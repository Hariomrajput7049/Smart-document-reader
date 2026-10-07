import os
import sys
import google.generativeai as genai

# Add app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

test_models = [
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest"
]

print("Testing models for active quota...")
for model_name in test_models:
    try:
        print(f"Testing {model_name}...")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hello! Respond with 'Ready' if you can hear me.")
        print(f" -> SUCCESS: {model_name} generated content: '{response.text.strip()}'\n")
        # We found a working model!
        print(f"RECOMMENDED_MODEL={model_name}")
        break
    except Exception as e:
        print(f" -> FAILED: {model_name} - Error: {e}\n")
