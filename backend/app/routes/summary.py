from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Document, DocumentChunk, User
from app.schemas import SummaryRequest, SummaryResponse
from app.auth import get_current_user
from app.gemini import generate_document_summary, extract_structured_information

router = APIRouter(tags=["AI Document Intelligence"])

@router.post("/summary", response_model=SummaryResponse)
def get_document_summary(
    request: SummaryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Verify document ownership
    document = db.query(Document).filter(
        Document.id == request.document_id,
        Document.user_id == current_user.id
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document is in state '{document.status}' and cannot be summarized yet."
        )

    # 2. Reconstruct full document text from SQLite chunks
    chunks = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document.id
    ).order_by(DocumentChunk.chunk_index.asc()).all()
    
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document has no extracted text content"
        )
        
    full_text = " ".join([c.text for c in chunks])

    # 3. Call Gemini to generate summaries
    summary_data = generate_document_summary(full_text)
    
    return SummaryResponse(
        short_summary=summary_data.get("short_summary", ""),
        detailed_summary=summary_data.get("detailed_summary", ""),
        bullet_summary=summary_data.get("bullet_summary", "")
    )


@router.post("/document/{id}/extract-info")
def extract_document_information(
    id: int,
    doc_type: str = Query(..., description="Type of document: invoice, resume, or contract"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Verify document ownership
    document = db.query(Document).filter(
        Document.id == id,
        Document.user_id == current_user.id
    ).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document is in state '{document.status}' and cannot be processed."
        )

    # 2. Reconstruct full text from SQLite chunks
    chunks = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document.id
    ).order_by(DocumentChunk.chunk_index.asc()).all()
    
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document has no text content"
        )
        
    full_text = " ".join([c.text for c in chunks])

    # 3. Process with Gemini structured info extraction
    extracted_data = extract_structured_information(full_text, doc_type)
    return {
        "document_id": id,
        "document_type": doc_type,
        "extracted_data": extracted_data
    }
