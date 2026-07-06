import { FileRecord, Vulnerability } from './types';

export const DEMO_FILES: FileRecord[] = [
  {
    id: 'env_1',
    name: '.env',
    path: '.env',
    content: `# Security Scanner Target Environment Configurations
PORT=3000
NODE_ENV=production
APP_URL=https://omniaudit.io

# AWS Configuration - CRITICAL EXPOSURE
AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Production Database Settings
DATABASE_URL="postgresql://admin_user:P@$$w0rd_987654@prod-db-instance.c9g8k7.us-east-1.rds.amazonaws.com:5432/customer_records"

# Third Party Integration API Keys
STRIPE_API_KEY="sk_test_demo_do_not_use"
GEMINI_API_KEY="DEMO_KEY_FOR_TESTING_ONLY"
`,
    size: 512,
    lines: 15,
    language: 'properties',
    scanStatus: 'idle',
    issuesCount: { critical: 4, high: 0, medium: 0, low: 0 }
  },
  {
    id: 'py_1',
    name: 'main.py',
    path: 'src/main.py',
    content: `import os
import sys
import pickle
import subprocess
from flask import Flask, request, render_template

app = Flask(__name__)

# DEBUG flag left enabled in production config
app.config['DEBUG'] = True

@app.route('/ping')
def ping_server():
    # HIGH - Command Injection Vulnerability
    target_host = request.args.get('host', 'localhost')
    command = "ping -c 1 " + target_host
    output = os.system(command)
    return f"Ping executed with status: {output}"

@app.route('/exec')
def execute_system():
    # CRITICAL - Exec of user inputs
    cmd = request.args.get('cmd')
    exec(cmd)
    return "Executed successfully"

@app.route('/unserialize')
def restore_session():
    # HIGH - Unsafe Pickle Deserialization
    user_session = request.cookies.get('session_data')
    if user_session:
        data = pickle.loads(bytes.fromhex(user_session))
        return f"Welcome back {data.get('user', 'Guest')}"
    return "No session"

@app.route('/read_config')
def read_config():
    # HIGH - Path Traversal (Directory Traversal)
    file_name = request.args.get('file')
    with open(f"/app/config/{file_name}", "r") as f:
        return f.read()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
`,
    size: 1048,
    lines: 44,
    language: 'python',
    scanStatus: 'idle',
    issuesCount: { critical: 1, high: 3, medium: 1, low: 0 }
  },
  {
    id: 'js_1',
    name: 'auth.js',
    path: 'src/utils/auth.js',
    content: `const mysql = require('mysql2');
const jwt = require('jsonwebtoken');

// CRITICAL - Hardcoded Secret / Token Signature Key
const JWT_SECRET = "super_secret_master_key_998877_do_not_share";

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password123',
  database: 'auth_db'
});

// HIGH - SQL Injection through direct string interpolation
function authenticateUser(username, password) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
    pool.query(sql, (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
}

// MEDIUM - Weak Hashing Algorithm (MD5 used for sensitive data)
const crypto = require('crypto');
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// LOW - Broad except clause / uncaught database details
function debugUserInfo(userId) {
  try {
    const query = \`SELECT * FROM user_details WHERE id = \${userId}\`;
    pool.query(query, (err, res) => {
      console.log("Details found: ", res);
    });
  } catch (e) {
    // Broad catch that logs the entire exception stack trace including DB settings
    console.error("DB Error occured: " + e.message);
  }
}

module.exports = { authenticateUser, JWT_SECRET, hashPassword };
`,
    size: 1190,
    lines: 45,
    language: 'javascript',
    scanStatus: 'idle',
    issuesCount: { critical: 1, high: 1, medium: 1, low: 1 }
  },
  {
    id: 'php_1',
    name: 'index.php',
    path: 'web/index.php',
    content: `<?php
// PHP Security Playground demo

$user_profile = $_GET['id'];

// CRITICAL - Insecure evaluation / Eval Code Injection
if (isset($_GET['eval_code'])) {
    $code = $_GET['eval_code'];
    eval($code); 
}

// HIGH - SQL injection via dynamic query string
$conn = new mysqli("localhost", "db_user", "root_pass", "records");
$query = "SELECT * FROM transactions WHERE profile_id = " . $user_profile;
$result = $conn->query($query);

// MEDIUM - Reflected Cross-Site Scripting (XSS) via unescaped output
echo "<div>Welcome back, user " . $_GET['username'] . "!</div>";

// LOW - FIXME comments referencing credential security leaks
// FIXME: Need to replace hardcoded DB user with env variables before publishing!
?>
`,
    size: 678,
    lines: 21,
    language: 'php',
    scanStatus: 'idle',
    issuesCount: { critical: 1, high: 1, medium: 1, low: 1 }
  },
  {
    id: 'ts_1',
    name: 'server.ts',
    path: 'src/server.ts',
    content: `import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

// MEDIUM - Wildcard CORS Allowed for all external connections
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/api/status', (req, res) => {
  res.json({ status: 'online' });
});

app.get('/api/redirect', (req, res) => {
  // MEDIUM - Unvalidated Redirect Url
  const target = req.query.url as string;
  if (target) {
    res.redirect(target);
  } else {
    res.send('No target URL provided');
  }
});

// LOW - Commented out credentials block
// const ADMIN_PASS = "OmniAuditAdmin2026!";

app.listen(PORT, () => {
  console.log(\`Server is running on port \${PORT}\`);
});
`,
    size: 795,
    lines: 36,
    language: 'typescript',
    scanStatus: 'idle',
    issuesCount: { critical: 0, high: 0, medium: 2, low: 1 }
  },
  {
    id: 'yaml_1',
    name: 'config.yaml',
    path: 'kubernetes/config.yaml',
    content: `apiVersion: v1
kind: Pod
metadata:
  name: omniaudit-demo-app
spec:
  containers:
  - name: application
    image: node:18-alpine
    securityContext:
      # HIGH - Overly permissive runtime privilege escalation container settings
      privileged: true
      allowPrivilegeEscalation: true
    env:
    - name: DATABASE_PORT
      value: "5432"
    # LOW - TODO regarding certificate management
    # TODO: Migrate TLS certificates to Vault secrets manager before audit
`,
    size: 412,
    lines: 17,
    language: 'yaml',
    scanStatus: 'idle',
    issuesCount: { critical: 0, high: 1, medium: 0, low: 1 }
  },
  {
    id: 'py_2',
    name: 'worker.py',
    path: 'src/legacy/worker.py',
    content: `import os
import subprocess
import pickle
from flask import request

API_TOKEN = "ghp_1234567890abcdefghijklmnopqrstuv"


def run_job():
    cmd = request.args.get("cmd")
    subprocess.run(cmd, shell=True, check=False)
    return "job complete"


def restore_state(payload):
    return pickle.loads(bytes.fromhex(payload))
`,
    size: 620,
    lines: 16,
    language: 'python',
    scanStatus: 'idle',
    issuesCount: { critical: 1, high: 1, medium: 0, low: 0 }
  },
  {
    id: 'js_2',
    name: 'portal.js',
    path: 'src/legacy/portal.js',
    content: `const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: '*' }));

app.get('/redirect', (req, res) => {
  const target = req.query.url;
  eval(target);
  res.send('redirected');
});
`,
    size: 340,
    lines: 12,
    language: 'javascript',
    scanStatus: 'idle',
    issuesCount: { critical: 1, high: 1, medium: 1, low: 0 }
  }
];

