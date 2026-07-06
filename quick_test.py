import sys
sys.path.insert(0, '.')
from api.endpoints import run_python_scanner
import os

test_files = {}
for file in ['test_dummy_app/app.py', 'test_dummy_app/db.py']:
    if os.path.exists(file):
        with open(file, 'r') as f:
            test_files[file] = f.read()

vulnerabilities, score, grade = run_python_scanner(test_files)
print(f'✅ Vulnerabilities found: {len(vulnerabilities)}')
print(f'✅ Security Score: {score}/100')
print(f'✅ Grade: {grade}')
for vuln in vulnerabilities[:3]:
    severity = vuln.get('severity', 'UNKNOWN')
    desc = vuln.get('description', 'N/A')[:50]
    print(f'   - {severity}: {desc}...')
