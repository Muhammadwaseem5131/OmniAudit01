"""
OmniAudit Backend & CLI — main.py
================================================================
Entrypoint for the CLI command and backend service.

- On startup, kicks off the ADK swarm audit in the background.
- Serves a loading page while scanning, then the generated dashboard.
- Exposes POST /api/remediate for Human-in-the-Loop auto-fix.
"""
import os
import re
import asyncio
import argparse
import logging
import traceback
from dataclasses import dataclass, field
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

# Load .env (GOOGLE_API_KEY, etc.)
load_dotenv()

logger = logging.getLogger("omniaudit")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_FILE_SIZE = 10 * 1024 * 1024   # 10 MB per file
MAX_TOTAL_SIZE = 100 * 1024 * 1024  # 100 MB total
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

SUPPORTED_EXTENSIONS = ['.py', '.js', '.ts', '.java', '.php', '.go', '.rb', '.env']


# ---------------------------------------------------------------------------
# Pydantic models for input validation (SEC-06)
# ---------------------------------------------------------------------------
class RemediationRequest(BaseModel):
    """Validated input for the /api/remediate endpoint."""
    file: str = Field(..., min_length=1, max_length=500, description="Relative file path")
    line: int = Field(..., ge=1, le=100000, description="1-indexed line number")
    type: str = Field(default="", max_length=100, description="Vulnerability type")
    severity: str = Field(default="", max_length=20, description="Severity level")
    snippet: str = Field(default="", max_length=2000, description="Vulnerable code snippet")
    fix_snippet: str = Field(default="", max_length=2000, description="Fix code snippet")
    fix_code: str = Field(default="", max_length=2000, description="Fix code (alt field)")

    @field_validator("file")
    @classmethod
    def validate_file_path(cls, v: str) -> str:
        """Reject directory traversal and absolute paths in file field."""
        if ".." in v or v.startswith(("/", "\\")):
            raise ValueError("Invalid file path: traversal or absolute paths not allowed")
        return v


# ---------------------------------------------------------------------------
# Application state (replaces bare globals — CODE-02)
# ---------------------------------------------------------------------------
@dataclass
class AppState:
    """Encapsulated application state instead of bare globals."""
    target_path: str = "."
    scan_status: str = "idle"   # idle | running | completed | failed
    error_message: str = ""

app_state = AppState()

# Ensure output directory exists before anything tries to write to it
os.makedirs("output", exist_ok=True)


# ---------------------------------------------------------------------------
# Grade calculation helper (unified — BUG-07: removed grade 'E')
# ---------------------------------------------------------------------------
def calculate_grade(score: int) -> str:
    """Unified grade calculation. No 'E' grade — consistent with frontend."""
    if score >= 90:
        return 'A'
    elif score >= 80:
        return 'B'
    elif score >= 70:
        return 'C'
    elif score >= 60:
        return 'D'
    else:
        return 'F'


def calculate_score(vulnerabilities: list) -> int:
    """Calculate security score from vulnerability list."""
    score = 100
    for v in vulnerabilities:
        severity = v.get('severity', 'LOW')
        if severity == 'CRITICAL':
            score -= 15
        elif severity == 'HIGH':
            score -= 10
        elif severity == 'MEDIUM':
            score -= 5
        else:
            score -= 2
    return max(0, score)


