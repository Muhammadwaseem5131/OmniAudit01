import React, { useState, useEffect } from 'react';
import { FileRecord, Vulnerability, Settings, AgentType, AgentStatus, ScanLogLine, LLMProvider } from './types';
import { scanFile } from './utils/scannerEngine';
import { apiScanFiles, apiRemediate } from './utils/api';
import { DEMO_FILES } from './data';
import Navbar from './components/Navbar';
import SettingsModal from './components/SettingsModal';
import UploadZone from './components/UploadZone';
import FileCardsGrid from './components/FileCardsGrid';
import AgentPipeline from './components/AgentPipeline';
import ResultsDashboard from './components/ResultsDashboard';
import FixIDE from './components/FixIDE';
import SecurityReportView from './components/SecurityReportView';
import { CheckCircle, ShieldAlert, Sparkles, X } from 'lucide-react';
import JSZip from 'jszip';

const DEFAULT_SETTINGS: Settings = {
  apiKeys: {
    anthropic: { key: '', model: 'claude-sonnet-4-6', status: 'none' },
    openai: { key: '', model: 'gpt-4o', status: 'none' },
    google: { key: '', model: 'gemini-1.5-pro', status: 'none' },
    mistral: { key: '', model: 'mistral-large', status: 'none' }
  },
  activeProvider: 'anthropic',
  preferences: {
    autoAdvance: true,
    showExplanations: true,
    sensitivity: 'high',
    language: 'en',
    themeColor: 'sky'
  }
};

