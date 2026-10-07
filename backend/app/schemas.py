from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# Auth schemas
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None

# Document schemas
class DocumentResponse(BaseModel):
    id: int
    filename: str
    upload_date: datetime
    status: str
    error_message: Optional[str] = None
    total_pages: int
    file_size: int
    user_id: int

    class Config:
        from_attributes = True

class ChunkResponse(BaseModel):
    id: int
    document_id: int
    chunk_index: int
    page_number: int
    text: str

    class Config:
        from_attributes = True

class DocumentDetailResponse(DocumentResponse):
    chunks: List[ChunkResponse] = []

# Chat schemas
class ChatRequest(BaseModel):
    question: str
    document_id: Optional[int] = None  # None means search all user's documents

class ChatSource(BaseModel):
    document_id: int
    filename: str
    page_number: int
    text: str
    score: Optional[float] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[ChatSource] = []

class ChatHistoryResponse(BaseModel):
    id: int
    user_id: int
    document_id: Optional[int] = None
    question: str
    answer: str
    sources: Optional[str] = None  # JSON string
    created_at: datetime

    class Config:
        from_attributes = True

# Search schemas
class SearchRequest(BaseModel):
    query: str
    document_id: Optional[int] = None

class SearchResultItem(BaseModel):
    document_id: int
    filename: str
    page_number: int
    chunk_id: int
    text: str
    score: float

class SearchHistoryResponse(BaseModel):
    id: int
    user_id: int
    query: str
    search_type: str
    created_at: datetime

    class Config:
        from_attributes = True

# Summary schemas
class SummaryRequest(BaseModel):
    document_id: int

class SummaryResponse(BaseModel):
    short_summary: str
    detailed_summary: str
    bullet_summary: str

# Dashboard schemas
class DashboardStats(BaseModel):
    total_documents: int
    recent_documents: List[DocumentResponse]
    recent_searches: List[SearchHistoryResponse]
    recent_chats: List[ChatHistoryResponse]
