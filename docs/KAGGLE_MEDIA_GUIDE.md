# OmniAudit — Kaggle Submission Media Guide

## Video Hosting & Requirements

**Platform:** YouTube (public or unlisted)  
**Duration:** Exactly 5 minutes or less  
**Quality:** 1080p or higher  
**Audio:** Clear, background music optional

### Video Script (5 Minutes)

```
[0:00 – 0:20] — HOOK (20 seconds)
Visual: Slide 1 — Cover / Hero Banner (omniaudit_hero_banner.png) with a slow zoom.
Narration: "What if your security team never had to manually scan for vulnerabilities again? What if autonomous AI agents could detect threats, analyze CVEs, and generate fixes — all while you sleep? That's OmniAudit."

[0:20 – 0:50] — PROBLEM (30 seconds)
Visual: Slide 2 — Problem Statement (omniaudit_problem.png).
Narration: "Security teams today face a serious challenge. On average it takes over 200 days to detect a breach. 80% of exploited vulnerabilities were already known — but unpatched. And analysts spend almost half their time on repetitive, manual scanning tasks. This is not a tools problem. It is a speed and automation problem."

[0:50 – 1:20] — WHY AGENTS (30 seconds)
Visual: Slide 3 — Architecture Diagram (omniaudit_architecture.png).
Narration: "Normal scripts run one task at a time. AI agents are different. They reason, delegate, and collaborate. OmniAudit uses a multi-agent swarm — an Orchestrator Agent that breaks down the security task, and four specialized sub-agents that run in parallel: Scanner, Analyzer, Threat Hunter, and Remediation. This is something a single script simply cannot do."

[1:20 – 2:00] — ARCHITECTURE DEEP DIVE (40 seconds)
Visual: Highlight arrows and agents on Slide 3 or transition to Sequence Diagram (omniaudit_workflow.png).
Narration: "Here is how it works. The user submits a scan request. The Orchestrator Agent receives it and splits the work. The Scanner Agent uses Suricata to probe the target system. The Analyzer Agent queries the NVD CVE database to match findings to known vulnerabilities. The Threat Hunter Agent checks IPs against VirusTotal and AbuseIPDB. Finally the Remediation Agent generates specific patch recommendations. All agents report back to the Orchestrator which compiles the final report."

[2:00 – 2:15] — MCP SERVER MENTION (15 seconds)
Visual: Zoom in on the MCP server box in the Architecture Diagram or show code.
Narration: "OmniAudit also integrates an MCP server, allowing agents to call external tools as structured function calls — making the system modular, extensible, and production-ready."

[2:15 – 3:30] — LIVE DEMO (75 seconds)
Visual: Screen recording of React dashboard scan execution.
Actions:
  - 2:15 - 2:25: Open dashboard. (Narration: "Let me show you OmniAudit in action...")
  - 2:25 - 2:35: Click "Browse Projects" and upload test_dummy_app. (Narration: "I am submitting a scan request now...")
  - 2:35 - 2:55: Show Agent Status panel updating. (Narration: "Notice the status panel updating...")
  - 2:55 - 3:15: Show vulnerability list loading. (Narration: "The scan results have returned...")
  - 3:15 - 3:30: Click on SQL Injection and show IDE editor remediation tab. (Narration: "Clicking on this finding, we see...")

[3:30 – 4:00] — RESULTS / REPORT (30 seconds)
Visual: Slide 6 — Sample Security Report (omniaudit_report_output.png).
Narration: "At the end of every scan, OmniAudit generates a structured security report. Critical vulnerabilities are flagged at the top. Each finding includes the CVE ID, affected component, risk score, and a specific recommended fix. What used to take a security analyst hours now takes under five minutes."

[4:00 – 4:20] — TECH STACK (20 seconds)
Visual: Slide 7 — Tech Stack (omniaudit_tech_stack.png).
Narration: "OmniAudit is built on Google ADK for agent orchestration, Gemini as the reasoning backbone, MCP for tool integration, Suricata and Wazuh for security scanning, and React with FastAPI for the frontend and backend. All open source. All reproducible from the GitHub repo."

[4:20 – 4:45] — BEFORE vs AFTER (25 seconds)
Visual: Slide 8 — Before vs After (omniaudit_before_after.png).
Narration: "The difference is clear. Manual security audits: hours of work, human error, delayed response. OmniAudit: autonomous agents working in parallel, real-time threat detection, instant remediation steps, 24 hours a day."

[4:45 – 5:00] — CLOSING (15 seconds)
Visual: Slide 1 — Hero Banner again with GitHub link visible.
Narration: "OmniAudit is more than a prototype. It is a production-ready autonomous security platform built for the real world. The full code, documentation, and setup instructions are on GitHub. Thank you."
```

## Image Assets

All assets are located in the `assets/` folder in the project root. For compliance with Kaggle requirements, each asset is available in two resolutions:
1. **High Resolution (`1280x720px`)** — Recommended for high-quality viewing.
2. **Target Resolution (`640x360px`)** — Resized copies ending in `_640x360.png` (satisfies Kaggle's minimum 640x360 requirement).

### Asset Filenames:

* **Hero Banner / Cover**: `omniaudit_hero_banner.png` & `omniaudit_hero_banner_640x360.png`
* **Problem Statement**: `omniaudit_problem.png` & `omniaudit_problem_640x360.png`
* **Architecture Diagram**: `omniaudit_architecture.png` & `omniaudit_architecture_640x360.png`
* **Agent Workflow**: `omniaudit_workflow.png` & `omniaudit_workflow_640x360.png`
* **Dashboard Screenshot**: `omniaudit_dashboard.png` & `omniaudit_dashboard_640x360.png`
* **Sample Report Output**: `omniaudit_report_output.png` & `omniaudit_report_output_640x360.png`
* **Tech Stack**: `omniaudit_tech_stack.png` & `omniaudit_tech_stack_640x360.png`
* **Before vs After**: `omniaudit_before_after.png` & `omniaudit_before_after_640x360.png`
* **YouTube Thumbnail**: `omniaudit_youtube_thumbnail.png` & `omniaudit_youtube_thumbnail_640x360.png`

## Kaggle Media Gallery Checklist

- [ ] Cover image (`omniaudit_hero_banner_640x360.png` or `omniaudit_hero_banner.png`)
- [ ] YouTube video link (public)
- [ ] 8 gallery images in order (either high-res or 640x360)
- [ ] YouTube thumbnail set to `omniaudit_youtube_thumbnail.png`

## Recording Tips

1. **Use OBS Studio or similar** for screen recording.
2. **Set high resolution** (1080p minimum) and set canvas to 16:9.
3. **Record the demo flow:**
   - Open React dashboard on `http://localhost:3000`.
   - Click "Browse Projects" and upload `test_dummy_app` folder.
   - Show active agents and list of vulnerabilities.
   - Show remediation code-diff view.
4. **Keep narration clear, steady, and exactly matching the script timestamps.**

