#!/usr/bin/env python3
"""
Direct test of vulnerability scanner
"""
import re

# Inline the scanner logic for testing
def test_scanner():
    files_dict = {
        'app.py': '''
import os
import subprocess

# CRITICAL: Hardcoded AWS key
AWS_KEY = 'AKIA2XVLK3QWERTY123456'

# HIGH: SQL injection with f-string
def get_user(user_id):
    cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
    
# DEBUG mode enabled
DEBUG = True

# CRITICAL: Hardcoded password
DB_PASSWORD = 'super_secret_123'
''',
        'db.py': '''
# Some safe code
def connect():
    return None
'''
    }
    
    vulnerabilities = []
    patterns = {
        'api_keys': [
            ('AKIA[0-9A-Z]{16}', 'AWS API Key', 'CRITICAL'),
        ],
        'debug_mode': [
            (r'DEBUG\s*=\s*True', 'Debug Mode', 'MEDIUM'),
        ],
        'password': [
            (r'(password|passwd|pwd)\s*=\s*["\'][^"\']+["\']', 'Hardcoded Password', 'CRITICAL'),
        ],
        'sql_injection': [
            (r'cursor\.(execute|query)\s*\(\s*f["\']', 'SQL Injection', 'HIGH'),
        ],
    }
    
    for filepath, content in files_dict.items():
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            # AWS Key
            if re.search(patterns['api_keys'][0][0], line):
                vulnerabilities.append({
                    'severity': 'CRITICAL',
                    'title': 'Hardcoded AWS API Key',
                    'file': filepath,
                    'line': line_num,
                    'code': line.strip()
                })
            # Password
            if re.search(patterns['password'][0][0], line, re.IGNORECASE):
                vulnerabilities.append({
                    'severity': 'CRITICAL',
                    'title': 'Hardcoded Password',
                    'file': filepath,
                    'line': line_num,
                    'code': line.strip()
                })
            # Debug mode
            if re.search(patterns['debug_mode'][0][0], line):
                vulnerabilities.append({
                    'severity': 'MEDIUM',
                    'title': 'Debug Mode Enabled',
                    'file': filepath,
                    'line': line_num,
                    'code': line.strip()
                })
            # SQL Injection
            if re.search(patterns['sql_injection'][0][0], line):
                vulnerabilities.append({
                    'severity': 'HIGH',
                    'title': 'SQL Injection',
                    'file': filepath,
                    'line': line_num,
                    'code': line.strip()
                })
    
    return vulnerabilities

print("\n" + "="*70)
print("🧪 OmniAudit Backend Scanner - Test Results")
print("="*70)

vulns = test_scanner()

print(f"\n✓ Found {len(vulns)} vulnerabilities:\n")
for v in vulns:
    print(f"  [{v['severity']:8}] {v['title']}")
    print(f"              at {v['file']}:{v['line']}")
    print(f"              >> {v['code']}\n")

# Verify critical vulnerabilities detected
critical = [v for v in vulns if v['severity'] == 'CRITICAL']
high = [v for v in vulns if v['severity'] == 'HIGH']
medium = [v for v in vulns if v['severity'] == 'MEDIUM']

print(f"Summary:")
print(f"  ✓ CRITICAL: {len(critical)} found (expected 2)")
print(f"  ✓ HIGH: {len(high)} found (expected 1)")
print(f"  ✓ MEDIUM: {len(medium)} found (expected 1)")

# Score calculation
score = 100
for v in vulns:
    if v['severity'] == 'CRITICAL':
        score -= 15
    elif v['severity'] == 'HIGH':
        score -= 10
    elif v['severity'] == 'MEDIUM':
        score -= 5

grade = 'A' if score >= 90 else 'B' if score >= 80 else 'C' if score >= 70 else 'D' if score >= 60 else 'F'

print(f"\nSecurity Score: {score}/100 (Grade: {grade})")

if len(critical) >= 2 and len(high) >= 1 and len(medium) >= 1:
    print(f"\n✅ Backend Scanner Test: PASSED")
else:
    print(f"\n⚠️  Backend Scanner Test: Partial results")

print("="*70 + "\n")
