import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, Search, Zap, Palette, Wrench, Check, Terminal, ShieldAlert, AlertTriangle, ShieldCheck, FolderOpen, Play, FileCode } from 'lucide-react';
import { AgentType, AgentStatus, ScanLogLine, Vulnerability, FileRecord } from '../types';

interface AgentPipelineProps {
  filesToScan: FileRecord[];
  currentScanningFileIndex: number;
  activeAgent: AgentType | null;
  agents: AgentStatus[];
  logs: ScanLogLine[];
  discoveredVulnerabilities: Vulnerability[];
  progressPercent: number;
  onScanComplete: () => void;
  files?: FileRecord[];
  onScanSingle?: (fileId: string) => void;
}

export default function AgentPipeline({
  filesToScan,
  currentScanningFileIndex,
  activeAgent,
  agents,
  logs,
  discoveredVulnerabilities,
  progressPercent,
  onScanComplete,
  files,
  onScanSingle
}: AgentPipelineProps) {
  
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const currentFile = filesToScan[currentScanningFileIndex] || null;

  // Auto-scroll terminal container to bottom if user hasn't scrolled up
  useEffect(() => {
    if (terminalContainerRef.current && !isUserScrolledUpRef.current) {
      terminalContainerRef.current.scrollTo({
        top: terminalContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  // Track if user manually scrolls up
  const handleTerminalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 40;
    isUserScrolledUpRef.current = !isAtBottom;
  };

  // Translate agent names to icons
  const renderAgentIcon = (id: AgentType, status: string) => {
    const classes = `h-6 w-6 ${status === 'working' ? 'animate-bounce' : ''}`;
    switch (id) {
      case 'cartographer': return <Map className={classes} />;
      case 'secretHunter': return <Search className={classes} />;
      case 'codeHunter': return <Zap className={classes} />;
      case 'uiArchitect': return <Palette className={classes} />;
      case 'remediationEng': return <Wrench className={classes} />;
    }
  };

  // Color code log text based on agent
  const getAgentColorClass = (agent: AgentType) => {
    switch (agent) {
      case 'cartographer': return 'text-sky-400';
      case 'secretHunter': return 'text-rose-400';
      case 'codeHunter': return 'text-amber-400';
      case 'uiArchitect': return 'text-emerald-400';
      case 'remediationEng': return 'text-violet-400';
    }
  };

  const getAgentAbbrev = (agent: AgentType) => {
    switch (agent) {
      case 'cartographer': return 'MAP';
      case 'secretHunter': return 'KEY';
      case 'codeHunter': return 'CODE';
      case 'uiArchitect': return 'ARCH';
      case 'remediationEng': return 'FIX';
    }
  };

  const agentPositions: Record<AgentType, number> = {
    cartographer: 8,
    secretHunter: 29,
    codeHunter: 50,
    uiArchitect: 71,
    remediationEng: 92,
  };

  const getParentFolder = (filePath: string): string => {
    if (!filePath) return 'root';
    const parts = filePath.split('/');
    if (parts.length <= 1) return 'root';
    return parts.slice(0, -1).join('/');
  };

  const currentFolder = currentFile ? getParentFolder(currentFile.path) : 'root';
  const siblingFiles = files && currentFile 
    ? files.filter(f => getParentFolder(f.path) === currentFolder) 
    : [];

  return (
    <div className="pt-6 pb-20 px-6 max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
        
        {/* LEFT COLUMN: Workspace Sibling Files Sidebar */}
        {files && files.length > 0 && (
          <div className="xl:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">FOLDER WORKSPACE</span>
              <span className="text-[10px] font-mono text-slate-500">/{currentFolder === 'root' ? '' : currentFolder}</span>
            </div>

            <div className="bg-workbench-sidebar rounded-lg border border-slate-850 p-2.5 space-y-1.5 max-h-[580px] overflow-y-auto">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
                <FolderOpen className="h-4 w-4 text-brand shrink-0" />
                <span className="text-xs font-mono font-bold text-slate-300 truncate" title={currentFolder}>
                  /{currentFolder === 'root' ? 'root_workspace' : currentFolder}
                </span>
              </div>

              <div className="space-y-1 pt-1.5">
                {siblingFiles.map((sibling) => {
                  const isScanningNow = currentFile && sibling.id === currentFile.id;
                  
                  // Get style icon for this sibling
                  const isEnv = sibling.name.endsWith('.env');
                  const isPy = sibling.name.endsWith('.py');
                  const isJs = sibling.name.endsWith('.js') || sibling.name.endsWith('.ts');
                  
                  let fileIcon = <FileCode className="h-4 w-4 text-slate-400" />;
                  if (isEnv) fileIcon = <ShieldAlert className="h-4 w-4 text-rose-400 animate-pulse" />;
                  else if (isPy) fileIcon = <FileCode className="h-4 w-4 text-blue-400" />;
                  else if (isJs) fileIcon = <FileCode className="h-4 w-4 text-brand" />;

                  // Find issues count
                  const totalIssues = sibling.issuesCount.critical + sibling.issuesCount.high + sibling.issuesCount.medium + sibling.issuesCount.low;

                  return (
                    <div
                      key={sibling.id}
                      className={`group relative flex items-center justify-between p-2 rounded text-left text-xs transition-all border ${
                        isScanningNow
                          ? 'bg-brand/10 border-brand/20 text-brand font-semibold'
                          : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="shrink-0">
                          {fileIcon}
                        </div>
                        <div className="truncate flex flex-col">
                          <span className="font-sans font-semibold leading-tight text-slate-200 group-hover:text-brand transition-colors truncate">
                            {sibling.name}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                            {sibling.lines} lines
                          </span>
                        </div>
                      </div>

                      {/* Interactive Scan Trigger or Status Indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Hover Play Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onScanSingle) {
                              onScanSingle(sibling.id);
                            }
                          }}
                          className="hidden group-hover:flex h-6 w-6 items-center justify-center rounded bg-brand text-slate-950 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow shadow-brand/30 shrink-0"
                          title="Scan this file now"
                        >
                          <Play className="h-3 w-3 fill-slate-950" />
                        </button>

                        {/* Status indicator shown when NOT hovered */}
                        <div className="group-hover:hidden shrink-0 flex items-center">
                          {sibling.scanStatus === 'scanning' || isScanningNow ? (
                            <div className="h-3.5 w-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                          ) : sibling.scanStatus === 'clean' || sibling.scanStatus === 'fixed' ? (
                            <Check className="h-4 w-4 text-emerald-400 stroke-[3]" />
                          ) : sibling.scanStatus === 'issues' ? (
                            <div className="flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded px-1 text-[9px] font-mono font-bold leading-none">
                              <span className="h-1 w-1 rounded-full bg-rose-500 animate-pulse" />
                              {totalIssues}
                            </div>
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Action Info Tip */}
              <p className="text-[10px] font-sans text-slate-500 text-center mt-3 pt-2.5 border-t border-slate-900 leading-normal">
                Hover files in workspace to reveal direct <span className="text-brand font-semibold">Audit This Module</span> trigger.
              </p>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: The Scan pipeline metrics, logs, timeline */}
        <div className={`${files && files.length > 0 ? 'xl:col-span-9' : 'xl:col-span-12'} space-y-6 w-full`}>
          
          {/* Dynamic Scan Header and Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="rounded bg-brand/10 border border-brand/20 px-2.5 py-1 text-[10px] font-bold font-mono tracking-widest text-brand uppercase">
                  SCANNING IN PROGRESS
                </span>
                <h1 className="font-sans text-lg font-bold text-slate-100 mt-2">
                  {currentFile 
                    ? `Analyzing module: ${currentFile.name} (${currentScanningFileIndex + 1} of ${filesToScan.length})`
                    : 'Repository diagnostics run...'
                  }
                </h1>
              </div>
              <span className="text-sm font-mono text-brand font-bold">{Math.round(progressPercent)}%</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden border border-slate-800/60 p-[1px]">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-brand via-indigo-500 to-emerald-400 transition-all duration-300 shadow-[0_0_8px_var(--brand-color-glow-hover)]"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

      {/* AGENT PIPELINE ROW */}
      <div className="relative rounded-2xl border border-slate-850 bg-slate-950/40 p-6 flex items-center justify-between overflow-hidden">
        
        {/* Animated flowing path background with Framer Motion lasers & neon glow */}
        <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 h-4 z-0">
          <svg className="w-full h-4 overflow-visible">
            {/* Inactive connection line */}
            <line 
              x1="8%" y1="50%" x2="92%" y2="50%" 
              stroke="#1e293b" strokeWidth="4" 
              strokeLinecap="round"
            />
            {/* Smoothly expanding glowing laser line based on current agent */}
            {activeAgent && (
              <motion.line 
                x1="8%" y1="50%"
                animate={{ 
                  x2: `${agentPositions[activeAgent]}%` 
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 80, 
                  damping: 15,
                  mass: 0.8
                }}
                y2="50%" 
                stroke="var(--brand-color)" 
                strokeWidth="4" 
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(var(--brand-color-rgb),0.6)]"
              />
            )}
            {/* Continuous stream of light pulses sliding along the path to the current agent */}
            {activeAgent && (
              <svg className="absolute inset-0 w-full h-full overflow-visible">
                <motion.circle
                  r="4"
                  fill="var(--brand-color)"
                  animate={{ 
                    cx: ["8%", `${agentPositions[activeAgent]}%`] 
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.6, 
                    ease: "linear" 
                  }}
                  cy="50%"
                  className="blur-[1px] drop-shadow-[0_0_6px_var(--brand-color)]"
                />
                <motion.circle
                  r="6"
                  fill="none"
                  stroke="var(--brand-color)"
                  strokeWidth="1.5"
                  animate={{ 
                    cx: ["8%", `${agentPositions[activeAgent]}%`],
                    scale: [1, 1.8],
                    opacity: [0.8, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.6, 
                    ease: "linear" 
                  }}
                  cy="50%"
                />
              </svg>
            )}
          </svg>
        </div>

        {/* Floating animated file chip using Framer Motion - smooth sliding and bounce effect */}
        <AnimatePresence mode="popLayout">
          {activeAgent && (
            <motion.div 
              key={`${activeAgent}-${currentFile?.id}`}
              initial={{ scale: 0.7, opacity: 0, y: "-50%", rotate: -5 }}
              animate={{ 
                left: `${agentPositions[activeAgent]}%`,
                scale: 1, 
                opacity: 1,
                y: "-50%",
                rotate: 0
              }}
              exit={{ scale: 0.7, opacity: 0, rotate: 5 }}
              transition={{ 
                type: "spring", 
                stiffness: 80, 
                damping: 14,
                mass: 0.9
              }}
              className="absolute top-1/2 z-20 pointer-events-none -translate-x-1/2"
            >
              <div className="flex items-center gap-1.5 rounded-full bg-slate-950 border-2 border-brand text-brand px-3 py-1.5 text-[10px] font-mono font-bold shadow-[0_0_20px_rgba(var(--brand-color-rgb),0.4)] animate-float-y">
                <FileCode className="h-3.5 w-3.5 text-brand shrink-0 animate-pulse" />
                <span className="truncate max-w-[120px]">{currentFile?.name || 'module.src'}</span>
                <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-brand/60 animate-ping" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent Nodes */}
        {agents.map((agent) => {
          const isWorking = agent.status === 'working';
          const isDone = agent.status === 'done';
          
          return (
            <div 
              key={agent.id}
              className={`relative z-10 w-[16%] flex flex-col items-center justify-center text-center space-y-2 group transition-all duration-300 ${
                isWorking ? 'scale-105' : ''
              }`}
            >
              {/* Node Icon Ring */}
              <div className={`relative flex h-14 w-14 items-center justify-center rounded-xl border transition-all duration-500 ${
                isWorking 
                  ? 'border-brand bg-brand/10 shadow-[0_0_20px_var(--brand-color-glow-hover)] animate-pulse-glow'
                  : isDone
                  ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400'
                  : 'border-slate-800 bg-slate-950 text-slate-500'
              }`}>
                {renderAgentIcon(agent.id, agent.status)}

                {/* Spinning Loading Outer Circle when active */}
                {isWorking && (
                  <div className="absolute inset-0 border-2 border-brand border-t-transparent border-b-transparent rounded-xl animate-spin"></div>
                )}

                {/* Green checkmark badge */}
                {isDone && (
                  <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-slate-900 shadow shadow-emerald-500/40 animate-in zoom-in-50 duration-300">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Node Metadata */}
              <div>
                <p className={`font-sans font-semibold text-xs leading-none ${isWorking ? 'text-brand' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                  {agent.name}
                </p>
                <span className={`inline-block text-[9px] font-mono tracking-wider uppercase mt-1 ${
                  isWorking ? 'text-brand font-bold' : isDone ? 'text-emerald-500' : 'text-slate-600'
                }`}>
                  {agent.status}
                </span>
              </div>
            </div>
          );
        })}

      </div>

      {/* 60/40 SPLIT VIEW SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 h-auto lg:h-[400px]">
        
        {/* Left 60%: Real-time terminal log */}
        <div className="lg:col-span-6 rounded-lg border border-slate-850 bg-slate-950 p-4 flex flex-col h-[340px] lg:h-full shadow-2xl relative">
          {/* Terminal top chrome */}
          <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-brand" />
              <span className="font-mono text-xs font-bold text-slate-300">SYSTEM AUDIT TERMINAL FEED</span>
            </div>
            {/* Window control dots */}
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500/50"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500/50"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/50"></span>
            </div>
          </div>

          {/* Terminal log lines */}
          <div 
            ref={terminalContainerRef}
            onScroll={handleTerminalScroll}
            className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1.5 pr-2"
          >
            {logs.length === 0 ? (
              <div className="text-slate-600 italic flex items-center justify-center h-full">
                <span>Awaiting connection to pipeline node stream...</span>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-1 duration-150">
                  <span className="text-slate-600 font-bold select-none shrink-0">{log.timestamp}</span>
                  <span className="rounded bg-slate-900 border border-slate-850 px-1 text-[8.5px] font-bold text-slate-500 tracking-wider shrink-0 mt-[2px]">
                    {getAgentAbbrev(log.agent)}
                  </span>
                  <p className={`flex-1 break-all ${getAgentColorClass(log.agent)}`}>
                    {log.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 40%: Live vulnerability feed */}
        <div className="lg:col-span-4 rounded-lg border border-slate-850 bg-workbench-sidebar p-4 flex flex-col h-[340px] lg:h-full">
          <h3 className="font-sans text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-500 animate-pulse" />
            Vulnerabilities Found
            <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-mono text-rose-400 ml-auto">
              {discoveredVulnerabilities.length}
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {discoveredVulnerabilities.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-full border border-dashed border-slate-800 rounded-xl p-6 text-slate-500 space-y-2">
                <ShieldCheck className="h-8 w-8 text-slate-600 animate-pulse" />
                <span className="text-xs font-mono">No vulnerabilities detected yet.</span>
              </div>
            ) : (
              discoveredVulnerabilities.map((vuln) => {
                const isCritical = vuln.severity === 'critical';
                const isHigh = vuln.severity === 'high';

                let borderLeftColor = 'border-l-brand';
                let bgClass = 'bg-slate-950/20';
                let badgeClass = 'bg-brand/10 text-brand border-brand/20';

                if (isCritical) {
                  borderLeftColor = 'border-l-rose-500';
                  bgClass = 'bg-rose-950/5';
                  badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                } else if (isHigh) {
                  borderLeftColor = 'border-l-amber-500';
                  bgClass = 'bg-amber-950/5';
                  badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                } else if (vuln.severity === 'medium') {
                  borderLeftColor = 'border-l-emerald-500';
                  bgClass = 'bg-emerald-950/5';
                  badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                }

                return (
                  <div
                    key={vuln.id}
                    className={`rounded-xl border-y border-r border-slate-800 border-l-3 ${borderLeftColor} ${bgClass} p-3.5 space-y-2 flex flex-col justify-between animate-in slide-in-from-right-3 duration-300 shadow-lg`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold font-mono tracking-widest uppercase border ${badgeClass}`}>
                        {vuln.severity}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">
                        Line {vuln.line}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-sans font-bold text-slate-200 text-xs truncate">
                        {vuln.type}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                        {vuln.fileName} &bull; {vuln.filePath}
                      </p>
                    </div>

                    <div className="rounded bg-slate-950 border border-slate-900 px-2 py-1.5">
                      <code className="text-[10px] text-slate-300 font-mono block truncate">
                        {vuln.codeSnippet}
                      </code>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  </div>
</div>
);
}
