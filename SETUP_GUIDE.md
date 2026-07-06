# OmniAudit 2.0 - Complete Setup Guide

## 📋 Prerequisites

- **Node.js** 16+ and npm
- **Python** 3.10+
- **LLM API Key** (Claude, GPT-4, or Gemini)
- **Git**

## 🚀 Installation & Running

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/omniaudit.git
cd omniaudit
```

### Step 2: Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env with your LLM API key
# Choose ONE of:
# ANTHROPIC_API_KEY=sk-ant-...    # For Claude
# OPENAI_API_KEY=sk-...            # For GPT-4
# GOOGLE_API_KEY=AIza...           # For Gemini
```

### Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

cd ..
```

### Step 4: Run OmniAudit 2.0

```bash
# Start the backend server
python main.py --port 3000

# Then open in browser
# http://localhost:3000
```

## 🎯 Basic Usage

### 1. Upload a Project
1. Open http://localhost:3000
2. Drag your project folder or click "Browse Projects"
3. Wait for scan to complete

### 2. View Security Results
- Dashboard shows security score and severity breakdown
- Click on any vulnerability to see details

### 3. Configure AI Fixer
1. Click Settings ⚙️
2. Select LLM provider (Claude/GPT-4/Gemini)
3. Paste your API key
4. Click "Test Connection"
5. Save settings

### 4. Fix with AI
1. Click "⚡ Fix with AI" on any vulnerability
2. Review the proposed fix in the IDE
3. Click "✓ Apply Fix" to patch the code
4. File is updated automatically

### 5. Download Results
- **Security Report**: PDF with detailed findings
- **Fixed Project**: ZIP with all patched files

## 🛠️ Development Mode

### Frontend Development

```bash
cd frontend
npm start  # Starts React dev server on :3000
```

### Backend Development

```bash
# Install development dependencies
pip install -e .

# Run with auto-reload
uvicorn api.endpoints:app --reload --port 8000
```

## 📦 Project Structure

```
omniaudit/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # Main app
│   │   ├── components/
│   │   │   ├── FileUpload.jsx         # Upload interface
│   │   │   ├── Dashboard.jsx          # Results dashboard
│   │   │   ├── IDEEditor.jsx          # Code editor + AI fixes
│   │   │   └── Settings.jsx           # API key settings
│   │   └── utils/
│   │       ├── scanner.js             # Vulnerability scanner
│   │       ├── llmClient.js           # LLM provider interface
│   │       └── reportGenerator.js     # PDF/ZIP export
│   └── package.json
├── api/
│   └── endpoints.py                    # FastAPI routes
├── agents/
│   └── swarm.py                        # v1 agents (optional)
├── mcp_server/
│   └── filesystem_server.py
├── test_dummy_app/
│   ├── app.py                          # Demo: hardcoded AWS key
│   └── db.py                           # Demo: SQL injection
├── main.py                             # Server entry point
├── requirements.txt
├── pyproject.toml
└── UPGRADE_README.md
```

## 🔑 API Key Setup Guide

### Claude (Anthropic)

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create new API key
5. Copy to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

**Recommended Models:**
- `claude-opus-4-1` (Most capable)
- `claude-3-5-sonnet-20241022` (Balanced)
- `claude-3-5-haiku-20241022` (Fast)

### GPT-4 (OpenAI)

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Create new API key
4. Copy to `.env`: `OPENAI_API_KEY=sk-...`

**Recommended Models:**
- `gpt-4-turbo-preview` (Most capable)
- `gpt-4` (Standard)
- `gpt-3.5-turbo` (Budget option)

### Gemini (Google)

1. Go to https://ai.google.dev
2. Sign up or log in
3. Create API key
4. Copy to `.env`: `GOOGLE_API_KEY=AIza...`

**Recommended Models:**
- `gemini-pro` (Full model)
- `gemini-2.0-flash` (Fast inference)

## 🧪 Testing with Demo App

OmniAudit includes a deliberately vulnerable test app for demo purposes:

```bash
# Scan the test app
python main.py --path ./test_dummy_app --port 3000
```

### Vulnerabilities in test_dummy_app:

**app.py:12** - CRITICAL: Hardcoded AWS API Key
```python
aws_key = 'AKIAIOSFODNN7EXAMPLE'  # ← Fixed by AI to: os.environ.get('AWS_KEY')
```

**db.py:18** - HIGH: SQL Injection
```python
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")  # ← Fixed to use ?
```

### Testing the Fix Flow:

1. Open http://localhost:3000
2. Click "Scan" (it auto-scans test_dummy_app)
3. See 2 vulnerabilities on the dashboard
4. Configure API key in Settings
5. Click "Fix with AI" on first vulnerability
6. Review proposed fix in IDE panel
7. Click "Apply Fix" 
8. Watch the fix apply in real-time
9. Repeat for second vulnerability

## 📊 Vulnerability Database

### Detected Patterns by Severity

**CRITICAL (15 points):**
- Hardcoded API keys (AWS, Stripe, GitHub, Google)
- Hardcoded passwords
- Database credentials
- Private keys in code
- AWS/GCP/Azure credentials

**HIGH (10 points):**
- SQL injection
- Command injection
- Unsafe deserialization (pickle, yaml)
- Eval/exec with user input
- Weak cryptography (MD5, SHA1, DES)
- Path traversal

**MEDIUM (5 points):**
- XSS vulnerabilities
- CORS misconfiguration
- Debug mode enabled
- Insecure random
- Missing input validation

**LOW (2 points):**
- Commented credentials
- Security-related TODOs
- Sensitive data in print statements
- Overly broad exception handling

## 🚀 Deployment

### Deploy Frontend to Vercel

```bash
cd frontend
npm install -g vercel
vercel
```

### Deploy Backend to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway up

# Set environment variables in Railway dashboard
# ANTHROPIC_API_KEY=...
# OPENAI_API_KEY=...
# GOOGLE_API_KEY=...
```

