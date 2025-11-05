"""
Phone Normalization Service
"""

import re
from typing import Optional


class PhoneNormalizer:
    """Normalize phone numbers for matching"""
    
    @staticmethod
    def normalize(phone: Optional[str]) -> Optional[str]:
        """
        Normalize phone for comparison.
        - Remove all non-digit characters (spaces, dashes, parentheses, plus signs)
        - Return digits-only for comparison
        """
        if not phone:
            return None
        
        # Convert to string
        phone_str = str(phone).strip()
        
        if not phone_str:
            return None
        
        # Remove all non-digit characters
        digits_only = re.sub(r'\D', '', phone_str)
        
        return digits_only if digits_only else None
    
    @staticmethod
    def preserve_format(phone: Optional[str]) -> str:
        """
        Preserve original format for display.
        Returns the original phone string, or empty string if None.
        """
        if not phone:
            return ""
        
        return str(phone).strip()

