import re
import os

PATTERNS = {
    'CRITICAL': [
        (r'AKIA[0-9A-Z]{16}', 'AWS Access Key ID'),
        (r'sk_live_[A-Za-z0-9]{24,}', 'Stripe Live API Key'),
        (r'github_pat_[A-Za-z0-9]{22,}', 'GitHub Personal Access Token'),
        (r'password\s*=\s*["\'][\w\d!@#$%^&*()_+=\-\[\]{};:\'",.<>?/`~\\|]{8,}["\']', 'Hardcoded Password'),
        (r'api[_-]?key\s*=\s*["\'][^"\']+["\']', 'Hardcoded API Key'),
    ],
    'HIGH': [
        (r'cursor\.execute\s*\(\s*f["\']', 'SQL Injection via f-string'),
        (r'subprocess\.(?:call|run|Popen)\s*\(\s*(?!\.split|\[)', 'Command Injection'),
        (r'pickle\.(?:load|loads)', 'Unsafe Pickle Deserialization'),
        (r'eval\s*\(', 'Unsafe eval() call'),
        (r'exec\s*\(', 'Unsafe exec() call'),
    ],
    'MEDIUM': [
        (r'DEBUG\s*=\s*True', 'Debug Mode Enabled'),
        (r'<script[^>]*>', 'Potential XSS'),
        (r'\.verify\s*=\s*False', 'SSL Verification Disabled'),
    ],
}

def scan_files(files_dict):
    vulnerabilities = []
    for filename, content in files_dict.items():
        lines = content.split('\n')
        for line_no, line in enumerate(lines, 1):
            for severity, patterns in PATTERNS.items():
                for pattern, desc in patterns:
                    if re.search(pattern, line, re.IGNORECASE):
                        vulnerabilities.append({
                            'file': filename,
                            'line': line_no,
                            'severity': severity,
                            'description': desc,
                            'code': line.strip()[:80]
                        })
    return vulnerabilities

test_files = {}
for file in ['test_dummy_app/app.py', 'test_dummy_app/db.py']:
    if os.path.exists(file):
        with open(file, 'r') as f:
            test_files[file] = f.read()

vulnerabilities = scan_files(test_files)
print(f'✅ Vulnerabilities found: {len(vulnerabilities)}')
print(f'\n📋 Details:')
for vuln in vulnerabilities[:5]:
    print(f'   File: {vuln["file"]}:{vuln["line"]}')
    print(f'   Severity: {vuln["severity"]}')
    print(f'   Issue: {vuln["description"]}')
    print(f'   Code: {vuln["code"]}...')
    print()
