"""
Helper Utility Functions
"""

from typing import Any, Dict, List


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace in text"""
    if not text:
        return ""
    return " ".join(text.split())


def safe_int(value: Any, default: int = 0) -> int:
    """Safely convert value to int"""
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_str(value: Any, default: str = "") -> str:
    """Safely convert value to string"""
    if value is None:
        return default
    return str(value)

