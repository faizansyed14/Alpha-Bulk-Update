"""
Column Validation Service
"""

from typing import Dict, List, Optional, Tuple
import pandas as pd
import re


class ColumnValidator:
    """Validate and map Excel columns to required format"""
    
    REQUIRED_COLUMNS = ["Company", "Name", "Surname", "Email", "Position", "Phone"]
    
    def __init__(self):
        self.required_columns_lower = [col.lower() for col in self.REQUIRED_COLUMNS]
    
    def normalize_column_name(self, col_name: str) -> str:
        """
        Normalize column name for matching.
        - Convert to lowercase
        - Remove spaces, underscores, hyphens
        """
        if not col_name:
            return ""
        
        # Convert to lowercase
        normalized = str(col_name).lower()
        
        # Remove whitespace, underscores, hyphens
        normalized = re.sub(r'[\s_\-]', '', normalized)
        
        return normalized
    
    def find_column_mapping(self, df_columns: List[str]) -> Dict[str, Optional[str]]:
        """
        Find mapping from Excel columns to required columns.
        
        Returns:
            Dict mapping required column names to Excel column names (or None if not found)
        """
        mapping = {}
        normalized_excel_cols = {
            self.normalize_column_name(col): col 
            for col in df_columns
        }
        
        for required_col in self.REQUIRED_COLUMNS:
            normalized_required = self.normalize_column_name(required_col)
            
            # Try exact match first
            if normalized_required in normalized_excel_cols:
                mapping[required_col] = normalized_excel_cols[normalized_required]
            else:
                # Try partial match
                found = None
                for excel_norm, excel_orig in normalized_excel_cols.items():
                    if normalized_required in excel_norm or excel_norm in normalized_required:
                        found = excel_orig
                        break
                
                mapping[required_col] = found
        
        return mapping
    
    def validate_columns(self, df: pd.DataFrame) -> Tuple[bool, Dict[str, Optional[str]], List[str]]:
        """
        Validate that required columns exist (with flexible matching).
        
        Returns:
            Tuple of (is_valid, column_mapping, missing_columns)
        """
        df_columns = list(df.columns)
        mapping = self.find_column_mapping(df_columns)
        
        missing_columns = [
            req_col for req_col, excel_col in mapping.items() 
            if excel_col is None
        ]
        
        is_valid = len(missing_columns) == 0
        
        return is_valid, mapping, missing_columns
    
    def extract_columns(self, df: pd.DataFrame, mapping: Dict[str, Optional[str]]) -> pd.DataFrame:
        """
        Extract and rename columns according to mapping.
        
        Returns:
            DataFrame with required columns in correct order
        """
        result_data = {}
        
        for required_col in self.REQUIRED_COLUMNS:
            excel_col = mapping.get(required_col)
            if excel_col and excel_col in df.columns:
                result_data[required_col] = df[excel_col]
            else:
                # Missing column - fill with empty strings
                result_data[required_col] = [""] * len(df)
        
        # Create DataFrame with required columns in order
        result_df = pd.DataFrame(result_data)
        
        # Convert all values to strings and handle NaN
        for col in result_df.columns:
            result_df[col] = result_df[col].astype(str).replace("nan", "")
        
        return result_df

