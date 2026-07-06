import React, { useState } from 'react';
import { Play, Settings, AlertTriangle, CheckCircle, HelpCircle, FileText, FileCode, ShieldAlert, Sparkles, Folder, FolderOpen, Grid, ChevronRight } from 'lucide-react';
import { FileRecord } from '../types';

interface FileCardsGridProps {
  files: FileRecord[];
  onScanSingle: (fileId: string) => void;
  onScanAll: () => void;
  onOpenSettings: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function FileCardsGrid({ files, onScanSingle, onScanAll, onOpenSettings, onShowToast }: FileCardsGridProps) {
  
  // Format sizes beautifully
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get extension specific icons and colors
  const getFileStyleAndIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (fileName.endsWith('.env')) {
      return {
        icon: <ShieldAlert className="h-5 w-5 text-rose-500" />,
        colorClass: 'border-rose-950/40 bg-rose-950/5 hover:border-rose-500/30',
        extLabel: 'ENV SECRETS',
        badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      };
    }
    switch (ext) {
      case 'py':
        return {
          icon: <FileCode className="h-5 w-5 text-blue-400" />,
          colorClass: 'border-blue-950/40 bg-blue-950/5 hover:border-blue-500/30',
          extLabel: 'PYTHON SOURCE',
          badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        };
      case 'js':
        return {
          icon: <FileCode className="h-5 w-5 text-yellow-500" />,
          colorClass: 'border-yellow-950/40 bg-yellow-950/5 hover:border-yellow-500/30',
          extLabel: 'JAVASCRIPT',
          badgeColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
        };
      case 'ts':
        return {
          icon: <FileCode className="h-5 w-5 text-sky-400" />,
          colorClass: 'border-sky-950/40 bg-sky-950/5 hover:border-sky-500/30',
          extLabel: 'TYPESCRIPT',
          badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
        };
      case 'jsx':
      case 'tsx':
        return {
          icon: <FileCode className="h-5 w-5 text-cyan-400" />,
          colorClass: 'border-cyan-950/40 bg-cyan-950/5 hover:border-cyan-500/30',
          extLabel: 'REACT JSX/TSX',
          badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
        };
      case 'php':
        return {
          icon: <FileCode className="h-5 w-5 text-indigo-400" />,
          colorClass: 'border-indigo-950/40 bg-indigo-950/5 hover:border-indigo-500/30',
          extLabel: 'PHP SCRIPTS',
          badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
        };
      case 'yaml':
      case 'yml':
        return {
          icon: <FileText className="h-5 w-5 text-purple-400" />,
          colorClass: 'border-purple-950/40 bg-purple-950/5 hover:border-purple-500/30',
          extLabel: 'YAML CONFIG',
          badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
        };
      case 'json':
        return {
          icon: <FileText className="h-5 w-5 text-amber-500" />,
          colorClass: 'border-amber-950/40 bg-amber-950/5 hover:border-amber-500/30',
          extLabel: 'JSON METADATA',
          badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        };
      default:
        return {
          icon: <FileText className="h-5 w-5 text-slate-400" />,
          colorClass: 'border-slate-800 bg-slate-900/40 hover:border-slate-700',
          extLabel: 'SOURCE CODE',
          badgeColor: 'bg-slate-800 text-slate-400 border-slate-700'
        };
    }
  };

  // Grouping and auto sorting files
  const envFiles = files.filter(f => f.name.endsWith('.env') || f.path.endsWith('.env'));
  const pyFiles = files.filter(f => f.name.endsWith('.py') && !f.name.endsWith('.env'));
  const jsTsFiles = files.filter(f => (f.name.endsWith('.js') || f.name.endsWith('.ts')) && !f.name.endsWith('.env'));
  const jsxTsxFiles = files.filter(f => f.name.endsWith('.jsx') || f.name.endsWith('.tsx'));
  const otherFiles = files.filter(f => {
    const n = f.name;
    return !n.endsWith('.env') && !n.endsWith('.py') && !n.endsWith('.js') && !n.endsWith('.ts') && !n.endsWith('.jsx') && !n.endsWith('.tsx');
  }).sort((a, b) => a.name.localeCompare(b.name));

