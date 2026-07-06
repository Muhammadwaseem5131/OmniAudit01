import React, { useRef, useState } from 'react';
import { UploadCloud, FolderOpen, FileCode, CheckCircle, Sparkles, HelpCircle } from 'lucide-react';
import { FileRecord } from '../types';
import { detectLanguage } from '../utils/scannerEngine';
import JSZip from 'jszip';
import InteractiveCodeBg from './InteractiveCodeBg';

interface UploadZoneProps {
  onFilesLoaded: (files: FileRecord[]) => void;
  onLoadDemo: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function UploadZone({ onFilesLoaded, onLoadDemo, onShowToast }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUPPORTED_EXTENSIONS = [
    '.py', '.js', '.ts', '.jsx', '.tsx', '.php', '.java', '.go', '.rb', '.env', '.yaml', '.json', '.html'
  ];

  // Check if file is text/supported
  const isSupportedFile = (fileName: string): boolean => {
    const ext = '.' + (fileName.split('.').pop()?.toLowerCase() || '');
    if (fileName.includes('node_modules') || fileName.includes('.git/') || fileName.includes('dist/')) return false;
    return SUPPORTED_EXTENSIONS.includes(ext) || fileName.endsWith('.env');
  };

  // Helper to read File object as string
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Handle standard folder or file input changes
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;
    await processFiles(Array.from(filesList));
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  // Handle dropped files/folders
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const items = e.dataTransfer.items;
    const files: File[] = [];

    if (items) {
      setIsProcessing(true);
      
      // Look for zipped file first
      const firstItem = e.dataTransfer.files[0];
      if (firstItem && firstItem.name.endsWith('.zip')) {
        await processZip(firstItem);
        setIsProcessing(false);
        return;
      }

      // Read standard files
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      
      await processFiles(files);
      setIsProcessing(false);
    }
  };

