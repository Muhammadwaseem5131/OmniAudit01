# 🚀 OmniAudit 2.0 - Quick Start Guide

## Current Status ✅
- ✅ Backend API running on `http://localhost:8000`
- ✅ Frontend UI running on `http://localhost:3000`
- ✅ Upload feature fully functional
- ✅ Vulnerability scanning working

## 🎯 Test the Upload Feature (30 seconds)

### Step 1: Open the UI
```
Open your browser and navigate to:
http://localhost:3000
```

**What you'll see:**
- OmniAudit 2.0 title with shield icon
- Large upload zone with "Drop your project folder here"
- "Browse Projects" button
- Feature cards showing CRITICAL/HIGH/MEDIUM/LOW severity types

### Step 2: Upload Test Project
```
Click the "Browse Projects" button
```

**A file browser will open.** Navigate to:
```
d:\OmniAudit\test_dummy_app
```

Select the folder and click "Open"

### Step 3: Watch the Magic
The app will:
1. Upload the files to the backend
2. Scan for vulnerabilities (1-2 seconds)
3. Display the Dashboard with findings

**Expected Results:**
```
📊 Vulnerabilities Found: 2
🎯 Security Score: 75/100
📈 Grade: C
```

**Vulnerabilities Detected:**
1. ⚠️ CRITICAL: Hardcoded AWS API Key (app.py:14)
2. ⚠️ HIGH: SQL Injection Vulnerability (db.py:16)

---

## 🔍 Understanding the Results

### What Each Screen Shows

#### **Upload Screen** (Current)
- Where you select files/folders to scan
- Drag-drop or browse button
- Shows supported file types

#### **Dashboard Screen** (After Upload)
- Overview of all vulnerabilities
- Security score (0-100)
- Grade (A-F)
- Doughnut chart of severity distribution
- Filterable vulnerability list
- Click on any issue to view details

#### **IDE Editor Screen**
- Code view with vulnerable code highlighted
- AI-powered fix suggestions
- Apply fixes directly
- Shows before/after code

#### **Settings Screen**
- Configure LLM provider (Claude, GPT-4, Gemini)
- Enter API keys
- Select models
- Test connection

#### **Status Screen**
- View scanning progress
- Shows audit results
- Links to export reports

---

## 💻 Command Reference

### Start Backend
```powershell
cd d:\OmniAudit
python main.py
```

### Start Frontend (in separate terminal)
```powershell
cd d:\OmniAudit\frontend
npm start
```

### Run Tests
```powershell
cd d:\OmniAudit
python e2e_test.py          # Test API
python test_api_upload.py   # Test upload endpoint
```

### Check Logs
- **Backend**: Terminal running `python main.py`
- **Frontend**: Terminal running `npm start`
- **Browser**: Open Developer Tools (F12)

---

## 🐛 Troubleshooting

### "Upload not working"
1. Check backend is running: `http://localhost:8000/api/health`
2. Check frontend is running: `http://localhost:3000`
3. Restart both servers:
   ```powershell
   Get-Process python | Stop-Process -Force
   Get-Process node | Stop-Process -Force
   ```

### "API errors in browser console"
1. Open DevTools (F12)
2. Check Network tab for `/api/scan` requests
3. Verify backend response has `status: 200`

### "Files not being detected"
1. Only `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.php`, `.java`, `.go`, `.rb`, `.env` files are scanned
2. Make sure test files are in one of these supported formats
3. Check file paths don't have special characters

---

## 🎨 UI Features

### Dark Mode Design
- Navy background (#0f172a)
- Sky blue accents (#0ea5e9)
- Smooth animations
- Responsive layout

### Severity Colors
- 🔴 **CRITICAL** (Red) → -15 points
- 🟠 **HIGH** (Orange) → -10 points
- 🟡 **MEDIUM** (Green) → -5 points
- ⚪ **LOW** (Gray) → -2 points

### Interactive Elements
- Sortable vulnerability tables
- Filterable by severity
- Expandable details
- Copy-to-clipboard buttons
- Export options (PDF, ZIP)

---

## 🚀 Advanced Features (Optional)

### Generate AI Fixes
1. Go to **IDE Editor** screen
2. Enter your LLM API key in **Settings**
3. Select a vulnerability
4. Click "Generate Fix"
5. Review AI suggestion
6. Apply fix to code

### Export Reports
1. Click "Export Report"
2. Choose format: PDF or ZIP
3. Report includes:
   - All vulnerabilities
   - Severity breakdown
   - Remediation suggestions
   - Risk score

### Customizable Settings
- Multiple LLM providers supported
- Severity threshold configuration
- File type filtering
- Custom pattern rules

---

## 📊 System Requirements

- Python 3.9+
- Node.js 18+
- 2GB RAM minimum
- Modern web browser (Chrome, Firefox, Safari, Edge)

---

## 📞 Quick Reference

| Task | Command | Port |
|------|---------|------|
| View UI | `http://localhost:3000` | 3000 |
| API Docs | Not available (but try `/docs`) | 8000 |
| Health Check | `curl http://localhost:8000/api/health` | 8000 |
| Upload Test | Run `python test_api_upload.py` | 8000 |
| E2E Test | Run `python e2e_test.py` | 8000 |

---

## ✅ Verification Checklist

Before testing, verify:
- [ ] Backend running (see "Uvicorn running on" message)
- [ ] Frontend running (see webpack compilation success)
- [ ] No errors in terminals
- [ ] Can access `http://localhost:3000` in browser
- [ ] Can access `http://localhost:8000/api/health` in browser

---

## 🎯 Success Criteria

Upload is working when:
1. ✅ Files upload without errors
2. ✅ Backend receives files and scans them (< 2 seconds)
3. ✅ Frontend displays vulnerabilities
4. ✅ Security score calculates correctly
5. ✅ Grade displays (A-F)
6. ✅ Can view vulnerability details

---

## 📚 File Structure

```
d:\OmniAudit\
├── main.py                          # Backend FastAPI app
├── frontend/                        # React frontend
│   ├── src/
│   │   ├── App.jsx                 # Main component
│   │   ├── components/             # Screen components
│   │   ├── utils/                  # Utilities (scanner, llm, etc.)
│   │   └── index.css               # Global styles
│   └── package.json                # npm config with proxy
├── test_dummy_app/                 # Test project with vulnerabilities
│   ├── app.py                      # Has AWS key hardcoded
│   └── db.py                       # Has SQL injection
├── e2e_test.py                     # End-to-end test script
└── UPLOAD_VERIFICATION_REPORT.md   # Detailed verification report
```

---

## 🎉 You're All Set!

The OmniAudit 2.0 AI Security IDE is ready to use. Go ahead and:

1. Open `http://localhost:3000`
2. Click **Browse Projects**
3. Select **test_dummy_app** folder
4. Watch it detect vulnerabilities! 🚀

---

**Last Updated**: January 3, 2025
**Version**: OmniAudit 2.0
**Status**: ✅ READY FOR PRODUCTION