  const sections = [
    { label: 'Environment Credential Configuration', list: envFiles, dangerLabel: 'CRITICAL THREAT ZONE' },
    { label: 'Python Services', list: pyFiles },
    { label: 'JavaScript & TypeScript Modules', list: jsTsFiles },
    { label: 'React Frontend Architectures', list: jsxTsxFiles },
    { label: 'Other Configs & Scripts', list: otherFiles }
  ].filter(sec => sec.list.length > 0);

  // Helper to render card status
  const renderCardStatus = (file: FileRecord) => {
    const issuesTotal = file.issuesCount.critical + file.issuesCount.high + file.issuesCount.medium + file.issuesCount.low;

    switch (file.scanStatus) {
      case 'scanning':
        return (
          <div className="flex items-center gap-1.5 text-xs text-brand font-mono">
            <div className="h-3.5 w-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
            <span>Analyzing...</span>
          </div>
        );
      case 'clean':
        return (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Clean (0 Issues)</span>
          </div>
        );
      case 'issues':
        return (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold font-mono">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>{issuesTotal} Vulnerabilit{issuesTotal > 1 ? 'ies' : 'y'}</span>
          </div>
        );
      case 'fixed':
        return (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold font-mono">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/10" />
            <span>All Remediated!</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <span className="h-2 w-2 rounded-full bg-slate-600"></span>
            <span>Awaiting Audit</span>
          </div>
        );
    }
  };

  // Support Folder Tree state
  const [viewMode, setViewMode] = useState<'folder' | 'type'>('folder');
  const [selectedFolder, setSelectedFolder] = useState<string>('root');

  const getParentFolder = (filePath: string): string => {
    if (!filePath) return 'root';
    const parts = filePath.split('/');
    if (parts.length <= 1) return 'root';
    return parts.slice(0, -1).join('/');
  };

  const getBorderClass = (file: FileRecord) => {
    let borderClass = 'border-slate-800';
    if (file.scanStatus === 'scanning') borderClass = 'border-sky-500 animate-pulse-glow';
    else if (file.scanStatus === 'clean') borderClass = 'border-emerald-500/40 bg-emerald-950/2';
    else if (file.scanStatus === 'fixed') borderClass = 'border-emerald-500/50';
    else if (file.scanStatus === 'issues') {
      borderClass = file.issuesCount.critical > 0 
        ? 'border-rose-500/40 bg-rose-950/2' 
        : 'border-amber-500/40 bg-amber-950/2';
    }
    return borderClass;
  };

  const folders = Array.from(new Set(files.map(f => getParentFolder(f.path))));
  const sortedFolders = [...folders].sort((a, b) => {
    if (a === 'root') return -1;
    if (b === 'root') return 1;
    return a.localeCompare(b);
  });

  // Keep selectedFolder valid in case files list changes
  React.useEffect(() => {
    if (sortedFolders.length > 0 && !sortedFolders.includes(selectedFolder)) {
      setSelectedFolder(sortedFolders[0]);
    }
  }, [files]);

