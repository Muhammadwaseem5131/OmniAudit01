import requests
import json

# Create test vulnerable file
test_code = """
aws_key = 'AKIAIOSFODNN7EXAMPLE'
password = 'hardcoded_secret'
"""

files = {'files': ('test.py', test_code)}
resp = requests.post('http://localhost:8000/api/scan', files=files)
data = resp.json()
print(f"✅ SCAN TEST:")
print(f"  Status: {resp.status_code}")
print(f"  Vulnerabilities found: {len(data.get('vulnerabilities', []))}")
if data.get('vulnerabilities'):
    for v in data['vulnerabilities'][:3]:
        print(f"  - {v.get('title', 'Unknown')} (line {v.get('line')}, severity: {v.get('severity')})")
