"""
Email Normalization Service
"""

import re
from typing import Optional


class EmailNormalizer:
    """Normalize email addresses for matching"""
    
    @staticmethod
    def normalize(email: Optional[str]) -> Optional[str]:
        """
        Normalize email for comparison.
        - Extract from HTML links if present
        - Convert to lowercase
        - Trim whitespace
        """
        if not email:
            return None
        
        # Convert to string and strip whitespace
        email_str = str(email).strip()
        
        if not email_str:
            return None
        
        # Extract email from HTML mailto links
        # Pattern: <a href="mailto:email@example.com"> or mailto:email@example.com
        mailto_pattern = r'mailto:([^\s">]+)'
        match = re.search(mailto_pattern, email_str, re.IGNORECASE)
        if match:
            email_str = match.group(1)
        
        # Remove any HTML tags
        email_str = re.sub(r'<[^>]+>', '', email_str)
        
        # Convert to lowercase
        email_str = email_str.lower()
        
        # Trim whitespace
        email_str = email_str.strip()
        
        return email_str if email_str else None
    
    @staticmethod
    def extract_from_html(html_content: Optional[str]) -> Optional[str]:
        """Extract email from HTML content"""
        if not html_content:
            return None
        
        # Pattern for email in HTML
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        match = re.search(email_pattern, html_content, re.IGNORECASE)
        if match:
            return EmailNormalizer.normalize(match.group(0))
        
        return None

