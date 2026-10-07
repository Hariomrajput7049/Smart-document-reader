import os
import sys
import google.generativeai as genai

# Add app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.config import settings

print(f"Configured API Key prefix: {settings.GEMINI_API_KEY[:6]}...")
genai.configure(api_key=settings.GEMINI_API_KEY)

try:
    print("Fetching available models...")
    for m in genai.list_models():
        if "generateContent" in m.supported_generation_methods:
            print(f" - {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")
