"""
OmniAudit 2.0 Backend — Updated API endpoints for React frontend
"""
import os
import re
import traceback
import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("omniaudit.api")

app = FastAPI(
    title="OmniAudit 2.0 Backend",
    version="2.0.0",
)

# ---------------------------------------------------------------------------
# Constants & Config
# ---------------------------------------------------------------------------
MAX_FILE_SIZE = 10 * 1024 * 1024   # 10 MB per file
MAX_TOTAL_SIZE = 100 * 1024 * 1024  # 100 MB total
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
SUPPORTED_EXTENSIONS = ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.php', '.go', '.rb', '.env']
TARGET_PATH = "."

# SEC-03: Enable CORS for frontend securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# BUG-01: Mount static directory conditionally
build_dir = Path("frontend/dist")
static_dir = build_dir / "assets"
if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(static_dir)), name="assets")

# ARCH-03: Removed unused uploads directory creation

# ---------------------------------------------------------------------------
# Pydantic Models (SEC-06)
# ---------------------------------------------------------------------------
class RemediationRequest(BaseModel):
    file: str = Field(..., min_length=1, max_length=500)
    line: int = Field(..., ge=1)
    fix_code: str = Field(default="", max_length=2000)
    type: str = Field(default="", max_length=100)
    severity: str = Field(default="", max_length=20)

    @field_validator("file")
    @classmethod
    def validate_file_path(cls, v: str) -> str:
        if ".." in v or v.startswith(("/", "\\")):
            raise ValueError("Invalid file path: traversal or absolute paths not allowed")
        return v

# ---------------------------------------------------------------------------
# Helper Functions (BUG-07: Unified grade)
# ---------------------------------------------------------------------------
def get_grade(score: int) -> str:
    if score >= 90: return 'A'
    if score >= 80: return 'B'
    if score >= 70: return 'C'
    if score >= 60: return 'D'
    return 'F'

def calculate_score(vulnerabilities: list) -> int:
    score = 100
    for v in vulnerabilities:
        sev = v.get('severity', 'LOW')
        if sev == 'CRITICAL': score -= 15
        elif sev == 'HIGH': score -= 10
        elif sev == 'MEDIUM': score -= 5
        else: score -= 2
    return max(0, score)

