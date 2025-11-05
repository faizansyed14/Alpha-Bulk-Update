"""
Identity Matcher - Composite Matching (Email OR Phone)
"""

from typing import Optional, Dict, List, Tuple
from app.services.email_normalizer import EmailNormalizer
from app.services.phone_normalizer import PhoneNormalizer


class IdentityMatchType:
    """Identity match types"""
    EMAIL_MATCH = "email_match"
    PHONE_MATCH = "phone_match"
    BOTH_MATCH = "both_match"
    NEW = "new"


class IdentityMatcher:
    """Match records by Email OR Phone (composite matching)"""
    
    def __init__(self):
        self.email_normalizer = EmailNormalizer()
        self.phone_normalizer = PhoneNormalizer()
    
    def normalize_email(self, email: Optional[str]) -> Optional[str]:
        """Normalize email for matching"""
        return self.email_normalizer.normalize(email)
    
    def normalize_phone(self, phone: Optional[str]) -> Optional[str]:
        """Normalize phone for matching"""
        return self.phone_normalizer.normalize(phone)
    
    def find_match(
        self,
        email: Optional[str],
        phone: Optional[str],
        existing_records: List[Dict]
    ) -> Tuple[Optional[Dict], str, bool]:
        """
        Find matching record by Email OR Phone.
        
        Returns:
            Tuple of (matched_record, match_type, identity_conflict)
            - matched_record: The matching record or None
            - match_type: "email_match", "phone_match", "both_match", or "new"
            - identity_conflict: True if Email matches but Phone differs (or vice versa)
        """
        email_norm = self.normalize_email(email)
        phone_norm = self.normalize_phone(phone)
        
        if not email_norm and not phone_norm:
            # No identifiers available
            return None, IdentityMatchType.NEW, False
        
        email_match = None
        phone_match = None
        
        # Find matches
        for record in existing_records:
            record_email_norm = self.normalize_email(record.get("email"))
            record_phone_norm = self.normalize_phone(record.get("phone"))
            
            # Check email match
            if email_norm and record_email_norm and email_norm == record_email_norm:
                email_match = record
            
            # Check phone match
            if phone_norm and record_phone_norm and phone_norm == record_phone_norm:
                phone_match = record
        
        # Determine match type and identity conflicts
        if email_match and phone_match:
            # Both match - check if it's the same record
            if email_match.get("id") == phone_match.get("id"):
                # Exact match on same record
                return email_match, IdentityMatchType.BOTH_MATCH, False
            else:
                # Conflict: Email matches one record, Phone matches another
                # Return the email match (prioritize email)
                return email_match, IdentityMatchType.EMAIL_MATCH, True
        
        elif email_match:
            # Only email matches
            email_match_phone_norm = self.normalize_phone(email_match.get("phone"))
            identity_conflict = (
                phone_norm and email_match_phone_norm and 
                phone_norm != email_match_phone_norm
            )
            return email_match, IdentityMatchType.EMAIL_MATCH, identity_conflict
        
        elif phone_match:
            # Only phone matches
            phone_match_email_norm = self.normalize_email(phone_match.get("email"))
            identity_conflict = (
                email_norm and phone_match_email_norm and 
                email_norm != phone_match_email_norm
            )
            return phone_match, IdentityMatchType.PHONE_MATCH, identity_conflict
        
        else:
            # No match - new record
            return None, IdentityMatchType.NEW, False
    
    def is_duplicate(
        self,
        email: Optional[str],
        phone: Optional[str],
        existing_records: List[Dict]
    ) -> Tuple[bool, str]:
        """
        Check if record is duplicate (matches existing by Email OR Phone).
        
        Returns:
            Tuple of (is_duplicate, match_type)
        """
        matched_record, match_type, _ = self.find_match(email, phone, existing_records)
        is_dup = matched_record is not None
        return is_dup, match_type

