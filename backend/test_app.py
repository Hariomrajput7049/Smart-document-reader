import os
import sys
import unittest

# Add app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal, Base
from app.models import User, Document, DocumentChunk
from app.auth import get_password_hash, verify_password, create_access_token
from app.embeddings import split_text_into_chunks

class TestAppSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create tables in SQLite test instance
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        # Drop tables to clean up
        Base.metadata.drop_all(bind=engine)

    def test_auth_password_hashing(self):
        password = "mysecretpassword123"
        hashed = get_password_hash(password)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("wrongpassword", hashed))

    def test_auth_jwt_issuance(self):
        token_data = {"sub": "testuser", "id": 999}
        token = create_access_token(token_data)
        self.assertTrue(isinstance(token, str))
        self.assertTrue(len(token) > 20)

    def test_text_splitting_overlap(self):
        # Create text with 500 words
        dummy_words = ["word"] * 500
        text = " ".join(dummy_words)
        
        chunks = split_text_into_chunks(text, chunk_size=400, overlap=80)
        self.assertEqual(len(chunks), 2)
        
        # Check first chunk has 400 words
        self.assertEqual(len(chunks[0].split()), 400)
        # Check second chunk has remaining words
        self.assertEqual(len(chunks[1].split()), 180) # 500 - (400 - 80) = 180

    def test_user_creation_sqlite(self):
        test_user = User(
            username="smoketestuser",
            email="smoketest@example.com",
            hashed_password=get_password_hash("password123")
        )
        self.db.add(test_user)
        self.db.commit()
        
        queried = self.db.query(User).filter(User.username == "smoketestuser").first()
        self.assertIsNotNone(queried)
        self.assertEqual(queried.email, "smoketest@example.com")
        
        # Cleanup
        self.db.delete(queried)
        self.db.commit()

if __name__ == "__main__":
    print("Running Smart Document Intelligence Platform Smoke Tests...")
    unittest.main()
