import json
import google.generativeai as genai
from app.config import settings
from typing import List, Dict, Any, Optional

# Initialize Google Gemini
def init_gemini():
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
    else:
        print("WARNING: GEMINI_API_KEY is not set. AI features will fail.")

# Run initialization
init_gemini()

def get_gemini_model(model_name: str = "gemini-2.5-flash"):
    return genai.GenerativeModel(model_name)

def generate_rag_answer(question: str, chunks: List[Dict[str, Any]]) -> str:
    """
    Asks Gemini a question using retrieved vector chunks as context.
    """
    if not settings.GEMINI_API_KEY:
        return "Gemini API key is missing. Please configure it in your settings."
        
    model = get_gemini_model()
    
    # Construct context string
    context_str = ""
    for idx, chunk in enumerate(chunks):
        context_str += f"\n--- EXCERPT {idx+1} (Source: {chunk['filename']}, Page: {chunk['page_number']}) ---\n"
        context_str += f"{chunk['text']}\n"
        
    prompt = f"""You are an advanced AI Smart Document Assistant. Answer the user's question based STRICTLY on the provided document excerpts.
If the answer cannot be found or inferred from the excerpts, state clearly: "I cannot find the answer in the provided documents."

CONTEXT:
{context_str}

QUESTION:
{question}

INSTRUCTIONS:
1. Answer the question comprehensively and professionally.
2. Cite the source files and pages (e.g. `[filename, Page X]`) where the information was found in your answer.
3. Be objective. Do not make up facts not present in the context.
"""
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error calling Gemini API: {str(e)}")
        return f"Error communicating with Gemini: {str(e)}"

def generate_document_summary(full_text: str) -> Dict[str, str]:
    """
    Generates short, detailed, and bullet summaries for a document.
    Uses Gemini's JSON output mode.
    """
    if not settings.GEMINI_API_KEY:
        return {
            "short_summary": "Gemini API Key missing.",
            "detailed_summary": "Please configure GEMINI_API_KEY.",
            "bullet_summary": "• Missing configuration"
        }
        
    model = get_gemini_model()
    
    # Cap text if it is excessively long, though 1.5-flash supports 1M tokens.
    # 50,000 words is a good safety limit for standard processing.
    words = full_text.split()
    if len(words) > 50000:
        full_text = " ".join(words[:50000]) + "\n... [Text truncated for summarization]"

    prompt = f"""Analyze the following document and provide three types of summaries:
1. Short Summary: A concise 1-2 sentence overview of what the document is about.
2. Detailed Summary: A comprehensive, multi-paragraph breakdown of the document.
3. Bullet Summary: A list of key takeaways or bullet points.

Provide the response in JSON format matching the schema:
{{
  "short_summary": "string",
  "detailed_summary": "string",
  "bullet_summary": "string"
}}

Document Text:
{full_text}
"""
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        data = json.loads(response.text)
        return {
            "short_summary": data.get("short_summary", ""),
            "detailed_summary": data.get("detailed_summary", ""),
            "bullet_summary": data.get("bullet_summary", "")
        }
    except Exception as e:
        print(f"Summary Generation Error: {str(e)}")
        return {
            "short_summary": "Failed to generate summary.",
            "detailed_summary": f"An error occurred: {str(e)}",
            "bullet_summary": "• Failed to generate list."
        }

def extract_structured_information(full_text: str, doc_type: str) -> Dict[str, Any]:
    """
    Extracts key information from text depending on the document type (invoice, resume, contract).
    """
    if not settings.GEMINI_API_KEY:
        return {"error": "Gemini API Key is missing."}
        
    model = get_gemini_model()
    
    # Truncate text if needed
    words = full_text.split()
    if len(words) > 20000:
        full_text = " ".join(words[:20000])

    # Dynamic schema selection
    if doc_type.lower() == "invoice":
        schema_desc = """{
  "invoice_number": "string or null",
  "date": "string or null",
  "gst_number": "string or null",
  "total_amount": "string or null",
  "currency": "string or null",
  "vendor_name": "string or null"
}"""
        extra_instr = "Extract invoice particulars. Clean and format currency/amount."
    elif doc_type.lower() == "resume":
        schema_desc = """{
  "skills": ["string"],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "year": "string or null"
    }
  ],
  "experience": [
    {
      "role": "string",
      "company": "string",
      "duration": "string or null",
      "responsibilities": "string or null"
    }
  ]
}"""
        extra_instr = "Extract personal professional details like education, skills list, and job roles."
    elif doc_type.lower() == "contract":
        schema_desc = """{
  "parties": ["string"],
  "effective_date": "string or null",
  "expiry_date": "string or null",
  "governing_law": "string or null",
  "key_clauses": [
    {
      "clause_title": "string",
      "summary": "string"
    }
  ]
}"""
        extra_instr = "Extract legal entities, agreements, date bounds, and major paragraphs/indemnities/obligations."
    else:
        schema_desc = """{
  "key_findings": ["string"],
  "metadata": {}
}"""
        extra_instr = "Extract overall key findings from the document."

    prompt = f"""You are an advanced data extraction agent. Read the document text below and extract structured information.
    
INSTRUCTIONS:
1. Extract data conforming to this JSON structure:
{schema_desc}
2. Extra directive: {extra_instr}
3. If a field cannot be found, output null (or an empty array for lists). Do not guess values.

Document Text:
{full_text}
"""
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Extraction Error: {str(e)}")
        return {"error": f"Failed to extract information: {str(e)}"}
