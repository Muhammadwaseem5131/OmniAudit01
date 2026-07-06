"""
OmniAudit MCP Security Sandbox — mcp_server/filesystem_server.py
================================================================
Implements the Air-Gapped MCP boundary. The LLM is PHYSICALLY
INCAPABLE of reading .env or system files because validate_path()
blocks all such requests at the Python level before any I/O occurs.
All 5 tools here are the ONLY way ADK agents touch the filesystem.
"""
import os
import sys
import json
import subprocess
from pathlib import Path

# Import the MCP server class — handle both old and new package layouts
try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    from mcp.server import MCPServer as FastMCP  # renamed in newer versions

mcp = FastMCP("omniaudit-filesystem")
BASE_DIR = Path(os.environ.get("AUDIT_TARGET", ".")).resolve()


def validate_path(requested_path: str) -> Path:
    """
    Security sandbox: validates EVERY path before any file operation.
    Called by all 5 MCP tools. No exceptions. No bypass.

    Rules enforced (in order):
    0. Block UNC paths and absolute paths
    1. No directory traversal: blocks paths containing ".."
    2. No hidden files: blocks any segment starting with "."
       (covers .env, .git, .aws, .ssh, and all hidden configs)
    3. No sensitive keywords: blocks "credential","secret","password"
    4. Boundary check: resolved path must be within BASE_DIR (using is_relative_to)

    Raises PermissionError on any violation — LLM sees only the
    error message, never the file contents.
    """
    # Rule 0: Block UNC paths and absolute paths
    if requested_path.startswith(("\\\\", "//")) or os.path.isabs(requested_path):
        raise PermissionError(
            f"SECURITY VIOLATION: Absolute/UNC path blocked: {requested_path}"
        )
    # Rule 1: Block directory traversal
    if ".." in requested_path:
        raise PermissionError(
            f"SECURITY VIOLATION: Directory traversal blocked: {requested_path}"
        )
    # Rule 2: Block hidden files/dirs
    for part in Path(requested_path).parts:
        if part.startswith(".") and part != ".":
            raise PermissionError(
                f"SECURITY VIOLATION: Hidden file blocked: {part}"
            )
    # Rule 3: Block sensitive keywords
    for kw in ["credential", "secret", "password"]:
        if kw in requested_path.lower():
            raise PermissionError(
                f"SECURITY VIOLATION: Sensitive keyword in path: {kw}"
            )
    # Rule 4: Enforce BASE_DIR boundary using is_relative_to (Python 3.9+)
    resolved = (BASE_DIR / requested_path).resolve()
    try:
        if not resolved.is_relative_to(BASE_DIR):
            raise PermissionError("SECURITY VIOLATION: Path escapes audit boundary")
    except AttributeError:
        # Fallback for Python < 3.9: use os.path with trailing separator
        base_str = str(BASE_DIR) + os.sep
        if not (str(resolved) + os.sep).startswith(base_str) and resolved != BASE_DIR:
            raise PermissionError("SECURITY VIOLATION: Path escapes audit boundary")
    return resolved


@mcp.tool()
def list_dir(path: str) -> str:
    """Lists directory contents safely via validate_path().
    Used exclusively by the Cartographer agent to map the repo.
    Returns JSON with file names, types, and sizes.

    Args:
        path: Relative path within the audit target directory to list.
    """
    safe_path = validate_path(path)
    entries = []
    for item in sorted(safe_path.iterdir()):
        entries.append({
            "name": item.name,
            "type": "dir" if item.is_dir() else "file",
            "size": item.stat().st_size if item.is_file() else None,
        })
    return json.dumps({"path": path, "entries": entries}, indent=2)


@mcp.tool()
def read_file(path: str) -> str:
    """Reads file content safely. Used by the Secret Hunter agent
    to scan for hardcoded credentials. validate_path() ensures
    .env and hidden files are NEVER readable by the LLM.

    Args:
        path: Relative path within the audit target directory to the file.
    """
    safe_path = validate_path(path)
    if not safe_path.is_file():
        return f"ERROR: {path} is not a file."
    return safe_path.read_text(encoding="utf-8", errors="replace")


@mcp.tool()
def run_linter(tool_name: str, path: str) -> str:
    """Executes a security linter on the target path.
    WHITELIST: only 'bandit' is permitted — no arbitrary commands.
    Used by the Code Hunter to detect SQL injection, XSS, etc.

    Args:
        tool_name: The linter to use. Only 'bandit' is whitelisted.
        path: Relative path within the audit target directory to scan.
    """
    safe_path = validate_path(path)
    allowed = {"bandit": ["bandit", "-r", "-f", "json", str(safe_path)]}
    if tool_name not in allowed:
        return f"ERROR: Tool {tool_name} is not whitelisted."
    try:
        result = subprocess.run(
            allowed[tool_name], capture_output=True, text=True, timeout=60
        )
        return result.stdout or result.stderr
    except FileNotFoundError:
        return "ERROR: bandit is not installed. Run: pip install bandit"
    except subprocess.TimeoutExpired:
        return "ERROR: Linter timed out after 60 seconds."


@mcp.tool()
def write_file(path: str, content: str) -> str:
    """Writes content to a file within the audit boundary.
    Used ONLY by the UI Architect to save output/index.html.
    validate_path() prevents writing outside the target directory.

    Args:
        path: Relative path within the audit target directory to write to.
        content: The text content to write into the file.
    """
    safe_path = validate_path(path)
    safe_path.parent.mkdir(parents=True, exist_ok=True)
    safe_path.write_text(content, encoding="utf-8")
    return f"SUCCESS: Wrote {len(content)} bytes to {path}"


@mcp.tool()
def patch_file(path: str, line_number: int, new_content: str) -> str:
    """Replaces a specific line in a file. Used ONLY by the
    Remediation Engineer, which is itself ONLY triggered via
    the HITL dashboard Auto-Fix button (human approval required).
    Double-gated: human approval + MCP path validation.

    Args:
        path: Relative path within the audit target directory to patch.
        line_number: The 1-indexed line number to replace.
        new_content: The replacement text for the specified line.
    """
    safe_path = validate_path(path)
    lines = safe_path.read_text(encoding="utf-8").splitlines(keepends=True)
    if not (1 <= line_number <= len(lines)):
        return f"ERROR: Line {line_number} out of range (file has {len(lines)} lines)"
    indent = len(lines[line_number - 1]) - len(lines[line_number - 1].lstrip())
    lines[line_number - 1] = " " * indent + new_content.strip() + "\n"
    safe_path.write_text("".join(lines), encoding="utf-8")
    return f"SUCCESS: Patched line {line_number} in {path}"


if __name__ == "__main__":
    # Run via stdio transport for ADK McpToolset integration
    mcp.run(transport="stdio")
