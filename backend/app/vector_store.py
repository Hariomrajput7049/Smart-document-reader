import chromadb
from app.config import settings
from app.embeddings import generate_embeddings
from typing import List, Dict, Any, Optional

# Singleton for ChromaDB client
_chroma_client = None

def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
    return _chroma_client

def get_collection():
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="document_chunks",
        metadata={"hnsw:space": "cosine"} # Use cosine similarity
    )

def add_chunks_to_vector_store(
    chunks: List[Dict[str, Any]], 
    embeddings: List[List[float]], 
    document_id: int, 
    filename: str
):
    """
    Adds document chunks and their precomputed embeddings into ChromaDB.
    Each chunk dict has: chunk_index, page_number, text.
    """
    if not chunks:
        return
        
    collection = get_collection()
    
    ids = []
    documents = []
    metadatas = []
    
    for idx, chunk in enumerate(chunks):
        chunk_id = f"doc_{document_id}_chunk_{chunk['chunk_index']}"
        ids.append(chunk_id)
        documents.append(chunk["text"])
        metadatas.append({
            "document_id": int(document_id),
            "page": int(chunk["page_number"]),
            "filename": str(filename),
            "chunk_id": int(chunk["chunk_index"])
        })
        
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )

def delete_document_from_vector_store(document_id: int):
    """Deletes all chunks belonging to a document from ChromaDB."""
    collection = get_collection()
    # Delete by metadata filter
    collection.delete(where={"document_id": int(document_id)})

def semantic_search_in_store(
    query_text: str, 
    document_ids: Optional[List[int]] = None, 
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Searches ChromaDB for the top K similar chunks.
    Filters search by list of authorized document_ids if provided.
    """
    collection = get_collection()
    
    # Compute query embedding
    query_embedding = generate_embeddings([query_text])[0]
    
    # Prepare metadata filter
    where_filter = None
    if document_ids is not None:
        if len(document_ids) == 0:
            return []  # No documents authorized to search
        elif len(document_ids) == 1:
            where_filter = {"document_id": int(document_ids[0])}
        else:
            # ChromaDB supports $in operator
            where_filter = {"document_id": {"$in": [int(d) for d in document_ids]}}
            
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where_filter
    )
    
    formatted_results = []
    if not results or not results['documents'] or len(results['documents'][0]) == 0:
        return []
        
    # Chroma returns lists of lists since it supports batch queries. We only query 1 text.
    docs = results['documents'][0]
    metas = results['metadatas'][0]
    distances = results['distances'][0] if 'distances' in results and results['distances'] else [0.0] * len(docs)
    ids = results['ids'][0]
    
    for i in range(len(docs)):
        # Convert cosine distance to a similarity score (since Chroma distance is typically 1 - similarity)
        score = float(1.0 - distances[i])
        formatted_results.append({
            "chunk_id": ids[i],
            "document_id": metas[i]["document_id"],
            "filename": metas[i]["filename"],
            "page_number": metas[i]["page"],
            "text": docs[i],
            "score": score
        })
        
    return formatted_results
