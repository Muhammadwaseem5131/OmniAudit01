"""
test_dummy_app/db.py
INTENTIONALLY VULNERABLE — OmniAudit demo only.
Contains SQL injection via f-string on line 18 (HIGH severity).
"""
import sqlite3
conn = sqlite3.connect("users.db")

def get_user(user_id: int) -> dict:
    """
    HIGH: SQL Injection — f-string interpolation in SQL query.
    OmniAudit Auto-Fix: replace with parameterized query.
    """
    cursor = conn.cursor()
    # VULNERABLE LINE — Code Hunter + bandit will detect this
    cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
    row = cursor.fetchone()
    return {"id": row[0], "name": row[1]} if row else {}

    # SAFE VERSION (what Auto-Fix produces):
    # cursor.execute(
    # "SELECT * FROM users WHERE id = ?", (user_id,)
    # )
