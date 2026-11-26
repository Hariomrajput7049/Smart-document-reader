import os
import sys
import traceback

# Add app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.schemas import UserCreate
from app.routes.auth import register

print("Attempting to run register function directly...")
user_in = UserCreate(
    username="shrutisharma080624@gmail.com",
    email="shrutisharma080624@gmail.com",
    password="password123"
)

db = SessionLocal()
try:
    res = register(user_in, db)
    print("SUCCESS: Account registered successfully inside Python.")
    print(f"Details: ID={res.id}, Username={res.username}")
except Exception as e:
    print("FAILED: An exception was thrown during registration:")
    traceback.print_exc()
finally:
    db.close()
