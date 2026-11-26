from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import ChatHistory, Document, SearchHistory, User
from app.schemas import ChatHistoryResponse, SearchHistoryResponse, DashboardStats, DocumentResponse
from app.auth import get_current_user

router = APIRouter(tags=["History & Analytics"])

@router.get("/chat-history", response_model=List[ChatHistoryResponse])
def get_chat_history(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db.query(ChatHistory).filter(
        ChatHistory.user_id == current_user.id
    ).order_by(ChatHistory.created_at.desc()).limit(limit).all()
    return history


@router.get("/search-history", response_model=List[SearchHistoryResponse])
def get_search_history(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db.query(SearchHistory).filter(
        SearchHistory.user_id == current_user.id
    ).order_by(SearchHistory.created_at.desc()).limit(limit).all()
    return history


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Total uploaded documents
    total_docs = db.query(Document).filter(Document.user_id == current_user.id).count()
    
    # Recent documents (limit 5)
    recent_docs = db.query(Document).filter(
        Document.user_id == current_user.id
    ).order_by(Document.upload_date.desc()).limit(5).all()
    
    # Recent searches (limit 5)
    recent_searches = db.query(SearchHistory).filter(
        SearchHistory.user_id == current_user.id
    ).order_by(SearchHistory.created_at.desc()).limit(5).all()
    
    # Recent chat questions (limit 5)
    recent_chats = db.query(ChatHistory).filter(
        ChatHistory.user_id == current_user.id
    ).order_by(ChatHistory.created_at.desc()).limit(5).all()
    
    return DashboardStats(
        total_documents=total_docs,
        recent_documents=recent_docs,
        recent_searches=recent_searches,
        recent_chats=recent_chats
    )
