# 🛡️ OmniAudit 2.0 — AI Security IDE

**Professional-grade browser-based security IDE** powered by AI. Upload your project, scan for vulnerabilities, and fix code in real-time with Claude/GPT-4/Gemini.

## ✨ Features

### 🚀 Core Capabilities
- **Drag-and-drop project upload** - Upload entire folders with webkitdirectory support
- **Real-time security scanning** - Detects 50+ vulnerability patterns
- **AI-powered fixes** - Generate fixes using Claude, GPT-4, or Gemini
- **Split-screen IDE** - Monaco editor with syntax highlighting and live code patching
- **Zero-server trust** - Your code and API keys never leave your browser
- **Professional dashboard** - Security score, severity breakdown, detailed reports
- **Before/After diffs** - See exactly what changed with git-style diffs

### 🔒 Security Detection

**CRITICAL** (Hardcoded Secrets):
- AWS API keys (AKIA...)
- GitHub tokens (ghp_...)
- Stripe keys (sk_...)
- Google API keys (AIza...)
- Database connection strings
- Private keys and certificates

**HIGH** (Code Vulnerabilities):
- SQL Injection (f-string/%-formatting in queries)
- Command Injection (os.system, subprocess with user input)
- Unsafe deserialization (pickle, yaml.load)
- Weak cryptography (MD5, SHA1, DES)
- Path traversal vulnerabilities
- Eval/exec with user input

**MEDIUM** (Security Misconfigurations):
- XSS vulnerabilities
- CORS misconfiguration (Allow-Origin: *)
- Debug mode enabled
- Insecure random for tokens
- Missing input validation

**LOW** (Code Quality):
- Commented credentials
- TODO comments mentioning security
- Print statements with sensitive data
- Overly broad exception handling

## 🏗️ Architecture

```
OmniAudit 2.0/
├── frontend/                    # React Single Page App
│   ├── src/
│   │   ├── App.jsx             # Main entry
│   │   ├── index.js            # React DOM entry
│   │   ├── index.css           # Tailwind + custom styles
│   │   ├── components/
│   │   │   ├── FileUpload.jsx  # Drag-drop interface
│   │   │   ├── Dashboard.jsx   # Results & scoring
│   │   │   ├── IDEEditor.jsx   # Monaco editor + AI fixes
│   │   │   └── Settings.jsx    # API key config
│   │   └── utils/
│   │       ├── scanner.js      # 50+ vulnerability patterns
│   │       └── llmClient.js    # Claude/GPT4/Gemini API
│   ├── public/
│   │   └── index.html
│   └── package.json
│
├── api/
│   └── endpoints.py            # FastAPI backend
│
├── agents/                       # Original v1 agents (optional)
│   └── swarm.py
│
├── mcp_server/
│   └── filesystem_server.py
│
└── main.py                      # Server entry point
```

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/omniaudit.git
cd omniaudit

# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Build Frontend

```bash
cd frontend
npm run build
cd ..
```

### 3. Set Up Environment

```bash
cp .env.example .env
# Edit .env and add your LLM API key
# GOOGLE_API_KEY=your-key  # For Gemini
# ANTHROPIC_API_KEY=your-key  # For Claude
# OPENAI_API_KEY=your-key  # For GPT-4
```

### 4. Run OmniAudit

```bash
python main.py --port 3000
# Open http://localhost:3000
```

## 🎯 Usage

### 1. Upload Project
- Drag your project folder into the drop zone
- Or click "Browse Projects" to select
- Supports .py, .js, .ts, .java, .php, .go, .rb, .env

### 2. Configure AI
- Click Settings gear icon
- Choose provider (Claude/GPT-4/Gemini)
- Paste your API key
- Click "Test Connection"
- Keys stored only in browser localStorage

### 3. View Results
- Dashboard shows security score (0-100, A-F grade)
- Doughnut chart breaks down by severity
- Click any vulnerability to open IDE

### 4. Fix with AI
- Editor opens with vulnerable file
- AI generates fix proposal
- Review diff before applying
- Click "Apply Fix" to patch code
- Fixed line highlighted in green

### 5. Download Report
- Export security report as PDF
- Download fixed project as ZIP
- Share security score with team

## 🔐 Security & Privacy

✅ **Your data stays yours:**
- All code analysis happens locally in your browser
- API keys stored only in browser localStorage
- Direct API calls to LLM providers (Claude/OpenAI/Google)
- No OmniAudit servers see your code or keys

