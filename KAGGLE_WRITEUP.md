# OmniAudit: An AI Agent for Security Auditing and Remediation

## Subtitle
An interactive multi-agent system that scans code, finds vulnerabilities, and turns remediation into a guided workflow.

## Track
Agents for Good

## Problem
Modern developers often discover security issues late in the development cycle. Static scanning tools can be noisy, difficult to interpret, and disconnected from the coding workflow. That makes security review feel like a separate, burdensome step instead of part of software delivery.

## Solution
OmniAudit addresses that problem with an AI-assisted security auditing experience. Users can upload a project or run it against a demo app, and the system identifies common vulnerabilities such as hardcoded secrets, SQL injection patterns, and unsafe command execution. The findings are shown through a dashboard with clear explanations and proposed fixes.

## Why agents?
The project uses a multi-agent setup to mirror how a real security review team might work. Different agents can focus on different tasks: scanning for risky patterns, explaining the severity, and suggesting fix strategies. This makes the experience more dynamic than a single-rule scanner and shows how agent-based systems can support practical software engineering tasks.

## Architecture
OmniAudit combines a FastAPI backend, a React frontend, and agent orchestration built with Google ADK. The system also uses an MCP filesystem server for tool-based interactions. This architecture allows the app to feel like a real AI workflow rather than a static demo.

## Build journey
The project started as a local security scanning prototype and evolved into a full demo experience with a polished UI, a backend API, and an interactive remediation flow. The most important design choices were to keep the experience simple for judges, make the vulnerabilities easy to see, and demonstrate how AI agents can help with concrete security tasks rather than generic chat.

## Demo experience
In the live demo, a user uploads a sample project or uses the included vulnerable test app. The sample app is intentionally seeded with safe placeholder credentials and insecure patterns, so judges can validate the scan behavior without any real secrets. The system scans the code, highlights vulnerabilities, and presents remediation guidance in an IDE-like experience. This gives the audience a clear picture of how AI can accelerate secure development without needing a complex enterprise setup.

## Impact
OmniAudit is a strong example of how AI agents can be applied to a meaningful developer workflow. It lowers the barrier to security awareness, makes vulnerability review more understandable, and demonstrates the value of agent-driven tooling in a domain where clarity and trust matter.