  // Process a ZIP file via JSZip
  const processZip = async (zipFile: File) => {
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(zipFile);
      const fileRecords: FileRecord[] = [];

      onShowToast(`Parsing ZIP archive: ${zipFile.name}...`, 'info');

      const promises: Promise<void>[] = [];

      content.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && isSupportedFile(zipEntry.name)) {
          const promise = zipEntry.async('string').then((text) => {
            const size = text.length; // Approximate size
            const lines = text.split('\n').length;
            const language = detectLanguage(zipEntry.name);

            fileRecords.push({
              id: `uploaded_${Math.random().toString(36).substr(2, 9)}`,
              name: zipEntry.name.split('/').pop() || zipEntry.name,
              path: relativePath,
              content: text,
              size,
              lines,
              language,
              scanStatus: 'idle',
              issuesCount: { critical: 0, high: 0, medium: 0, low: 0 }
            });
          });
          promises.push(promise);
        }
      });

      await Promise.all(promises);

      if (fileRecords.length > 0) {
        onShowToast(`Successfully loaded ${fileRecords.length} files from ZIP`, 'success');
        onFilesLoaded(fileRecords);
      } else {
        onShowToast('No supported source files (.py, .js, .ts, etc.) found in ZIP', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Failed to parse ZIP archive', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process standard list of Files
  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    try {
      // Check if there is a ZIP in files
      const zipFile = files.find(f => f.name.endsWith('.zip'));
      if (zipFile) {
        await processZip(zipFile);
        return;
      }

      const fileRecords: FileRecord[] = [];
      const filteredFiles = files.filter(f => isSupportedFile(f.name));

      if (filteredFiles.length === 0) {
        onShowToast('No supported code files detected. Try loading our Demo Project instead!', 'error');
        setIsProcessing(false);
        return;
      }

      for (const file of filteredFiles) {
        const text = await readFileContent(file);
        // Deduce virtual folder path from file webkitRelativePath
        const relativePath = file.webkitRelativePath || file.name;
        const linesCount = text.split('\n').length;
        const language = detectLanguage(file.name);

        fileRecords.push({
          id: `uploaded_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          path: relativePath,
          content: text,
          size: file.size,
          lines: linesCount,
          language,
          scanStatus: 'idle',
          issuesCount: { critical: 0, high: 0, medium: 0, low: 0 }
        });
      }

      onShowToast(`Loaded ${fileRecords.length} project files!`, 'success');
      onFilesLoaded(fileRecords);
    } catch (err) {
      console.error(err);
      onShowToast('Error parsing file streams', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[calc(100vh-54px)] max-w-3xl mx-auto w-full relative overflow-hidden select-none">
      {/* Dynamic interactive coding backdrop */}
      <InteractiveCodeBg />

      {/* Hero Header */}
      <div className="relative z-10 text-center mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 mb-4 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          <span className="text-[11px] font-mono font-semibold text-brand tracking-widest uppercase">OmniAudit 2.0 — AI Security Engine</span>
        </div>
        <h1 className="font-sans text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
          Audit Your Codebase
          <span className="block bg-gradient-to-r from-brand via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            In Seconds
          </span>
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Drop any project folder or ZIP — our 5-agent AI swarm scans for secrets, injections, misconfigs, and more.
        </p>
      </div>

      {/* Upload Zone Card */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`w-full rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300 relative z-10 backdrop-blur-[6px] ${
          isDragActive
            ? 'border-2 border-brand bg-brand/10 shadow-2xl shadow-brand/20 scale-[1.01]'
            : 'border border-dashed border-slate-700/60 bg-slate-900/50 hover:border-brand/40 hover:bg-slate-900/70 hover:shadow-xl hover:shadow-brand/[0.05]'
        }`}
        style={{
          boxShadow: isDragActive
            ? '0 0 0 1px rgba(14,165,233,0.3), 0 25px 60px -10px rgba(14,165,233,0.15)'
            : undefined
        }}
      >
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/85 rounded-2xl flex flex-col items-center justify-center z-10 backdrop-blur-sm">
            <div className="h-12 w-12 border-[3px] border-brand border-t-transparent rounded-full animate-spin shadow-lg shadow-brand/20"></div>
            <p className="text-sm font-semibold text-slate-200 mt-5 font-mono">Parsing Code Assets...</p>
            <p className="text-xs text-slate-500 mt-1">Reading file tree and extracting source modules</p>
          </div>
        )}

        {/* Upload Icon */}
        <div className={`flex h-20 w-20 items-center justify-center rounded-2xl mb-6 transition-all duration-300 ${
          isDragActive
            ? 'bg-brand/20 border-2 border-brand/50 text-brand scale-110 shadow-lg shadow-brand/20'
            : 'bg-workbench-editor border border-slate-800 text-slate-400'
        }`}>
          <UploadCloud className={`h-9 w-9 ${isDragActive ? '' : 'animate-float-y'}`} />
        </div>

        {/* Message */}
        <h2 className="font-sans text-xl font-bold text-slate-100 tracking-tight">
          {isDragActive ? 'Release to load project' : 'Drop your project folder here'}
        </h2>
        <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed font-mono">
          or click below to browse — supports directories and zipped source bundles
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-2.5 rounded-lg bg-brand text-slate-950 px-5 py-2.5 text-xs font-bold hover:bg-cyan-400 transition-all cursor-pointer shadow-lg shadow-brand/25 hover:shadow-brand/40 hover:scale-[1.02] active:scale-95"
          >
            <FolderOpen className="h-4 w-4" />
            Upload Project Folder
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2.5 rounded-lg bg-workbench-editor border border-slate-700 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:border-slate-600 hover:text-white transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-95"
          >
            <FileCode className="h-4 w-4 text-emerald-400" />
            Browse ZIP / Files
          </button>
        </div>

        {/* Hidden inputs */}
        {/* @ts-ignore */}
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip, .py, .js, .ts, .jsx, .tsx, .php, .java, .go, .rb, .yaml, .yml, .json, .html, .env"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Supported Languages Pills */}
        <div className="mt-10 w-full max-w-xl border-t border-slate-800/60 pt-6">
          <p className="text-[10px] font-bold text-slate-600 font-mono uppercase tracking-widest mb-3">Supported Targets</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {SUPPORTED_EXTENSIONS.map((ext) => (
              <span
                key={ext}
                className="rounded bg-workbench-editor border border-slate-800/80 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 font-mono tracking-tight hover:text-slate-300 hover:border-slate-700 transition-colors"
              >
                {ext}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Alternative */}
      <div className="mt-5 flex items-center justify-between gap-4 p-5 bg-slate-900/60 backdrop-blur-[4px] border border-slate-800/60 hover:border-brand/20 rounded-2xl w-full text-left transition-all duration-300 relative z-10 group">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            <span className="text-xs font-bold text-brand tracking-wide">Want to explore instantly?</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Skip upload — pre-load the <strong className="text-slate-300">Vulnerability Sandbox</strong> with 15+ real-world secrets, injections, and misconfigs.
          </p>
        </div>
        <button
          onClick={onLoadDemo}
          className="shrink-0 flex items-center gap-2 rounded-lg bg-brand/10 border border-brand/25 hover:bg-brand/20 hover:border-brand/50 text-brand px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md group-hover:shadow-brand/10 hover:scale-[1.02] active:scale-95 whitespace-nowrap"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Load Demo
        </button>
      </div>
    </div>
  );
}