### Docker Deployment

```bash
# Build Docker image
docker build -t omniaudit:2.0 .

# Run container
docker run -p 3000:8000 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  omniaudit:2.0
```

## 🔒 Security Best Practices

✅ **What OmniAudit Does Right:**
- Code never sent to OmniAudit servers
- API keys stored only in browser localStorage
- Direct connections to LLM providers
- All scanning happens client-side
- No third-party analytics or tracking

⚠️ **What You Should Do:**
- Use separate API keys for development/production
- Rotate API keys regularly
- Don't share your API key with others
- Use environment variables in production
- Keep OmniAudit updated
- Review all AI-generated fixes before applying

## 🐛 Troubleshooting

### Frontend builds but won't start

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Backend gives import errors

```bash
# Ensure you're in the right Python environment
which python  # Should show venv path
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### LLM API calls failing

1. Check API key is correct in Settings
2. Verify API key has permissions
3. Check API quota hasn't been exceeded
4. Try "Test Connection" in Settings
5. Check browser console for error messages (F12 → Console)

### Vulnerabilities not detected

1. Check file extensions are supported (.py, .js, .ts, etc.)
2. Verify scanner patterns match your code
3. Try the test_dummy_app first to confirm scanner works
4. Open GitHub issue with code sample

## 📚 Advanced Usage

### Adding Custom Vulnerability Patterns

Edit `frontend/src/utils/scanner.js`:

```javascript
// Add new pattern to PATTERNS object
hardcoded_api_key: [
  // ... existing patterns
  { 
    pattern: /your_pattern_here/gi, 
    severity: 'CRITICAL', 
    type: 'your_type' 
  },
]
```

### Integrating with CI/CD

```yaml
# GitHub Actions example
- name: OmniAudit Security Scan
  run: |
    python main.py --path . --output report.json
```

### Batch Processing

```javascript
// Process multiple projects
const projects = ['project1/', 'project2/', 'project3/'];
for (const project of projects) {
  const results = await scanProjectFiles(project);
  // Process results...
}
```

## 📞 Support & Community

- **Issues**: https://github.com/your-username/omniaudit/issues
- **Discussions**: https://github.com/your-username/omniaudit/discussions
- **Email**: support@omniaudit.dev
- **Twitter**: [@omniaudit](https://twitter.com/omniaudit)

## 📄 License

MIT License - See LICENSE file

## 🙏 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🎉 That's it!

You now have a fully functional AI-powered security IDE. Start scanning your projects!

**Questions?** Check the UPGRADE_README.md for detailed feature documentation.
