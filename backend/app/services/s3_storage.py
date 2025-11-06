"""
AWS S3 Storage Service for File Uploads
"""

import boto3
import os
from typing import Optional, BinaryIO
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)


class S3StorageService:
    """Service for managing file uploads to AWS S3"""
    
    def __init__(self):
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_region = os.getenv("AWS_REGION", "us-east-1")
        self.bucket_name = os.getenv("AWS_S3_BUCKET")
        
        if not all([self.aws_access_key_id, self.aws_secret_access_key, self.bucket_name]):
            logger.warning("S3 credentials not configured. File storage will use local filesystem.")
            self.s3_client = None
        else:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=self.aws_access_key_id,
                    aws_secret_access_key=self.aws_secret_access_key,
                    region_name=self.aws_region
                )
                # Verify bucket exists
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                logger.info(f"S3 storage initialized successfully. Bucket: {self.bucket_name}")
            except ClientError as e:
                logger.error(f"Failed to initialize S3 client: {e}")
                self.s3_client = None
    
    def upload_file(self, file_content: bytes, file_name: str, folder: str = "uploads") -> Optional[str]:
        """
        Upload file to S3
        
        Args:
            file_content: File content as bytes
            file_name: Name of the file
            folder: Folder path in S3 bucket
            
        Returns:
            S3 object key if successful, None otherwise
        """
        if not self.s3_client:
            return None
        
        try:
            # Create S3 key
            s3_key = f"{folder}/{file_name}"
            
            # Upload file
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=self._get_content_type(file_name)
            )
            
            logger.info(f"File uploaded to S3: {s3_key}")
            return s3_key
            
        except ClientError as e:
            logger.error(f"Failed to upload file to S3: {e}")
            return None
    
    def download_file(self, s3_key: str) -> Optional[bytes]:
        """
        Download file from S3
        
        Args:
            s3_key: S3 object key
            
        Returns:
            File content as bytes if successful, None otherwise
        """
        if not self.s3_client:
            return None
        
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            return response['Body'].read()
            
        except ClientError as e:
            logger.error(f"Failed to download file from S3: {s3_key}: {e}")
            return None
    
    def delete_file(self, s3_key: str) -> bool:
        """
        Delete file from S3
        
        Args:
            s3_key: S3 object key
            
        Returns:
            True if successful, False otherwise
        """
        if not self.s3_client:
            return False
        
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"File deleted from S3: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete file from S3: {s3_key}: {e}")
            return False
    
    def get_file_url(self, s3_key: str, expires_in: int = 3600) -> Optional[str]:
        """
        Generate presigned URL for file access
        
        Args:
            s3_key: S3 object key
            expires_in: URL expiration time in seconds
            
        Returns:
            Presigned URL if successful, None otherwise
        """
        if not self.s3_client:
            return None
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expires_in
            )
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None
    
    def is_available(self) -> bool:
        """Check if S3 storage is available"""
        return self.s3_client is not None
    
    @staticmethod
    def _get_content_type(file_name: str) -> str:
        """Get content type based on file extension"""
        extension = file_name.lower().split('.')[-1]
        content_types = {
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'csv': 'text/csv',
        }
        return content_types.get(extension, 'application/octet-stream')


# Global instance
s3_storage = S3StorageService()

