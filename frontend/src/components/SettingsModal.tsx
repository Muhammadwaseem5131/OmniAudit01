import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, Copy, Trash2, CheckCircle, AlertCircle, Sparkles, Server, Terminal, Heart, Shield } from 'lucide-react';
import { Settings, ApiKeyConfig, LLMProvider } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSaveSettings: (settings: Settings) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings, onShowToast }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'keys' | 'prefs' | 'about'>('keys');
  const [localSettings, setLocalSettings] = useState<Settings>({ ...settings });
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<LLMProvider | null>(null);

  // Sync local state when modal opens or settings change
  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings({ ...settings });
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // Toggle eye visibility
  const toggleVisibility = (provider: LLMProvider) => {
    setVisibleKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  // Change input
  const handleKeyChange = (provider: LLMProvider, val: string) => {
    setLocalSettings(prev => {
      const updatedKeys = { ...prev.apiKeys };
      updatedKeys[provider] = {
        ...updatedKeys[provider],
        key: val,
        // Reset status if empty
        status: val ? updatedKeys[provider].status : 'none'
      };
      return { ...prev, apiKeys: updatedKeys };
    });
  };

  // Change model
  const handleModelChange = (provider: LLMProvider, val: string) => {
    setLocalSettings(prev => {
      const updatedKeys = { ...prev.apiKeys };
      updatedKeys[provider] = { ...updatedKeys[provider], model: val };
      return { ...prev, apiKeys: updatedKeys };
    });
  };

  // Copy key
  const copyToClipboard = (provider: LLMProvider) => {
    const keyVal = localSettings.apiKeys[provider].key;
    if (!keyVal) return;
    navigator.clipboard.writeText(keyVal);
    onShowToast(`${provider.toUpperCase()} API key copied to clipboard`, 'success');
  };

  // Clear key
  const clearKey = (provider: LLMProvider) => {
    handleKeyChange(provider, '');
    onShowToast(`${provider.toUpperCase()} API key removed`, 'info');
  };

  // Test Connection
  const testConnection = (provider: LLMProvider) => {
    const keyConfig = localSettings.apiKeys[provider];
    if (!keyConfig.key) {
      onShowToast(`Please enter an API key for ${provider.toUpperCase()}`, 'error');
      return;
    }

    setTestingProvider(provider);

    // Simulate key testing with a beautiful loader
    setTimeout(() => {
      const isMockValid = keyConfig.key.trim().length > 6;
      
      const updatedKeys = { ...localSettings.apiKeys };
      updatedKeys[provider] = {
        ...updatedKeys[provider],
        status: isMockValid ? 'connected' : 'invalid'
      };

      // If this provider successfully connects, we can auto-select it as active if none is active
      let newActive = localSettings.activeProvider;
      if (isMockValid) {
        newActive = provider;
      }

      const nextSettings = { ...localSettings, apiKeys: updatedKeys, activeProvider: newActive };
      setLocalSettings(nextSettings);
      onSaveSettings(nextSettings);

      setTestingProvider(null);

      if (isMockValid) {
        onShowToast(`✓ Connected to ${provider.toUpperCase()} (${keyConfig.model}) successfully!`, 'success');
      } else {
        onShowToast(`✗ Invalid API Key. Please verify and try again.`, 'error');
      }
    }, 1200);
  };

  // Load Demo Keys for immediate testing
  const loadDemoSecrets = () => {
    const updatedKeys = { ...localSettings.apiKeys };
    (Object.keys(updatedKeys) as LLMProvider[]).forEach(provider => {
      let dummyKey = '';
      if (provider === 'anthropic') dummyKey = 'sk-ant-dummy-secret-omniaudit-token-2026';
      if (provider === 'openai') dummyKey = 'sk-proj-dummy-openai-key-secure-omniaudit';
      if (provider === 'google') dummyKey = 'AIzaSyDummyGeminiKey_OmniAuditSecret_2026';
      if (provider === 'mistral') dummyKey = 'mistral-dummy-key-token-secret-9999';

      updatedKeys[provider] = {
        ...updatedKeys[provider],
        key: dummyKey,
        status: 'connected'
      };
    });

    const nextSettings = { ...localSettings, apiKeys: updatedKeys, activeProvider: 'anthropic' as LLMProvider };
    setLocalSettings(nextSettings);
    onSaveSettings(nextSettings);
    onShowToast('✓ Demo Sandbox API Keys authorized successfully!', 'success');
  };

  // Select Active Provider
  const selectActiveProvider = (provider: LLMProvider) => {
    const status = localSettings.apiKeys[provider].status;
    if (status !== 'connected') {
      onShowToast(`Cannot select ${provider.toUpperCase()} — please enter and test key first`, 'error');
      return;
    }

    const nextSettings = { ...localSettings, activeProvider: provider };
    setLocalSettings(nextSettings);
    onSaveSettings(nextSettings);
    onShowToast(`Active Fix Agent switched to: ${provider.toUpperCase()}`, 'success');
  };

  // Save other settings
  const handlePreferenceChange = (key: string, val: any) => {
    const nextSettings = {
      ...localSettings,
      preferences: {
        ...localSettings.preferences,
        [key]: val
      }
    };
    setLocalSettings(nextSettings);
    onSaveSettings(nextSettings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      {/* Modal Card */}
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <Server className="h-5 w-5 text-sky-400" />
            <h2 className="font-sans text-lg font-semibold text-slate-100">Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Nav */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 px-6">
          <button
            onClick={() => setActiveTab('keys')}
            className={`border-b-2 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'keys' 
                ? 'border-sky-500 text-sky-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            API Credentials
          </button>
          <button
            onClick={() => setActiveTab('prefs')}
            className={`border-b-2 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'prefs' 
                ? 'border-sky-500 text-sky-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`border-b-2 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'about' 
                ? 'border-sky-500 text-sky-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            About
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[480px] overflow-y-auto">
          
          {/* TAB 1 - API KEYS */}
          {activeTab === 'keys' && (
            <div className="space-y-5">
              
              {/* Privacy Warning Header */}
              <div className="rounded-lg bg-sky-500/5 border border-sky-500/10 p-4 flex items-start gap-3">
                <Lock className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Local Sandboxed Credentials</h4>
                  <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
                    Your authorization keys are stored directly in your local browser sandbox. They never leave your device, touch our servers, or pass through any third-party infrastructure.
                  </p>
                </div>
                <button
                  onClick={loadDemoSecrets}
                  className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all shrink-0 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  Auto-Fill Demo Keys
                </button>
              </div>

              {/* Providers Grid / Table */}
              <div className="space-y-4">
                
                {/* 1. ANTHROPIC */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-violet-500"></span>
                      <span className="font-semibold text-slate-200 text-sm">Anthropic Claude</span>
                    </div>
                    {/* Model Dropdown */}
                    <select
                      value={localSettings.apiKeys.anthropic.model}
                      onChange={(e) => handleModelChange('anthropic', e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-xs px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                      <option value="claude-opus-4">claude-opus-4</option>
                      <option value="claude-haiku">claude-haiku</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={visibleKeys.anthropic ? 'text' : 'password'}
                        value={localSettings.apiKeys.anthropic.key}
                        onChange={(e) => handleKeyChange('anthropic', e.target.value)}
                        placeholder="sk-ant-............"
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-100 rounded-lg text-xs pl-3 pr-24 py-2.5 font-mono focus:border-sky-500 focus:outline-none transition-colors"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-500">
                        <button onClick={() => toggleVisibility('anthropic')} className="hover:text-slate-300 cursor-pointer">
                          {visibleKeys.anthropic ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => copyToClipboard('anthropic')} className="hover:text-slate-300 cursor-pointer">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => clearKey('anthropic')} className="hover:text-red-400 cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => testConnection('anthropic')}
                      disabled={testingProvider === 'anthropic'}
                      className={`px-4 text-xs font-semibold rounded-lg border cursor-pointer transition-all ${
                        localSettings.apiKeys.anthropic.status === 'connected'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          : localSettings.apiKeys.anthropic.status === 'invalid'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {testingProvider === 'anthropic' ? 'Testing...' : localSettings.apiKeys.anthropic.status === 'connected' ? '✓ Connected' : 'Test'}
                    </button>
                  </div>

                  {/* Active Radio */}
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="radio-anthropic"
                      name="active-provider"
                      checked={localSettings.activeProvider === 'anthropic'}
                      onChange={() => selectActiveProvider('anthropic')}
                      disabled={localSettings.apiKeys.anthropic.status !== 'connected'}
                      className="text-sky-500 focus:ring-sky-500 bg-slate-900 border-slate-800 rounded disabled:opacity-40"
                    />
                    <label 
                      htmlFor="radio-anthropic" 
                      className={`text-xs select-none ${localSettings.apiKeys.anthropic.status === 'connected' ? 'text-slate-300 cursor-pointer' : 'text-slate-500'}`}
                    >
                      Set Claude as Active Fix Agent
                    </label>
                  </div>
                </div>

                {/* 2. OPENAI */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      <span className="font-semibold text-slate-200 text-sm">OpenAI GPT-4</span>
                    </div>
                    {/* Model Dropdown */}
                    <select
                      value={localSettings.apiKeys.openai.model}
                      onChange={(e) => handleModelChange('openai', e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-xs px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="gpt-4o">gpt-4o</option>
                      <option value="gpt-4-turbo">gpt-4-turbo</option>
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={visibleKeys.openai ? 'text' : 'password'}
                        value={localSettings.apiKeys.openai.key}
                        onChange={(e) => handleKeyChange('openai', e.target.value)}
                        placeholder="sk-proj-............"
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-100 rounded-lg text-xs pl-3 pr-24 py-2.5 font-mono focus:border-sky-500 focus:outline-none transition-colors"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-500">
                        <button onClick={() => toggleVisibility('openai')} className="hover:text-slate-300 cursor-pointer">
                          {visibleKeys.openai ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => copyToClipboard('openai')} className="hover:text-slate-300 cursor-pointer">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => clearKey('openai')} className="hover:text-red-400 cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => testConnection('openai')}
                      disabled={testingProvider === 'openai'}
                      className={`px-4 text-xs font-semibold rounded-lg border cursor-pointer transition-all ${
                        localSettings.apiKeys.openai.status === 'connected'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          : localSettings.apiKeys.openai.status === 'invalid'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {testingProvider === 'openai' ? 'Testing...' : localSettings.apiKeys.openai.status === 'connected' ? '✓ Connected' : 'Test'}
                    </button>
                  </div>

                  {/* Active Radio */}
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="radio-openai"
                      name="active-provider"
                      checked={localSettings.activeProvider === 'openai'}
                      onChange={() => selectActiveProvider('openai')}
                      disabled={localSettings.apiKeys.openai.status !== 'connected'}
                      className="text-sky-500 focus:ring-sky-500 bg-slate-900 border-slate-800 rounded disabled:opacity-40"
                    />
                    <label 
                      htmlFor="radio-openai" 
                      className={`text-xs select-none ${localSettings.apiKeys.openai.status === 'connected' ? 'text-slate-300 cursor-pointer' : 'text-slate-500'}`}
                    >
                      Set GPT-4 as Active Fix Agent
                    </label>
                  </div>
                </div>

                {/* 3. GOOGLE / GEMINI */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                      <span className="font-semibold text-slate-200 text-sm">Google Gemini</span>
                    </div>
                    {/* Model Dropdown */}
                    <select
                      value={localSettings.apiKeys.google.model}
                      onChange={(e) => handleModelChange('google', e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-xs px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                      <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={visibleKeys.google ? 'text' : 'password'}
                        value={localSettings.apiKeys.google.key}
                        onChange={(e) => handleKeyChange('google', e.target.value)}
                        placeholder="AIzaSy............"
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-100 rounded-lg text-xs pl-3 pr-24 py-2.5 font-mono focus:border-sky-500 focus:outline-none transition-colors"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-500">
                        <button onClick={() => toggleVisibility('google')} className="hover:text-slate-300 cursor-pointer">
                          {visibleKeys.google ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => copyToClipboard('google')} className="hover:text-slate-300 cursor-pointer">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => clearKey('google')} className="hover:text-red-400 cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => testConnection('google')}
                      disabled={testingProvider === 'google'}
                      className={`px-4 text-xs font-semibold rounded-lg border cursor-pointer transition-all ${
                        localSettings.apiKeys.google.status === 'connected'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          : localSettings.apiKeys.google.status === 'invalid'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {testingProvider === 'google' ? 'Testing...' : localSettings.apiKeys.google.status === 'connected' ? '✓ Connected' : 'Test'}
                    </button>
                  </div>

                  {/* Active Radio */}
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="radio-google"
                      name="active-provider"
                      checked={localSettings.activeProvider === 'google'}
                      onChange={() => selectActiveProvider('google')}
                      disabled={localSettings.apiKeys.google.status !== 'connected'}
                      className="text-sky-500 focus:ring-sky-500 bg-slate-900 border-slate-800 rounded disabled:opacity-40"
                    />
                    <label 
                      htmlFor="radio-google" 
                      className={`text-xs select-none ${localSettings.apiKeys.google.status === 'connected' ? 'text-slate-300 cursor-pointer' : 'text-slate-500'}`}
                    >
                      Set Gemini as Active Fix Agent
                    </label>
                  </div>
                </div>

                {/* 4. MISTRAL */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      <span className="font-semibold text-slate-200 text-sm">Mistral AI</span>
                    </div>
                    {/* Model Dropdown */}
                    <select
                      value={localSettings.apiKeys.mistral.model}
                      onChange={(e) => handleModelChange('mistral', e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-xs px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="mistral-large">mistral-large</option>
                      <option value="mistral-medium">mistral-medium</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={visibleKeys.mistral ? 'text' : 'password'}
                        value={localSettings.apiKeys.mistral.key}
                        onChange={(e) => handleKeyChange('mistral', e.target.value)}
                        placeholder="sk-mistral-............"
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-100 rounded-lg text-xs pl-3 pr-24 py-2.5 font-mono focus:border-sky-500 focus:outline-none transition-colors"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-500">
                        <button onClick={() => toggleVisibility('mistral')} className="hover:text-slate-300 cursor-pointer">
                          {visibleKeys.mistral ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => copyToClipboard('mistral')} className="hover:text-slate-300 cursor-pointer">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => clearKey('mistral')} className="hover:text-red-400 cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => testConnection('mistral')}
                      disabled={testingProvider === 'mistral'}
                      className={`px-4 text-xs font-semibold rounded-lg border cursor-pointer transition-all ${
                        localSettings.apiKeys.mistral.status === 'connected'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          : localSettings.apiKeys.mistral.status === 'invalid'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {testingProvider === 'mistral' ? 'Testing...' : localSettings.apiKeys.mistral.status === 'connected' ? '✓ Connected' : 'Test'}
                    </button>
                  </div>

                  {/* Active Radio */}
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="radio-mistral"
                      name="active-provider"
                      checked={localSettings.activeProvider === 'mistral'}
                      onChange={() => selectActiveProvider('mistral')}
                      disabled={localSettings.apiKeys.mistral.status !== 'connected'}
                      className="text-sky-500 focus:ring-sky-500 bg-slate-900 border-slate-800 rounded disabled:opacity-40"
                    />
                    <label 
                      htmlFor="radio-mistral" 
                      className={`text-xs select-none ${localSettings.apiKeys.mistral.status === 'connected' ? 'text-slate-300 cursor-pointer' : 'text-slate-500'}`}
                    >
                      Set Mistral as Active Fix Agent
                    </label>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2 - PREFERENCES */}
          {activeTab === 'prefs' && (
            <div className="space-y-6">
              
              {/* Theme Settings */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">System Theme Mode</h3>
                  <p className="text-[12px] text-slate-400">Select the visual skin of the scanner interface.</p>
                </div>
                <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                  <button className="rounded px-3.5 py-1.5 text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                    DARK
                  </button>
                  <button disabled className="rounded px-3.5 py-1.5 text-xs font-medium text-slate-500 opacity-50 cursor-not-allowed font-mono">
                    LIGHT
                  </button>
                  <button disabled className="rounded px-3.5 py-1.5 text-xs font-medium text-slate-500 opacity-50 cursor-not-allowed font-mono">
                    SYSTEM
                  </button>
                </div>
              </div>

              {/* Brand Accent Theme Color Options */}
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Accent Theme Color</h3>
                  <p className="text-[12px] text-slate-400">Choose custom color configurations for glow accents, badges, and controls.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['sky', 'emerald', 'violet', 'amber', 'rose', 'indigo'] as const).map((colorSw) => {
                    const colorData = {
                      sky: { name: 'Sky', bg: 'bg-sky-500', hex: '#0ea5e9' },
                      emerald: { name: 'Emerald', bg: 'bg-emerald-500', hex: '#10b981' },
                      violet: { name: 'Violet', bg: 'bg-violet-500', hex: '#8b5cf6' },
                      amber: { name: 'Amber', bg: 'bg-amber-500', hex: '#f59e0b' },
                      rose: { name: 'Rose', bg: 'bg-rose-500', hex: '#f43f5e' },
                      indigo: { name: 'Indigo', bg: 'bg-indigo-500', hex: '#6366f1' }
                    };
                    const isSelected = (localSettings.preferences.themeColor || 'sky') === colorSw;
                    return (
                      <button
                        key={colorSw}
                        onClick={() => handlePreferenceChange('themeColor', colorSw)}
                        style={{
                          borderColor: isSelected ? colorData[colorSw].hex : undefined,
                          boxShadow: isSelected ? `0 0 12px ${colorData[colorSw].hex}30` : undefined
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-slate-950 text-slate-100' 
                            : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${colorData[colorSw].bg}`} />
                        <span>{colorData[colorSw].name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                
                {/* Auto-advance Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Auto-Advance Remediation Queue</h3>
                    <p className="text-[12px] text-slate-400">Automatically progress to the next code issue 1.5s after patch application.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={localSettings.preferences.autoAdvance} 
                      onChange={(e) => handlePreferenceChange('autoAdvance', e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {/* Show Fix Explanations */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Generate Explanations</h3>
                    <p className="text-[12px] text-slate-400">Instruct the LLM Agent to stream detailed risk and diff diagnostics in word-by-word typing blocks.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={localSettings.preferences.showExplanations} 
                      onChange={(e) => handlePreferenceChange('showExplanations', e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {/* Scan Sensitivity */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Scan Sensitivity Level</h3>
                    <p className="text-[12px] text-slate-400">Controls what vulnerability thresholds to check and report.</p>
                  </div>
                  <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => handlePreferenceChange('sensitivity', level)}
                        className={`rounded px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider font-mono cursor-pointer transition-colors ${
                          localSettings.preferences.sensitivity === level
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'text-slate-400 hover:text-slate-300 border border-transparent'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred Language */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Auditor Report Language</h3>
                    <p className="text-[12px] text-slate-400">Language configuration for static findings and report printouts.</p>
                  </div>
                  <select
                    value={localSettings.preferences.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs px-3.5 py-2 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="en">English (US)</option>
                    <option value="de">Deutsch (Coming Soon)</option>
                    <option value="fr">Français (Coming Soon)</option>
                    <option value="ja">日本語 (Coming Soon)</option>
                  </select>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3 - ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              
              <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-950/30 border border-slate-800 rounded-xl space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-lg shadow-sky-500/5">
                  <Shield className="h-8 w-8 animate-pulse-glow" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-bold text-slate-100">OmniAudit Security Engine</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">RELEASE v2.0.0-SANDBOX</p>
                </div>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed mt-2">
                  OmniAudit is a local-first, container-hardened web auditing studio designed to map, scan, diagnose, and remediate cloud configurations and repository codebases directly within browser sandboxes.
                </p>
              </div>

              {/* Version info and details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-lg bg-slate-950/20 border border-slate-800 space-y-2">
                  <h4 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">Engine Stack</h4>
                  <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
                    <li className="flex justify-between"><span>Core Runtime</span> <span className="text-sky-400">React 19 / TS</span></li>
                    <li className="flex justify-between"><span>Build Pipeline</span> <span className="text-sky-400">Vite 6 / Esbuild</span></li>
                    <li className="flex justify-between"><span>Animation Engine</span> <span className="text-sky-400">Motion 12</span></li>
                    <li className="flex justify-between"><span>PDF Generator</span> <span className="text-sky-400">jsPDF 2.5</span></li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-slate-950/20 border border-slate-800 space-y-2">
                  <h4 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">Project Metadata</h4>
                  <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
                    <li className="flex justify-between"><span>License Type</span> <span className="text-emerald-400">MIT Open Source</span></li>
                    <li className="flex justify-between"><span>Integrations</span> <span className="text-sky-400">Google Workspace</span></li>
                    <li className="flex justify-between"><span>Sandbox Environment</span> <span className="text-purple-400">Secure Client</span></li>
                    <li className="flex justify-between"><span>Compliance Standard</span> <span className="text-amber-400">OWASP Top 10</span></li>
                  </ul>
                </div>
              </div>

              {/* Credits footer */}
              <div className="text-center text-[11px] text-slate-500 font-sans flex items-center justify-center gap-1.5 pt-4">
                <span>Created with care by the security community</span>
                <Heart className="h-3 w-3 text-rose-500 fill-rose-500 animate-pulse" />
                <span>&copy; 2026 OmniAudit Systems.</span>
              </div>

            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end border-t border-slate-800 px-6 py-4 bg-slate-950/30 gap-3">
          <button
            onClick={() => {
              onSaveSettings(localSettings);
              onClose();
            }}
            className="rounded-lg bg-sky-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-400 shadow-lg shadow-sky-500/10 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            Apply Settings
          </button>
        </div>

      </div>
    </div>
  );
}
