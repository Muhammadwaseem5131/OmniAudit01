<div align="center">
  <img src="docs/omniaudit_architecture.png" alt="OmniAudit Banner" width="100%">
  
  # OmniAudit
  **Autonomous DevSecOps Security Platform**
  
  [![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/downloads/)
  [![Google ADK](https://img.shields.io/badge/Google-ADK-orange.svg)](https://github.com/google/agent-development-kit)
  [![Kaggle](https://img.shields.io/badge/Kaggle-AI_Agents_Capstone_2026-20beff.svg)](https://www.kaggle.com/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

  *Submitted to Kaggle AI Agents Vibe Coding Capstone 2026 (Track: Agents for Business)*
</div>

---

## 📖 Overview

**OmniAudit** is an autonomous, multi-agent security auditing platform that can scan a codebase, detect real vulnerabilities, explain every finding, and offer one-click code patches. 

Most security tools give you a list of warnings. OmniAudit gives you a guided remediation workflow. Developers upload a project folder, and within seconds a team of AI agents fans out to inspect files, match patterns against known vulnerability classes, and produce an interactive dashboard with severity scoring, vulnerable code highlights, suggested safe replacements, and an **Auto-Fix** button that patches the source file in place.

**Why AI Agents?** A conventional scanner cannot reason about what it finds, cannot adapt its investigation, and cannot coordinate across multiple dimensions simultaneously. OmniAudit uses Google ADK agents to operate in parallel, chain outputs as context, and take real actions via tools. 

---

## ✨ Features

* **🤖 Multi-Agent Swarm Architecture:** Specialized agents (Cartographer, Secret Hunter, Code Hunter, UI Architect, Remediation Engineer) collaborate to scan and fix vulnerabilities.
* **🕵️ Autonomous CVE Detection:** Scans source code for known vulnerability patterns (SQLi, XSS, etc.).
* **⚡ Real-Time Threat Hunting:** Detects hardcoded secrets (API keys, tokens) and unsafe configurations.
* **🛠️ Automated Remediation:** Offers one-click "Auto-Fix" buttons that patch the exact lines of vulnerable source code.* **🧪 Safe Demo Data:** The included sample app uses safe placeholder credentials and intentionally vulnerable patterns so judges can verify detection without any real secrets.* **🔌 MCP Server Integration:** All filesystem operations are exposed as structured MCP tools (`list_dir`, `read_file`, `write_file`, `run_linter`, `patch_file`), creating a secure boundary.
* **📊 React Dashboard:** A premium, glassmorphism-styled interactive dashboard for reviewing and remediating findings.

---

## 🏗️ Architecture

<div align="center">
  <img src="docs/omniaudit_architecture.png" alt="OmniAudit Architecture" width="80%">
</div>

### The Agent Swarm
1. **Cartographer:** Maps the repository using `list_dir` to find scannable files.
2. **Secret Hunter:** Reads files using `read_file` to find hardcoded credentials.
3. **Code Hunter:** Runs the Bandit linter via `run_linter` to find code vulnerabilities.
4. **UI Architect:** Combines findings and writes the dashboard using `write_file`.
5. **Remediation Engineer:** Applies patches to source code using `patch_file` when triggered by the user.

---

## 💻 Tech Stack

| Technology | Purpose | Version |
| :--- | :--- | :--- |
| **Python** | Backend & Agent Logic | 3.10+ |
| **Google ADK** | Multi-Agent Orchestration | >=1.0.0 |
| **FastAPI** | Backend API & Web Server | >=0.100.0 |
| **MCP** | Secure Tool execution boundary | >=1.0.0 |
| **React + Vite** | Interactive Dashboard | 18+ |
| **Tailwind CSS** | Styling | Latest |

---

## ⚙️ Prerequisites

* **Python 3.10+**
* **Node.js 18+**
* **Git**
* **API Keys:**
  * Gemini API Key (Required for ADK Agents)
  * VirusTotal API Key (Optional)
  * AbuseIPDB API Key (Optional)
  * NVD API Key (Optional)

---

## 🚀 Installation

Follow these steps to set up OmniAudit locally.

**Step 1 - Clone the repo:**
```bash
git clone https://github.com/Muhammadwaseem5131/OmniAudit.git
cd OmniAudit
```

**Step 2 - Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

**Step 3 - Install Python dependencies:**
```bash
pip install -r requirements.txt
```

**Step 4 - Install frontend dependencies:**
```bash
cd frontend
npm install
cd ..
```

**Step 5 - Set up environment variables:**
```bash
cp .env.example .env
```
*Edit `.env` and add your real API keys.*

**Step 6 - Get your API keys:**
* Gemini API: [https://aistudio.google.com](https://aistudio.google.com)
* VirusTotal API: [https://www.virustotal.com/gui/my-apikey](https://www.virustotal.com/gui/my-apikey)
* AbuseIPDB API: [https://www.abuseipdb.com/api](https://www.abuseipdb.com/api)
* NVD API: [https://nvd.nist.gov/developers/request-an-api-key](https://nvd.nist.gov/developers/request-an-api-key)

**Step 7 - Run the backend:**
```bash
# Keep this running in terminal 1
python main.py
```

**Step 8 - Run the frontend:**
```bash
# Open a new terminal
cd frontend
npm start
```

**Step 9 - Access the dashboard:**
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔍 How to Run a Scan

1. Open the dashboard at `http://localhost:3000`.
2. Click **Browse Projects** and select a target folder (e.g., the included `test_dummy_app`).
3. The ADK agent swarm will begin mapping, scanning, and analyzing the code. You can monitor the progress on the dashboard.
4. Once complete, review the generated report.
5. Click **Auto-Fix** on any finding to trigger the Remediation Engineer agent to patch the code automatically.

---

## 🧠 Agent Architecture Explained

| Agent Name | Role | Tools Used | Output |
| :--- | :--- | :--- | :--- |
| **Cartographer** | Discovery | `list_dir` | `{manifest}` JSON |
| **Secret Hunter** | Credential scanning | `read_file` | `{secret_findings}` JSON |
| **Code Hunter** | Vulnerability scanning | `run_linter` | `{code_findings}` JSON |
| **UI Architect** | Report generation | `write_file` | HTML Dashboard |
| **Remediation Engineer** | Code patching (HITL) | `patch_file` | Patched source file |

---

## 📁 Project Structure

```
omniaudit/
├── README.md               # You are here
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── requirements.txt        # Python dependencies
├── config/                 # Centralized configuration
│   └── settings.py
├── agents/                 # Multi-agent definitions
│   └── swarm.py            # ADK Swarm configuration
├── mcp_server/             # Model Context Protocol
│   └── filesystem_server.py# Secure file access boundary
├── frontend/               # React Dashboard UI
│   ├── src/                # UI components
│   └── package.json        # Node dependencies
├── api/                    # FastAPI Endpoints
│   └── endpoints.py
├── docs/                   # Documentation and diagrams
└── test_dummy_app/         # Intentionally vulnerable app for testing
```

---

## 🏆 Kaggle Competition

This project was built for the **Kaggle AI Agents Vibe Coding Capstone 2026**.

* **Track:** Agents for Business
* **Key Concepts Demonstrated:** 
  * Multi-agent orchestration (Google ADK)
  * Model Context Protocol (MCP) Server for secure tool execution
  * Human-in-the-Loop (HITL) remediation
  * Practical Security/DevSecOps use case

---

## 🤝 Contributing

Contributions are welcome!
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

* **MIT License** - see the `LICENSE` file for details.
* **CC-BY 4.0** - as required by Kaggle competition rules for media/documentation.

---

## 👨‍💻 Author

**Muhammad Waseem**
*IT Professional | Cybersecurity | AI/ML*
* **GitHub:** [Muhammadwaseem5131](https://github.com/Muhammadwaseem5131)
* **LinkedIn:** [muhammad-waseem-6361b4400](https://www.linkedin.com/in/muhammad-waseem-6361b4400)