def run_python_scanner(files_dict: dict) -> list:
    """Run a lightweight security scan over uploaded files and return rich findings."""
    vulnerabilities = []

    patterns = {
        'api_keys': [
            (r'AKIA[0-9A-Z]{16}', 'AWS API Key', 'CRITICAL'),
            (r'sk-[a-zA-Z0-9]{20,}', 'Stripe API Key', 'CRITICAL'),
            (r'ghp_[a-zA-Z0-9]{36}', 'GitHub Token', 'CRITICAL'),
            (r'AIza[a-zA-Z0-9\\-_]{35}', 'Google API Key', 'CRITICAL'),
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
        'aws_key': {'title': 'Hardcoded AWS API Key Detected', 'why_dangerous': 'AWS keys grant access to cloud resources and can be abused for data theft or expensive resource usage.', 'fix_description': 'Move credentials to a runtime secret store or IAM role.', 'fix_code': 'AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")', 'cwe': 'CWE-798'},
        'stripe_key': {'title': 'Hardcoded Stripe API Key', 'why_dangerous': 'Leakage of payment credentials can enable fraudulent transactions or refund abuse.', 'fix_description': 'Load the key from platform secrets at runtime.', 'fix_code': 'STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")', 'cwe': 'CWE-798'},
        'github_token': {'title': 'Hardcoded GitHub Token', 'why_dangerous': 'GitHub tokens can be used to access repositories, workflows, and private code.', 'fix_description': 'Replace the token with access via a secure credential store.', 'fix_code': 'GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")', 'cwe': 'CWE-798'},
        'google_api_key': {'title': 'Hardcoded Google API Key', 'why_dangerous': 'API keys can be abused to exhaust quotas and access model services.', 'fix_description': 'Store the Gemini or Google key in environment variables.', 'fix_code': 'GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")', 'cwe': 'CWE-798'},
        'sql_injection': {'title': 'SQL Injection Vulnerability', 'why_dangerous': 'Unsanitized SQL input can expose or corrupt database records.', 'fix_description': 'Use parameterized queries and input validation.', 'fix_code': 'cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))', 'cwe': 'CWE-89'},
        'command_injection': {'title': 'Command Injection', 'why_dangerous': 'Untrusted input can trigger arbitrary shell commands on the server.', 'fix_description': 'Avoid shell execution and use safe subprocess arguments.', 'fix_code': 'subprocess.run(["ping", "-c", "1", host], shell=False)', 'cwe': 'CWE-78'},
        'debug_mode': {'title': 'Debug Mode Enabled', 'why_dangerous': 'Debug mode can leak stack traces and internal state in production.', 'fix_description': 'Disable debug mode in production environments.', 'fix_code': 'DEBUG = False', 'cwe': 'CWE-215'},
        'hardcoded_password': {'title': 'Hardcoded Password', 'why_dangerous': 'Hardcoded passwords can be reused across services and are easily exposed.', 'fix_description': 'Load credentials from a secrets manager or environment variable.', 'fix_code': 'DB_PASSWORD = os.environ.get("DB_PASSWORD")', 'cwe': 'CWE-798'},
        'exec_call': {'title': 'Arbitrary Code Execution', 'why_dangerous': 'Dynamic execution lets attackers run arbitrary code in the application runtime.', 'fix_description': 'Remove dynamic exec/eval usage and replace it with a strict allowlist.', 'fix_code': 'raise PermissionError("Dynamic code execution is not allowed")', 'cwe': 'CWE-95'},
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
                        'id': f"{filepath}:{line_num}:{v_type}",
                        'file': filepath,
                        'line': line_num,
                        'column': column,
                        'severity': severity,
                        'type': v_type,
                        'title': m['title'],
                        'description': f"{name} found hardcoded",
                        'vulnerable_code': line.strip(),
                        'why_dangerous': m['why_dangerous'],
                        'fix_description': m['fix_description'],
                        'fix_code': m['fix_code'],
                        'cwe': m['cwe'],
                        'learn_more_url': f"https://cwe.mitre.org/data/definitions/{m['cwe'].split('-')[1]}.html",
                    })

            for pattern, name, severity in patterns['sql_injection']:
                if re.search(pattern, line, re.IGNORECASE):
                    m = meta['sql_injection']
                    vulnerabilities.append({
                        'id': f"{filepath}:{line_num}:sql_injection",
                        'file': filepath,
                        'line': line_num,
                        'column': column,
                        'severity': severity,
                        'type': 'sql_injection',
                        'title': m['title'],
                        'description': f"{name} detected",
                        'vulnerable_code': line.strip(),
                        'why_dangerous': m['why_dangerous'],
                        'fix_description': m['fix_description'],
                        'fix_code': m['fix_code'],
                        'cwe': m['cwe'],
                        'learn_more_url': f"https://cwe.mitre.org/data/definitions/{m['cwe'].split('-')[1]}.html",
                    })

            for pattern, name, severity in patterns['command_injection']:
                if re.search(pattern, line, re.IGNORECASE):
                    m = meta['command_injection']
                    vulnerabilities.append({
                        'id': f"{filepath}:{line_num}:command_injection",
                        'file': filepath,
                        'line': line_num,
                        'column': column,
                        'severity': severity,
                        'type': 'command_injection',
                        'title': m['title'],
                        'description': f"{name} detected",
                        'vulnerable_code': line.strip(),
                        'why_dangerous': m['why_dangerous'],
                        'fix_description': m['fix_description'],
                        'fix_code': m['fix_code'],
                        'cwe': m['cwe'],
                        'learn_more_url': f"https://cwe.mitre.org/data/definitions/{m['cwe'].split('-')[1]}.html",
                    })

            if re.search(r'DEBUG\s*=\s*True|debug\s*:\s*true', line, re.IGNORECASE):
                m = meta['debug_mode']
                vulnerabilities.append({
                    'id': f"{filepath}:{line_num}:debug_mode",
                    'file': filepath,
                    'line': line_num,
                    'column': column,
                    'severity': 'MEDIUM',
                    'type': 'debug_mode',
                    'title': m['title'],
                    'description': 'Debug mode is enabled',
                    'vulnerable_code': line.strip(),
                    'why_dangerous': m['why_dangerous'],
                    'fix_description': m['fix_description'],
                    'fix_code': m['fix_code'],
                    'cwe': m['cwe'],
                    'learn_more_url': f"https://cwe.mitre.org/data/definitions/{m['cwe'].split('-')[1]}.html",
                })

            if re.search(r'(password|passwd|pwd)\s*=\s*["\'][^"\']+["\']', line, re.IGNORECASE):
                if not re.search(r'os\.environ|config\.|settings\.', line):
                    m = meta['hardcoded_password']
                    vulnerabilities.append({
                        'id': f"{filepath}:{line_num}:hardcoded_password",
                        'file': filepath,
                        'line': line_num,
                        'column': column,
                        'severity': 'CRITICAL',
                        'type': 'hardcoded_password',
                        'title': m['title'],
                        'description': 'Password hardcoded',
                        'vulnerable_code': line.strip(),
                        'why_dangerous': m['why_dangerous'],
                        'fix_description': m['fix_description'],
                        'fix_code': m['fix_code'],
                        'cwe': m['cwe'],
                        'learn_more_url': f"https://cwe.mitre.org/data/definitions/{m['cwe'].split('-')[1]}.html",
                    })

            if re.search(r'\b(eval|exec)\s*\(', line, re.IGNORECASE):
                m = meta['exec_call']
                vulnerabilities.append({
                    'id': f"{filepath}:{line_num}:exec_call",
                    'file': filepath,
                    'line': line_num,
                    'column': column,
                    'severity': 'CRITICAL',
                    'type': 'exec_call',
                    'title': m['title'],
                    'description': 'Dynamic code execution detected',
                    'vulnerable_code': line.strip(),
                    'why_dangerous': m['why_dangerous'],
                    'fix_description': m['fix_description'],
                    'fix_code': m['fix_code'],
                    'cwe': m['cwe'],
                    'learn_more_url': f"https://cwe.mitre.org/data/definitions/{m['cwe'].split('-')[1]}.html",
                })

    return vulnerabilities


