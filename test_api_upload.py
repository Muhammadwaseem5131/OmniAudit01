import requests
import os

# Create multipart form data with test files
files = []
for root, dirs, filenames in os.walk('test_dummy_app'):
    for filename in filenames:
        filepath = os.path.join(root, filename)
        with open(filepath, 'rb') as f:
            relative_path = os.path.relpath(filepath, '.')
            files.append(('files', (relative_path, f.read())))

# Send POST request to backend
try:
    response = requests.post('http://localhost:8000/api/scan', files=files)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