  return (
    <div className="pb-36 pt-6 px-6 max-w-7xl mx-auto w-full">
      {/* Grid Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="font-sans text-xl font-bold text-slate-100 flex items-center gap-3">
            Loaded Project Files
            <span className="rounded-full bg-slate-800 border border-slate-750 px-2.5 py-0.5 text-xs text-slate-300 font-mono">
              {files.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Audit individual modules or deploy complete static analysis sweeps below.</p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850 self-start sm:self-center">
          <button
            onClick={() => setViewMode('folder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              viewMode === 'folder' 
                ? 'bg-brand text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder className="h-3.5 w-3.5" />
            Folder Explorer
          </button>
          <button
            onClick={() => setViewMode('type')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              viewMode === 'type' 
                ? 'bg-brand text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            Grouped by Service
          </button>
        </div>
      </div>

      {/* Main Content Router */}
      {viewMode === 'folder' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Folders Directory List */}
          <div className="md:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">DIRECTORIES</span>
              <span className="text-[10px] font-mono text-slate-500">{sortedFolders.length} Folders</span>
            </div>
            
            <div className="bg-workbench-sidebar border border-slate-850 rounded-lg p-2.5 space-y-1 max-h-[480px] overflow-y-auto">
              {sortedFolders.map(folder => {
                const folderFiles = files.filter(f => getParentFolder(f.path) === folder);
                const isSelected = selectedFolder === folder;
                
                // Indicators for child file states
                const folderHasIssues = folderFiles.some(f => f.scanStatus === 'issues');
                const folderAllSecure = folderFiles.length > 0 && folderFiles.every(f => f.scanStatus === 'clean' || f.scanStatus === 'fixed');
                const folderScanning = folderFiles.some(f => f.scanStatus === 'scanning');

                return (
                  <button
                    key={folder}
                    onClick={() => setSelectedFolder(folder)}
                    className={`w-full flex items-center justify-between p-2 rounded text-left text-xs font-medium cursor-pointer border transition-all ${
                      isSelected 
                        ? 'bg-brand/10 border-brand/20 text-brand font-semibold' 
                        : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected ? (
                        <FolderOpen className="h-4 w-4 text-brand shrink-0" />
                      ) : (
                        <Folder className="h-4 w-4 text-slate-500 shrink-0" />
                      )}
                      <span className="truncate font-mono text-[11px]" title={folder}>
                        {folder === 'root' ? 'root_workspace' : folder}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {folderScanning && (
                        <div className="h-2 w-2 border border-brand border-t-transparent rounded-full animate-spin" />
                      )}
                      {folderHasIssues && !folderScanning && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      )}
                      {folderAllSecure && (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400 fill-emerald-500/5 shrink-0" />
                      )}
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono leading-none ${
                        isSelected ? 'bg-brand/20 text-brand' : 'bg-workbench-editor text-slate-500 border border-slate-850'
                      }`}>
                        {folderFiles.length}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Folder stats overview */}
            <div className="b2b-glass-panel rounded-xl p-4 space-y-3">
              <span className="text-[9px] font-bold font-mono tracking-widest text-slate-500 uppercase">FOLDER HEALTH SUM</span>
              {(() => {
                const folderFiles = files.filter(f => getParentFolder(f.path) === selectedFolder);
                const total = folderFiles.length;
                const scanned = folderFiles.filter(f => f.scanStatus !== 'idle').length;
                const secure = folderFiles.filter(f => f.scanStatus === 'clean' || f.scanStatus === 'fixed').length;
                const pct = total > 0 ? Math.round((scanned / total) * 100) : 0;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Audit Coverage</span>
                      <span className="text-brand font-bold">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-850/50">
                      <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                      <span>{scanned} of {total} Analyzed</span>
                      <span>{secure} Safe</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* RIGHT COLUMN: Filtered Files in Selected Folder */}
          <div className="md:col-span-9 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4.5 w-4.5 text-brand" />
                <h3 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
                  Workspace Location: <span className="text-brand">/{selectedFolder === 'root' ? '' : selectedFolder}</span>
                </h3>
              </div>
              
              <span className="text-[10px] font-mono text-slate-500">
                Showing {files.filter(f => getParentFolder(f.path) === selectedFolder).length} items
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {files
                .filter(f => getParentFolder(f.path) === selectedFolder)
                .map((file) => {
                  const styleMeta = getFileStyleAndIcon(file.name);
                  const semanticBorder = 
                    file.scanStatus === 'issues' 
                      ? (file.issuesCount.critical > 0 ? 'b2b-border-critical' : 'b2b-border-warning') 
                      : (file.scanStatus === 'clean' || file.scanStatus === 'fixed' ? 'b2b-border-clean' : '');

                  return (
                    <div
                      key={file.id}
                      className={`group relative rounded-xl b2b-card p-5 hover:-translate-y-1 overflow-hidden h-[154px] flex flex-col justify-between ${semanticBorder}`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 border border-slate-800">
                              {styleMeta.icon}
                            </div>
                            <div>
                              <p className="font-sans font-bold text-slate-100 text-[13px] leading-tight truncate max-w-[130px] group-hover:text-sky-400 transition-colors" title={file.name}>
                                {file.name}
                              </p>
                              <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold font-mono tracking-wider mt-1 ${styleMeta.badgeColor}`}>
                                {styleMeta.extLabel}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 mt-3 truncate w-full" title={file.path}>
                          {file.path}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-900 mt-2 z-10">
                        <span className="rounded bg-slate-950 border border-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-400 font-semibold">
                          {file.lines} lines
                        </span>
                        {renderCardStatus(file)}
                      </div>

                      {/* Sliding Hover Scan Button */}
                      <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-slate-950 border-t border-sky-500/20 px-4 py-3 flex items-center justify-center z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onScanSingle(file.id);
                          }}
                          className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-500 text-white font-sans text-xs font-bold py-2 hover:bg-sky-400 active:scale-95 transition-all cursor-pointer shadow-lg shadow-sky-500/20"
                        >
                          <Play className="h-3.5 w-3.5 fill-white animate-pulse" />
                          Audit This Module
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10 animate-in fade-in duration-200">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-4">
              
              {/* Divider Header */}
              <div className="flex items-center gap-3 border-b border-slate-850 pb-2">
                <span className="text-[11px] font-bold font-mono tracking-widest text-slate-400 uppercase">
                  {section.label}
                </span>
                {section.dangerLabel && (
                  <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[9px] font-extrabold font-mono tracking-widest text-rose-400 uppercase animate-pulse">
                    {section.dangerLabel}
                  </span>
                )}
                <div className="flex-1 h-[1px] bg-slate-850"></div>
              </div>

              {/* Section Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {section.list.map((file) => {
                  const styleMeta = getFileStyleAndIcon(file.name);
                  const semanticBorder = 
                    file.scanStatus === 'issues' 
                      ? (file.issuesCount.critical > 0 ? 'b2b-border-critical' : 'b2b-border-warning') 
                      : (file.scanStatus === 'clean' || file.scanStatus === 'fixed' ? 'b2b-border-clean' : '');

                  return (
                    <div
                      key={file.id}
                      className={`group relative rounded-xl b2b-card p-5 hover:-translate-y-1 overflow-hidden h-[154px] flex flex-col justify-between ${semanticBorder}`}
                    >
                      
                      {/* Top block */}
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          {/* File extension badge & icon */}
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 border border-slate-800">
                              {styleMeta.icon}
                            </div>
                            <div>
                              <p className="font-sans font-bold text-slate-100 text-[13px] leading-tight truncate max-w-[130px] group-hover:text-sky-400 transition-colors" title={file.name}>
                                {file.name}
                              </p>
                              <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold font-mono tracking-wider mt-1 ${styleMeta.badgeColor}`}>
                                {styleMeta.extLabel}
                              </span>
                            </div>
                          </div>

                          {/* File Size */}
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">
                            {formatBytes(file.size)}
                          </span>
                        </div>

                        {/* File Relative Path */}
                        <p className="text-[11px] font-mono text-slate-500 mt-3 truncate w-full" title={file.path}>
                          {file.path}
                        </p>
                      </div>

                      {/* Bottom Status Block */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-900 mt-2 z-10">
                        {/* Left Badge: Lines */}
                        <span className="rounded bg-slate-950 border border-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-400 font-semibold">
                          {file.lines} lines
                        </span>

                        {/* Right Badge: Scan status */}
                        {renderCardStatus(file)}
                      </div>

                      {/* Sliding Hover Scan Button */}
                      <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-slate-950 border-t border-brand/20 px-4 py-3 flex items-center justify-center z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onScanSingle(file.id);
                          }}
                          className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand text-slate-950 font-sans text-xs font-bold py-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg shadow-brand/20"
                        >
                          <Play className="h-3.5 w-3.5 fill-slate-950" />
                          Audit This Module
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur-md flex items-center justify-between">
        <div className="mx-auto flex max-w-7xl items-center justify-between w-full">
          {/* Left info */}
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
            </span>
            <p className="text-xs text-slate-300 font-mono font-medium">
              <span className="text-brand font-bold">{files.length}</span> modules ready for comprehensive audit
            </p>
          </div>

          {/* Center Play All */}
          <button
            onClick={onScanAll}
            className="flex items-center gap-2.5 rounded-full bg-brand hover:opacity-95 text-slate-950 text-sm font-bold font-sans px-8 py-3.5 shadow-lg shadow-brand/15 cursor-pointer hover:scale-103 active:scale-97 transition-all flex-shrink-0"
          >
            <Play className="h-4.5 w-4.5 fill-slate-950" />
            Audit Complete Repository
          </button>

          {/* Right Gear Shortcut */}
          <button
            onClick={onOpenSettings}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-all cursor-pointer shadow-md"
            title="Open Settings"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

    </div>
  );
}
