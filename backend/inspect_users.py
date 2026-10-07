import os
import sys

# Add app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import User

db = SessionLocal()

print("Listing all registered accounts in SQLite:")
users = db.query(User).all()
for u in users:
    print(f" - ID: {u.id} | Username: {u.username} | Email: {u.email}")
db.close()
