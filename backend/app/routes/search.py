from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Document, DocumentChunk, SearchHistory, User
from app.schemas import SearchRequest, SearchResultItem
from app.auth import get_current_user
from app.vector_store import semantic_search_in_store

router = APIRouter(tags=["Search"])

@router.post("/semantic-search", response_model=List[SearchResultItem])
def semantic_search(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Determine authorized document IDs
    if request.document_id is not None:
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
        user_docs = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.status == "COMPLETED"
        ).all()
        authorized_doc_ids = [d.id for d in user_docs]

    if not authorized_doc_ids:
        return []

    # 2. Query Vector Store
    try:
        results = semantic_search_in_store(
            query_text=request.query,
            document_ids=authorized_doc_ids,
            top_k=5
        )
    except Exception as e:
        print(f"Semantic search vector error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic search failed: {str(e)}"
        )

    # 3. Log search history
    db_history = SearchHistory(
        user_id=current_user.id,
        query=request.query,
        search_type="semantic"
    )
    db.add(db_history)
    db.commit()

    # 4. Map results to schema
    items = []
    for r in results:
        items.append(SearchResultItem(
            document_id=r["document_id"],
            filename=r["filename"],
            page_number=r["page_number"],
            chunk_id=r["chunk_id"].split("_")[-1] if "_" in r["chunk_id"] else 0,
            text=r["text"],
            score=r["score"]
        ))
    return items


@router.post("/keyword-search", response_model=List[SearchResultItem])
def keyword_search(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Base query joining Document to verify ownership
    query = db.query(DocumentChunk).join(Document).filter(
        Document.user_id == current_user.id,
        Document.status == "COMPLETED"
    )

    # 2. Filter by document_id if provided
    if request.document_id is not None:
        query = query.filter(DocumentChunk.document_id == request.document_id)

    # 3. Case-insensitive LIKE query in SQL
    keyword_like = f"%{request.query}%"
    chunks = query.filter(DocumentChunk.text.like(keyword_like)).limit(20).all()

    # 4. Log search history
    db_history = SearchHistory(
        user_id=current_user.id,
        query=request.query,
        search_type="keyword"
    )
    db.add(db_history)
    db.commit()

    # 5. Map to return schema. Score for keyword search is 1.0 if matched.
    items = []
    for chunk in chunks:
        items.append(SearchResultItem(
            document_id=chunk.document_id,
            filename=chunk.document.filename,
            page_number=chunk.page_number,
            chunk_id=chunk.chunk_index,
            text=chunk.text,
            score=1.0
        ))
    return items
