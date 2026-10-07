import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Document, DocumentChunk, User
from app.schemas import DocumentResponse, DocumentDetailResponse
from app.auth import get_current_user
from app.config import settings
from app.ocr import extract_text_from_file
from app.embeddings import split_text_into_chunks, generate_embeddings
from app.vector_store import add_chunks_to_vector_store, delete_document_from_vector_store

router = APIRouter(tags=["Documents"])

MAX_UPLOAD_SIZE = 20 * 1024 * 1024  # 20 MB

def process_document_task(document_id: int, file_path: str, filename: str, db_session_maker):
    """
    Background worker task to extract OCR text, split into chunks,
    generate sentence embeddings, and index them in ChromaDB.
    """
    # Open fresh DB session for the background task
    db = db_session_maker()
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        db.close()
        return

    try:
        document.status = "PROCESSING"
        db.commit()

        # 1. OCR / Text Extraction
        pages_data = extract_text_from_file(file_path)
        
        # Update page count
        document.total_pages = len(pages_data)
        db.commit()

        # 2. Text Processing & SQLite Chunk Saving
        all_chunks = []
        chunk_index = 0
        
        from app.pii_redaction import redact_sensitive_data
        
        for page in pages_data:
            page_num = page["page_number"]
            raw_page_text = page["text"]
            
            # --- PII REDACTION MIDDLEWARE ---
            # Mask sensitive data before it hits the database or vector store
            page_text = redact_sensitive_data(raw_page_text)
            
            # Split page text into 400-word chunks (80 overlap)
            text_chunks = split_text_into_chunks(page_text, chunk_size=400, overlap=80)
            
            for chunk_text in text_chunks:
                if not chunk_text.strip():
                    continue
                db_chunk = DocumentChunk(
                    document_id=document.id,
                    chunk_index=chunk_index,
                    page_number=page_num,
                    text=chunk_text
                )
                db.add(db_chunk)
                
                # Keep a copy for vector store indexing
                all_chunks.append({
                    "chunk_index": chunk_index,
                    "page_number": page_num,
                    "text": chunk_text
                })
                chunk_index += 1

        db.commit()

        # 3. Vector Embeddings Generation & ChromaDB Indexing
        if all_chunks:
            texts_to_embed = [c["text"] for c in all_chunks]
            embeddings = generate_embeddings(texts_to_embed)
            
            # Index into ChromaDB
            add_chunks_to_vector_store(
                chunks=all_chunks,
                embeddings=embeddings,
                document_id=document.id,
                filename=filename
            )

        document.status = "COMPLETED"
        db.commit()

    except Exception as e:
        print(f"Error processing document {document_id}: {str(e)}")
        document.status = "FAILED"
        document.error_message = str(e)
        db.commit()
    finally:
        db.close()


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation
    # File type verification
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    if ext not in ['.pdf', '.png', '.jpg', '.jpeg']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Upload PDF, PNG, JPG, or JPEG."
        )

    # File size verification
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum upload size of 20MB. Size: {file_size / 1024 / 1024:.2f}MB"
        )

    # 2. Save file to disk
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file to disk: {str(e)}"
        )

    # 3. Create document record in SQLite
    db_document = Document(
        filename=filename,
        file_path=file_path,
        status="PENDING",
        file_size=file_size,
        total_pages=0,
        user_id=current_user.id
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    # 4. Enqueue background processing (OCR, chunking, embeddings)
    from app.database import SessionLocal
    background_tasks.add_task(
        process_document_task,
        db_document.id,
        file_path,
        filename,
        SessionLocal
    )

    return db_document


@router.get("/documents", response_model=List[DocumentResponse])
def get_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit
    documents = db.query(Document).filter(
        Document.user_id == current_user.id
    ).order_by(Document.upload_date.desc()).offset(offset).limit(limit).all()
    return documents


@router.get("/document/{id}", response_model=DocumentDetailResponse)
def get_document(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = db.query(Document).filter(
        Document.id == id,
        Document.user_id == current_user.id
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return document


from fastapi import Request
from jose import jwt, JWTError

@router.get("/document/{id}/file")
def get_document_file(
    id: int, 
    request: Request,
    token: Optional[str] = Query(None), 
    db: Session = Depends(get_db)
):
    """Downloads/streams the original uploaded file. Supports header or query parameter JWT token."""
    resolved_token = token
    if not resolved_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            resolved_token = auth_header.split(" ")[1]

    if not resolved_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(resolved_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    document = db.query(Document).filter(
        Document.id == id,
        Document.user_id == user_id
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical file not found on disk"
        )
        
    return FileResponse(
        document.file_path, 
        filename=document.filename,
        media_type="application/octet-stream"
    )


@router.delete("/document/{id}")
def delete_document(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = db.query(Document).filter(
        Document.id == id,
        Document.user_id == current_user.id
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # 1. Delete file from disk
    if os.path.exists(document.file_path):
        try:
            os.remove(document.file_path)
        except Exception as e:
            print(f"Failed to remove physical file: {str(e)}")

    # 2. Delete from ChromaDB
    try:
        delete_document_from_vector_store(document.id)
    except Exception as e:
        print(f"Failed to delete Chroma vectors: {str(e)}")

    # 3. SQLite cascades to delete document_chunks, chat histories, etc.
    db.delete(document)
    db.commit()

    return {"message": "Document and associated vectors deleted successfully"}


@router.post("/extract")
def extract_ocr_only(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint to run immediate OCR on an uploaded document without saving metadata.
    Returns page text list.
    """
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    if ext not in ['.pdf', '.png', '.jpg', '.jpeg']:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload PDF, PNG, JPG, or JPEG."
        )

    # Save to a temporary file
    temp_filename = f"temp_{uuid.uuid4()}{ext}"
    temp_path = os.path.join(settings.UPLOAD_DIR, temp_filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Extract text
        pages_data = extract_text_from_file(temp_path)
        
        from app.pii_redaction import redact_sensitive_data
        for page in pages_data:
            page["text"] = redact_sensitive_data(page["text"])
            
        return {"filename": filename, "pages": pages_data}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OCR extraction failed: {str(e)}"
        )
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