def agent_swarm_enabled() -> bool:
    """Return True when an AI key is configured for the agent swarm."""
    return bool(os.getenv("GOOGLE_API_KEY"))


# ---------------------------------------------------------------------------
# Lifespan (replaces deprecated @app.on_event)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the background swarm scan when the server boots."""
    if agent_swarm_enabled():
        app_state.scan_status = "running"
        logger.info(f"Starting swarm audit → {os.path.abspath(app_state.target_path)}")
        print(f"[OmniAudit] Starting swarm audit → {os.path.abspath(app_state.target_path)}")

        async def _scan():
            try:
                from agents.swarm import run_scan_workflow
                await run_scan_workflow(app_state.target_path)
                app_state.scan_status = "completed"
                print("[OmniAudit] ✓ Audit complete. Dashboard → output/index.html")
            except Exception as exc:
                app_state.scan_status = "failed"
                app_state.error_message = str(exc)
                traceback.print_exc()
                print(f"[OmniAudit] ✗ Audit failed: {exc}")

        asyncio.create_task(_scan())
    else:
        app_state.scan_status = "completed"
        app_state.error_message = "Demo mode: no Gemini API key configured. Agent swarm is disabled."
        logger.info("Gemini API key not found; running in demo mode without agent swarm.")
        print("[OmniAudit] Gemini API key not found; running in demo mode without agent swarm.")

    yield  # server is running
    # shutdown — nothing to clean up


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
fastapi_app = FastAPI(
    title="OmniAudit Backend API",
    version="2.0.0",
    lifespan=lifespan,
)

