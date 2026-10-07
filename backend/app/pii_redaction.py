import re

def redact_sensitive_data(text: str) -> str:
    """
    NLP Middleware utility to redact PII (Personally Identifiable Information) 
    such as Emails, Phone Numbers, Credit Cards, and SSNs from raw text.
    Replaces sensitive parts with [MASKED_TAGS].
    """
    if not text:
        return text

    # 1. Mask Emails
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    text = re.sub(email_pattern, '[EMAIL_REDACTED]', text)
    
    # 2. Mask Credit Cards (e.g. 1234-5678-9012-3456 or 1234 5678 9012 3456 or contiguous)
    cc_pattern = r'\b(?:\d{4}[-\s]){3}\d{4}\b|\b\d{16}\b'
    text = re.sub(cc_pattern, '[CREDIT_CARD_REDACTED]', text)

    # 3. Mask SSN (Social Security Numbers) (e.g. 123-45-6789)
    ssn_pattern = r'\b\d{3}-\d{2}-\d{4}\b'
    text = re.sub(ssn_pattern, '[SSN_REDACTED]', text)

    # 4. Mask Phone Numbers (Basic US & Int formats)
    # Matches (123) 456-7890, 123-456-7890, +1-123-456-7890
    phone_pattern = r'\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}\b'
    text = re.sub(phone_pattern, '[PHONE_REDACTED]', text)

    return text