export const DEMO_VULNERABILITIES: Vulnerability[] = [
  // .env
  {
    id: 'v_env_aws',
    fileId: 'env_1',
    fileName: '.env',
    filePath: '.env',
    line: 6,
    severity: 'critical',
    type: 'Hardcoded AWS Access Credentials',
    codeSnippet: 'AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"\nAWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
    description: 'Active AWS key identifiers and secret pairs found exposed in plain text files.',
    riskExplanation: 'Compromising AWS keys allows external actors to take complete control of your AWS accounts, spawn virtual machines for crypto-mining, access highly sensitive data buckets, and generate substantial resource bills.',
    cwe: 'CWE-798: Use of Hard-coded Credentials',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    proposedFix: '# AWS Configuration - Read from secure system environment variables or Vault\n# AWS_ACCESS_KEY_ID is now fetched dynamically by standard SDKs',
    diffOriginal: 'AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"\nAWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
    diffNew: '# Retrieve credentials at runtime from secure environment variables or AWS IAM Roles\n# Do not commit credentials in local source files.',
    fixExplanation: 'Removed the plain text AWS credentials. Modern applications should fetch keys dynamically from a secure environment or leverage temporary IAM instance profiles (like AWS ECS task roles or GCP service accounts) to avoid file-level exposures completely.',
    fixed: false
  },
  {
    id: 'v_env_db',
    fileId: 'env_1',
    fileName: '.env',
    filePath: '.env',
    line: 10,
    severity: 'critical',
    type: 'Hardcoded Database Credentials',
    codeSnippet: 'DATABASE_URL="postgresql://admin_user:P@$$w0rd_987654@prod-db-instance.c9g8k7.us-east-1.rds.amazonaws.com:5432/customer_records"',
    description: 'Plaintext database connection string containing master user credentials exposed in configuration file.',
    riskExplanation: 'Exposing database URIs with passwords enables malicious users to access and download entire customer tables, execute drop commands, inject ransomware, and leak private user details.',
    cwe: 'CWE-259: Use of Hard-coded Password',
    owasp: 'OWASP A02:2021-Cryptographic Failures',
    proposedFix: '# Fetch database password from a runtime secrets manager dynamically\nDATABASE_URL=process.env.DATABASE_URL',
    diffOriginal: 'DATABASE_URL="postgresql://admin_user:P@$$w0rd_987654@prod-db-instance.c9g8k7.us-east-1.rds.amazonaws.com:5432/customer_records"',
    diffNew: 'DATABASE_URL="${DATABASE_URL}" # Connection string is securely loaded at runtime from platform settings',
    fixExplanation: 'Replaced the hardcoded password string with a secure variable lookup. Database access passwords should be managed using platform secrets (such as Heroku, Vercel, or GCP secrets panel) and never recorded in local files.',
    fixed: false
  },
  {
    id: 'v_env_stripe',
    fileId: 'env_1',
    fileName: '.env',
    filePath: '.env',
    line: 13,
    severity: 'critical',
    type: 'Hardcoded Third-Party API Secret Key',
    codeSnippet: 'STRIPE_API_KEY="sk_test_demo_do_not_use"',
    description: 'Stripe merchant key (even test keys) should not be hardcoded.',
    riskExplanation: 'Exposing payment processing merchant keys permits hostile entities to intercept invoices, process unauthorized customer refunds, trigger fraudulent transactions, and steal financial logs.',
    cwe: 'CWE-798: Use of Hard-coded Credentials',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    proposedFix: 'STRIPE_API_KEY=process.env.STRIPE_SECRET_KEY',
    diffOriginal: 'STRIPE_API_KEY="sk_test_demo_do_not_use"',
    diffNew: '# Loaded at runtime via secure platform container variables\nSTRIPE_API_KEY=""',
    fixExplanation: 'Replaced plain text Stripe merchant keys. Merchant private APIs should reside in secure system environments.',
    fixed: false
  },
  {
    id: 'v_env_gemini',
    fileId: 'env_1',
    fileName: '.env',
    filePath: '.env',
    line: 14,
    severity: 'critical',
    type: 'Hardcoded Google/Gemini API Key',
    codeSnippet: 'GEMINI_API_KEY="AIzaSyA1b2c3d4e5f6g7h8i9j0k_OmniAudit"',
    description: 'Plaintext Google API / Gemini SDK authorization key discovered in file.',
    riskExplanation: 'Unchecked access keys allow third parties to exhaust your model compute quotas, run up high API billing charges, and access model contexts.',
    cwe: 'CWE-798: Use of Hard-coded Credentials',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    proposedFix: 'GEMINI_API_KEY=process.env.GEMINI_API_KEY',
    diffOriginal: 'GEMINI_API_KEY="AIzaSyA1b2c3d4e5f6g7h8i9j0k_OmniAudit"',
    diffNew: '# Managed securely in system cloud environment variables\nGEMINI_API_KEY=""',
    fixExplanation: 'Removed key. The application will leverage container environment properties inside GCP/AWS.',
    fixed: false
  },

  // main.py
  {
    id: 'v_py_exec',
    fileId: 'py_1',
    fileName: 'main.py',
    filePath: 'src/main.py',
    line: 21,
    severity: 'critical',
    type: 'Dangerous Arbitrary Code Execution (exec)',
    codeSnippet: '    cmd = request.args.get(\'cmd\')\n    exec(cmd)',
    description: 'Evaluating dynamically supplied user strings directly into the Python interpreter execution runtime (exec).',
    riskExplanation: 'Direct execution of user strings permits complete control over the Python application process. Hackers can spawn reverse-shells, modify source files, delete data, or run arbitrary terminal payloads.',
    cwe: 'CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code',
    owasp: 'OWASP A03:2021-Injection',
    proposedFix: '    # Eliminate dangerous exec() calls entirely. Implement custom whitelist parsing.\n    raise PermissionError("Direct dynamic code execution is forbidden.")',
    diffOriginal: '    cmd = request.args.get(\'cmd\')\n    exec(cmd)',
    diffNew: '    # Forbidden: Dynamic exec is eliminated\n    raise PermissionError("Arbitrary engine execution is strictly blocked.")',
    fixExplanation: 'Removed the Python `exec()` command entirely. Unauthenticated code execution must never be permitted in web apps. Any logic requiring command dispatch should rely on hardcoded maps or strict key lookups.',
    fixed: false
  },
  {
    id: 'v_py_cmd_inj',
    fileId: 'py_1',
    fileName: 'main.py',
    filePath: 'src/main.py',
    line: 13,
    severity: 'high',
    type: 'OS Command Injection via Shell execution',
    codeSnippet: '    target_host = request.args.get(\'host\', \'localhost\')\n    command = "ping -c 1 " + target_host\n    output = os.system(command)',
    description: 'Concatenating raw unvalidated request parameters directly into a system terminal command execute shell (`os.system`).',
    riskExplanation: 'By appending shell operators (such as `;`, `&&`, or `|`), an attacker can execute arbitrary OS commands on your host system. For example, a host value of `127.0.0.1; rm -rf /` would delete workspace files.',
    cwe: 'CWE-78: Improper Neutralization of Special Elements used in an OS Command',
    owasp: 'OWASP A03:2021-Injection',
    proposedFix: '    import shlex\n    target_host = request.args.get(\'host\', \'localhost\')\n    # Sanitize inputs or use subprocess with array formatting and no shell execution\n    subprocess.run(["ping", "-c", "1", target_host], check=True, capture_output=True)',
    diffOriginal: '    target_host = request.args.get(\'host\', \'localhost\')\n    command = "ping -c 1 " + target_host\n    output = os.system(command)',
    diffNew: '    import socket\n    target_host = request.args.get(\'host\', \'localhost\')\n    # Validate as IP address first to block injection payloads\n    try:\n        socket.gethostbyname(target_host)\n    except socket.gaierror:\n        return "Invalid hostname", 400\n    # Use structured process array to execute safely without Shell shell context\n    subprocess.run(["ping", "-c", "1", target_host], capture_output=True)',
    fixExplanation: 'Swapped `os.system` with a secure structured call to `subprocess.run` (without `shell=True`). We also resolve the target hostname via Python socket API first, confirming the host is a valid IP or domain before running terminal commands.',
    fixed: false
  },
  {
    id: 'v_py_pickle',
    fileId: 'py_1',
    fileName: 'main.py',
    filePath: 'src/main.py',
    line: 27,
    severity: 'high',
    type: 'Insecure Object Deserialization (pickle)',
    codeSnippet: '    user_session = request.cookies.get(\'session_data\')\n    if user_session:\n        data = pickle.loads(bytes.fromhex(user_session))',
    description: 'Unserializing untrusted hex streams via the built-in standard Python `pickle` deserializer module.',
    riskExplanation: 'Python Pickle format files can execute arbitrary shell codes automatically during the load phase. Loading unverified pickle payloads lets a malicious client inject remote shell commands inside cookie properties.',
    cwe: 'CWE-502: Deserialization of Untrusted Data',
    owasp: 'OWASP A08:2021-Software and Data Integrity Failures',
    proposedFix: '    import json\n    user_session = request.cookies.get(\'session_data\')\n    if user_session:\n        # Swapped to secure JSON parsing with cryptographic signing signatures\n        data = json.loads(user_session)',
    diffOriginal: '    user_session = request.cookies.get(\'session_data\')\n    if user_session:\n        data = pickle.loads(bytes.fromhex(user_session))',
    diffNew: '    import json, hmac, hashlib\n    # Use JSON instead of pickle, and verify signatures using secure platform keys\n    user_session = request.cookies.get(\'session_data\')\n    if user_session:\n        # Safer and standard data structure transport\n        data = json.loads(user_session)',
    fixExplanation: 'Replaced `pickle.loads` with native structured text JSON parsing (`json.loads`). Pickle serialization is insecure by design and should be replaced with JSON, Protocol Buffers, or cryptographically signed session tokens.',
    fixed: false
  },
  {
    id: 'v_py_path_trav',
    fileId: 'py_1',
    fileName: 'main.py',
    filePath: 'src/main.py',
    line: 34,
    severity: 'high',
    type: 'Uncontrolled Path Traversal (Directory Traversal)',
    codeSnippet: '    file_name = request.args.get(\'file\')\n    with open(f"/app/config/{file_name}", "r") as f:',
    description: 'Constructing local filesystem paths using unvalidated user inputs directly inside `open()` system file streams.',
    riskExplanation: 'Attackers can bypass application folders by passing path operators (`../../etc/passwd` or `..\..\windows\win.ini`), downloading server source codes, secret profiles, and critical keyrings.',
    cwe: 'CWE-22: Improper Limitation of a Pathname to a Restricted Directory',
    owasp: 'OWASP A01:2021-Broken Access Control',
    proposedFix: '    file_name = request.args.get(\'file\')\n    # Validate and secure filename, matching against a hardcoded safe whitelist\n    safe_name = os.path.basename(file_name)\n    with open(os.path.join("/app/config", safe_name), "r") as f:',
    diffOriginal: '    file_name = request.args.get(\'file\')\n    with open(f"/app/config/{file_name}", "r") as f:',
    diffNew: '    file_name = request.args.get(\'file\')\n    # Strict path verification and traversal check\n    base_dir = "/app/config"\n    safe_path = os.path.abspath(os.path.join(base_dir, file_name))\n    if not safe_path.startswith(os.path.abspath(base_dir)):\n        return "Forbidden Access", 403\n    with open(safe_path, "r") as f:',
    fixExplanation: 'Configured absolute path containment audits using `os.path.abspath` and verifying that the final target path remains within the `/app/config` base directory. This completely neutralizes `../` style traversal attacks.',
    fixed: false
  },
  {
    id: 'v_py_debug',
    fileId: 'py_1',
    fileName: 'main.py',
    filePath: 'src/main.py',
    line: 9,
    severity: 'medium',
    type: 'Debug Flag Left Enabled',
    codeSnippet: 'app.config[\'DEBUG\'] = True',
    description: 'Enabling active web application trace debugging within operational settings.',
    riskExplanation: 'Running applications with active debug settings prints system stack traces, database schema traces, and variables directly to end-users whenever an error occurs, providing map blueprints for target vectors.',
    cwe: 'CWE-489: Active Debug Code',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    proposedFix: 'app.config[\'DEBUG\'] = False',
    diffOriginal: 'app.config[\'DEBUG\'] = True',
    diffNew: 'app.config[\'DEBUG\'] = os.environ.get("FLASK_DEBUG", "False").lower() == "true"',
    fixExplanation: 'Migrated the debugger flag to an external environmental configuration. Debug modes are turned off in production by default, and can only be enabled explicitly in sandbox local nodes.',
    fixed: false
  },

  // auth.js
  {
    id: 'v_js_jwt',
    fileId: 'js_1',
    fileName: 'auth.js',
    filePath: 'src/utils/auth.js',
    line: 5,
    severity: 'critical',
    type: 'Hardcoded Cryptographic Token Key',
    codeSnippet: 'const JWT_SECRET = "super_secret_master_key_998877_do_not_share";',
    description: 'Hardcoded plaintext cryptographic signature key used for issuing JWT cookies and hashes.',
    riskExplanation: 'If an attacker retrieves this key from source code, they can forge highly privileged JWT auth session tokens, impersonate system administrators, bypass credentials checks, and access all tenant data.',
    cwe: 'CWE-321: Use of Hard-coded Cryptographic Key',
    owasp: 'OWASP A02:2021-Cryptographic Failures',
    proposedFix: 'const JWT_SECRET = process.env.JWT_SIGNING_KEY;',
    diffOriginal: 'const JWT_SECRET = "super_secret_master_key_998877_do_not_share";',
    diffNew: 'const JWT_SECRET = process.env.JWT_SIGNING_KEY; // Loaded from secure env variables',
    fixExplanation: 'Extracted the hardcoded signing key to `process.env.JWT_SIGNING_KEY`. Token validation secrets must remain dynamic and are set inside secured containers during application boot.',
    fixed: false
  },
  {
    id: 'v_js_sql_inj',
    fileId: 'js_1',
    fileName: 'auth.js',
    filePath: 'src/utils/auth.js',
    line: 16,
    severity: 'high',
    type: 'SQL Injection via String Interpolation',
    codeSnippet: '    const sql = "SELECT * FROM users WHERE username = \'" + username + "\' AND password = \'" + password + "\'";',
    description: 'Executing database queries using raw unvalidated string addition and parameters interpolation.',
    riskExplanation: 'Attackers can bypass login checks entirely by entering input patterns like `admin\' OR \'1\'=\'1`. This allows logging in as any user and retrieving complete underlying system datasets.',
    cwe: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command',
    owasp: 'OWASP A03:2021-Injection',
    proposedFix: '    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";\n    pool.query(sql, [username, password], (err, results) => { ... });',
    diffOriginal: '    const sql = "SELECT * FROM users WHERE username = \'" + username + "\' AND password = \'" + password + "\'";\n    pool.query(sql, (err, results) => {',
    diffNew: '    // Use standard parameterized query inputs\n    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";\n    pool.query(sql, [username, password], (err, results) => {',
    fixExplanation: 'Refactored SQL queries to utilize parameterized statements with placeholder arrays (`?`). This treats user inputs strictly as parameters rather than executable SQL directives.',
    fixed: false
  },
  {
    id: 'v_js_md5',
    fileId: 'js_1',
    fileName: 'auth.js',
    filePath: 'src/utils/auth.js',
    line: 27,
    severity: 'medium',
    type: 'Weak Hashing Function (MD5)',
    codeSnippet: 'function hashPassword(password) {\n  return crypto.createHash(\'md5\').update(password).digest(\'hex\');\n}',
    description: 'Using legacy MD5 cryptographic digest hash formats for sensitive passwords and tokens encryption.',
    riskExplanation: 'MD5 is highly susceptible to collision attacks and instant decryption via online rainbow lookup tables. MD5 is extremely insecure for password storage.',
    cwe: 'CWE-328: Use of Weak Cryptographic Algorithm',
    owasp: 'OWASP A02:2021-Cryptographic Failures',
    proposedFix: 'const bcrypt = require(\'bcrypt\');\n// Hash password using strong password hashing like Argon2 or bcrypt\nreturn bcrypt.hash(password, 10);',
    diffOriginal: 'function hashPassword(password) {\n  return crypto.createHash(\'md5\').update(password).digest(\'hex\');\n}',
    diffNew: 'const bcrypt = require("bcrypt");\n// Utilizing modern secure bcrypt with high-work salt factors\nfunction hashPassword(password) {\n  return bcrypt.hashSync(password, 12);\n}',
    fixExplanation: 'Migrated MD5 password encryption to `bcrypt` hashing with 12 salt rounds, ensuring protection against modern brute force and dictionary lookup databases.',
    fixed: false
  },
  {
    id: 'v_js_err',
    fileId: 'js_1',
    fileName: 'auth.js',
    filePath: 'src/utils/auth.js',
    line: 38,
    severity: 'low',
    type: 'Database Exception Information Leak',
    codeSnippet: '  } catch (e) {\n    // Broad catch that logs the entire exception stack trace including DB settings\n    console.error("DB Error occured: " + e.message);\n  }',
    description: 'Broad application catches reporting raw stack details or infrastructure error descriptions directly to runtime logs.',
    riskExplanation: 'Revealing system exception paths and internal structure components makes it easier for bad actors to find software packages, version configurations, and platform layouts.',
    cwe: 'CWE-209: Generation of Error Message Containing Sensitive Information',
    owasp: 'OWASP A09:2021-Security Logging and Monitoring Failures',
    proposedFix: '  } catch (e) {\n    // Write details to an offline secure diagnostic log file, and show a safe custom error message to user\n    console.error("Database connection failure. Code reference: ERR_DB_X5");\n  }',
    diffOriginal: '  } catch (e) {\n    // Broad catch that logs the entire exception stack trace including DB settings\n    console.error("DB Error occured: " + e.message);\n  }',
    diffNew: '  } catch (e) {\n    // Mask and map internal database issues using safe codes\n    console.error("Database connection failure. Generic Code Reference: ERR_DB_500");\n  }',
    fixExplanation: 'Sanitized internal database logging. Internal details are recorded in private server error files, while generic system indicators are logged to the console.',
    fixed: false
  },

  // php_1
  {
    id: 'v_php_eval',
    fileId: 'php_1',
    fileName: 'index.php',
    filePath: 'web/index.php',
    line: 8,
    severity: 'critical',
    type: 'Uncontrolled Eval Execution',
    codeSnippet: 'if (isset($_GET[\'eval_code\'])) {\n    $code = $_GET[\'eval_code\'];\n    eval($code); \n}',
    description: 'Passing direct unvalidated query inputs inside PHP language `eval()` commands.',
    riskExplanation: 'Executing dynamic text payloads lets client nodes run unauthenticated PHP scripts, install web-shells, wipe server files, and take total control over host containers.',
    cwe: 'CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code',
    owasp: 'OWASP A03:2021-Injection',
    proposedFix: '// Remove eval altogether. Never parse arbitrary strings inside runtime systems.',
    diffOriginal: 'if (isset($_GET[\'eval_code\'])) {\n    $code = $_GET[\'eval_code\'];\n    eval($code); \n}',
    diffNew: '// Eliminated eval block to secure code execution limits.',
    fixExplanation: 'Removed the unsafe evaluation mechanism. Under no circumstances should runtime user properties be processed through dynamic system evaluation modules.',
    fixed: false
  },
  {
    id: 'v_php_sql',
    fileId: 'php_1',
    fileName: 'index.php',
    filePath: 'web/index.php',
    line: 14,
    severity: 'high',
    type: 'SQL Injection in MySQLi Connector',
    codeSnippet: '$query = "SELECT * FROM transactions WHERE profile_id = " . $user_profile;\n$result = $conn->query($query);',
    description: 'Direct concatenation of query values inside SQL statement execution paths.',
    riskExplanation: 'Exploitable database inputs can execute unauthorized command batches, dump password catalogs, and corrupt table sets.',
    cwe: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command',
    owasp: 'OWASP A03:2021-Injection',
    proposedFix: '$stmt = $conn->prepare("SELECT * FROM transactions WHERE profile_id = ?");\n$stmt->bind_param("i", $user_profile);\n$stmt->execute();',
    diffOriginal: '$query = "SELECT * FROM transactions WHERE profile_id = " . $user_profile;\n$result = $conn->query($query);',
    diffNew: '$stmt = $conn->prepare("SELECT * FROM transactions WHERE profile_id = ?");\n$stmt->bind_param("i", $user_profile);\n$stmt->execute();\n$result = $stmt->get_result();',
    fixExplanation: 'Converted to MySQLi prepared statements with explicit parameter binding.',
    fixed: false
  },
  {
    id: 'v_php_xss',
    fileId: 'php_1',
    fileName: 'index.php',
    filePath: 'web/index.php',
    line: 18,
    severity: 'medium',
    type: 'Reflected Cross-Site Scripting (XSS)',
    codeSnippet: 'echo "<div>Welcome back, user " . $_GET[\'username\'] . "!</div>";',
    description: 'Printing raw user URL parameters back to the browser without sanitization or HTML escaping.',
    riskExplanation: 'Attackers can share links containing dynamic JavaScript parameters (`<script>steal_cookies()</script>`), executing malicious code within victims\' browsers to compromise active session credentials.',
    cwe: 'CWE-79: Improper Neutralization of Input During Web Page Generation',
    owasp: 'OWASP A03:2021-Injection',
    proposedFix: 'echo "<div>Welcome back, user " . htmlspecialchars($_GET[\'username\'], ENT_QUOTES, \'UTF-8\') . "!</div>";',
    diffOriginal: 'echo "<div>Welcome back, user " . $_GET[\'username\'] . "!</div>";',
    diffNew: 'echo "<div>Welcome back, user " . htmlspecialchars($_GET[\'username\'], ENT_QUOTES, \'UTF-8\') . "!</div>";',
    fixExplanation: 'Wrapped HTML outputs inside PHP `htmlspecialchars()` with secure parameters (`ENT_QUOTES`) to prevent malicious character translation.',
    fixed: false
  },
  {
    id: 'v_php_comment',
    fileId: 'php_1',
    fileName: 'index.php',
    filePath: 'web/index.php',
    line: 20,
    severity: 'low',
    type: 'Insecure Development Todo Comment',
    codeSnippet: '// FIXME: Need to replace hardcoded DB user with env variables before publishing!',
    description: 'Comments left in code revealing security configurations or structural issues.',
    riskExplanation: 'Internal comments highlight architecture weaknesses and point attackers directly to vulnerabilities.',
    cwe: 'CWE-615: Information Exposure Through Comments',
    owasp: 'OWASP A09:2021-Security Logging and Monitoring Failures',
    proposedFix: '// Clean comment block before launching code.',
    diffOriginal: '// FIXME: Need to replace hardcoded DB user with env variables before publishing!',
    diffNew: '// Standard production config verified.',
    fixExplanation: 'Removed specific developer commentary regarding database credential configuration leaks.',
    fixed: false
  },

  // ts_1
  {
    id: 'v_ts_cors',
    fileId: 'ts_1',
    fileName: 'server.ts',
    filePath: 'src/server.ts',
    line: 8,
    severity: 'medium',
    type: 'Excessive CORS Wildcard Configuration',
    codeSnippet: 'app.use(cors({\n  origin: \'*\'',
    description: 'Enabling unrestricted Cross-Origin Resource Sharing (CORS) with wildcards (`*`) inside production route handlers.',
    riskExplanation: 'Allows any unauthorized external website to initiate background network fetches against your APIs, potentially compromising tenant datasets.',
    cwe: 'CWE-942: Permissive Relation of Multiple Resources to Common Origin',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    proposedFix: 'app.use(cors({\n  origin: ["https://trusted-domain.com"]\n}));',
    diffOriginal: 'app.use(cors({\n  origin: \'*\'',
    diffNew: 'const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["https://app.omniaudit.io"];\napp.use(cors({\n  origin: (origin, callback) => {\n    if (!origin || allowedOrigins.indexOf(origin) !== -1) {\n      callback(null, true);\n    } else {\n      callback(new Error("CORS policy violation"));\n    }\n  }',
    fixExplanation: 'Replaced wildcard CORS configurations with an explicit whitelist domain array dynamically loaded at runtime.',
    fixed: false
  },
  {
    id: 'v_ts_redirect',
    fileId: 'ts_1',
    fileName: 'server.ts',
    filePath: 'src/server.ts',
    line: 20,
    severity: 'medium',
    type: 'Open / Unvalidated Redirect Redirect',
    codeSnippet: '  const target = req.query.url as string;\n  if (target) {\n    res.redirect(target);',
    description: 'Dispatching HTTP redirections using dynamic unvalidated inputs from users.',
    riskExplanation: 'Enables open-redirect phishing campaigns where hackers use your trusted domain to forward users to credential-harvesting pages.',
    cwe: 'CWE-601: URL Redirection to Untrusted Site',
    owasp: 'OWASP A01:2021-Broken Access Control',
    proposedFix: '  // Restrict redirects to local paths or an explicit domain whitelist\n  if (target && target.startsWith(\'/\')) {\n    res.redirect(target);\n  }',
    diffOriginal: '  const target = req.query.url as string;\n  if (target) {\n    res.redirect(target);',
    diffNew: '  const target = req.query.url as string;\n  // Restrict redirects to safe relative paths starting with "/"\n  if (target && target.startsWith("/")) {\n    res.redirect(target);\n  } else {\n    res.status(400).send("Invalid target domainredirect.");\n  }',
    fixExplanation: 'Implemented restriction checks enforcing relative paths (e.g. starting with `/`), blocking external redirections.',
    fixed: false
  },
  {
    id: 'v_ts_comment',
    fileId: 'ts_1',
    fileName: 'server.ts',
    filePath: 'src/server.ts',
    line: 29,
    severity: 'low',
    type: 'Commented out credentials block',
    codeSnippet: '// const ADMIN_PASS = "OmniAuditAdmin2026!";',
    description: 'Leftover code remarks containing potential security passwords.',
    riskExplanation: 'Provides code breakers with password lists or pattern matches.',
    cwe: 'CWE-615: Information Exposure Through Comments',
    owasp: 'OWASP A09:2021-Security Logging and Monitoring Failures',
    proposedFix: '// Clean comment block before production launch.',
    diffOriginal: '// const ADMIN_PASS = "OmniAuditAdmin2026!";',
    diffNew: '',
    fixExplanation: 'Successfully removed commented credentials from the code.',
    fixed: false
  },

  // yaml_1
  {
    id: 'v_yaml_priv',
    fileId: 'yaml_1',
    fileName: 'config.yaml',
    filePath: 'kubernetes/config.yaml',
    line: 11,
    severity: 'high',
    type: 'Insecure Container Privilege Level (allowPrivilegeEscalation)',
    codeSnippet: '      privileged: true\n      allowPrivilegeEscalation: true',
    description: 'Launching Docker containers with high container permissions and kernel access levels.',
    riskExplanation: 'Privileged pods can mount host filesystem drives, access Docker commands, and escape container environments to access underlying cloud host networks.',
    cwe: 'CWE-250: Execution with Unnecessary Privileges',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    proposedFix: '      privileged: false\n      allowPrivilegeEscalation: false',
    diffOriginal: '      privileged: true\n      allowPrivilegeEscalation: true',
    diffNew: '      privileged: false\n      allowPrivilegeEscalation: false\n      readOnlyRootFilesystem: true',
    fixExplanation: 'Set security parameters to false and configured a read-only root system context to secure containers.',
    fixed: false
  },
  {
    id: 'v_yaml_todo',
    fileId: 'yaml_1',
    fileName: 'config.yaml',
    filePath: 'kubernetes/config.yaml',
    line: 16,
    severity: 'low',
    type: 'Todo comment referencing key vault setup',
    codeSnippet: '    # TODO: Migrate TLS certificates to Vault secrets manager before audit',
    description: 'Operational notes highlighting weaknesses in configuration files.',
    riskExplanation: 'Exposes pending secrets migration lists.',
    cwe: 'CWE-615: Information Exposure Through Comments',
    owasp: 'OWASP A09:2021-Security Logging and Monitoring Failures',
    proposedFix: '# Vault secrets task tracking should live in JIRA/GitHub, not in YAML files',
    diffOriginal: '    # TODO: Migrate TLS certificates to Vault secrets manager before audit',
    diffNew: '',
    fixExplanation: 'Removed todo text from YAML code properties.',
    fixed: false
  },
  {
    id: 'v_py2_token',
    fileId: 'py_2',
    fileName: 'worker.py',
    filePath: 'src/legacy/worker.py',
    line: 6,
    severity: 'critical',
    type: 'Hardcoded GitHub Token',
    codeSnippet: 'API_TOKEN = "ghp_1234567890abcdefghijklmnopqrstuv"',
    description: 'A GitHub personal access token is checked into source code.',
    riskExplanation: 'A leaked token can be abused to read private code, trigger workflows, and exfiltrate repository data.',
    cwe: 'CWE-798: Use of Hard-coded Credentials',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    proposedFix: 'API_TOKEN = os.environ.get("GITHUB_TOKEN")',
    diffOriginal: 'API_TOKEN = "ghp_1234567890abcdefghijklmnopqrstuv"',
    diffNew: 'API_TOKEN = os.environ.get("GITHUB_TOKEN")',
    fixExplanation: 'Moved the GitHub token to a runtime environment variable to prevent source-code disclosure.',
    fixed: false
  },
  {
    id: 'v_py2_cmd',
    fileId: 'py_2',
    fileName: 'worker.py',
    filePath: 'src/legacy/worker.py',
    line: 10,
    severity: 'high',
    type: 'OS Command Injection Risk',
    codeSnippet: 'subprocess.run(cmd, shell=True, check=False)',
    description: 'The worker executes request-controlled commands via the shell.',
    riskExplanation: 'Shell-enabled execution allows attackers to inject extra OS commands into the process.',
    cwe: 'CWE-78: Improper Neutralization of Special Elements used in an OS Command',
    owasp: 'OWASP A03:2021-Injection',
    proposedFix: 'subprocess.run(["/bin/sh", "-c", "echo ok"], shell=False)',
    diffOriginal: 'subprocess.run(cmd, shell=True, check=False)',
    diffNew: 'subprocess.run(["/bin/sh", "-c", "echo ok"], shell=False)',
    fixExplanation: 'Removed the unsafe shell-based command execution in favor of a fixed subprocess call.',
    fixed: false
  },
  {
    id: 'v_js2_cors',
    fileId: 'js_2',
    fileName: 'portal.js',
    filePath: 'src/legacy/portal.js',
    line: 5,
    severity: 'medium',
    type: 'Permissive CORS Configuration',
    codeSnippet: 'app.use(cors({ origin: "*" }));',
    description: 'The service accepts cross-origin requests from any site.',
    riskExplanation: 'Wildcard CORS policies enable hostile websites to trigger authenticated requests against the API.',
    cwe: 'CWE-942: Permissive Relation of Multiple Resources to Common Origin',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    proposedFix: 'app.use(cors({ origin: ["https://app.omniaudit.io"] }));',
    diffOriginal: 'app.use(cors({ origin: "*" }));',
    diffNew: 'app.use(cors({ origin: ["https://app.omniaudit.io"] }));',
    fixExplanation: 'Scoped the CORS policy to a trusted origin instead of allowing every origin.',
    fixed: false
  },
  {
    id: 'v_js2_eval',
    fileId: 'js_2',
    fileName: 'portal.js',
    filePath: 'src/legacy/portal.js',
    line: 8,
    severity: 'critical',
    type: 'Arbitrary Code Execution (eval)',
    codeSnippet: 'eval(target);',
    description: 'The route evaluates a query parameter as JavaScript.',
    riskExplanation: 'Dynamic evaluation of request values allows arbitrary script execution inside the server process.',
    cwe: 'CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code',
    owasp: 'OWASP A03:2021-Injection',
    proposedFix: 'const safeTarget = "/health"; res.redirect(safeTarget);',
    diffOriginal: 'eval(target);',
    diffNew: 'const safeTarget = "/health"; res.redirect(safeTarget);',
    fixExplanation: 'Removed the unsafe eval call and replaced it with a safe redirect flow.',
    fixed: false
  }
];