def run_python_scanner(files_dict: dict) -> list:
    """Run the Python security scanner on uploaded files."""
    vulnerabilities = []
    
    patterns = {
        'api_keys': [
            ('AKIA[0-9A-Z]{16}', 'AWS API Key', 'CRITICAL'),
            ('sk-[a-zA-Z0-9]{20,}', 'Stripe API Key', 'CRITICAL'),
            ('ghp_[a-zA-Z0-9]{36}', 'GitHub Token', 'CRITICAL'),
            ('AIza[a-zA-Z0-9\\-_]{35}', 'Google API Key', 'CRITICAL'),
        ],
        'sql_injection': [
            (r'cursor\.(execute|query)\s*\(\s*f["\']', 'SQL Injection', 'HIGH'),
            (r'\.execute\s*\(\s*f["\'].*WHERE', 'SQL Injection', 'HIGH'),
        ],
        'command_injection': [
            (r'os\.(system|popen)\s*\(\s*user_input', 'Command Injection', 'HIGH'),
            (r'subprocess\..*shell\s*=\s*True', 'Command Injection', 'HIGH'),
        ],
    }

    meta = {
        'aws_key': {'title': 'Hardcoded AWS API Key Detected', 'why_dangerous': '...', 'fix_description': '...', 'fix_code': '...', 'cwe': 'CWE-798'},
        'stripe_key': {'title': 'Hardcoded Stripe API Key', 'why_dangerous': '...', 'fix_description': '...', 'fix_code': '...', 'cwe': 'CWE-798'},
        'github_token': {'title': 'Hardcoded GitHub Token', 'why_dangerous': '...', 'fix_description': '...', 'fix_code': '...', 'cwe': 'CWE-798'},
        'google_api_key': {'title': 'Hardcoded Google API Key', 'why_dangerous': '...', 'fix_description': '...', 'fix_code': '...', 'cwe': 'CWE-798'},
        'sql_injection': {'title': 'SQL Injection Vulnerability', 'why_dangerous': '...', 'fix_description': '...', 'fix_code': '...', 'cwe': 'CWE-89'},
        'command_injection': {'title': 'Command Injection', 'why_dangerous': '...', 'fix_description': '...', 'fix_code': '...', 'cwe': 'CWE-78'},
        'debug_mode': {'title': 'Debug Mode Enabled', 'why_dangerous': '...', 'fix_description': '...', 'fix_code': '...', 'cwe': 'CWE-215'},
        'hardcoded_password': {'title': 'Hardcoded Password', 'why_dangerous': '...', 'fix_description': '...', 'fix_code': '...', 'cwe': 'CWE-798'}
    }
    
    for filepath, content in files_dict.items():
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            column = len(line) - len(line.lstrip())
            
            for pattern, name, severity in patterns['api_keys']:
                if re.search(pattern, line):
                    v_type = 'aws_key' if 'aws' in name.lower() else 'stripe_key' if 'stripe' in name.lower() else 'google_api_key' if 'google' in name.lower() else 'github_token'
                    m = meta.get(v_type, meta['aws_key'])
                    vulnerabilities.append({
                        'id': f"{filepath}:{line_num}:{v_type}", 'file': filepath, 'line': line_num, 'column': column,
                        'severity': severity, 'type': v_type, 'title': m['title'], 'description': f"{name} found hardcoded",
                        'vulnerable_code': line.strip(), 'why_dangerous': m['why_dangerous'], 'fix_description': m['fix_description'],
                        'fix_code': m['fix_code'], 'cve_reference': m['cwe'], 'learn_more_url': f"https://cwe.mitre.org/data/definitions/{m['cwe'].split('-')[1]}.html"
                    })

            for pattern, name, severity in patterns['sql_injection']:
                if re.search(pattern, line, re.IGNORECASE):
                    m = meta['sql_injection']
                    vulnerabilities.append({
                        'id': f"{filepath}:{line_num}:sql_injection", 'file': filepath, 'line': line_num, 'column': column,
                        'severity': severity, 'type': 'sql_injection', 'title': m['title'], 'description': f"{name} detected",
                        'vulnerable_code': line.strip(), 'why_dangerous': m['why_dangerous'], 'fix_description': m['fix_description'],
                        'fix_code': m['fix_code'], 'cve_reference': m['cwe'], 'learn_more_url': f"https://cwe.mitre.org/data/definitions/{m['cwe'].split('-')[1]}.html"
                    })

            for pattern, name, severity in patterns['command_injection']:
                if re.search(pattern, line, re.IGNORECASE):
                    m = meta['command_injection']
                    vulnerabilities.append({
                        'id': f"{filepath}:{line_num}:command_injection", 'file': filepath, 'line': line_num, 'column': column,
                        'severity': severity, 'type': 'command_injection', 'title': m['title'], 'description': f"{name} detected",
                        'vulnerable_code': line.strip(), 'why_dangerous': m['why_dangerous'], 'fix_description': m['fix_description'],
                        'fix_code': m['fix_code'], 'cve_reference': m['cwe'], 'learn_more_url': f"https://cwe.mitre.org/data/definitions/{m['cwe'].split('-')[1]}.html"
                    })

            if re.search(r'DEBUG\s*=\s*True|debug\s*:\s*true', line, re.IGNORECASE):
                m = meta['debug_mode']
                vulnerabilities.append({
                    'id': f"{filepath}:{line_num}:debug_mode", 'file': filepath, 'line': line_num, 'column': column,
                    'severity': 'MEDIUM', 'type': 'debug_mode', 'title': m['title'], 'description': "Debug mode is enabled",
                    'vulnerable_code': line.strip(), 'why_dangerous': m['why_dangerous'], 'fix_description': m['fix_description'],
                    'fix_code': m['fix_code'], 'cve_reference': m['cwe'], 'learn_more_url': f"https://cwe.mitre.org/data/definitions/{m['cwe'].split('-')[1]}.html"
                })

            if re.search(r'(password|passwd|pwd)\s*=\s*["\'][^"\']+["\']', line, re.IGNORECASE):
                if not re.search(r'os\.environ|config\.|settings\.', line):
                    m = meta['hardcoded_password']
                    vulnerabilities.append({
                        'id': f"{filepath}:{line_num}:hardcoded_password", 'file': filepath, 'line': line_num, 'column': column,
                        'severity': 'CRITICAL', 'type': 'hardcoded_password', 'title': m['title'], 'description': "Password hardcoded",
                        'vulnerable_code': line.strip(), 'why_dangerous': m['why_dangerous'], 'fix_description': m['fix_description'],
                        'fix_code': m['fix_code'], 'cve_reference': m['cwe'], 'learn_more_url': f"https://cwe.mitre.org/data/definitions/{m['cwe'].split('-')[1]}.html"
                    })

    return vulnerabilities


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------
@app.post("/api/scan")
async def scan_project(request: Request):
    """Scan project files (with SEC-04 size limits, CODE-01 except fixes)."""
    form = await request.form()
    files = form.getlist("files")
    
    if not files:
        return JSONResponse({"error": "No files uploaded"}, status_code=400)

    files_dict = {}
    total_size = 0
    
    for file in files:
        content = await file.read()
        file_size = len(content)
        
        if file_size > MAX_FILE_SIZE:
            return JSONResponse({"error": f"File '{file.filename}' exceeds {MAX_FILE_SIZE // (1024*1024)}MB"}, status_code=413)
            
        total_size += file_size
        if total_size > MAX_TOTAL_SIZE:
            return JSONResponse({"error": f"Total upload exceeds {MAX_TOTAL_SIZE // (1024*1024)}MB"}, status_code=413)

        filepath = file.filename
        
        if any(filepath.endswith(ext) for ext in SUPPORTED_EXTENSIONS):
            try:
                files_dict[filepath] = content.decode('utf-8', errors='replace')
            except (UnicodeDecodeError, AttributeError) as exc:
                logger.warning(f"Could not decode {filepath}: {exc}")

    vulnerabilities = run_python_scanner(files_dict)
    score = calculate_score(vulnerabilities)

    return JSONResponse({
        "vulnerabilities": vulnerabilities,
        "total": len(vulnerabilities),
        "score": score,
        "grade": get_grade(score)
    })

