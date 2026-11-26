import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ChatHistory, Document, User
from app.schemas import ChatRequest, ChatResponse, ChatSource
from app.auth import get_current_user
from app.vector_store import semantic_search_in_store
from app.gemini import generate_rag_answer

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("", response_model=ChatResponse)
def chat_with_documents(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Determine which document IDs to query
    if request.document_id is not None:
        # Check if the document exists and belongs to the user
        document = db.query(Document).filter(
            Document.id == request.document_id,
            Document.user_id == current_user.id
        ).first()
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        authorized_doc_ids = [request.document_id]
    else:
        # Chatting with all of the user's documents
        user_docs = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.status == "COMPLETED"
        ).all()
        authorized_doc_ids = [d.id for d in user_docs]
        
    if not authorized_doc_ids:
        # User has no successfully processed documents
        return ChatResponse(
            answer="You don't have any uploaded and processed documents to chat with. Please upload a document first.",
            sources=[]
        )

    # 2. Perform Semantic Search in ChromaDB to retrieve Top 5 relevant chunks
    try:
        search_results = semantic_search_in_store(
            query_text=request.question,
            document_ids=authorized_doc_ids,
            top_k=5
        )
    except Exception as e:
        print(f"ChromaDB search error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector search failed: {str(e)}"
        )

    # 3. Generate answer using Google Gemini
    answer = generate_rag_answer(question=request.question, chunks=search_results)

    # 4. Format sources list
    sources = []
    for r in search_results:
        sources.append(ChatSource(
            document_id=r["document_id"],
            filename=r["filename"],
            page_number=r["page_number"],
            text=r["text"],
            score=r["score"]
        ))

    # 5. Save interaction in SQLite ChatHistory
    # Convert sources list to a JSON string
    sources_json = json.dumps([s.dict() for s in sources])
    db_chat = ChatHistory(
        user_id=current_user.id,
        document_id=request.document_id,  # Will store the single doc id, or NULL if multi-doc query
        question=request.question,
        answer=answer,
        sources=sources_json
    )
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)

    return ChatResponse(
        answer=answer,
        sources=sources
    )