# SEC-03: Restrict CORS to known origins (not wildcard)
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Serve generated dashboard assets
fastapi_app.mount("/output", StaticFiles(directory="output"), name="output")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@fastapi_app.get("/")
def serve_dashboard():
    """Serve the dashboard, or a loading page while the scan runs."""
    index_path = os.path.join("output", "index.html")
    if app_state.scan_status == "completed" and os.path.isfile(index_path):
        return FileResponse(os.path.abspath(index_path))

    # Premium dark-mode loading / status page
    if app_state.scan_status == "running":
        status_dot = '<span class="h-2 w-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></span>Scanning Codebase'
        detail = f"Auditing <code class='bg-gray-800 text-gray-200 px-1.5 py-0.5 rounded'>{app_state.target_path}</code>"
        sub = "Mapping repo, scanning credentials, running bandit…"
        refresh = '<meta http-equiv="refresh" content="3">'
    elif app_state.scan_status == "failed":
        status_dot = '<span class="h-2 w-2 rounded-full bg-red-500 mr-2"></span>Failed'
        detail = f"<span class='text-red-400'>{app_state.error_message}</span>"
        sub = ""
        refresh = ""
    elif app_state.scan_status == "completed":
        status_dot = '<span class="h-2 w-2 rounded-full bg-green-500 mr-2"></span>Demo Mode'
        detail = f"<span class='text-green-300'>Demo mode active. Upload files to /api/scan for a local security scan.</span>"
        sub = f"{app_state.error_message}"
        refresh = ""
    else:
        status_dot = '<span class="h-2 w-2 rounded-full bg-gray-500 mr-2"></span>Idle'
        detail = ""
        sub = ""
        refresh = ""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>OmniAudit Status</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    body {{ font-family:'Inter',sans-serif; background:#0d0f14; }}
    .glass {{ background:rgba(255,255,255,.03); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,.05); }}
  </style>
  {refresh}
</head>
<body class="text-gray-100 flex items-center justify-center min-h-screen p-6">
  <div class="glass max-w-lg w-full p-8 rounded-2xl shadow-2xl text-center space-y-6">
    <div class="flex justify-center">
      <div class="h-16 w-16 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin flex items-center justify-center">
        <span class="text-blue-400 font-bold text-xs">OA</span>
      </div>
    </div>
    <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
      OmniAudit Autonomous Swarm
    </h1>
    <div class="space-y-2">
      <p class="text-sm text-gray-400">Current Status</p>
      <div class="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider glass">
        {status_dot}
      </div>
    </div>
    <p class="text-gray-400 text-sm">{detail}</p>
    <p class="text-xs text-gray-500 italic">{sub}</p>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html)


@fastapi_app.post("/api/scan")
async def scan_project(request: Request):
    """
    API endpoint for scanning uploaded project files.
    Receives multipart files and runs security scanner.
    SEC-04: Enforces per-file and total upload size limits.
    CODE-01: Catches specific exceptions instead of bare except.
    """
    form = await request.form()
    files = form.getlist("files")

    if not files:
        return JSONResponse({"error": "No files uploaded"}, status_code=400)

    files_dict = {}
    total_size = 0

    # Read all uploaded files with size limits (SEC-04)
    for file in files:
        content = await file.read()
        file_size = len(content)

        # Per-file size check
        if file_size > MAX_FILE_SIZE:
            return JSONResponse(
                {"error": f"File '{file.filename}' exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"},
                status_code=413,
            )

        total_size += file_size
        if total_size > MAX_TOTAL_SIZE:
            return JSONResponse(
                {"error": f"Total upload exceeds {MAX_TOTAL_SIZE // (1024*1024)}MB limit"},
                status_code=413,
            )

        filepath = file.filename

        # Support only certain file types
        if any(filepath.endswith(ext) for ext in SUPPORTED_EXTENSIONS):
            try:
                files_dict[filepath] = content.decode('utf-8', errors='replace')
            except (UnicodeDecodeError, AttributeError) as exc:
                logger.warning(f"Could not decode {filepath}: {exc}")

    vulnerabilities = run_python_scanner(files_dict)
    score = calculate_score(vulnerabilities)
    grade = calculate_grade(score)

    return JSONResponse({
        "vulnerabilities": vulnerabilities,
        "total": len(vulnerabilities),
        "score": score,
        "grade": grade
    })


@fastapi_app.post("/api/remediate")
async def remediate(request: Request):
    """
    Human-in-the-Loop Auto-Fix endpoint.
    SEC-06: Validates input using Pydantic model before processing.
    """
    try:
        raw = await request.json()
        vuln = RemediationRequest(**raw)
    except Exception as exc:
        return JSONResponse(
            {"status": "error", "message": f"Invalid input: {exc}"},
            status_code=422,
        )

    logger.info(f"Remediation request → {vuln.file}:{vuln.line}")
    print(f"[OmniAudit] Remediation request → {vuln.file}:{vuln.line}")

    try:
        from agents.swarm import run_remediation_workflow
        remediation_payload = vuln.model_dump()
        remediation_payload["fix_snippet"] = remediation_payload.get("fix_snippet") or remediation_payload.get("fix_code") or "# AI generated fix"
        await run_remediation_workflow(app_state.target_path, remediation_payload)
        return JSONResponse(
            {"status": "success", "message": f"Patched {vuln.file} line {vuln.line}"}
        )
    except Exception as exc:
        traceback.print_exc()
        return JSONResponse(
            {"status": "error", "message": str(exc)}, status_code=500
        )


@fastapi_app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok", "version": "2.0.0"}


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="OmniAudit — Autonomous DevSecOps Swarm & Dashboard"
    )
    parser.add_argument("--path", default=".", help="Directory to audit")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    args = parser.parse_args()

    app_state.target_path = args.path

    print(f"[OmniAudit] Target  → {os.path.abspath(app_state.target_path)}")
    print(f"[OmniAudit] Server  → http://127.0.0.1:{args.port}/")
    uvicorn.run(fastapi_app, host="127.0.0.1", port=args.port, log_level="info")


if __name__ == "__main__":
    main()
