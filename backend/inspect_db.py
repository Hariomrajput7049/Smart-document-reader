import os
import sys

# Add app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Document, DocumentChunk

db = SessionLocal()

print("Listing all uploaded documents and their details:")
docs = db.query(Document).all()
for doc in docs:
    print(f"\n=========================================")
    print(f"DOCUMENT ID: {doc.id}")
    print(f"FILENAME: {doc.filename}")
    print(f"STATUS: {doc.status}")
    print(f"TOTAL PAGES: {doc.total_pages}")
    
    # Print the first chunk text to see what was extracted
    chunk = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).first()
    if chunk:
        print(f"FIRST CHUNK TEXT (Snippet): {chunk.text[:300]}...")
    else:
        print("NO TEXT CHUNKS EXTRACTED")
print("=========================================")
db.close()
