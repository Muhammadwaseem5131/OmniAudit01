# Security Policy

## Reporting Security Issues

If you discover a security vulnerability in OmniAudit, please email the maintainer privately rather than opening a public issue.

**Do not** create a public GitHub issue for security vulnerabilities.

### How to Report

1. Email: [your-email@example.com]
2. Subject: `[SECURITY] OmniAudit Vulnerability`
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

We will respond within 48 hours and work with you to resolve the issue before public disclosure.

## Supported Versions

| Version | Supported          |
|---------|-------------------|
| 2.0.x   | ✅ Actively maintained |
| 1.x     | ❌ No longer supported |

## Security Best Practices

When using OmniAudit:

- Never commit `.env` files with real API keys
- Use environment variables for all sensitive data
- Run scans on code before it goes to production
- Review all suggested fixes before applying them
- Keep dependencies up to date

## Dependencies

OmniAudit uses:
- FastAPI
- React
- Google ADK
- MCP

All dependencies are from official, maintained sources.