## 🛠️ Technology Stack

**Frontend:**
- React 18
- Monaco Editor (@monaco-editor/react)
- Tailwind CSS
- Recharts (for security score visualization)
- react-hot-toast (notifications)

**Backend:**
- FastAPI (Python)
- Uvicorn
- CORS middleware

**LLM Integration:**
- Anthropic Claude (claude-opus-4-1, claude-3-5-sonnet)
- OpenAI GPT-4 (gpt-4, gpt-4-turbo)
- Google Gemini (gemini-pro, gemini-2.0-flash)

**File Operations:**
- File System Access API (WebKit)
- JSZip (for ZIP downloads)
- jsPDF (for reports)

## 📊 Supported Languages

- Python (.py)
- JavaScript (.js)
- TypeScript (.ts, .tsx)
- Java (.java)
- PHP (.php)
- Go (.go)
- Ruby (.rb)
- Environment files (.env)

## 🔥 Example Scan Results

**Vulnerability Found:**
```
CRITICAL: Hardcoded AWS API Key
File: config/credentials.py:12
Code: aws_key = 'AKIAIOSFODNN7EXAMPLE'
Why Dangerous: Anyone with access to code can use your AWS account
Fix: aws_key = os.environ.get('AWS_KEY')
```

**Score Calculation:**
- Start: 100 points
- -15 per CRITICAL
- -10 per HIGH
- -5 per MEDIUM
- -2 per LOW
- Result: Security score with letter grade

## 📝 Configuration

### Environment Variables

```env
# LLM Provider Keys (choose one)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...

# Optional
PORT=3000
HOST=localhost
LOG_LEVEL=info
```

### Settings.jsx API Providers

Update provider buttons in `Settings.jsx`:
```jsx
<button onClick={() => setApiProvider('claude')}>Claude</button>
<button onClick={() => setApiProvider('openai')}>GPT-4</button>
<button onClick={() => setApiProvider('gemini')}>Gemini</button>
```

## 🧪 Testing

### Test with Dummy App

```bash
# Scan the vulnerable test app
python main.py --path ./test_dummy_app
```

View findings:
- `test_dummy_app/app.py:12` - Hardcoded AWS key
- `test_dummy_app/db.py:18` - SQL injection

Click "Fix with AI" to patch automatically.

## 🚀 Deployment

### Deploy to Vercel (Frontend)

```bash
# Build and deploy frontend
cd frontend
vercel
```

### Deploy to Railway/Heroku (Backend)

```bash
# Deploy backend API
# Configure with LLM API keys in env
```

## 📚 Architecture Deep Dive

### Scanner Engine (scanner.js)

Regex patterns + vulnerability rules for each severity level.
Returns standardized JSON:
```javascript
{
  file: "path/to/file.py",
  line: 42,
  severity: "CRITICAL",
  title: "Hardcoded AWS API Key",
  vulnerable_code: "aws_key = 'AKIA...'",
  why_dangerous: "Anyone can use your account",
  fix_code: "aws_key = os.environ.get('AWS_KEY')",
  cwe_reference: "CWE-798"
}
```

### LLM Client (llmClient.js)

Unified interface for 3 providers:
```javascript
await callLLM(apiKey, 'claude', prompt, 'claude-opus-4-1')
await callLLM(apiKey, 'openai', prompt, 'gpt-4')
await callLLM(apiKey, 'gemini', prompt, 'gemini-pro')
```

### IDE Editor (IDEEditor.jsx)

Three-panel split-screen:
1. **Left:** Issue details + AI fix button
2. **Center:** Monaco code editor
3. **Right:** Diff viewer + apply/skip buttons

## 🤝 Contributing

Contributions welcome! Areas to improve:
- Add more vulnerability patterns
- Support more languages
- Improve AI fix quality
- Add batch processing
- Create VS Code extension

## 📄 License

MIT License - See [LICENSE](LICENSE)

## 🙏 Acknowledgments

- Google ADK (Agent Development Kit)
- Monaco Editor (Microsoft)
- Claude AI (Anthropic)
- GPT-4 (OpenAI)
- Gemini (Google)

## 💬 Support

- GitHub Issues: [Report bugs](https://github.com/your-username/omniaudit/issues)
- Discussions: [Ask questions](https://github.com/your-username/omniaudit/discussions)
- Twitter: [@omniaudit](https://twitter.com/omniaudit)

---

**OmniAudit 2.0** — Built by security engineers, for security engineers. 🛡️
