import os
import fitz  # PyMuPDF
import easyocr
import numpy as np
from PIL import Image
import io
import re
from typing import List, Dict, Any

# Singleton for EasyOCR Reader to avoid loading the model multiple times
_ocr_reader = None

def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        # Initialize reader for English. We run on CPU by default.
        _ocr_reader = easyocr.Reader(['en'], gpu=False)
    return _ocr_reader

def clean_text(text: str) -> str:
    # Clean unwanted spaces, non-printable characters and double returns
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]', '', text)  # remove non-ascii control chars
    text = re.sub(r'\s+', ' ', text)  # collapse multiple spaces/newlines to a single space
    return text.strip()

def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    """Runs OCR on raw image bytes (JPG, PNG)."""
    reader = get_ocr_reader()
    results = reader.readtext(image_bytes, detail=0)
    full_text = " ".join(results)
    return clean_text(full_text)

def extract_text_from_pdf_page(page: fitz.Page, page_num: int) -> str:
    """Extracts text from a single PDF page. If scanned, falls back to OCR."""
    text = page.get_text()
    
    # Heuristic: if text length is less than 40 characters, it is likely a scanned page
    if len(text.strip()) < 40:
        # Convert page to image pixmap
        # Using 150 DPI is a good balance between OCR quality and speed
        pix = page.get_pixmap(dpi=150)
        img_data = pix.tobytes("png")
        
        # Run EasyOCR
        text = extract_text_from_image_bytes(img_data)
        print(f"Page {page_num}: Scanned page detected. OCR extracted {len(text)} chars.")
    else:
        text = clean_text(text)
        print(f"Page {page_num}: Selectable text extracted. {len(text)} chars.")
        
    return text

def extract_text_from_file(file_path: str) -> List[Dict[str, Any]]:
    """
    Main entry point for extracting text.
    Supports PDF and common image formats (PNG, JPG, JPEG).
    Returns list of dicts: [{'page_number': int, 'text': str}]
    """
    _, ext = os.path.splitext(file_path.lower())
    pages_data = []

    if ext == '.pdf':
        doc = fitz.open(file_path)
        for i in range(len(doc)):
            page = doc[i]
            page_text = extract_text_from_pdf_page(page, i + 1)
            pages_data.append({
                "page_number": i + 1,
                "text": page_text
            })
        doc.close()
    elif ext in ['.png', '.jpg', '.jpeg']:
        with open(file_path, 'rb') as f:
            img_bytes = f.read()
        page_text = extract_text_from_image_bytes(img_bytes)
        pages_data.append({
            "page_number": 1,
            "text": page_text
        })
    else:
        raise ValueError(f"Unsupported file extension: {ext}")

    return pages_data
