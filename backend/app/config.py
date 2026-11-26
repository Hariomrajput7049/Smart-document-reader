import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    JWT_SECRET: str = "supersecretjwtkeyforhashingdocsplatform"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    SQLITE_DB_URL: str = "sqlite:///./sql_app.db"
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    UPLOAD_DIR: str = "./uploads"
    GEMINI_API_KEY: str = ""
    PORT: int = 8000

    class Config:
        env_file = (".env", "../.env")
        env_file_encoding = "utf-8"

settings = Settings()

# Create directories if they do not exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
