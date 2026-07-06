import pytest
from fastapi.testclient import TestClient
from api.endpoints import app, calculate_score, get_grade

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "2.0.0"}

def test_scan_no_files():
    response = client.post("/api/scan", data={})
    assert response.status_code == 400
    assert "No files uploaded" in response.json()["error"]

def test_scan_with_vulnerabilities():
    test_code = \"\"\"
import os
import sqlite3

def get_db():
    password = "hardcoded_password_123"
    DEBUG = True
    cursor = db.cursor()
    cursor.execute(f"SELECT * FROM users WHERE id = '{user_id}'")
\"\"\"
    files = {
        "files": ("test_code.py", test_code.encode("utf-8"))
    }
    response = client.post("/api/scan", files=files)
    assert response.status_code == 200
    data = response.json()
    
    assert data["total"] > 0
    vuln_types = [v["type"] for v in data["vulnerabilities"]]
    assert "hardcoded_password" in vuln_types
    assert "debug_mode" in vuln_types
    assert "sql_injection" in vuln_types

def test_calculate_score():
    vulns = [
        {"severity": "CRITICAL"},
        {"severity": "HIGH"},
        {"severity": "MEDIUM"}
    ]
    score = calculate_score(vulns)
    # 100 - 15 - 10 - 5 = 70
    assert score == 70
    assert get_grade(score) == "C"

def test_calculate_score_zero_floor():
    vulns = [{"severity": "CRITICAL"}] * 10
    score = calculate_score(vulns)
    assert score == 0
    assert get_grade(score) == "F"

def test_validate_remediation_input():
    response = client.post("/api/remediate", json={
        "file": "../etc/passwd",
        "line": 1,
        "type": "test",
        "fix_code": "fix"
    })
    assert response.status_code == 422
    assert "traversal or absolute paths not allowed" in response.json()["message"]
