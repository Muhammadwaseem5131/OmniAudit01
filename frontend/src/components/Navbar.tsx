import React from 'react';
import { Shield, Settings, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Settings as SettingsType } from '../types';

interface NavbarProps {
  settings: SettingsType;
  onOpenSettings: () => void;
  currentScreen: number;
  onGoHome: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBackPage: () => void;
  onGoForwardPage: () => void;
  screenName: string;
}

export default function Navbar({ 
  settings, 
  onOpenSettings, 
  currentScreen, 
  onGoHome,
  canGoBack,
  canGoForward,
  onGoBackPage,
  onGoForwardPage,
  screenName
}: NavbarProps) {
  // Check if active provider has a connected key
  const activeProvider = settings.activeProvider;
  const activeConfig = settings.apiKeys[activeProvider];
  const isConnected = activeConfig && activeConfig.status === 'connected';

  // Format provider display name
  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'Claude';
      case 'openai': return 'GPT-4';
      case 'google': return 'Gemini';
      case 'mistral': return 'Mistral';
      default: return provider;
    }
  };

  return (
    <nav className="border-b border-slate-850 bg-workbench-sidebar px-6 py-2.5 sticky top-0 z-40 h-[54px] flex items-center">
      <div className="mx-auto flex max-w-7xl items-center justify-between w-full">
        {/* Logo and Brand */}
        <button 
          onClick={onGoHome}
          className="flex items-center gap-2.5 group text-left cursor-pointer transition-transform active:scale-95"
        >
          <div className="flex h-8.5 w-8.5 items-center justify-center rounded-md bg-brand/10 text-brand border border-brand/20 group-hover:bg-brand/20 transition-all duration-300">
            <Shield className="h-4.5 w-4.5 animate-pulse-glow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-bold text-slate-100 tracking-tight text-sm">
                OmniAudit
              </span>
              <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[9px] font-semibold text-brand border border-brand/15">
                2.0
              </span>
            </div>
            <p className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">AI Security Engine</p>
          </div>
        </button>

        {/* Navigation History Controls */}
        <div className="flex items-center gap-1 bg-workbench-editor border border-slate-850 p-1 rounded-md shrink-0">
          <button
            onClick={onGoBackPage}
            disabled={!canGoBack}
            className={`flex h-6.5 w-6.5 items-center justify-center rounded transition-all cursor-pointer ${
              canGoBack 
                ? 'text-slate-200 hover:bg-slate-800 hover:text-white' 
                : 'text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title="Go Back Page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          
          <div className="text-[10px] text-slate-400 font-mono font-medium px-2.5 max-w-[130px] text-center truncate select-none">
            {screenName}
          </div>

          <button
            onClick={onGoForwardPage}
            disabled={!canGoForward}
            className={`flex h-6.5 w-6.5 items-center justify-center rounded transition-all cursor-pointer ${
              canGoForward 
                ? 'text-slate-200 hover:bg-slate-800 hover:text-white' 
                : 'text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title="Go Forward Page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Action Items */}
        <div className="flex items-center gap-4">
          {/* API Status Badge */}
          <div 
            onClick={onOpenSettings}
            className="flex items-center gap-2 rounded-full border border-slate-850 bg-workbench-editor px-3.5 py-1 text-xs cursor-pointer hover:bg-slate-800 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'bg-emerald-400' : 'bg-rose-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}></span>
            </span>
            <span className="font-mono text-slate-300 text-[11px]">
              {isConnected 
                ? `${getProviderName(activeProvider)} Active`
                : 'No API Key'
              }
            </span>
          </div>

          {/* Settings Trigger */}
          <button
            id="settings-navbar-btn"
            onClick={onOpenSettings}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-md border border-slate-850 bg-workbench-editor text-slate-400 hover:border-slate-750 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Open Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