@app.post("/api/remediate")
async def apply_remediation(request: Request):
    """Human-in-the-Loop Auto-Fix endpoint. BUG-03: Real implementation."""
    try:
        raw = await request.json()
        vuln = RemediationRequest(**raw)
    except Exception as exc:
        return JSONResponse({"status": "error", "message": f"Invalid input: {exc}"}, status_code=422)

    try:
        # Pass to the ADK remediation workflow
        # Note: In a real environment, we'd also pass `vuln.fix_code` if provided by the frontend editor
        from agents.swarm import run_remediation_workflow
        
        # Format the dict expected by run_remediation_workflow
        vuln_dict = {
            "file": vuln.file,
            "line": vuln.line,
            "type": vuln.type,
            "fix_snippet": vuln.fix_code if vuln.fix_code else "# AI generated fix"
        }
        
        await run_remediation_workflow(TARGET_PATH, vuln_dict)
        return JSONResponse({
            "status": "success",
            "message": f"Applied fix to {vuln.file}:{vuln.line}"
        })
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}

@app.get("/")
def root():
    index_file = build_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return JSONResponse({"error": "Frontend build not found. Run: cd frontend && npm run build"}, status_code=404)

# SPA Catch-all: serve index.html for all unknown routes (React Router support)
@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    """Serve index.html for all non-API routes so React Router handles them."""
    # Only serve SPA fallback for non-API, non-assets paths
    if full_path.startswith("api/") or full_path.startswith("assets/"):
        from fastapi import Response
        return Response(status_code=404)
    index_file = build_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return JSONResponse({"error": "Frontend not built"}, status_code=404)

if __name__ == "__main__":
    import uvicorn
    # SEC-07: Bind to localhost instead of 0.0.0.0 by default
    uvicorn.run(app, host="127.0.0.1", port=8000)
