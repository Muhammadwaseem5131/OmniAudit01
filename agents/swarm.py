"""
OmniAudit Swarm — agents/swarm.py
================================================================
Defines all 5 Google ADK agents and orchestrates their pipeline.
"""
from __future__ import annotations

import os
import sys
import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from google.adk.agents import Agent, SequentialAgent, ParallelAgent  # type: ignore

# NOTE: google-adk and mcp are optional runtime dependencies for the
# audit pipeline. Import them lazily inside functions so the package
# can be inspected or the web server started without necessarily
# having the ADK installed (useful for environments where the
# scanner isn't being executed).


def _ensure_adk():
    """Lazily import google-adk and mcp symbols and return them.

    Raises ImportError with a helpful message when the packages are
    not available.
    """
    try:
        from google.adk.agents import Agent, SequentialAgent, ParallelAgent  # type: ignore
        from google.adk.tools.mcp_tool import McpToolset  # type: ignore
        from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams  # type: ignore
        from google.adk.runners import InMemoryRunner  # type: ignore
        from google.genai.types import Content, Part  # type: ignore
        from mcp import StdioServerParameters  # type: ignore
        return {
            "Agent": Agent,
            "SequentialAgent": SequentialAgent,
            "ParallelAgent": ParallelAgent,
            "McpToolset": McpToolset,
            "StdioConnectionParams": StdioConnectionParams,
            "InMemoryRunner": InMemoryRunner,
            "Content": Content,
            "Part": Part,
            "StdioServerParameters": StdioServerParameters,
        }
    except Exception as exc:
        raise ImportError(
            "Missing runtime dependency: install 'google-adk' and 'mcp' to run the swarm."
        ) from exc


def _mcp_server_script_path() -> str:
    """Returns the absolute path to the MCP filesystem_server.py script."""
    return os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "mcp_server", "filesystem_server.py")
    )


def get_mcp_toolset(target_path: str, tool_filter=None):
    """
    Helper: creates an McpToolset pointing at our custom MCP filesystem server.
    The server is launched as a child process via stdio transport.
    """
    symbols = _ensure_adk()
    McpToolset = symbols["McpToolset"]
    StdioConnectionParams = symbols["StdioConnectionParams"]
    StdioServerParameters = symbols["StdioServerParameters"]

    return McpToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command=sys.executable,
                args=[_mcp_server_script_path()],
                env={**os.environ, "AUDIT_TARGET": os.path.abspath(target_path)},
            ),
        ),
        tool_filter=tool_filter,
    )


# ---------------------------------------------------------------------------
# Agent Definitions
# ---------------------------------------------------------------------------

def _make_cartographer(target_path: str) -> "Agent":
    symbols = _ensure_adk()
    Agent = symbols["Agent"]

    return Agent(
        name="cartographer",
        model="gemini-2.0-flash",
        instruction=(
            "You are the Cartographer agent. Map the repository by calling list_dir "
            "with path='.' to discover files. Generate a JSON list of scannable file "
            "paths (only .py and .js files). Output ONLY the raw JSON array — no "
            "markdown fences, no explanation."
        ),
        tools=[get_mcp_toolset(target_path, ["list_dir"])],
        output_key="manifest",
    )


def _make_secret_hunter(target_path: str) -> "Agent":
    symbols = _ensure_adk()
    Agent = symbols["Agent"]

    return Agent(
        name="secret_hunter",
        model="gemini-2.0-flash",
        instruction=(
            "You are Secret Hunter. You scan source files for hardcoded secrets.\n"
            "The Cartographer identified these scannable files: {manifest}\n\n"
            "For EACH file, call read_file and inspect for secrets such as:\n"
            "  AWS keys (AKIA...), GitHub tokens (ghp_...), Stripe keys (sk-...), "
            "API_KEY= literals, or any plaintext credential.\n\n"
            "Return a JSON list where each finding has:\n"
            '  "file", "line" (1-indexed), "severity" ("CRITICAL"), '
            '"type" ("Hardcoded API Key"), "snippet" (the line, secret masked), '
            '"fix_snippet" (safe replacement, e.g. os.environ.get(...))\n\n'
            "Return ONLY valid JSON — no markdown fences."
        ),
        tools=[get_mcp_toolset(target_path, ["read_file"])],
        output_key="secret_findings",
    )


def _make_code_hunter(target_path: str) -> "Agent":
    symbols = _ensure_adk()
    Agent = symbols["Agent"]

    return Agent(
        name="code_hunter",
        model="gemini-2.0-flash",
        instruction=(
            "You are Code Hunter. You detect code-level security vulnerabilities.\n"
            "The Cartographer identified these scannable files: {manifest}\n\n"
            "For EACH file, call run_linter with tool_name='bandit' and path=<file>.\n"
            "Parse the JSON output and return a merged JSON list where each finding has:\n"
            '  "file", "line" (1-indexed), "severity" ("HIGH"/"MEDIUM"/"LOW"), '
            '"type" (e.g. "SQL Injection"), "snippet" (the vulnerable line), '
            '"fix_snippet" (the secure replacement)\n\n'
            "Return ONLY valid JSON — no markdown fences."
        ),
        tools=[get_mcp_toolset(target_path, ["run_linter"])],
        output_key="code_findings",
    )