// Custom Local Toast Interface
interface LocalToast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  // Screens navigation state: 1 (Upload), 2 (Cards Grid), 3 (Live Pipeline), 4 (Results), 5 (Fix IDE), 6 (Report)
  const [currentScreen, setCurrentScreen] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [screenHistory, setScreenHistory] = useState<number[]>([1]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const getScreenName = (screenNum: number): string => {
    switch (screenNum) {
      case 1: return 'Upload Zone';
      case 2: return 'File Explorer';
      case 3: return 'Scan Pipeline';
      case 4: return 'Dashboard';
      case 5: return 'Remediation IDE';
      case 6: return 'Security Report';
      default: return 'Workspace';
    }
  };

  const navigateScreen = (screen: 1 | 2 | 3 | 4 | 5 | 6) => {
    if (screen === currentScreen) return;
    const nextHistory = screenHistory.slice(0, historyIndex + 1);
    nextHistory.push(screen);
    setScreenHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setCurrentScreen(screen);
  };

  const handleGoBackPage = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setCurrentScreen(screenHistory[nextIndex] as any);
      showToast(`Navigated back to ${getScreenName(screenHistory[nextIndex])}`, 'info');
    }
  };

  const handleGoForwardPage = () => {
    if (historyIndex < screenHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setCurrentScreen(screenHistory[nextIndex] as any);
      showToast(`Navigated forward to ${getScreenName(screenHistory[nextIndex])}`, 'info');
    }
  };

  const handleCloseIde = () => {
    if (historyIndex > 0) {
      handleGoBackPage();
    } else {
      navigateScreen(4);
    }
  };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Files & Vulnerabilities core DB states
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  
  // Scanned history/tracking list for Undo support
  const [undoStack, setUndoStack] = useState<{ files: FileRecord[]; vulnerabilities: Vulnerability[] }[]>([]);

  // Scan pipeline animation states
  const [filesQueueToScan, setFilesQueueToScan] = useState<FileRecord[]>([]);
  const [currentScanningFileIndex, setCurrentScanningFileIndex] = useState<number>(0);
  const [activeAgent, setActiveAgent] = useState<AgentType | null>(null);
  const [agents, setAgents] = useState<AgentStatus[]>([
    { id: 'cartographer', name: 'Cartographer', iconName: 'map', status: 'waiting' },
    { id: 'secretHunter', name: 'Secret Hunter', iconName: 'search', status: 'waiting' },
    { id: 'codeHunter', name: 'Code Hunter', iconName: 'zap', status: 'waiting' },
    { id: 'uiArchitect', name: 'UI Architect', iconName: 'palette', status: 'waiting' },
    { id: 'remediationEng', name: 'Remediation Eng', iconName: 'wrench', status: 'waiting' }
  ]);
  const [scanLogs, setScanLogs] = useState<ScanLogLine[]>([]);
  const [discoveredVulnerabilities, setDiscoveredVulnerabilities] = useState<Vulnerability[]>([]);
  const [scanProgressPercent, setScanProgressPercent] = useState<number>(0);

  // Active IDE drawer states
  const [activeIdeVulnId, setActiveIdeVulnId] = useState<string>('');

  // Toast states
  const [toasts, setToasts] = useState<LocalToast[]>([]);

  // Load settings on boot
  useEffect(() => {
    const saved = localStorage.getItem('omniaudit_api_keys');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to parse API keys', err);
      }
    }
  }, []);

  // Reset window scroll position whenever screen transitions occur
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [currentScreen]);

  // Save settings helper
  const handleSaveSettings = (nextSettings: Settings) => {
    setSettings(nextSettings);
    localStorage.setItem('omniaudit_api_keys', JSON.stringify(nextSettings));
  };

  // Toast Notification manager
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto dismiss after 3.2s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  // Remove toast manually
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // LOAD DEMO PLAYGROUND FILES
  const handleLoadDemoProject = () => {
    setFiles(DEMO_FILES);
    setVulnerabilities([]);
    setUndoStack([]);
    navigateScreen(2);
    showToast('✓ Demo Sandbox project loaded with 8 complex modules!', 'success');
  };

  // FILES UPLOAD TRIGGER
  const handleFilesUploaded = (uploadedFiles: FileRecord[]) => {
    setFiles(uploadedFiles);
    setVulnerabilities([]);
    setUndoStack([]);
    navigateScreen(2);
  };

  // COMPREHENSIVE SCAN ORCHESTRATOR
  const startScan = async (selectedFiles: FileRecord[]) => {
    setFilesQueueToScan(selectedFiles);
    setCurrentScanningFileIndex(0);
    setScanLogs([]);
    setDiscoveredVulnerabilities([]);
    setScanProgressPercent(0);
    
    // Reset all agents status
    setAgents(prev => prev.map(a => ({ ...a, status: 'waiting' })));

    // Transition view
    navigateScreen(3);
    showToast('Starting security scanning engine pipeline...', 'info');

    try {
      const backendVulns = await apiScanFiles(selectedFiles);
      // Run active sequential scan timer
      runScanningLoop(selectedFiles, 0, backendVulns);
    } catch (err: any) {
      showToast(`Backend scan failed: ${err.message}`, 'error');
      navigateScreen(2);
    }
  };

  // Scanning loop
  const runScanningLoop = (queue: FileRecord[], fileIdx: number, backendVulns: Vulnerability[]) => {
    if (fileIdx >= queue.length) {
      // COMPLETE SCAN FOR ALL FILES
      setScanProgressPercent(100);
      setAgents(prev => prev.map(a => ({ ...a, status: 'done' })));
      
      // Update the status of files in primary database state to represent complete scan
      setFiles(prevFiles => {
        return prevFiles.map(orig => {
          const wasInQueue = queue.some(q => q.id === orig.id);
          if (!wasInQueue) return orig;

          // Find issues count for this file from discovered list
          const fileVulns = discoveredVulnerabilities.filter(v => v.fileId === orig.id);
          const hasIssues = fileVulns.length > 0;
          
          return {
            ...orig,
            scanStatus: hasIssues ? 'issues' as const : 'clean' as const,
            issuesCount: {
              critical: fileVulns.filter(v => v.severity === 'critical').length,
              high: fileVulns.filter(v => v.severity === 'high').length,
              medium: fileVulns.filter(v => v.severity === 'medium').length,
              low: fileVulns.filter(v => v.severity === 'low').length
            }
          };
        });
      });

      // Save overall vulnerabilities
      setVulnerabilities(prev => {
        // Remove existing vulns for these files before adding newly scanned ones to avoid duplicates
        const fileIds = queue.map(q => q.id);
        const filtered = prev.filter(v => !fileIds.includes(v.fileId));
        return [...filtered, ...discoveredVulnerabilities];
      });

      setTimeout(() => {
        navigateScreen(4); // Move to Results
        showToast('✓ Repository security scan audit complete!', 'success');
      }, 1000);
      return;
    }

    setCurrentScanningFileIndex(fileIdx);
    const fileToScan = queue[fileIdx];
    
    // Scan the file statically right away to compile issues list for pipeline stages
    const fileVulns = backendVulns.filter(v => v.fileId === fileToScan.id);

    // Sequence of active Agents
    const agentSequence: AgentType[] = ['cartographer', 'secretHunter', 'codeHunter', 'uiArchitect', 'remediationEng'];
    let agentIdx = 0;

    const runAgentNode = () => {
      if (agentIdx >= agentSequence.length) {
        // Complete this individual file scan, progress to next file in queue
        const nextFileIdx = fileIdx + 1;
        const totalProgress = (nextFileIdx / queue.length) * 100;
        setScanProgressPercent(totalProgress);
        
        // Loop back
        runScanningLoop(queue, nextFileIdx, backendVulns);
        return;
      }

      const currentAgentId = agentSequence[agentIdx];
      setActiveAgent(currentAgentId);

      // Pulse working state on active agent
      setAgents(prev => prev.map(a => {
        if (a.id === currentAgentId) return { ...a, status: 'working' };
        // Mark previous agents as done
        const prevAgentIndex = agentSequence.indexOf(a.id);
        if (prevAgentIndex < agentIdx) return { ...a, status: 'done' };
        return a;
      }));

      // Add log entries based on file details and current agent focus
      const timestamp = new Date().toLocaleTimeString();
      let logsToAdd: string[] = [];

      switch (currentAgentId) {
        case 'cartographer':
          logsToAdd = [
            `Mapping folder node trees in path: ${fileToScan.path}`,
            `Loaded file segment size: ${fileToScan.size} bytes (${fileToScan.lines} lines of code parsed)`
          ];
          break;
        case 'secretHunter':
          const secrets = fileVulns.filter(v => v.severity === 'critical');
          logsToAdd = [
            `Scanning module symbols for exposed secrets and credential key signatures...`,
            secrets.length > 0 
              ? `⚠️ CRITICAL: Identified ${secrets.length} exposed token or key credentials!` 
              : `✓ Secret Hunter verification successful: no hardcoded credentials found.`
          ];
          break;
        case 'codeHunter':
          const codes = fileVulns.filter(v => v.severity === 'high');
          logsToAdd = [
            `Inspecting interpreter execution lines for dynamic code injections and traversals...`,
            codes.length > 0
              ? `⚠️ WARNING: Found ${codes.length} high priority input vulnerability exposures!`
              : `✓ Code Hunter verification successful: injection pathways clean.`
          ];
          break;
        case 'uiArchitect':
          const architectureIssues = fileVulns.filter(v => v.severity === 'medium');
          logsToAdd = [
            `Analyzing parameters configuration for XSS pathways and CORS wildcard protocols...`,
            architectureIssues.length > 0
              ? `⚠️ Alert: Detected ${architectureIssues.length} mid-severity misconfiguration issues.`
              : `✓ UI Architect validation complete: CORS and markup parameters secure.`
          ];
          break;
        case 'remediationEng':
          logsToAdd = [
            `Compiling security findings and scheduling automated patch queues...`,
            `Module ${fileToScan.name} audit catalog completed.`
          ];
          break;
      }

      // Progressively write logs and append findings to discovered feed
      logsToAdd.forEach((logText, lIdx) => {
        setTimeout(() => {
          setScanLogs(prev => [
            ...prev,
            {
              id: `log_${Math.random().toString(36).substr(2, 9)}`,
              agent: currentAgentId,
              text: logText,
              timestamp
            }
          ]);
        }, lIdx * 200);
      });

      // Filter and append any vulnerability found at this agent phase
      setTimeout(() => {
        let matchingVulns: Vulnerability[] = [];
        if (currentAgentId === 'secretHunter') {
          matchingVulns = fileVulns.filter(v => v.severity === 'critical');
        } else if (currentAgentId === 'codeHunter') {
          matchingVulns = fileVulns.filter(v => v.severity === 'high');
        } else if (currentAgentId === 'uiArchitect') {
          matchingVulns = fileVulns.filter(v => v.severity === 'medium');
        } else if (currentAgentId === 'remediationEng') {
          matchingVulns = fileVulns.filter(v => v.severity === 'low');
        }

        if (matchingVulns.length > 0) {
          setDiscoveredVulnerabilities(prev => [...prev, ...matchingVulns]);
        }

        // Proceed to next agent in line
        agentIdx++;
        setTimeout(runAgentNode, 700);
      }, 500);
    };

    runAgentNode();
  };

  // SCAN INDIVIDUAL FILE CARD TRIGGER
  const handleScanSingleFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      startScan([file]);
    }
  };

  // SCAN ALL REPOSITORY FILES TRIGGER
  const handleScanAllFiles = () => {
    if (files.length === 0) {
      showToast('No project files loaded to audit!', 'error');
      return;
    }
    startScan(files);
  };

  // ACTIVATE IDE REMEDIATION DRAWER ON SELECTION
  const handleFixVulnerability = (vuln: Vulnerability) => {
    setActiveIdeVulnId(vuln.id);
    navigateScreen(5); // Transition to Fix IDE Drawer
  };

  // ACTION: APPLY INDIVIDUAL PATCH MODIFICATION IN IDE
  const handleApplyFix = async (vulnId: string, customNewCode?: string) => {
    // 1. Snapshot previous state for undo capability
    setUndoStack(prev => [...prev, { files: JSON.parse(JSON.stringify(files)), vulnerabilities: JSON.parse(JSON.stringify(vulnerabilities)) }]);

    const vulnIndex = vulnerabilities.findIndex(v => v.id === vulnId);
    if (vulnIndex === -1) return;

    const targetVuln = vulnerabilities[vulnIndex];
    const targetFileIndex = files.findIndex(f => f.id === targetVuln.fileId);
    if (targetFileIndex === -1) return;

    const file = files[targetFileIndex];
    const replacementCode = customNewCode || targetVuln.diffNew.replace('// SECURE RESOLUTION:\n', '').trim();
    
    try {
      await apiRemediate(targetVuln.fileId, targetVuln.filePath, targetVuln.line, targetVuln.type, replacementCode);
    } catch (err: any) {
      showToast(`Remediation failed: ${err.message}`, 'error');
      // Revert undo stack addition since backend failed
      setUndoStack(prev => prev.slice(0, prev.length - 1));
      return;
    }
    
    // Apply changes to file text content
    const lines = file.content.split('\n');
    lines[targetVuln.line - 1] = replacementCode;
    const nextContent = lines.join('\n');

    // Update files database
    setFiles(prevFiles => {
      const updated = [...prevFiles];
      const nextIssuesCount = { ...updated[targetFileIndex].issuesCount };

      // Deduct corresponding severity weight
      if (targetVuln.severity === 'critical') nextIssuesCount.critical = Math.max(0, nextIssuesCount.critical - 1);
      if (targetVuln.severity === 'high') nextIssuesCount.high = Math.max(0, nextIssuesCount.high - 1);
      if (targetVuln.severity === 'medium') nextIssuesCount.medium = Math.max(0, nextIssuesCount.medium - 1);
      if (targetVuln.severity === 'low') nextIssuesCount.low = Math.max(0, nextIssuesCount.low - 1);

      const totalRemaining = nextIssuesCount.critical + nextIssuesCount.high + nextIssuesCount.medium + nextIssuesCount.low;

      updated[targetFileIndex] = {
        ...updated[targetFileIndex],
        content: nextContent,
        scanStatus: totalRemaining === 0 ? 'fixed' : 'issues',
        issuesCount: nextIssuesCount
      };
      return updated;
    });

    // Mark vulnerability as fixed
    setVulnerabilities(prevVulns => {
      const updated = [...prevVulns];
      updated[vulnIndex] = { ...updated[vulnIndex], fixed: true };
      return updated;
    });
  };

  // BATCH FILE DIRECT MODIFICATION ACTION
  const handleFixAllInFile = async (fileId: string) => {
    const fileVulns = vulnerabilities.filter(v => v.fileId === fileId && !v.fixed);
    if (fileVulns.length === 0) return;

    showToast(`Remediating ${fileVulns.length} vulnerabilities in file...`, 'info');
    
    // Snapshot state
    setUndoStack(prev => [...prev, { files: JSON.parse(JSON.stringify(files)), vulnerabilities: JSON.parse(JSON.stringify(vulnerabilities)) }]);

    for (const v of fileVulns) {
      await handleApplyFix(v.id);
    }

    showToast(`✓ All vulnerabilities patched in file!`, 'success');
  };

  // ACTION: UNDO LAST APPLIED REMEDIATION PATCH
  const handleUndoLastFix = () => {
    if (undoStack.length === 0) {
      showToast('No outstanding history to undo', 'error');
      return;
    }

    const previousState = undoStack[undoStack.length - 1];
    setFiles(previousState.files);
    setVulnerabilities(previousState.vulnerabilities);
    
    // Pop top undo stack
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    showToast('✓ Previous remediation patch rolled back successfully', 'info');
  };

  // AUTO ADVANCE QUEUE ALGORITHM
  const handleSkipNext = () => {
    const currentIdx = vulnerabilities.findIndex(v => v.id === activeIdeVulnId);
    
    // Find next outstanding unfixed vulnerability
    const nextOutstandingIdx = vulnerabilities.findIndex((v, idx) => idx > currentIdx && !v.fixed);
    
    if (nextOutstandingIdx !== -1) {
      setActiveIdeVulnId(vulnerabilities[nextOutstandingIdx].id);
    } else {
      // Look from beginning of list
      const wrapOutstandingIdx = vulnerabilities.findIndex(v => !v.fixed);
      if (wrapOutstandingIdx !== -1) {
        setActiveIdeVulnId(vulnerabilities[wrapOutstandingIdx].id);
      } else {
        // All patched! Transition back to dashboard
        showToast('✓ Backlog queue resolved completely!', 'success');
        navigateScreen(4);
      }
    }
  };

  // COMPILE MODIFIED REPO ARCHIVES INTO ZIP FOR EXPORT
  const handleDownloadFixedZip = async () => {
    try {
      showToast('Starting ZIP directory compression packaging...', 'info');
      const zip = new JSZip();

      // Write each updated file record to the zip archive preserving nested folder trees
      files.forEach(f => {
        zip.file(f.path, f.content);
      });

      // Append a beautiful and formal CHANGES.md tracking remediation logs
      const appliedPatches = vulnerabilities.filter(v => v.fixed);
      let changelogText = `# OMNIAUDIT 2.0 - SECURITY REMEDIATION PATCH WORKSPACE LOG\n\n`;
      changelogText += `**REPORT COMPILED:** ${new Date().toUTCString()}\n`;
      changelogText += `**TOTAL DIRECTORY FILES:** ${files.length}\n`;
      changelogText += `**TOTAL DEPLOYED SECURITY PATCHES:** ${appliedPatches.length}\n\n`;
      changelogText += `## Applied Patches Database\n\n`;

      if (appliedPatches.length === 0) {
        changelogText += `No modifications applied. Base repository files are pristine.\n`;
      } else {
        appliedPatches.forEach((ap, idx) => {
          changelogText += `### ${idx + 1}. [${ap.severity.toUpperCase()}] ${ap.type}\n`;
          changelogText += `- **File Location:** \`${ap.filePath}\` (Line ${ap.line})\n`;
          changelogText += `- **Classification:** ${ap.cwe} (${ap.owasp})\n`;
          changelogText += `- **Correction Summary:** ${ap.fixExplanation}\n\n`;
        });
      }

      zip.file('CHANGES.md', changelogText);

      // Generate blob
      const blob = await zip.generateAsync({ type: 'blob' });
      
      // Draw download trigger in browser DOM
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omniaudit-patched-workspace-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('✓ patched-workspace.zip compiled and downloaded!', 'success');
    } catch (err) {
      console.error(err);
      showToast('ZIP packaging compilation failed.', 'error');
    }
  };

  // Reset to landing screen
  const handleGoHome = () => {
    setCurrentScreen(1);
    setFiles([]);
    setVulnerabilities([]);
    setUndoStack([]);
  };

  return (
    <div className={`min-h-screen bg-workbench-sidebar text-slate-100 flex flex-col relative theme-${settings.preferences.themeColor || 'sky'}`}>
      
      {/* GLOBAL TOP NAV */}
      <Navbar 
        settings={settings} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        currentScreen={currentScreen}
        onGoHome={handleGoHome}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < screenHistory.length - 1}
        onGoBackPage={handleGoBackPage}
        onGoForwardPage={handleGoForwardPage}
        screenName={getScreenName(currentScreen)}
      />

      {/* CORE VIEW ROUTER CANVAS */}
      <div className="flex-1">
        
        {/* SCREEN 1: LANDING / UPLOAD ZONE */}
        {currentScreen === 1 && (
          <div className="animate-fade-up">
            <UploadZone 
              onFilesLoaded={handleFilesUploaded} 
              onLoadDemo={handleLoadDemoProject}
              onShowToast={showToast}
            />
          </div>
        )}

        {/* SCREEN 2: FILE CARDS GRID */}
        {currentScreen === 2 && (
          <div className="animate-fade-up">
            <FileCardsGrid 
              files={files}
              onScanSingle={handleScanSingleFile}
              onScanAll={handleScanAllFiles}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onShowToast={showToast}
            />
          </div>
        )}

        {/* SCREEN 3: LIVE SCAN PIPELINE */}
        {currentScreen === 3 && (
          <div className="animate-fade-up">
            <AgentPipeline 
              filesToScan={filesQueueToScan}
              currentScanningFileIndex={currentScanningFileIndex}
              activeAgent={activeAgent}
              agents={agents}
              logs={scanLogs}
              discoveredVulnerabilities={discoveredVulnerabilities}
              progressPercent={scanProgressPercent}
              onScanComplete={() => navigateScreen(4)}
            />
          </div>
        )}

        {/* SCREEN 4: RESULTS DASHBOARD */}
        {currentScreen === 4 && (
          <div className="animate-fade-up">
            <ResultsDashboard 
              files={files}
              vulnerabilities={vulnerabilities}
              settings={settings}
              onFixVulnerability={handleFixVulnerability}
              onFixAllInFile={handleFixAllInFile}
              onGenerateReport={() => navigateScreen(6)}
              onDownloadFixedZip={handleDownloadFixedZip}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>
        )}

        {/* SCREEN 5: VS CODE GRADE FIX IDE (Full drawer overlay) */}
        {currentScreen === 5 && (
          <div className="animate-fade-up">
            <FixIDE 
              isOpen={currentScreen === 5}
              onClose={handleCloseIde}
              vulnerabilities={vulnerabilities}
              activeVulnId={activeIdeVulnId}
              onSelectVuln={(id) => setActiveIdeVulnId(id)}
              onApplyFix={handleApplyFix}
              onSkipNext={handleSkipNext}
              onUndoLastFix={handleUndoLastFix}
              canUndo={undoStack.length > 0}
              files={files}
              settings={settings}
              onShowToast={showToast}
            />
          </div>
        )}

        {/* SCREEN 6: FORMAL AUDITOR PRINT REPORT PREVIEW */}
        {currentScreen === 6 && (
          <div className="animate-fade-up">
            <SecurityReportView 
              files={files}
              vulnerabilities={vulnerabilities}
              settings={settings}
              onClose={() => navigateScreen(4)}
              onShowToast={showToast}
            />
          </div>
        )}


      </div>

      {/* SETTINGS MODAL */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onShowToast={showToast}
      />

      {/* CUSTOM ANIMATED FLOATING TOAST NOTIFICATION CONTAINER */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border p-4 shadow-xl transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right-4 ${
              toast.type === 'success' 
                ? 'bg-emerald-950/95 border-emerald-500/30 text-emerald-300' 
                : toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/30 text-rose-300'
                : 'bg-slate-900/95 border-slate-750 text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : toast.type === 'error' ? (
                <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
              ) : (
                <Sparkles className="h-5 w-5 text-sky-400 shrink-0" />
              )}
              <p className="text-xs font-semibold leading-relaxed font-sans">{toast.message}</p>
            </div>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 shrink-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* SOLID WORKBENCH STATUS BAR */}
      {currentScreen !== 5 && (
        <footer className="h-6.5 bg-workbench-statusbar border-t border-slate-850 flex items-center justify-between px-4 text-[10.5px] font-mono text-slate-500 shrink-0 select-none">
          {/* Left Side */}
          <div className="flex items-center gap-4">
            <div className="bg-brand text-slate-950 font-bold px-2 py-0.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-pulse" />
              <span>OMNIAUDIT WORKBENCH</span>
            </div>
            <span className="text-slate-400">✓ AI-Powered Security Audit Core Online</span>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <span>Active View: {getScreenName(currentScreen)}</span>
            <span>v2.0</span>
            <span className="text-brand font-semibold">Ready</span>
          </div>
        </footer>
      )}

    </div>
  );
}
