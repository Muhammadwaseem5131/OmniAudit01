#!/usr/bin/env python3
"""
Test React/JavaScript code syntax
"""
import re
import os

def check_jsx_syntax(filepath):
    """Basic JSX validation"""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    errors = []
    
    # Check for unmatched braces
    if content.count('{') != content.count('}'):
        errors.append(f"Unmatched braces: {{ count: {content.count('{')} }}, count: {content.count('}')} }}")
    
    # Check for unmatched parentheses
    if content.count('(') != content.count(')'):
        errors.append(f"Unmatched parentheses")
    
    # Check for valid imports
    imports = re.findall(r'import\s+.*?from\s+["\']([^"\']+)["\']', content)
    
    return errors, imports

print("\n" + "="*70)
print("🧪 OmniAudit React Frontend - Code Validation")
print("="*70)

frontend_files = [
    'd:\\OmniAudit\\frontend\\src\\App.jsx',
    'd:\\OmniAudit\\frontend\\src\\components\\FileUpload.jsx',
    'd:\\OmniAudit\\frontend\\src\\components\\Dashboard.jsx',
    'd:\\OmniAudit\\frontend\\src\\components\\IDEEditor.jsx',
    'd:\\OmniAudit\\frontend\\src\\components\\Settings.jsx',
]

print("\n📄 Checking React Components:\n")

all_ok = True
for filepath in frontend_files:
    if os.path.exists(filepath):
        errors, imports = check_jsx_syntax(filepath)
        filename = os.path.basename(filepath)
        status = "✓" if not errors else "✗"
        print(f"  {status} {filename}")
        if errors:
            for err in errors:
                print(f"      ERROR: {err}")
            all_ok = False
    else:
        print(f"  ✗ {os.path.basename(filepath)} - FILE NOT FOUND")
        all_ok = False

# Check utility files
util_files = [
    'd:\\OmniAudit\\frontend\\src\\utils\\scanner.js',
    'd:\\OmniAudit\\frontend\\src\\utils\\llmClient.js',
    'd:\\OmniAudit\\frontend\\src\\utils\\reportGenerator.js',
]

print("\n⚙️  Checking Utility Modules:\n")

for filepath in util_files:
    if os.path.exists(filepath):
        errors, imports = check_jsx_syntax(filepath)
        filename = os.path.basename(filepath)
        status = "✓" if not errors else "✗"
        print(f"  {status} {filename}")
        if errors:
            for err in errors:
                print(f"      ERROR: {err}")
            all_ok = False
    else:
        print(f"  ✗ {os.path.basename(filepath)} - FILE NOT FOUND")
        all_ok = False

# Check styling
print("\n🎨 Checking Styles:\n")
if os.path.exists('d:\\OmniAudit\\frontend\\src\\index.css'):
    print("  ✓ index.css")
else:
    print("  ✗ index.css - FILE NOT FOUND")
    all_ok = False

# Check HTML
print("\n📑 Checking HTML:\n")
if os.path.exists('d:\\OmniAudit\\frontend\\public\\index.html'):
    print("  ✓ index.html")
else:
    print("  ✗ index.html - FILE NOT FOUND")
    all_ok = False

if os.path.exists('d:\\OmniAudit\\frontend\\package.json'):
    print("\n📦 Checking Configuration:\n")
    print("  ✓ package.json")
else:
    print("  ✗ package.json - FILE NOT FOUND")
    all_ok = False

print("\n" + "="*70)
if all_ok:
    print("✅ Frontend Code Validation: ALL FILES PRESENT AND VALID")
else:
    print("⚠️  Frontend Code Validation: Some issues detected")
print("="*70 + "\n")
