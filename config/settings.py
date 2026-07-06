"""
OmniAudit Configuration — config/settings.py
==============================================
Centralised settings loaded from environment variables.
All values are read from .env (see .env.example for setup).
"""
import os
from dotenv import load_dotenv

load_dotenv()


# ---- Core AI ----
GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

# ---- Security Intelligence APIs ----
VIRUSTOTAL_API_KEY: str = os.getenv("VIRUSTOTAL_API_KEY", "")
ABUSEIPDB_API_KEY: str  = os.getenv("ABUSEIPDB_API_KEY", "")
NVD_API_KEY: str        = os.getenv("NVD_API_KEY", "")

# ---- Wazuh SIEM ----
WAZUH_API_URL:  str = os.getenv("WAZUH_API_URL", "http://localhost:55000")
WAZUH_API_USER: str = os.getenv("WAZUH_API_USER", "")
WAZUH_API_PASS: str = os.getenv("WAZUH_API_PASS", "")

# ---- Server ----
BACKEND_URL:    str = os.getenv("BACKEND_URL", "http://localhost:8000")
FRONTEND_PORT:  int = int(os.getenv("FRONTEND_PORT", "3000"))

# ---- Scan Limits ----
MAX_FILE_SIZE:  int = 10 * 1024 * 1024    # 10 MB per file
MAX_TOTAL_SIZE: int = 100 * 1024 * 1024   # 100 MB total upload
SUPPORTED_EXTENSIONS: list[str] = [
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".php", ".go", ".rb", ".env"
]

ALLOWED_ORIGINS: list[str] = [
    f"http://localhost:{FRONTEND_PORT}",
    f"http://127.0.0.1:{FRONTEND_PORT}",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
