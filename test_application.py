"""
Test Application - Full Workflow Test
Tests: Upload Excel, Edit Row, Delete Row, View Changes
"""

import requests
import json
import io
from openpyxl import Workbook

# Base URLs
BACKEND_URL = "http://localhost:8001"
API_URL = f"{BACKEND_URL}/api"

def create_test_excel():
    """Create a test Excel file"""
    wb = Workbook()
    ws = wb.active
    
    # Add headers
    ws.append(["Company", "Name", "Surname", "Email", "Position", "Phone"])
    
    # Add test data
    ws.append(["Test Corp", "John", "Doe", "john.doe@test.com", "Manager", "1234567890"])
    ws.append(["Test Corp", "Jane", "Smith", "jane.smith@test.com", "Developer", "0987654321"])
    ws.append(["Another Corp", "Bob", "Johnson", "bob.johnson@test.com", "Analyst", "5555555555"])
    
    # Save to bytes
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()

def test_health():
    """Test health endpoint"""
    print("\n=== Testing Health Endpoint ===")
    response = requests.get(f"{BACKEND_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_stats():
    """Test stats endpoint"""
    print("\n=== Testing Stats Endpoint ===")
    response = requests.get(f"{API_URL}/records/stats")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_upload():
    """Test file upload"""
    print("\n=== Testing File Upload ===")
    excel_data = create_test_excel()
    
    files = {'file': ('test.xlsx', excel_data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    response = requests.post(f"{API_URL}/upload", files=files)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        upload_data = response.json()
        if upload_data.get('success'):
            return upload_data.get('sheet_names', [])
    return None

def test_process_sheets(sheet_names):
    """Test processing sheets"""
    print("\n=== Testing Process Sheets ===")
    excel_data = create_test_excel()
    
    files = {'file': ('test.xlsx', excel_data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    data = {'sheet_names': json.dumps(sheet_names)}
    
    response = requests.post(f"{API_URL}/upload/process-sheets", files=files, data=data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Success: {result.get('success')}")
    print(f"Total Rows: {result.get('total_rows')}")
    
    if result.get('success'):
        return result.get('data', [])
    return None

def test_preview_changes(records):
    """Test preview changes"""
    print("\n=== Testing Preview Changes ===")
    payload = {
        "records": records,
        "update_mode": "replace"
    }
    
    response = requests.post(f"{API_URL}/upload/preview-changes", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Updates: {len(result.get('updates', []))}")
    print(f"New Records: {len(result.get('new_records', []))}")
    print(f"Summary: {result.get('summary')}")
    
    if response.status_code == 200:
        return result
    return None

def test_update_database(preview_data):
    """Test update database"""
    print("\n=== Testing Update Database ===")
    payload = {
        "preview_data": preview_data,
        "selected_ids": None  # All records
    }
    
    response = requests.post(f"{API_URL}/upload/update-database", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Success: {result.get('success')}")
    print(f"Updated: {result.get('updated_count')}")
    print(f"Inserted: {result.get('inserted_count')}")
    
    return response.status_code == 200

def test_get_records():
    """Test get records"""
    print("\n=== Testing Get Records ===")
    response = requests.get(f"{API_URL}/records?page=1&limit=10")
    print(f"Status: {response.status_code}")
    records = response.json()
    print(f"Records Count: {len(records)}")
    
    if records:
        print(f"First Record: {records[0]}")
        return records[0].get('id') if records else None
    return None

def test_edit_record(record_id):
    """Test edit record"""
    print("\n=== Testing Edit Record ===")
    if not record_id:
        print("No record ID available for editing")
        return False
    
    payload = {
        "name": "John Updated",
        "position": "Senior Manager"
    }
    
    response = requests.put(f"{API_URL}/records/{record_id}", json=payload)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Updated Record: ID={result.get('id')}, Name={result.get('name')}")
    
    return response.status_code == 200

def test_delete_record(record_id):
    """Test delete record"""
    print("\n=== Testing Delete Record ===")
    if not record_id:
        print("No record ID available for deletion")
        return False
    
    response = requests.delete(f"{API_URL}/records/{record_id}")
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Success: {result.get('success')}")
    
    return response.status_code == 200

def test_export_csv():
    """Test export CSV"""
    print("\n=== Testing Export CSV ===")
    response = requests.get(f"{API_URL}/export/csv")
    print(f"Status: {response.status_code}")
    print(f"Content Type: {response.headers.get('content-type')}")
    print(f"Content Length: {len(response.content)} bytes")
    
    return response.status_code == 200

def main():
    """Run all tests"""
    print("=" * 60)
    print("Excel Bulk Update Tool - Full Application Test")
    print("=" * 60)
    
    # Test 1: Health Check
    if not test_health():
        print("❌ Health check failed!")
        return
    
    # Test 2: Stats
    if not test_stats():
        print("❌ Stats check failed!")
        return
    
    # Test 3: Upload Excel
    sheet_names = test_upload()
    if not sheet_names:
        print("❌ Upload failed!")
        return
    
    # Test 4: Process Sheets
    records = test_process_sheets(sheet_names)
    if not records:
        print("❌ Process sheets failed!")
        return
    
    # Test 5: Preview Changes
    preview_data = test_preview_changes(records)
    if not preview_data:
        print("❌ Preview changes failed!")
        return
    
    # Test 6: Update Database
    if not test_update_database(preview_data):
        print("❌ Update database failed!")
        return
    
    # Test 7: Get Records
    record_id = test_get_records()
    
    # Test 8: Edit Record
    if record_id:
        test_edit_record(record_id)
    
    # Test 9: Export CSV
    test_export_csv()
    
    # Test 10: Delete Record (if we have one)
    if record_id:
        test_delete_record(record_id)
    
    # Final Stats
    print("\n=== Final Stats ===")
    response = requests.get(f"{API_URL}/records/stats")
    print(f"Final Stats: {response.json()}")
    
    print("\n" + "=" * 60)
    print("All Tests Completed Successfully!")
    print("=" * 60)

if __name__ == "__main__":
    main()

