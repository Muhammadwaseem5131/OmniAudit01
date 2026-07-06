import { FileRecord, Vulnerability, Severity } from '../types';
import { DEMO_VULNERABILITIES } from '../data';

// Helper to estimate file language
export function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'py': return 'python';
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'jsx': return 'jsx';
    case 'tsx': return 'tsx';
    case 'json': return 'json';
    case 'yaml':
    case 'yml': return 'yaml';
    case 'php': return 'php';
    case 'env': return 'properties';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'sh': return 'shell';
    case 'go': return 'go';
    case 'java': return 'java';
    case 'rb': return 'ruby';
    default: return 'plaintext';
  }
}

// Browser static analysis rules
interface ScanRule {
  id: string;
  type: string;
  severity: Severity;
  pattern: RegExp;
  description: string;
  riskExplanation: string;
  cwe: string;
  owasp: string;
  suggestedFix: string;
}

const STATIC_SCAN_RULES: ScanRule[] = [
  {
    id: 'rule_aws',
    type: 'Hardcoded AWS Access Credentials',
    severity: 'critical',
    pattern: /AKIA[0-9A-Z]{16}/,
    description: 'An AWS Access Key ID (AKIA pattern) was found exposed in the source code.',
    riskExplanation: 'Compromising AWS keys allows external actors to take complete control of your AWS accounts, spawn virtual machines for crypto-mining, and read confidential databases.',
    cwe: 'CWE-798: Use of Hard-coded Credentials',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    suggestedFix: '# Read credentials at runtime from system environments or secure Vault\nAWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")'
  },
  {
    id: 'rule_generic_sk',
    type: 'Hardcoded Third-Party API Key',
    severity: 'critical',
    pattern: /(sk_live_[0-9a-zA-Z]{24})|(ghp_[0-9a-zA-Z]{36})|(xox[bap]-[0-9a-zA-Z-]{24})/,
    description: 'An API client key (Stripe live key, GitHub personal token, or Slack token) was found exposed in plain text.',
    riskExplanation: 'Exposing third-party merchant or access keys permits hostile entities to intercept service transactions, manipulate customer billing tables, and steal sensitive interaction files.',
    cwe: 'CWE-798: Use of Hard-coded Credentials',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    suggestedFix: '# Load secret variables from container execution properties\nAPI_KEY = process.env.API_SECRET_KEY'
  },
  {
    id: 'rule_g_api_key',
    type: 'Hardcoded Google/Gemini API Key',
    severity: 'critical',
    pattern: /AIzaSy[0-9a-zA-Z-_]{33}/,
    description: 'A Google Cloud or Gemini API Authorization Key was discovered in the file content.',
    riskExplanation: 'Unchecked access keys allow third parties to exhaust your model compute quotas, run up high API billing charges, and access model contexts.',
    cwe: 'CWE-798: Use of Hard-coded Credentials',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    suggestedFix: 'const GEMINI_API_KEY = process.env.GEMINI_API_KEY;'
  },
  {
    id: 'rule_hardcoded_pass',
    type: 'Hardcoded Plaintext Password',
    severity: 'critical',
    pattern: /(password|passwd|db_password|admin_pass)\s*=\s*['"][a-zA-Z0-9!@#$%^&*()_+-]{6,}['"]/i,
    description: 'A literal password assignment or credential string was found hardcoded in plain text.',
    riskExplanation: 'Exposing master passwords enables attackers to access core user stores, execute drop commands, inject ransomware, and leak credentials.',
    cwe: 'CWE-259: Use of Hard-coded Password',
    owasp: 'OWASP A02:2021-Cryptographic Failures',
    suggestedFix: 'const DB_PASS = process.env.DB_PASSWORD;'
  },
  {
    id: 'rule_private_key',
    type: 'Exposed Cryptographic Private Key',
    severity: 'critical',
    pattern: /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----/,
    description: 'An exposed SSH, RSA, or SSL private key block was found within the file contents.',
    riskExplanation: 'Acquiring private encryption keys allows bad actors to intercept and decrypt SSL/TLS sessions, forge digital signatures, and execute man-in-the-middle attacks.',
    cwe: 'CWE-321: Use of Hard-coded Cryptographic Key',
    owasp: 'OWASP A02:2021-Cryptographic Failures',
    suggestedFix: '# Store private keys in an environment credential service or secure vault'
  },
  {
    id: 'rule_sql_injection',
    type: 'SQL Injection Vulnerability',
    severity: 'high',
    pattern: /(SELECT|INSERT|UPDATE|DELETE)\s+.*\s+WHERE\s+.*['"]\s*\+\s*[a-zA-Z0-9_.]+|['"]\s*\+.*\+\s*['"]|f['"].*\{[a-zA-Z0-9_.]+\}/i,
    description: 'Dynamic SQL query string creation using variable concatenation instead of parameterized statements.',
    riskExplanation: 'Exploitable database inputs can execute unauthorized command batches, dump password catalogs, and corrupt table sets.',
    cwe: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command',
    owasp: 'OWASP A03:2021-Injection',
    suggestedFix: '// Use parameterized queries instead\nconst sql = "SELECT * FROM users WHERE id = ?";\npool.query(sql, [userId]);'
  },
  {
    id: 'rule_eval_exec',
    type: 'Arbitrary Code Execution (eval/exec)',
    severity: 'critical',
    pattern: /\b(eval|exec)\s*\(\s*[a-zA-Z0-9_.$[('"]/i,
    description: 'Direct evaluation of strings in dynamic runtimes via dangerous functions like eval() or exec().',
    riskExplanation: 'Evaluating dynamically supplied user strings permits complete control over the application process. Attackers can execute arbitrary terminal commands.',
    cwe: 'CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code',
    owasp: 'OWASP A03:2021-Injection',
    suggestedFix: '// Eliminate eval entirely. Parse input against whitelisted commands or lookup tables.'
  },
  {
    id: 'rule_shell_command',
    type: 'OS Command Injection Risk',
    severity: 'high',
    pattern: /\bos\.(system|popen)|subprocess\.run\s*\(\s*['"]|os\.system\s*\(/i,
    description: 'Constructing and running external command shells using raw unvalidated parameters.',
    riskExplanation: 'Appending command control characters (`;`, `&&`, or `|`) allows intruders to execute commands directly on the host operating system.',
    cwe: 'CWE-78: Improper Neutralization of Special Elements used in an OS Command',
    owasp: 'OWASP A03:2021-Injection',
    suggestedFix: '# Use array arguments inside subprocess.run() with shell=False\nsubprocess.run(["ping", "-c", "1", hostname], shell=False)'
  },
  {
    id: 'rule_path_traversal',
    type: 'Uncontrolled Path Traversal',
    severity: 'high',
    pattern: /\bopen\s*\(\s*f?['"].*\{[a-zA-Z0-9_.-]+\}/i,
    description: 'Opening file paths crafted dynamically using unvalidated string parameters.',
    riskExplanation: 'Attackers can append navigation patterns like `../../etc/passwd` to traverse server file systems, downloading secure configuration data and keys.',
    cwe: 'CWE-22: Improper Limitation of a Pathname to a Restricted Directory',
    owasp: 'OWASP A01:2021-Broken Access Control',
    suggestedFix: '# Use os.path.abspath and assert boundary starts with root directory'
  },
  {
    id: 'rule_md5',
    type: 'Weak Hashing Algorithm (MD5/SHA1)',
    severity: 'medium',
    pattern: /\b(md5|sha1)\b/i,
    description: 'Utilizing MD5 or SHA1 hashing algorithms for password encryption or token digests.',
    riskExplanation: 'MD5 and SHA1 are cryptographically broken, and vulnerable to fast collision attacks and near-instant pre-computed lookup decryptions.',
    cwe: 'CWE-328: Use of Weak Cryptographic Algorithm',
    owasp: 'OWASP A02:2021-Cryptographic Failures',
    suggestedFix: 'const bcrypt = require("bcrypt");\nconst hashed = bcrypt.hashSync(password, 12);'
  },
  {
    id: 'rule_cors_wildcard',
    type: 'Permissive CORS Configuration',
    severity: 'medium',
    pattern: /origin\s*:\s*['"]\*['"]|Access-Control-Allow-Origin\s*,\s*['"]\*['"]/i,
    description: 'Enabling wildcard Access-Control-Allow-Origin configs (*), opening APIs to all external actors.',
    riskExplanation: 'Hostile external websites can initiate cross-origin fetches on behalf of logged-in visitors, leading to unauthorized data requests.',
    cwe: 'CWE-942: Permissive Relation of Multiple Resources to Common Origin',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    suggestedFix: 'cors({ origin: ["https://app.omniaudit.io"] })'
  },
  {
    id: 'rule_debug_enabled',
    type: 'Trace Debug Mode Enabled',
    severity: 'medium',
    pattern: /\bDEBUG\s*=\s*True\b/i,
    description: 'Exposing detailed diagnostic debug trace parameters in active configuration scripts.',
    riskExplanation: 'Provides hackers with complete stack details, variables, and library versions when error endpoints are hit.',
    cwe: 'CWE-489: Active Debug Code',
    owasp: 'OWASP A05:2021-Security Misconfiguration',
    suggestedFix: 'DEBUG = os.environ.get("DEBUG_MODE", "False") == "True"'
  },
  {
    id: 'rule_todo',
    type: 'Security Todo Comment',
    severity: 'low',
    pattern: /\/\/\s*(TODO|FIXME).*(security|password|key|credentials|auth|db|cert)/i,
    description: 'Developer comments detailing security concerns or leftover configuration requirements.',
    riskExplanation: 'Reveals internal implementation concerns or temporary credentials bypasses to auditors and code breakers.',
    cwe: 'CWE-615: Information Exposure Through Comments',
    owasp: 'OWASP A09:2021-Security Logging and Monitoring Failures',
    suggestedFix: '// Track infrastructure tasks in a central ticket manager, not code remarks.'
  }
];

export function scanFile(file: FileRecord): Vulnerability[] {
  // If this is a demo file, retrieve its static predefined vulnerabilities
  const isDemo = file.id.startsWith('env_') || file.id.startsWith('py_') || file.id.startsWith('js_') || file.id.startsWith('php_') || file.id.startsWith('ts_') || file.id.startsWith('yaml_');
  if (isDemo) {
    return DEMO_VULNERABILITIES.filter(v => v.fileId === file.id);
  }

  // Scan user uploaded files statically line by line
  const lines = file.content.split('\n');
  const vulnerabilities: Vulnerability[] = [];

  lines.forEach((lineText, index) => {
    const lineNum = index + 1;
    STATIC_SCAN_RULES.forEach(rule => {
      if (rule.pattern.test(lineText)) {
        const id = `user_v_${file.id}_${rule.id}_${lineNum}`;
        const surroundingCode = lines
          .slice(Math.max(0, index - 1), Math.min(lines.length, index + 2))
          .join('\n');

        vulnerabilities.push({
          id,
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          line: lineNum,
          severity: rule.severity,
          type: rule.type,
          codeSnippet: lineText.trim(),
          description: rule.description,
          riskExplanation: rule.riskExplanation,
          cwe: rule.cwe,
          owasp: rule.owasp,
          proposedFix: rule.suggestedFix,
          diffOriginal: lineText,
          diffNew: `// SECURE RESOLUTION:\n${rule.suggestedFix}`,
          fixExplanation: `Secured line ${lineNum} against ${rule.type}. Replaced dynamic, hardcoded, or unsafe expressions with system environment calls or sanitized placeholders.`,
          fixed: false
        });
      }
    });
  });

  return vulnerabilities;
}
