import { FileRecord, Vulnerability } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiScanFiles(files: FileRecord[]): Promise<Vulnerability[]> {
  const formData = new FormData();
  
  files.forEach(file => {
    // Create a Blob from the file content to simulate a real file upload
    const blob = new Blob([file.content], { type: 'text/plain' });
    formData.append('files', blob, file.path); // Using file.path as the filename
  });

  const response = await fetch(`${API_BASE_URL}/api/scan`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to scan files');
  }

  const data = await response.json();
  
  // Map backend vulnerabilities to frontend format
  const mappedVulns: Vulnerability[] = (data.vulnerabilities || []).map((v: any, index: number) => {
    // Attempt to map the returned file to the original file to get its ID and path
    // Attempt to map the returned file to the original file to get its ID and path using cross-platform slashes and fallback name matching
    const normalizedVFile = v.file.replace(/\\/g, '/');
    const originalFile = files.find(f => {
      const normalizedFPath = f.path.replace(/\\/g, '/');
      return normalizedFPath === normalizedVFile || 
             normalizedFPath.endsWith('/' + normalizedVFile) ||
             normalizedVFile.endsWith('/' + normalizedFPath) ||
             f.name === v.file;
    });
    const fileId = originalFile ? originalFile.id : `unknown_${index}`;
    const filePath = originalFile ? originalFile.path : v.file;
    const fileName = originalFile ? originalFile.name : v.file.split(/[/\\]/).pop();

    const suggestedFix = v.fix_code || '// Secure resolution not provided by backend';

    return {
      id: v.id || `backend_vuln_${index}`,
      fileId: fileId,
      fileName: fileName,
      filePath: filePath,
      line: v.line,
      severity: (v.severity || 'low').toLowerCase() as any,
      type: v.type,
      codeSnippet: v.vulnerable_code || '',
      description: v.title || v.description,
      riskExplanation: v.why_dangerous || v.description,
      cwe: v.cve_reference || v.cwe || 'Unknown',
      owasp: 'OWASP mapped', // Backend doesn't provide this currently
      proposedFix: suggestedFix,
      diffOriginal: v.vulnerable_code || '',
      diffNew: `// SECURE RESOLUTION:\n${suggestedFix}`,
      fixExplanation: v.fix_description || 'Applied security fix based on scanner recommendation.',
      fixed: false
    };
  });

  return mappedVulns;
}

export async function apiRemediate(fileId: string, filePath: string, line: number, type: string, fixCode: string): Promise<boolean> {
  const payload = {
    file: filePath,
    line: line,
    type: type,
    fix_code: fixCode,
    severity: "low" // required by pydantic model but not strictly used for logic
  };

  const response = await fetch(`${API_BASE_URL}/api/remediate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to apply remediation');
  }

  return true;
}
