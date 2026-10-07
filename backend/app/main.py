from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.config import settings
from app.database import engine
from app.models import Base

# Import routers
from app.routes import auth, users, documents, chat, summary, search, history, export

# Create SQLite database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Document Intelligence Platform API",
    description="Backend API for OCR, Semantic Search, and Gemini RAG over documents.",
    version="1.0.0"
)

# CORS Middleware config
# Allow local React dev server and Docker client instances
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For portfolio versatility, allow all. Change to strict list in prod.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    print("Pre-loading SentenceTransformer model to prevent request timeouts...")
    try:
        from app.embeddings import get_embedding_model
        get_embedding_model()
        print("SentenceTransformer pre-loaded successfully!")
    except Exception as e:
        print(f"Error pre-loading SentenceTransformer: {e}")

# Mount Routers under /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(summary.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(export.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Document Intelligence Platform API. Go to /docs for Swagger documentation."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
