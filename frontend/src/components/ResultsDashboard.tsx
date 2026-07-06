import React, { useState } from 'react';
import { 
  Folder, ChevronDown, ChevronRight, FileCode, CheckCircle, AlertTriangle, 
  ShieldAlert, Lock, Zap, Award, FileText, Download, ShieldCheck, 
  HelpCircle, Sparkles, TrendingUp
} from 'lucide-react';
import { FileRecord, Vulnerability, Settings } from '../types';

interface ResultsDashboardProps {
  files: FileRecord[];
  vulnerabilities: Vulnerability[];
  settings: Settings;
  onFixVulnerability: (vuln: Vulnerability) => void;
  onFixAllInFile: (fileId: string) => void;
  onGenerateReport: () => void;
  onDownloadFixedZip: () => void;
  onOpenSettings: () => void;
  onSelectFileInTree?: (fileId: string) => void;
}

export default function ResultsDashboard({
  files,
  vulnerabilities,
  settings,
  onFixVulnerability,
  onFixAllInFile,
  onGenerateReport,
  onDownloadFixedZip,
  onOpenSettings,
  onSelectFileInTree
}: ResultsDashboardProps) {

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'root': true,
    'src': true,
    'web': true,
    'kubernetes': true,
    'src/utils': true
  });
  
  const [selectedFileFilter, setSelectedFileFilter] = useState<string | null>(null);

  // Check if active key is connected
  const activeProvider = settings.activeProvider;
  const isApiKeySet = settings.apiKeys[activeProvider] && settings.apiKeys[activeProvider].status === 'connected';

  // Toggle folder expansion
  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  // Build Folder Tree structure from files list
  const getTreeNodes = () => {
    const rootNodes: Record<string, { folders: string[], files: FileRecord[] }> = {
      'root': { folders: [], files: [] }
    };

    files.forEach(file => {
      const parts = file.path.split('/');
      if (parts.length === 1) {
        // Root file
        rootNodes['root'].files.push(file);
      } else {
        // File in nested folders
        const fileName = parts.pop()!;
        const folderPath = parts.join('/');
        
        // Ensure folders path exists in root nodes
        let currentPath = '';
        parts.forEach((part, index) => {
          const parentPath = currentPath;
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          
          if (!rootNodes[currentPath]) {
            rootNodes[currentPath] = { folders: [], files: [] };
          }
          
          const parentKey = parentPath || 'root';
          if (!rootNodes[parentKey].folders.includes(currentPath)) {
            rootNodes[parentKey].folders.push(currentPath);
          }
        });

        rootNodes[currentPath].files.push(file);
      }
    });

    return rootNodes;
  };

  const treeNodes = getTreeNodes();

  // Helper to check file security status color
  const getFileStatusDot = (file: FileRecord) => {
    const criticals = file.issuesCount.critical;
    const highs = file.issuesCount.high;
    const total = criticals + highs + file.issuesCount.medium + file.issuesCount.low;

    if (file.scanStatus === 'fixed') {
      return <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Fixed" />;
    }
    if (total === 0) {
      return <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Clean" />;
    }
    if (criticals > 0) {
      return <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 animate-pulse" title="Critical issues" />;
    }
    if (highs > 0) {
      return <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" title="High issues" />;
    }
    return <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="No serious threats" />;
  };

  // Helper to check file text colors in sidebar
  const getFileTextClass = (file: FileRecord) => {
    const isSelected = selectedFileFilter === file.id;
    if (isSelected) return 'text-brand font-bold';
    
    if (file.scanStatus === 'fixed') return 'text-emerald-400/80';
    if (file.issuesCount.critical > 0) return 'text-rose-400 font-medium hover:text-rose-300';
    if (file.issuesCount.high > 0) return 'text-amber-400/90 hover:text-amber-300';
    return 'text-slate-400 hover:text-slate-200';
  };

  // Calculate security score
  // Start with 100, deduct 12 for each Critical issue, 6 for each High, 3 for Medium, 1 for Low
  const getSecurityScore = () => {
    let score = 100;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    vulnerabilities.forEach(v => {
      if (!v.fixed) {
        if (v.severity === 'critical') { criticalCount++; score -= 12; }
        if (v.severity === 'high') { highCount++; score -= 6; }
        if (v.severity === 'medium') { mediumCount++; score -= 3; }
        if (v.severity === 'low') { lowCount++; score -= 1; }
      }
    });

    const finalScore = Math.max(0, Math.min(100, score));

    let grade = 'A';
    let scoreColor = 'text-emerald-400';
    let ringColor = 'stroke-emerald-500';

    if (finalScore >= 90) grade = 'A';
    else if (finalScore >= 75) grade = 'B';
    else if (finalScore >= 55) { grade = 'C'; scoreColor = 'text-amber-400'; ringColor = 'stroke-amber-500'; }
    else if (finalScore >= 35) { grade = 'D'; scoreColor = 'text-amber-500'; ringColor = 'stroke-amber-500'; }
    else { grade = 'F'; scoreColor = 'text-rose-500'; ringColor = 'stroke-rose-500'; }

    return { score: finalScore, grade, scoreColor, ringColor };
  };

  const scoreMeta = getSecurityScore();

  // Metrics KPI calculations
  const totalFilesScanned = files.length;
  const criticalIssues = vulnerabilities.filter(v => v.severity === 'critical' && !v.fixed).length;
  const highIssues = vulnerabilities.filter(v => v.severity === 'high' && !v.fixed).length;
  const issuesFixed = vulnerabilities.filter(v => v.fixed).length;

  // Filter vulnerabilities list
  const filteredVulnerabilities = selectedFileFilter
    ? vulnerabilities.filter(v => v.fileId === selectedFileFilter)
    : vulnerabilities;

  // Group vulnerabilities by fileId
  const getGroupedVulnerabilities = () => {
    const groups: Record<string, { file: FileRecord, list: Vulnerability[] }> = {};
    
    filteredVulnerabilities.forEach(v => {
      if (!groups[v.fileId]) {
        const fileRecord = files.find(f => f.id === v.fileId)!;
        groups[v.fileId] = { file: fileRecord, list: [] };
      }
      groups[v.fileId].list.push(v);
    });

    return Object.values(groups);
  };

  const groupedVulnerabilities = getGroupedVulnerabilities();

  // Severity count for right sidebar donut chart
  const getSeverityBreakdown = () => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    vulnerabilities.forEach(v => {
      if (!v.fixed) {
        if (v.severity === 'critical') critical++;
        else if (v.severity === 'high') high++;
        else if (v.severity === 'medium') medium++;
        else if (v.severity === 'low') low++;
      }
    });

    const total = critical + high + medium + low;
    return { critical, high, medium, low, total };
  };

  const severityCounts = getSeverityBreakdown();

  // Top risk files ranked by issue counts weight
  const getTopRiskFiles = () => {
    return [...files]
      .map(file => {
        const weight = (file.issuesCount.critical * 4) + (file.issuesCount.high * 2.5) + (file.issuesCount.medium * 1) + (file.issuesCount.low * 0.5);
        return { file, weight };
      })
      .filter(item => item.weight > 0 && item.file.scanStatus !== 'fixed')
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 4);
  };

  const topRiskFiles = getTopRiskFiles();

  // Find most common vulnerability types
  const getMostCommonVulnType = () => {
    const counts: Record<string, number> = {};
    vulnerabilities.forEach(v => {
      if (!v.fixed) {
        counts[v.type] = (counts[v.type] || 0) + 1;
      }
    });

    let maxType = 'No severe findings';
    let maxCount = 0;
    Object.entries(counts).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    });

    return { type: maxType, count: maxCount };
  };

  const commonVuln = getMostCommonVulnType();

  // Custom recursive tree render function
  const renderTreeFolder = (folderKey: string, depth = 0) => {
    const node = treeNodes[folderKey];
    if (!node) return null;

    const parts = folderKey.split('/');
    const folderName = parts[parts.length - 1];
    const isExpanded = expandedFolders[folderKey];

    return (
      <div key={folderKey} className="space-y-1" style={{ marginLeft: `${depth * 8}px` }}>
        {/* Folder Header */}
        <button
          onClick={() => toggleFolder(folderKey)}
          className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-900 rounded-lg transition-colors text-left cursor-pointer"
        >
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
          <Folder className="h-4 w-4 text-brand shrink-0" />
          <span className="truncate">{folderName}</span>
        </button>

        {/* Children (Subfolders & Files) */}
        {isExpanded && (
          <div className="space-y-1.5 border-l border-slate-800 ml-3.5 pl-2">
            {/* Subfolders first */}
            {node.folders.map(subFolderKey => renderTreeFolder(subFolderKey, depth + 1))}
            
            {/* Folder Files */}
            {node.files.map(file => (
              <button
                key={file.id}
                onClick={() => {
                  setSelectedFileFilter(selectedFileFilter === file.id ? null : file.id);
                  if (onSelectFileInTree) onSelectFileInTree(file.id);
                }}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-colors text-left cursor-pointer ${
                  selectedFileFilter === file.id 
                    ? 'bg-brand/10 border border-brand/20' 
                    : 'border border-transparent hover:bg-slate-900'
                }`}
              >
                {getFileStatusDot(file)}
                <FileCode className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className={`truncate text-[11px] font-mono leading-none ${getFileTextClass(file)}`}>
                  {file.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-62px)] overflow-hidden bg-slate-950 font-sans">
      
      {/* 1. LEFT SIDEBAR: FILE TREE */}
      <aside className="w-[240px] shrink-0 b2b-glass-panel border-y-0 border-l-0 rounded-none flex flex-col justify-between h-full p-4 space-y-4">
        
        {/* Sidebar Header / Reset filter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">EXPLORER</span>
            {selectedFileFilter && (
              <button 
                onClick={() => setSelectedFileFilter(null)}
                className="text-[10px] font-semibold text-brand hover:opacity-80 font-mono cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Folder Tree Scroll area */}
          <div className="overflow-y-auto space-y-2 max-h-[calc(100vh-320px)] pr-1">
            {renderTreeFolder('root')}
          </div>
        </div>

        {/* Security Score Gauge Box */}
        <div className="b2b-glass-panel rounded-xl p-4.5 flex flex-col items-center justify-center text-center space-y-3 shrink-0">
          <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">SECURITY INDEX</span>
          
          {/* SVG Radial score indicator */}
          <div className="relative flex items-center justify-center h-24 w-24">
            <svg className="h-full w-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="48" cy="48" r="38"
                stroke="#1e293b" strokeWidth="6.5"
                fill="transparent"
              />
              {/* Foreground circle */}
              <circle
                cx="48" cy="48" r="38"
                stroke={scoreMeta.grade === 'A' || scoreMeta.grade === 'B' ? '#10b981' : scoreMeta.grade === 'C' ? '#f59e0b' : '#f43f5e'}
                strokeWidth="7"
                fill="transparent"
                strokeDasharray="238.76"
                strokeDashoffset={238.76 - (238.76 * scoreMeta.score) / 100}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            
            {/* Center score letter */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black ${scoreMeta.scoreColor} font-mono leading-none`}>
                {scoreMeta.grade}
              </span>
              <span className="text-[10px] font-mono text-slate-500 font-bold mt-1">
                Score: {scoreMeta.score}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed px-1">
            {scoreMeta.score >= 80 
              ? 'Excellent posture. No critical exposures outstanding.' 
              : scoreMeta.score >= 50
              ? 'Warning: Unresolved parameters compromise repository safety.'
              : 'CRITICAL THREATS FOUND. Immediate patch required!'
            }
          </p>
        </div>

      </aside>

      {/* 2. CENTER MAIN COMPONENT */}
      <main className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-6">
        
        {/* KPI CARDS BAR */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* KPI 1 */}
          <div className="b2b-card rounded-xl p-4 flex flex-col b2b-border-clean">
            <span className="text-[9px] font-bold font-mono tracking-widest text-slate-500 uppercase">FILES AUDITED</span>
            <span className="text-2xl font-extrabold text-slate-100 mt-1.5 font-mono">{totalFilesScanned}</span>
            <span className="text-[10px] text-slate-500 mt-1 font-mono">100% of repo scanned</span>
          </div>

          {/* KPI 2 */}
          <div className="b2b-card rounded-xl p-4 flex flex-col b2b-border-critical">
            <span className="text-[9px] font-bold font-mono tracking-widest text-slate-500 uppercase">CRITICAL SEVERITY</span>
            <span className={`text-2xl font-extrabold mt-1.5 font-mono ${criticalIssues > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
              {criticalIssues}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 font-mono">Secrets & cert leaks</span>
          </div>

          {/* KPI 3 */}
          <div className="b2b-card rounded-xl p-4 flex flex-col b2b-border-warning">
            <span className="text-[9px] font-bold font-mono tracking-widest text-slate-500 uppercase">HIGH SEVERITY</span>
            <span className={`text-2xl font-extrabold mt-1.5 font-mono ${highIssues > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
              {highIssues}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 font-mono">Injection vulnerabilities</span>
          </div>

          {/* KPI 4 */}
          <div className="b2b-card rounded-xl p-4 flex flex-col b2b-border-clean">
            <span className="text-[9px] font-bold font-mono tracking-widest text-slate-500 uppercase">PATCHES DEPLOYED</span>
            <span className={`text-2xl font-extrabold mt-1.5 font-mono ${issuesFixed > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
              {issuesFixed}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 font-mono">Remediated via AI IDE</span>
          </div>

        </section>

        {/* VULNERABILITY LIST */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-850">
            <h2 className="font-sans text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-brand animate-pulse" />
              Outstanding Vulnerability Catalog
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Displaying {filteredVulnerabilities.length} issue{filteredVulnerabilities.length !== 1 ? 's' : ''}
            </p>
          </div>

          {groupedVulnerabilities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-slate-200 text-sm">Perfect Score! All Systems Green</h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">No vulnerabilities detected in this workspace directory.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedVulnerabilities.map(({ file, list }) => {
                const totalActive = list.filter(v => !v.fixed).length;
                if (totalActive === 0) return null; // Skip file if all resolved

                return (
                  <div key={file.id} className="rounded-xl b2b-glass-panel overflow-hidden">
                    
                    {/* File Header Row separating groups */}
                    <div className="bg-slate-900/40 border-b border-white/8 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-sky-400" />
                        <span className="font-mono text-xs font-bold text-slate-200">{file.path}</span>
                        <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[9.5px] font-bold font-mono text-rose-400">
                          {totalActive} Threat{totalActive > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Fix All Button in File */}
                      {isApiKeySet ? (
                        <button
                          onClick={() => onFixAllInFile(file.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-bold px-3 py-1.5 shadow-md shadow-sky-500/5 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                        >
                          <Zap className="h-3 w-3 fill-white" />
                          Fix All in File
                        </button>
                      ) : (
                        <div 
                          className="group relative cursor-help flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] text-slate-500 font-semibold"
                          title="Verify API credential in settings to enable batch fixes"
                        >
                          <Lock className="h-3 w-3" />
                          AI Fix Locked
                        </div>
                      )}
                    </div>

                    {/* Vulnerability Items List */}
                    <div className="p-4 space-y-4 bg-slate-950/20">
                      {list.map((vuln) => {
                        const isCritical = vuln.severity === 'critical';
                        const isHigh = vuln.severity === 'high';
                        
                        let badgeClass = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
                        let indicatorColor = 'bg-sky-500';
                        let semanticBorder = '';

                        if (isCritical) {
                          badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                          indicatorColor = 'bg-rose-500';
                          semanticBorder = 'b2b-border-critical';
                        } else if (isHigh) {
                          badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                          indicatorColor = 'bg-amber-500';
                          semanticBorder = 'b2b-border-warning';
                        } else if (vuln.severity === 'medium') {
                          badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                          indicatorColor = 'bg-emerald-500';
                        }

                        return (
                          <div key={vuln.id} className={`p-5 rounded-lg b2b-card flex flex-col md:flex-row md:items-start md:justify-between gap-4 ${semanticBorder}`}>
                            {/* Left: Info */}
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center gap-3">
                                <span className={`h-2 w-2 rounded-full ${indicatorColor}`} />
                                <span className="font-mono text-[10px] font-bold text-slate-500">LINE {vuln.line}</span>
                                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold font-mono uppercase ${badgeClass}`}>
                                  {vuln.severity}
                                </span>
                                <h4 className="font-sans font-bold text-slate-200 text-[13px] leading-none">
                                  {vuln.type}
                                </h4>
                              </div>

                              {/* Vulnerable Code snippet */}
                              <div className="rounded-lg bg-slate-950 border border-slate-900 px-3 py-2.5 font-mono text-xs overflow-x-auto max-w-full text-slate-300">
                                {vuln.codeSnippet}
                              </div>

                              {/* Risk Description */}
                              <p className="text-xs text-slate-400 leading-relaxed">
                                <strong className="text-slate-300 font-sans font-semibold">Threat Risk:</strong> {vuln.riskExplanation}
                              </p>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex flex-col items-end gap-2 shrink-0 md:pt-4">
                              {/* Fix Status */}
                              <span className="text-[10px] font-mono text-slate-500 font-bold">
                                Status: <span className="text-rose-400 font-extrabold uppercase">Unresolved</span>
                              </span>

                              {/* Action Button */}
                              {isApiKeySet ? (
                                <button
                                  onClick={() => onFixVulnerability(vuln)}
                                  className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold px-4 py-2.5 shadow-lg shadow-sky-500/15 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all font-sans"
                                >
                                  <Zap className="h-3.5 w-3.5 fill-white" />
                                  Fix with AI
                                </button>
                              ) : (
                                <button
                                  onClick={onOpenSettings}
                                  className="group relative cursor-pointer flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold transition-all"
                                  title="Click to add API key in settings and unlock AI Fixes"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                  Unlock AI Fix
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* 3. RIGHT SIDEBAR: DIAGNOSTIC GRAPHS & CONTROLS */}
      <aside className="w-[280px] shrink-0 b2b-glass-panel border-y-0 border-r-0 rounded-none flex flex-col justify-between h-full p-4 space-y-5">
        
        {/* Core Buttons */}
        <div className="space-y-4">
          <button
            onClick={onGenerateReport}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-sans text-xs font-bold py-3.5 shadow-lg shadow-emerald-500/10 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <FileText className="h-4.5 w-4.5" />
            Generate Security Report
          </button>

          {/* Download Zip appears only after modifications */}
          {issuesFixed > 0 ? (
            <button
              onClick={onDownloadFixedZip}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-sans text-xs font-bold py-3.5 shadow-lg shadow-sky-500/10 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all border border-sky-500/20 animate-bounce"
            >
              <Download className="h-4.5 w-4.5" />
              Download Fixed Files (.zip)
            </button>
          ) : (
            <div className="w-full rounded-xl border border-slate-850 bg-slate-950/20 p-3.5 text-center text-[11px] font-mono text-slate-500 leading-relaxed">
              Fix code threats using the <strong className="text-sky-400">Fix with AI</strong> engine to generate your safe download archives.
            </div>
          )}
        </div>

        {/* Donut Chart and Metrics */}
        <div className="b2b-glass-panel rounded-xl p-4 space-y-3.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">SEVERITY CATALOG</span>
          </div>

          {/* SVG Custom Donut Chart */}
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="relative h-20 w-20 shrink-0">
              <svg className="h-full w-full transform -rotate-90">
                {/* Total backing circle */}
                <circle cx="40" cy="40" r="30" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                
                {/* Critical sector */}
                {severityCounts.critical > 0 && (
                  <circle
                    cx="40" cy="40" r="30" stroke="#f43f5e" strokeWidth="7" fill="transparent"
                    strokeDashoffset={188.4 - (188.4 * severityCounts.critical) / (severityCounts.total || 1)}
                    strokeDasharray={`${(188.4 * severityCounts.critical) / (severityCounts.total || 1)} 188.4`}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-extrabold text-slate-200 font-mono leading-none">{severityCounts.total}</span>
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">Alerts</span>
              </div>
            </div>

            {/* Chart Legend list */}
            <div className="space-y-1 text-[11px] font-mono flex-1">
              <div className="flex items-center justify-between text-rose-400">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />Crit</span>
                <span className="font-bold">{severityCounts.critical}</span>
              </div>
              <div className="flex items-center justify-between text-amber-400">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />High</span>
                <span className="font-bold">{severityCounts.high}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Med</span>
                <span className="font-bold">{severityCounts.medium}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />Low</span>
                <span className="font-bold">{severityCounts.low}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top risk files listed */}
        <div className="rounded-xl border border-slate-850 bg-slate-900/30 p-4 space-y-3 flex-1 flex flex-col justify-between max-h-[190px]">
          <div className="flex items-center gap-1.5 shrink-0">
            <Award className="h-3.5 w-3.5 text-brand" />
            <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">HIGH RISK FILES</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1 text-xs">
            {topRiskFiles.length === 0 ? (
              <div className="text-[11px] font-mono text-slate-500 italic text-center py-4">No risk profiles remaining!</div>
            ) : (
              topRiskFiles.map(({ file }) => {
                const total = file.issuesCount.critical + file.issuesCount.high;
                return (
                  <div key={file.id} className="flex items-center justify-between gap-2 border-b border-slate-900/50 pb-1.5">
                    <span className="font-mono text-slate-300 truncate max-w-[130px]" title={file.name}>{file.name}</span>
                    <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[9.5px] font-mono text-rose-400 font-bold shrink-0">
                      {total} severe
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-900 pt-2 shrink-0">
            <p className="text-[9px] font-mono text-slate-500 uppercase font-bold">Top threat vector</p>
            <p className="text-[11px] text-slate-300 font-sans font-semibold mt-0.5 truncate" title={commonVuln.type}>
              {commonVuln.type}
            </p>
          </div>
        </div>

      </aside>

    </div>
  );
}
