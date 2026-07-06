"""
test_dummy_app/app.py
INTENTIONALLY VULNERABLE — OmniAudit demo only.
Contains a hardcoded AWS key on line 12 (CRITICAL severity).
DO NOT USE IN PRODUCTION.
"""
import os
import sys
# Add current directory to path to ensure relative imports work correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db import get_user

# VULNERABLE — OmniAudit Secret Hunter will flag this
aws_key = 'AKIAIOSFODNN7EXAMPLE'
aws_secret = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'

# SAFE VERSION (what Auto-Fix produces):
# aws_key = os.environ.get('AWS_KEY')
# aws_secret = os.environ.get('AWS_SECRET')

def get_user_data(user_id: int) -> dict:
    """Fetch user data. Calls vulnerable db.py."""
    return get_user(user_id)
