<div align="center">
  <img src="docs/omniaudit_hero_banner.png" alt="OmniAudit Banner" width="100%">
  
  # OmniAudit
  **Autonomous DevSecOps Security Platform**
  
  [![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/downloads/)
  [![Google ADK](https://img.shields.io/badge/Google-ADK-orange.svg)](https://github.com/google/agent-development-kit)
  [![Kaggle](https://img.shields.io/badge/Kaggle-AI_Agents_Capstone_2026-20beff.svg)](https://www.kaggle.com/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

  *Submitted to Kaggle AI Agents Vibe Coding Capstone 2026 — Track: Agents for Business*
</div>

---

## 📖 Overview

**OmniAudit** is an autonomous, multi-agent security auditing platform that scans a codebase, detects real vulnerabilities, explains every finding, and offers one-click code patches.

Most security tools give you a list of warnings. OmniAudit gives you a guided remediation workflow. Developers upload a project folder, and within seconds a team of AI agents fans out to inspect files, match patterns against known vulnerability classes, and produce an interactive dashboard with severity scoring, vulnerable code highlights, suggested safe replacements, and an **Auto-Fix** button that patches the source file in place.

**Why AI Agents?** A conventional scanner cannot reason about what it finds, cannot adapt its investigation, and cannot coordinate across multiple dimensions simultaneously. OmniAudit uses Google ADK agents to operate in parallel, chain outputs as context, and take real actions via tools.

---

## ❓ The Problem

<div align="center">
  <img src="docs/omniaudit_problem.png" alt="The Problem with Manual Security Audits" width="85%">
</div>

<br/>

Security teams today face a critical challenge — breaches go undetected for months, known vulnerabilities stay unpatched, and analysts burn time on repetitive manual scans. OmniAudit solves this with an autonomous AI agent swarm.

---

## ✨ Features

* 🤖 **Multi-Agent Swarm Architecture** — Specialized agents collaborate to scan and fix vulnerabilities simultaneously
* 🕵️ **Autonomous CVE Detection** — Scans source code for known vulnerability patterns (SQLi, XSS, path traversal, etc.)
* ⚡ **Real-Time Threat Hunting** — Detects hardcoded secrets, API keys, tokens, and unsafe configurations
* 🛠️ **Automated Remediation** — One-click Auto-Fix patches the exact lines of vulnerable source code
* 🔌 **MCP Server Integration** — All filesystem operations exposed as structured MCP tools creating a secure boundary
* 📊 **React Dashboard** — Premium glassmorphism-styled interactive dashboard for reviewing and remediating findings
* 🔒 **Human-in-the-Loop (HITL)** — User approves every patch before it is applied

---

## 🏗️ Architecture

<div align="center">
  <img src="docs/omniaudit_architecture.png" alt="OmniAudit Multi-Agent Architecture" width="85%">
</div>

<br/>

### The Agent Swarm

| # | Agent | Role |
|---|---|---|
| 1 | **Cartographer** | Maps the repository using `list_dir` to find all scannable files |
| 2 | **Secret Hunter** | Reads files via `read_file` to detect hardcoded credentials |
| 3 | **Code Hunter** | Runs the Bandit linter via `run_linter` to find code vulnerabilities |
| 4 | **UI Architect** | Combines all findings and writes the dashboard using `write_file` |
| 5 | **Remediation Engineer** | Applies patches to source code via `patch_file` when triggered by user |

---

## 🔄 Workflow Sequence

<div align="center">
  <img src="docs/omniaudit_workflow_sequence.png" alt="OmniAudit Agent Workflow Sequence" width="85%">
</div>

<br/>

Each scan triggers a full agent collaboration pipeline — from target discovery through CVE analysis to final patch delivery.

---

## 📊 Dashboard

<div align="center">
  <img src="docs/omniaudit_dashboard.png" alt="OmniAudit Dashboard" width="85%">
</div>

<br/>

The live dashboard shows real-time agent status, vulnerability findings with severity badges, a global threat score, and one-click remediation controls.

---

## 📋 Security Report Output

<div align="center">
  <img src="docs/omniaudit_report_output.png" alt="OmniAudit Security Report" width="85%">
</div>

<br/>

Every scan produces a structured security report — CVE ID, severity, affected component, CVSS score, vulnerable code highlighted, and a side-by-side patched version ready to apply.

---

## 💻 Tech Stack

<div align="center">
  <img src="docs/omniaudit_tech_stack.png" alt="OmniAudit Tech Stack" width="85%">
</div>

<br/>

| Technology | Purpose | Version |
| :--- | :--- | :--- |
| **Python** | Backend & Agent Logic | 3.10+ |
| **Google ADK** | Multi-Agent Orchestration | >=1.0.0 |
| **FastAPI** | Backend API & Web Server | >=0.100.0 |
| **MCP** | Secure Tool Execution Boundary | >=1.0.0 |
| **React + Vite** | Interactive Dashboard | 18+ |
| **Tailwind CSS** | Styling | Latest |
| **Bandit** | Python Security Linter | Latest |

---

## 📈 Before vs After

<div align="center">
  <img src="docs/omniaudit_before_after.png" alt="Before vs After OmniAudit" width="85%">
</div>

---

## ⚙️ Prerequisites

Before you begin, make sure you have the following installed:

* **Python 3.10+** — [Download](https://www.python.org/downloads/)
* **Node.js 18+** — [Download](https://nodejs.org/)
* **Git** — [Download](https://git-scm.com/)
* **API Keys** (see Step 6 below):
  * Gemini API Key (**Required**)
  * VirusTotal API Key (Optional)
  * AbuseIPDB API Key (Optional)
  * NVD API Key (Optional)

---

## 🚀 Installation

### Step 1 — Clone the repository

```bash
git clone https://github.com/Muhammadwaseem5131/OmniAudit.git
cd OmniAudit
```

### Step 2 — Create a virtual environment

```bash
python -m venv venv

# Mac/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate
```

### Step 3 — Install Python dependencies

```bash
pip install -r requirements.txt
```

### Step 4 — Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 5 — Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your real API keys.

### Step 6 — Get your API keys

| Key | Where to Get It |
|---|---|
| Gemini API | [aistudio.google.com](https://aistudio.google.com) |
| VirusTotal API | [virustotal.com/gui/my-apikey](https://www.virustotal.com/gui/my-apikey) |
| AbuseIPDB API | [abuseipdb.com/api](https://www.abuseipdb.com/api) |
| NVD API | [nvd.nist.gov/developers/request-an-api-key](https://nvd.nist.gov/developers/request-an-api-key) |

### Step 7 — Run the backend

```bash
# Keep this running in Terminal 1
python main.py
```

### Step 8 — Run the frontend

```bash
# Open a new Terminal 2
cd frontend
npm start
```

### Step 9 — Open the dashboard

```
http://localhost:3000
```

---

## 🔍 How to Run a Scan

1. Open the dashboard at `http://localhost:3000`
2. Click **Browse Projects** and select a target folder
   > Use the included `test_dummy_app/` folder to see a demo scan with real findings
3. The ADK agent swarm begins — watch agents activate in real time on the dashboard
4. Review the generated security report with severity scores and vulnerable code highlights
5. Click **Auto-Fix** on any finding to trigger the Remediation Engineer to patch the code

---

## 🧠 Agent Architecture Explained

| Agent | Role | Tools Used | Output |
| :--- | :--- | :--- | :--- |
| **Cartographer** | Repository discovery | `list_dir` | `{manifest}` JSON |
| **Secret Hunter** | Credential scanning | `read_file` | `{secret_findings}` JSON |
| **Code Hunter** | Vulnerability scanning | `run_linter` | `{code_findings}` JSON |
| **UI Architect** | Report generation | `write_file` | HTML Dashboard |
| **Remediation Engineer** | Code patching (HITL) | `patch_file` | Patched source file |

---

## 📁 Project Structure

```
omniaudit/
├── README.md                    # You are here
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── requirements.txt             # Python dependencies
├── main.py                      # Application entry point
│
├── agents/                      # Multi-agent definitions
│   └── swarm.py                 # Google ADK swarm configuration
│
├── mcp_server/                  # Model Context Protocol
│   └── filesystem_server.py     # Secure file access boundary
│
├── api/                         # FastAPI endpoints
│   └── endpoints.py
│
├── config/                      # Centralized configuration
│   └── settings.py
│
├── frontend/                    # React Dashboard UI
│   ├── src/                     # UI components and pages
│   └── package.json             # Node dependencies
│
├── docs/                        # All images for README
│   ├── omniaudit_hero_banner.png
│   ├── omniaudit_problem.png
│   ├── omniaudit_architecture.png
│   ├── omniaudit_workflow_sequence.png
│   ├── omniaudit_dashboard.png
│   ├── omniaudit_report_output.png
│   ├── omniaudit_tech_stack.png
│   └── omniaudit_before_after.png
│
└── test_dummy_app/              # Intentionally vulnerable app for demo
```

---

## 🏆 Kaggle Competition

| Field | Detail |
|---|---|
| **Competition** | Kaggle AI Agents Vibe Coding Capstone 2026 |
| **Track** | Agents for Business |
| **Sponsor** | Google |

**Key Concepts Demonstrated:**

* ✅ Multi-agent orchestration (Google ADK)
* ✅ Model Context Protocol (MCP) Server for secure tool execution
* ✅ Human-in-the-Loop (HITL) remediation
* ✅ Security features (vulnerability detection, secret scanning)
* ✅ Practical DevSecOps business use case

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📜 License

* **MIT License** — see the `LICENSE` file for details
* **CC-BY 4.0** — as required by Kaggle competition rules for media and documentation

---

## 👨‍💻 Author

**Muhammad Waseem**  
*IT Professional | Cybersecurity | AI/ML*

[![GitHub](https://img.shields.io/badge/GitHub-Muhammadwaseem5131-black?logo=github)](https://github.com/Muhammadwaseem5131)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-muhammad--waseem--6361b4400-blue?logo=linkedin)](https://www.linkedin.com/in/muhammad-waseem-6361b4400)
