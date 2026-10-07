from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer

_model = None

def get_embedding_model():
    global _model
    if _model is None:
        # Load all-MiniLM-L6-v2 model. Runs locally.
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model

def split_text_into_chunks(text: str, chunk_size: int = 400, overlap: int = 80) -> List[str]:
    """
    Splits text into chunks of `chunk_size` words with an overlap of `overlap` words.
    """
    words = text.split()
    if not words:
        return []
    
    chunks = []
    step = chunk_size - overlap
    if step <= 0:
        step = chunk_size  # Avoid infinite loop
        
    for i in range(0, len(words), step):
        chunk_words = words[i:i + chunk_size]
        chunks.append(" ".join(chunk_words))
        # If we reached the end of the document, stop
        if i + chunk_size >= len(words):
            break
            
    return chunks

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generates embeddings for a list of texts using all-MiniLM-L6-v2.
    """
    if not texts:
        return []
    model = get_embedding_model()
    embeddings = model.encode(texts, show_progress_bar=False)
    # Convert numpy arrays to float lists for ChromaDB
    return [emb.tolist() for emb in embeddings]
