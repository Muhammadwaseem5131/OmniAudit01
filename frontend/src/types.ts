export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type ScanStatus = 'idle' | 'scanning' | 'clean' | 'issues' | 'fixed';

export interface FileRecord {
  id: string;
  name: string;
  path: string;
  content: string;
  size: number;
  lines: number;
  language: string;
  scanStatus: ScanStatus;
  issuesCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface Vulnerability {
  id: string;
  fileId: string;
  fileName: string;
  filePath: string;
  line: number;
  severity: Severity;
  type: string;
  codeSnippet: string;
  description: string;
  riskExplanation: string;
  cwe: string;
  owasp: string;
  proposedFix: string;
  diffOriginal: string;
  diffNew: string;
  fixExplanation: string;
  fixed: boolean;
}

export interface ApiKeyConfig {
  key: string;
  model: string;
  status: 'none' | 'connected' | 'invalid';
}

export type LLMProvider = 'anthropic' | 'openai' | 'google' | 'mistral';

export interface Settings {
  apiKeys: Record<LLMProvider, ApiKeyConfig>;
  activeProvider: LLMProvider;
  preferences: {
    autoAdvance: boolean;
    showExplanations: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    language: string;
    themeColor?: 'sky' | 'emerald' | 'violet' | 'amber' | 'rose' | 'indigo';
  };
}

export type AgentType = 'cartographer' | 'secretHunter' | 'codeHunter' | 'uiArchitect' | 'remediationEng';

export interface AgentStatus {
  id: AgentType;
  name: string;
  iconName: string;
  status: 'waiting' | 'working' | 'done';
}

export interface ScanLogLine {
  id: string;
  agent: AgentType;
  text: string;
  timestamp: string;
}