def _make_ui_architect(target_path: str) -> "Agent":
    symbols = _ensure_adk()
    Agent = symbols["Agent"]

    return Agent(
        name="ui_architect",
        model="gemini-2.0-flash",
        instruction=(
            "You are UI Architect. Generate a single-page HTML dashboard.\n"
            "Input findings:\n"
            "  Secret findings: {secret_findings}\n"
            "  Code findings:   {code_findings}\n\n"
            "Write a COMPLETE standalone HTML file to 'output/index.html' via write_file.\n"
            "Requirements:\n"
            "1. Dark mode, glassmorphism, HSL palette, Google Font 'Inter', gradients.\n"
            "2. Summary section: Chart.js doughnut (CRITICAL/HIGH/MEDIUM/LOW counts) + metrics.\n"
            "3. Table: file, line, type, severity badge, snippet, fix_snippet.\n"
            "4. Each row has an 'Auto-Fix' button that POSTs to http://localhost:8000/api/remediate\n"
            "   with JSON: {{\"file\": \"...\", \"line\": ..., \"type\": \"...\", \"severity\": \"...\", \"snippet\": \"...\", \"fix_snippet\": \"...\"}}.\n"
            "   On success → button turns green ('Fixed'), row dims, chart updates.\n"
            "5. Micro-animations, premium SaaS look.\n\n"
            "Call write_file to save the HTML. Return only a confirmation message."
        ),
        tools=[get_mcp_toolset(target_path, ["write_file"])],
        output_key="ui_result",
    )


def create_swarm(target_path: str) -> "SequentialAgent":
    """
    Builds the main 4-stage audit pipeline:
      Cartographer → (Secret Hunter || Code Hunter) → UI Architect
    """
    symbols = _ensure_adk()
    SequentialAgent = symbols["SequentialAgent"]
    ParallelAgent = symbols["ParallelAgent"]

    return SequentialAgent(
        name="omniaudit_pipeline",
        sub_agents=[
            _make_cartographer(target_path),
            ParallelAgent(
                name="hunter_swarm",
                sub_agents=[
                    _make_secret_hunter(target_path),
                    _make_code_hunter(target_path),
                ],
            ),
            _make_ui_architect(target_path),
        ],
    )


def create_remediation_engineer(target_path: str) -> "Agent":
    """
    Creates the Remediation Engineer agent (triggered by HITL Auto-Fix).
    """
    symbols = _ensure_adk()
    Agent = symbols["Agent"]

    return Agent(
        name="remediation_engineer",
        model="gemini-2.0-flash",
        instruction=(
            "You are the Remediation Engineer. You fix vulnerabilities by patching source files.\n"
            "You will receive a vulnerability report with 'file', 'line', and 'fix_snippet'.\n"
            "Call patch_file with path=file, line_number=line, new_content=fix_snippet.\n"
            "Return a confirmation message when the patch is successful."
        ),
        tools=[get_mcp_toolset(target_path, ["patch_file"])],
    )


# ---------------------------------------------------------------------------
# Workflow Runners
# ---------------------------------------------------------------------------

async def run_scan_workflow(target_path: str) -> dict:
    """
    Executes the full audit pipeline on the target directory.
    Returns the final session state dict.
    """
    symbols = _ensure_adk()
    InMemoryRunner = symbols["InMemoryRunner"]
    Content = symbols["Content"]
    Part = symbols["Part"]

    pipeline = create_swarm(target_path)
    runner = InMemoryRunner(agent=pipeline, app_name="omniaudit")

    user_id = "omniaudit_user"
    session = await runner.session_service.create_session(
        app_name="omniaudit", user_id=user_id
    )

    user_message = Content(parts=[Part(text="Scan the target directory and generate output/index.html")])

    async for event in runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=user_message,
    ):
        # Stream agent output to console
        if event.content and event.content.parts:
            for part in event.content.parts:
                if hasattr(part, "text") and part.text:
                    print(f"[{event.author}] {part.text[:200]}")

    # Refresh session to get final state
    session = await runner.session_service.get_session(
        app_name="omniaudit", user_id=user_id, session_id=session.id
    )
    return dict(session.state) if session else {}


async def run_remediation_workflow(target_path: str, vuln: dict) -> bool:
    """
    Runs the remediation agent to patch a single vulnerability.
    """
    symbols = _ensure_adk()
    InMemoryRunner = symbols["InMemoryRunner"]
    Content = symbols["Content"]
    Part = symbols["Part"]

    agent = create_remediation_engineer(target_path)
    runner = InMemoryRunner(agent=agent, app_name="omniaudit")

    user_id = "omniaudit_user"
    session = await runner.session_service.create_session(
        app_name="omniaudit", user_id=user_id
    )

    prompt_text = (
        f"Remediate the following vulnerability:\n"
        f"  File: {vuln.get('file')}\n"
        f"  Line: {vuln.get('line')}\n"
        f"  Type: {vuln.get('type')}\n"
        f"  Fix:  {vuln.get('fix_snippet')}\n"
    )
    user_message = Content(parts=[Part(text=prompt_text)])

    async for event in runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=user_message,
    ):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if hasattr(part, "text") and part.text:
                    print(f"[remediation] {part.text[:200]}")

    return True
