import React, { useState, useEffect } from 'react';
import { 
  X, Undo, Code, Wrench, ShieldAlert, CheckCircle, ChevronLeft, ChevronRight, Play, 
  Sparkles, Check, ArrowRight, CornerDownRight, FileCode, Sliders, Bot, Send, MessageSquare
} from 'lucide-react';
import { Vulnerability, FileRecord, Settings } from '../types';

interface FixIDEProps {
  isOpen: boolean;
  onClose: () => void;
  vulnerabilities: Vulnerability[];
  activeVulnId: string;
  onSelectVuln: (id: string) => void;
  onApplyFix: (vulnId: string, customNewCode?: string) => Promise<void>;
  onSkipNext: () => void;
  onUndoLastFix: () => void;
  canUndo: boolean;
  files: FileRecord[];
  settings: Settings;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function FixIDE({
  isOpen,
  onClose,
  vulnerabilities,
  activeVulnId,
  onSelectVuln,
  onApplyFix,
  onSkipNext,
  onUndoLastFix,
  canUndo,
  files,
  settings,
  onShowToast
}: FixIDEProps) {

  const activeVuln = vulnerabilities.find(v => v.id === activeVulnId) || vulnerabilities[0];
  const activeFile = activeVuln ? files.find(f => f.id === activeVuln.fileId) : null;

  // Animation states inside code editor
  const [editorLines, setEditorLines] = useState<string[]>([]);
  const [typingState, setTypingState] = useState<'idle' | 'deleting' | 'typing' | 'done'>('idle');
  const [animatingLineNum, setAnimatingLineNum] = useState<number>(-1);
  const [animatedCodeLine, setAnimatedCodeLine] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);

  // Typewriter streaming explanation state
  const [aiExplanationText, setAiExplanationText] = useState<string>('');
  const [batchSelectedIds, setBatchSelectedIds] = useState<Record<string, boolean>>({});

  // RESIZABLE WORKBENCH PANEL STATES (VS Code Layout)
  const [sidebarWidth, setSidebarWidth] = useState<number>(200);
  const [drawerWidth, setDrawerWidth] = useState<number>(380);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const [isResizingDrawer, setIsResizingDrawer] = useState<boolean>(false);

  // CO-DEVELOPER AI CHAT INTEGRATION
  const [rightPanelTab, setRightPanelTab] = useState<'diagnostics' | 'chat'>('diagnostics');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    timestamp: Date;
    proposedFix?: {
      diffOriginal: string;
      diffNew: string;
      fixExplanation: string;
      riskExplanation?: string;
    };
  }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Locally entered API key support as requested
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('omniaudit_gemini_key') || '');

  // Persistent modified proposals dict
  const [customProposals, setCustomProposals] = useState<Record<string, {
    diffOriginal: string;
    diffNew: string;
    fixExplanation: string;
    riskExplanation?: string;
  }>>({});

  const displayOriginal = customProposals[activeVuln?.id] ? customProposals[activeVuln.id].diffOriginal : (activeVuln?.diffOriginal || '');
  const displayNew = customProposals[activeVuln?.id] ? customProposals[activeVuln.id].diffNew : (activeVuln?.diffNew || '');
  const displayFixExplanation = customProposals[activeVuln?.id] ? customProposals[activeVuln.id].fixExplanation : (activeVuln?.fixExplanation || '');
  const displayRiskExplanation = customProposals[activeVuln?.id] ? customProposals[activeVuln.id].riskExplanation : (activeVuln?.riskExplanation || '');

  const activeProvider = settings.activeProvider || 'google';
  const apiConfig = settings.apiKeys?.[activeProvider];
  const apiKey = (activeProvider === 'google' ? (apiConfig?.key || customApiKey) : (apiConfig?.key || ''));

  const saveLocalApiKey = (keyVal: string) => {
    setCustomApiKey(keyVal);
    localStorage.setItem('omniaudit_gemini_key', keyVal);
    onShowToast(`✓ API Key saved securely! Connecting...`, 'success');
  };

  // Direct Browser Gemini Caller
  const callGeminiDirect = async (
    userPrompt: string,
    fileContent: string,
    currentOriginal: string,
    currentProposed: string,
    keyToUse: string
  ) => {
    if (!keyToUse) {
      throw new Error("API_KEY_MISSING");
    }

    const systemInstruction = `You are OmniAudit's expert AI remediation engine.
The developer wants to customize or refine the proposed secure code patch for the active vulnerability.
Analyze the requested customization, the file context, the original vulnerable code, and generate an updated, secure, optimized solution.

IMPORTANT rules:
1. You MUST respond with ONLY a raw JSON object matching the schema below. No markdown wrappers like \`\`\`json or \`\`\`. No leading or trailing text outside of the JSON object.
2. The code in "diffNew" MUST be correct, secure, compile-ready, and resolve the vulnerability as customized by the user.
3. Be highly concise in explanations.

JSON Response Schema:
{
  "diffOriginal": "exact lines of original vulnerable code to be replaced",
  "diffNew": "exact lines of secure replacement code containing the fix",
  "fixExplanation": "how this new patch fixes the security vulnerability and handles the user customization",
  "riskExplanation": "brief reminder of why the original code is dangerous",
  "chatResponse": "your direct conversational message to the user explaining the custom changes you made"
}

Vulnerability context:
- Category: ${activeVuln?.type}
- CWE: ${activeVuln?.cwe}
- Original code snippet: ${activeVuln?.codeSnippet}
- Current original lines being patched: ${currentOriginal}
- Currently proposed secure patch: ${currentProposed}

Full file context:
- File path: ${activeFile?.path || 'unknown'}
- Language: ${activeFile?.language || 'typescript'}
`;

    const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`;

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemInstruction },
              { text: `User requested customization/refinement: "${userPrompt}"` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      throw new Error(errRes?.error?.message || `HTTP error ${response.status}`);
    }

    const resData = await response.json();
    const responseText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error("Received an empty response from Gemini API");
    }

    // Clean any markdown formatting if present
    let cleanJsonText = responseText.trim();
    if (cleanJsonText.startsWith('```json')) {
      cleanJsonText = cleanJsonText.substring(7);
    }
    if (cleanJsonText.startsWith('```')) {
      cleanJsonText = cleanJsonText.substring(3);
    }
    if (cleanJsonText.endsWith('```')) {
      cleanJsonText = cleanJsonText.substring(0, cleanJsonText.length - 3);
    }
    cleanJsonText = cleanJsonText.trim();

    try {
      return JSON.parse(cleanJsonText);
    } catch (parseErr) {
      // Fallback extraction
      const match = cleanJsonText.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error("Failed to parse structural response from AI");
    }
  };

  // Resize handler effect for resizable panels
  useEffect(() => {
    if (!isResizingSidebar && !isResizingDrawer) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const nextWidth = Math.max(140, Math.min(380, e.clientX));
        setSidebarWidth(nextWidth);
      } else if (isResizingDrawer) {
        const nextWidth = Math.max(260, Math.min(600, window.innerWidth - e.clientX));
        setDrawerWidth(nextWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingDrawer(false);
    };

    // Prevent text selection while dragging
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingDrawer]);

  if (!isOpen || !activeVuln) return null;

  // Initialize editor lines when active file or vulnerability changes
  useEffect(() => {
    if (activeFile) {
      setEditorLines(activeFile.content.split('\n'));
      setTypingState('idle');
      setAnimatingLineNum(-1);
      setAnimatedCodeLine('');
      setIsApplying(false);
    }
  }, [activeVulnId, activeFile]);

  // Stream AI explanation typewriter style on vuln change or custom proposal generation
  useEffect(() => {
    if (activeVuln) {
      setAiExplanationText('');
      const words = displayFixExplanation.split(' ');
      let currentIdx = 0;
      let currentStr = '';

      const timer = setInterval(() => {
        if (currentIdx < words.length) {
          currentStr += (currentIdx === 0 ? '' : ' ') + words[currentIdx];
          setAiExplanationText(currentStr);
          currentIdx++;
        } else {
          clearInterval(timer);
        }
      }, 30);

      return () => clearInterval(timer);
    }
  }, [activeVulnId, displayFixExplanation]);

  // Initialize and reset AI Chatbot messages for current vulnerability
  useEffect(() => {
    if (activeVuln) {
      setChatMessages([
        {
          id: `welcome_${activeVuln.id}`,
          sender: 'assistant',
          text: `Hello! I can help you customize the secure patch for: "${activeVuln.type}" (Line ${activeVuln.line}). Tell me what custom code behavior, edge cases, or optimizations you would like to include!`,
          timestamp: new Date()
        }
      ]);
    }
  }, [activeVulnId]);

  // Chat message submission handler
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userText = chatInput.trim();
    setChatInput('');
    
    // Push user message
    const userMsg = {
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      sender: 'user' as const,
      text: userText,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const currentOriginal = displayOriginal;
      const currentProposed = displayNew;

      // Call the LLM
      const res = await callGeminiDirect(
        userText,
        activeFile?.content || '',
        currentOriginal,
        currentProposed,
        apiKey
      );

      // Update customProposals with updated secure patch
      if (res.diffNew && res.diffOriginal) {
        setCustomProposals(prev => ({
          ...prev,
          [activeVuln.id]: {
            diffOriginal: res.diffOriginal,
            diffNew: res.diffNew,
            fixExplanation: res.fixExplanation || displayFixExplanation,
            riskExplanation: res.riskExplanation || displayRiskExplanation
          }
        }));

        // Push assistant message with successful patch generation
        const assistantMsg = {
          id: `ai_${Math.random().toString(36).substr(2, 9)}`,
          sender: 'assistant' as const,
          text: res.chatResponse || "I have refined the proposed code patch based on your instructions. You can preview the changes above.",
          timestamp: new Date(),
          proposedFix: {
            diffOriginal: res.diffOriginal,
            diffNew: res.diffNew,
            fixExplanation: res.fixExplanation || displayFixExplanation,
            riskExplanation: res.riskExplanation || displayRiskExplanation
          }
        };
        setChatMessages(prev => [...prev, assistantMsg]);
        onShowToast("✨ Updated secure patch proposal generated!", "success");
      } else {
        // Non-structured response fallback
        const assistantMsg = {
          id: `ai_${Math.random().toString(36).substr(2, 9)}`,
          sender: 'assistant' as const,
          text: res.chatResponse || "I analyzed your request but couldn't construct a fully formed code patch. Could you specify the exact edit instruction?",
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error: any) {
      console.error("Gemini call error:", error);
      let errorMsg = "Sorry, I ran into an error communicating with the AI. Please verify your API Key and network connection.";
      if (error.message === "API_KEY_MISSING") {
        errorMsg = "API key is missing. Please enter your API Key in the field below to connect.";
      } else if (error.message) {
        errorMsg = `API Error: ${error.message}`;
      }

      const errorAssistantMsg = {
        id: `ai_${Math.random().toString(36).substr(2, 9)}`,
        sender: 'assistant' as const,
        text: errorMsg,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorAssistantMsg]);
      onShowToast("AI request failed.", "error");
    } finally {
      setIsChatLoading(false);
    }
  };

  // Apply Single Fix with beautiful typewriter code substitution animation
  const handleApplySingleFix = async () => {
    if (isApplying) return;
    setIsApplying(true);

    const originalLineIndex = activeVuln.line - 1;
    const replacementCode = displayNew.replace('// SECURE RESOLUTION:\n', '').trim();
    const originalText = editorLines[originalLineIndex];

    setAnimatingLineNum(activeVuln.line);
    
    // Step 1: Highlight yellow / Processing
    setTypingState('deleting');
    onShowToast(`Analyzing dependencies and planning patch on line ${activeVuln.line}...`, 'info');

    // Step 2: Delete characters one-by-one
    let currentLineText = originalText;
    const deleteInterval = setInterval(() => {
      if (currentLineText.length > 4) {
        currentLineText = currentLineText.substring(0, currentLineText.length - 3);
        setEditorLines(prev => {
          const next = [...prev];
          next[originalLineIndex] = currentLineText;
          return next;
        });
      } else {
        clearInterval(deleteInterval);
        
        // Step 3: Type characters in one-by-one
        setTypingState('typing');
        let typeIdx = 0;
        let typedText = '    '; // Keep indentation

        const typeInterval = setInterval(() => {
          if (typeIdx < replacementCode.length) {
            // Type 3 characters at a time for snappier feedback
            typedText += replacementCode.substring(typeIdx, typeIdx + 3);
            typeIdx += 3;
            setEditorLines(prev => {
              const next = [...prev];
              next[originalLineIndex] = typedText;
              return next;
            });
          } else {
            clearInterval(typeInterval);
            
            // Finish typing completely
            setEditorLines(prev => {
              const next = [...prev];
              next[originalLineIndex] = replacementCode;
              return next;
            });
            setTypingState('done');
            
            // Apply fix to core App state
            onApplyFix(activeVuln.id, replacementCode).then(() => {
              setIsApplying(false);
              onShowToast('✓ Vulnerability resolved successfully!', 'success');

              // Auto-advance queue if preference enabled
              if (settings.preferences.autoAdvance) {
                setTimeout(() => {
                  onSkipNext();
                }, 1500);
              }
            });
          }
        }, 35);
      }
    }, 20);
  };

  // Skip queue item
  const handleSkip = () => {
    onSkipNext();
    onShowToast('Issue deferred to backlog', 'info');
  };

  // Toggle batch selector checkboxes
  const toggleBatchSelect = (vulnId: string) => {
    setBatchSelectedIds(prev => ({ ...prev, [vulnId]: !prev[vulnId] }));
  };

  // Apply batch fixes
  const applyBatchSelectedFixes = async () => {
    const selectedIds = Object.entries(batchSelectedIds)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);

    if (selectedIds.length === 0) {
      onShowToast('Please check at least one checkbox below', 'error');
      return;
    }

    onShowToast(`Applying batch modifications to ${selectedIds.length} vulnerabilities...`, 'info');
    
    // Sequential fixes in background
    for (const id of selectedIds) {
      await onApplyFix(id);
    }

    setBatchSelectedIds({});
    onShowToast(`✓ Successfully patched ${selectedIds.length} select files!`, 'success');
  };

  const outstandingVulns = vulnerabilities.filter(v => !v.fixed);
  const activeVulnIndex = vulnerabilities.findIndex(v => v.id === activeVuln.id);

  return (
    <div className="fixed top-[54px] bottom-0 left-0 right-0 z-30 flex flex-col bg-workbench-sidebar font-sans animate-in slide-in-from-bottom duration-300">
      
      {/* TOP HEADER BAR (Anti-glare IDE status area) */}
      <header className="h-11 border-b border-slate-850 bg-workbench-statusbar flex items-center justify-between px-6 shrink-0">
        
        {/* Left branding and icon */}
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-brand/10 text-brand border border-brand/20">
            <Wrench className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-xs text-slate-300 tracking-wide">OMNIAUDIT REMEDIATION IDE</h2>
          </div>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <span className="font-mono text-xs text-slate-400 font-semibold truncate max-w-[200px]" title={activeFile?.path}>
            {activeFile?.path} (Line {activeVuln.line})
          </span>
        </div>

        {/* Center: card navigation indicators */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-md border border-slate-850 select-none">
          {/* Back Card Button */}
          <button
            onClick={() => {
              if (activeVulnIndex > 0) {
                onSelectVuln(vulnerabilities[activeVulnIndex - 1].id);
                onShowToast(`Switched to previous backlog card: issue ${activeVulnIndex}`, 'info');
              }
            }}
            disabled={activeVulnIndex === 0}
            className={`flex h-5 w-5 items-center justify-center rounded transition-colors cursor-pointer ${
              activeVulnIndex > 0 
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                : 'text-slate-700 cursor-not-allowed opacity-40'
            }`}
            title="Previous Vulnerability Card (Back Card)"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>

          <span className="font-mono text-[9px] text-slate-400 px-1">
            Card <span className="text-brand font-extrabold">{activeVulnIndex + 1}</span> of <span className="text-slate-200 font-bold">{vulnerabilities.length}</span>
          </span>

          {/* Forward Card Button */}
          <button
            onClick={() => {
              if (activeVulnIndex < vulnerabilities.length - 1) {
                onSelectVuln(vulnerabilities[activeVulnIndex + 1].id);
                onShowToast(`Switched to next backlog card: issue ${activeVulnIndex + 2}`, 'info');
              }
            }}
            disabled={activeVulnIndex === vulnerabilities.length - 1}
            className={`flex h-5 w-5 items-center justify-center rounded transition-colors cursor-pointer ${
              activeVulnIndex < vulnerabilities.length - 1 
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                : 'text-slate-700 cursor-not-allowed opacity-40'
            }`}
            title="Next Vulnerability Card (Forward Card)"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Right actions: Undo & Close */}
        <div className="flex items-center gap-3">
          {canUndo && (
            <button
              onClick={onUndoLastFix}
              className="flex items-center gap-1.5 rounded border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300 hover:text-white px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Undo className="h-3 w-3 text-brand" />
              Undo Last Fix
            </button>
          )}

          <button
            onClick={onClose}
            className="flex h-7.5 w-7.5 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100 cursor-pointer transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

      </header>

      {/* CORE IDE CONTAINER GRIDS */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* PANEL 1: LEFT SIDEBAR ISSUE QUEUE */}
        <aside 
          style={{ width: `${sidebarWidth}px` }}
          className="bg-workbench-sidebar border-r border-slate-850 flex flex-col h-full min-h-0 shrink-0"
        >
          <div className="p-3 border-b border-slate-850 bg-slate-950/20 shrink-0">
            <span className="text-[9px] font-bold font-mono tracking-widest text-slate-500 uppercase">ALERT BACKLOG</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-850/40">
            {vulnerabilities.map((vuln, index) => {
              const isSelected = vuln.id === activeVuln.id;
              
              return (
                <button
                  key={vuln.id}
                  onClick={() => onSelectVuln(vuln.id)}
                  className={`w-full text-left p-3.5 text-xs space-y-2 transition-all cursor-pointer flex flex-col justify-between ide-tree-item-hover ${
                    isSelected 
                      ? 'bg-[rgba(255,255,255,0.04)] border-l-2 border-l-brand' 
                      : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[9px] text-slate-500">LINE {vuln.line}</span>
                    {vuln.fixed ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 font-mono">
                        <Check className="h-3 w-3" />
                        FIXED
                      </span>
                    ) : (
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        vuln.severity === 'critical' 
                          ? 'bg-rose-500' 
                          : vuln.severity === 'high' 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`} />
                    )}
                  </div>

                  <p className={`font-sans font-semibold leading-tight truncate w-full ${
                    vuln.fixed 
                      ? 'text-slate-500 line-through decoration-slate-600' 
                      : isSelected 
                      ? 'text-brand' 
                      : 'text-slate-300'
                  }`}>
                    {vuln.type}
                  </p>

                  <p className="text-[10px] font-mono text-slate-500 truncate w-full">
                    {vuln.fileName}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* RESIZABLE DIVIDER 1 (Left Sidebar Resizer) */}
        <div 
          onMouseDown={() => setIsResizingSidebar(true)}
          className="w-[3px] hover:w-[5px] active:w-[5px] h-full cursor-col-resize hover:bg-brand/40 active:bg-brand bg-slate-850/60 transition-all duration-150 shrink-0 z-30 select-none relative group"
        >
          <div className="absolute inset-0 group-hover:scale-x-125 group-active:scale-x-150 transition-transform pointer-events-none" />
        </div>

        {/* PANEL 2: CENTER CODE EDITOR (largest width) */}
        <section className="flex-1 border-r border-slate-850 bg-workbench-editor flex flex-col min-h-0 relative">
          
          {/* Editor Header / Code File tabs */}
          <div className="h-9 border-b border-slate-850 bg-workbench-sidebar flex items-center shrink-0">
            <div className="flex h-full items-center border-r border-slate-850 bg-workbench-editor px-4 gap-2 text-xs font-mono font-bold text-brand">
              <FileCode className="h-3.5 w-3.5 text-brand" />
              <span>{activeFile?.name}</span>
            </div>
            <div className="flex-1 bg-workbench-sidebar h-full"></div>
          </div>

          {/* Code viewport with line numbers */}
          <div className="flex-1 overflow-auto flex min-h-0 font-mono text-[12px] leading-relaxed p-4 bg-workbench-editor text-slate-300">
            
            {/* Line numbers column */}
            <div className="select-none text-right pr-4 border-r border-slate-900 text-slate-600 text-xs space-y-[2px] font-mono shrink-0">
              {editorLines.map((_, idx) => (
                <div key={idx} className="h-[21px]">{idx + 1}</div>
              ))}
            </div>

            {/* Live lines code editor box */}
            <div className="flex-1 pl-4 space-y-[2px] overflow-x-auto min-w-0 relative">
              
              {editorLines.map((lineText, idx) => {
                const lineNum = idx + 1;
                const isVulnerableLine = lineNum === activeVuln.line;
                const isAnimating = lineNum === animatingLineNum;

                // Set styles for highlighting line
                let lineBgClass = '';
                let extraCodeClass = '';

                if (isVulnerableLine) {
                  if (activeVuln.fixed) {
                    lineBgClass = 'bg-emerald-950/15 border-y border-emerald-500/20';
                    extraCodeClass = 'text-emerald-300';
                  } else if (isAnimating && typingState === 'deleting') {
                    lineBgClass = 'bg-amber-950/40 border-y border-amber-500/30';
                  } else if (isAnimating && typingState === 'typing') {
                    lineBgClass = 'bg-brand/15 border-y border-brand/30';
                  } else {
                    lineBgClass = 'bg-rose-950/20 border-y border-rose-500/20';
                  }
                }

                return (
                  <div 
                    key={idx} 
                    className={`h-[21px] flex items-center relative ${lineBgClass}`}
                  >
                    {/* Gutter Icon */}
                    {isVulnerableLine && (
                      <div className="absolute -left-[30px] flex items-center justify-center">
                        {activeVuln.fixed ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400 fill-emerald-500/10" />
                        ) : (
                          <ShieldAlert className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                        )}
                      </div>
                    )}

                    {/* Code Text line */}
                    <span className={`whitespace-pre font-mono pr-4 block truncate ${extraCodeClass} ${isVulnerableLine && !activeVuln.fixed && !isAnimating ? (activeVuln.severity === 'critical' ? 'squiggly-critical' : 'squiggly-warning') : ''}`}>
                      {lineText}
                    </span>

                    {/* Left semantic indicator line overlay for vulnerable card link */}
                    {isVulnerableLine && !activeVuln.fixed && (
                      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${activeVuln.severity === 'critical' ? 'bg-[#FF3B30]' : 'bg-[#FF9500]'}`} />
                    )}
                  </div>
                );
              })}

            </div>

            {/* Monaco mock Mini-Map on the right side */}
            <div className="hidden lg:flex w-20 shrink-0 border-l border-slate-850 h-full p-1.5 select-none opacity-40 hover:opacity-80 transition-opacity flex-col gap-[2px] overflow-hidden bg-workbench-sidebar">
              {editorLines.slice(0, 70).map((line, idx) => {
                const lineNum = idx + 1;
                const isVuln = lineNum === activeVuln.line;
                const len = Math.min(60, line.length);
                const blocks = Array.from({ length: Math.max(1, Math.floor(len / 4)) });

                return (
                  <div key={idx} className="flex gap-[1px] h-[3px]">
                    {blocks.map((_, bIdx) => (
                      <div 
                        key={bIdx} 
                        className={`h-full w-[3px] rounded-[1px] ${
                          isVuln 
                            ? activeVuln.fixed ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse' 
                            : 'bg-slate-800'
                        }`} 
                      />
                    ))}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* RESIZABLE DIVIDER 2 (Right Diagnostics Resizer) */}
        <div 
          onMouseDown={() => setIsResizingDrawer(true)}
          className="w-[3px] hover:w-[5px] active:w-[5px] h-full cursor-col-resize hover:bg-brand/40 active:bg-brand bg-slate-850/60 transition-all duration-150 shrink-0 z-30 select-none relative group"
        >
          <div className="absolute inset-0 group-hover:scale-x-125 group-active:scale-x-150 transition-transform pointer-events-none" />
        </div>

        {/* RIGHT DRAWER: VULNERABILITY DIAGNOSTICS & ACTIONS */}
        <section 
          style={{ width: `${drawerWidth}px` }}
          className="bg-workbench-sidebar border-l border-slate-850 flex flex-col min-h-0 shrink-0 h-full"
        >
          {/* Tab Switcher Headers */}
          <div className="flex border-b border-slate-850 bg-slate-950/40 shrink-0 p-1">
            <button
              onClick={() => setRightPanelTab('diagnostics')}
              className={`flex-1 text-center py-2 text-[11px] font-sans font-bold rounded cursor-pointer transition-colors ${
                rightPanelTab === 'diagnostics' 
                  ? 'bg-brand/10 text-brand border border-brand/20' 
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              Diagnostics & Patch
            </button>
            <button
              onClick={() => setRightPanelTab('chat')}
              className={`flex-1 text-center py-2 text-[11px] font-sans font-bold rounded cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                rightPanelTab === 'chat' 
                  ? 'bg-brand/10 text-brand border border-brand/20' 
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Bot className="h-3.5 w-3.5 text-brand" />
              AI Co-Developer
            </button>
          </div>

          {rightPanelTab === 'chat' ? (
            /* TAB 2: CO-DEVELOPER AI CHAT TAB */
            <div className="flex-1 flex flex-col min-h-0 bg-workbench-sidebar">
              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    {/* Avatar & Sender Label */}
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-500">
                      {msg.sender === 'user' ? (
                        <span>Developer (You)</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Bot className="h-3 w-3 text-brand" />
                          <span className="text-brand font-bold">OMNIAUDIT AI</span>
                        </div>
                      )}
                      <span>• {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Text Bubble */}
                    <div className={`p-3 rounded-lg text-xs leading-relaxed max-w-[90%] whitespace-pre-wrap ${
                      msg.sender === 'user' 
                        ? 'bg-brand/15 text-slate-200 border border-brand/30 rounded-tr-none font-sans shadow-[0_0_8px_rgba(var(--brand-color-rgb),0.05)]' 
                        : 'bg-slate-950 text-slate-300 border border-slate-850 rounded-tl-none font-sans'
                    }`}>
                      {msg.text}

                      {/* Message contains revised code patch indicators */}
                      {msg.proposedFix && (
                        <div className="mt-3 p-2 bg-emerald-950/20 border border-emerald-500/20 rounded text-[10px] space-y-1 font-sans">
                          <div className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
                            <CheckCircle className="h-3.5 w-3.5 fill-emerald-500/5" />
                            <span>UPDATED PROPOSAL GENERATED</span>
                          </div>
                          <p className="text-slate-400 leading-normal">
                            The active vulnerability patch has been updated. Review the red/green Diff above in the editor and click "Apply This Fix" to commit.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-500">
                      <Bot className="h-3 w-3 text-brand animate-pulse" />
                      <span className="text-brand font-bold">OMNIAUDIT AI is thinking...</span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg text-xs flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-brand rounded-full animate-bounce" />
                      <div className="h-1.5 w-1.5 bg-brand rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="h-1.5 w-1.5 bg-brand rounded-full animate-bounce [animation-delay:0.4s]" />
                      <span className="text-slate-500 ml-1 font-mono text-[11px]">Generating revised secure patch...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* LOCAL API KEY SETUP WARNING */}
              {!apiKey && (
                <div className="p-3.5 bg-rose-500/5 border-t border-b border-rose-500/10 text-rose-300 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold font-mono text-[10px] text-rose-400 uppercase tracking-wider">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                    <span>Gemini API Key Required</span>
                  </div>
                  <p className="leading-snug text-slate-400 text-[10.5px]">
                    To enable real-time conversational code updates, provide a Gemini API Key. It is cached locally inside your browser session.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-brand/40 font-mono"
                    />
                    <button
                      onClick={() => {
                        if (customApiKey.trim()) {
                          saveLocalApiKey(customApiKey.trim());
                        } else {
                          onShowToast("Please enter a valid API Key first.", "error");
                        }
                      }}
                      className="bg-brand text-slate-950 px-3 py-1 rounded text-xs font-bold font-sans cursor-pointer hover:opacity-90 active:scale-95 transition-all shrink-0"
                    >
                      Save Key
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="p-2.5 bg-slate-950/60 border-t border-slate-850 flex gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder={apiKey ? "Ask AI to refine or modify patch..." : "Provide API Key to start chatting..."}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={!apiKey || isChatLoading}
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand/35 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!apiKey || isChatLoading || !chatInput.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-slate-950 disabled:bg-slate-850 disabled:text-slate-600 disabled:cursor-not-allowed shrink-0 cursor-pointer transition-all active:scale-95"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          ) : (
            /* TAB 1: DIAGNOSTICS & PROPOSED PATCH TAB */
            <div className="flex-1 overflow-y-auto p-4 border-b border-slate-850 space-y-4">
              
              {/* Header / Severity Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">DIAGNOSTICS</span>
                <span className={`rounded px-2.5 py-0.5 text-[9px] font-bold font-mono uppercase border ${
                  activeVuln.severity === 'critical'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {activeVuln.severity} SEVERITY
                </span>
              </div>

              {/* Vuln title */}
              <div className="space-y-1">
                <h3 className="font-sans font-bold text-slate-200 text-sm leading-snug">
                  {activeVuln.type}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {activeVuln.cwe}
                </p>
              </div>

              {/* Why dangerous section */}
              <div className="space-y-1.5 p-3 rounded-lg b2b-glass-panel">
                <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">WHY THIS IS DANGEROUS</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {displayRiskExplanation || activeVuln.riskExplanation}
                </p>
              </div>

              {/* Proposed code block: Diff Only View (No Slider per instructions) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">PROPOSED CODE PATCH</span>
                  <span className="rounded bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider">
                    Diff View
                  </span>
                </div>

                <div className="rounded-lg border border-slate-850 overflow-hidden text-[11px] font-mono shadow-inner bg-slate-950">
                  {/* original line removal */}
                  <div className="bg-rose-950/15 border-b border-rose-950/20 p-2.5 text-rose-300 flex items-start gap-2">
                    <span className="text-rose-500 font-bold shrink-0 select-none pr-1 w-3">-</span>
                    <code className="break-all whitespace-pre-wrap">{displayOriginal}</code>
                  </div>
                  {/* secure line insertion */}
                  <div className="bg-emerald-950/15 p-2.5 text-emerald-300 flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0 select-none pr-1 w-3">+</span>
                    <code className="break-all whitespace-pre-wrap">{displayNew}</code>
                  </div>
                </div>
              </div>

              {/* Typewriter Stream AI Explanation */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">AI REASONING</span>
                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-850 text-xs text-slate-300 leading-relaxed font-sans min-h-[60px]">
                  <p className="code-editor-cursor">{aiExplanationText}</p>
                </div>
              </div>

            </div>
          )}

          {/* BOTTOM FIXED INTERFACES: ACTIONS, CARD SWIPER & BATCH MODIFICATIONS */}
          <div className="bg-slate-950/50 p-4 shrink-0 space-y-4 border-t border-slate-850/60">
            
            {/* Primary control buttons */}
            {activeVuln.fixed ? (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center space-y-2">
                <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto fill-emerald-500/5" />
                <h4 className="font-sans font-bold text-xs text-emerald-400 uppercase tracking-wider">Patch Deployed</h4>
                <p className="text-[11px] text-slate-500 font-mono">Check editor viewport for updated content</p>
                <button
                  onClick={onSkipNext}
                  className="mt-2 text-xs font-semibold text-brand hover:opacity-80 underline font-mono cursor-pointer"
                >
                  Load Next Backlog Issue &rarr;
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  {/* Apply Fix */}
                  <button
                    onClick={handleApplySingleFix}
                    disabled={isApplying}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600 text-white font-sans text-xs font-bold py-3 shadow-lg shadow-emerald-500/10 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {isApplying ? (
                      <div className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Check className="h-4.5 w-4.5 stroke-[3]" />
                    )}
                    {isApplying ? 'Applying Patch...' : 'Apply This Fix'}
                  </button>

                  {/* Defer */}
                  <button
                    onClick={handleSkip}
                    disabled={isApplying}
                    className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-3 text-xs font-bold font-sans transition-all cursor-pointer border border-slate-750"
                  >
                    Defer Issue
                  </button>
                </div>

                <p className="text-center text-[10px] font-mono text-slate-500">
                  AI will not modify any repository code without your explicit approval.
                </p>
              </div>
            )}

            {/* Quick Card-Level Back/Forward Footer */}
            <div className="flex items-center justify-between border-t border-slate-850 pt-3 text-[10px] font-mono text-slate-500">
              <button
                disabled={activeVulnIndex === 0}
                onClick={() => {
                  if (activeVulnIndex > 0) {
                    onSelectVuln(vulnerabilities[activeVulnIndex - 1].id);
                  }
                }}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeVulnIndex > 0 ? 'text-slate-400 hover:text-white' : 'text-slate-700 cursor-not-allowed'
                }`}
              >
                &larr; Prev Card
              </button>
              
              <span className="text-slate-600 font-semibold select-none">
                {activeVulnIndex + 1} / {vulnerabilities.length}
              </span>

              <button
                disabled={activeVulnIndex === vulnerabilities.length - 1}
                onClick={() => {
                  if (activeVulnIndex < vulnerabilities.length - 1) {
                    onSelectVuln(vulnerabilities[activeVulnIndex + 1].id);
                  }
                }}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeVulnIndex < vulnerabilities.length - 1 ? 'text-slate-400 hover:text-white' : 'text-slate-700 cursor-not-allowed'
                }`}
              >
                Next Card &rarr;
              </button>
            </div>

            {/* BATCH REMEDIATION SECTION */}
            {outstandingVulns.length > 1 && (
              <div className="border-t border-slate-850 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">BATCH OPERATIONS</span>
                  <span className="text-[10px] text-slate-400 font-semibold font-mono">
                    {outstandingVulns.length} items outstanding
                  </span>
                </div>

                {/* Checklist scroll area */}
                <div className="max-h-[85px] overflow-y-auto space-y-1.5 border border-slate-850 bg-slate-950/40 rounded-lg p-2.5 font-mono text-[10px]">
                  {outstandingVulns.map(v => (
                    <div key={v.id} className="flex items-center gap-2">
                       <input
                        type="checkbox"
                        id={`chk-${v.id}`}
                        checked={!!batchSelectedIds[v.id]}
                        onChange={() => toggleBatchSelect(v.id)}
                        className="text-brand focus:ring-brand bg-slate-900 border-slate-800 rounded"
                      />
                      <label htmlFor={`chk-${v.id}`} className="text-slate-400 cursor-pointer truncate max-w-[280px]">
                        [{v.severity.toUpperCase()}] {v.fileName} line {v.line}: {v.type}
                      </label>
                    </div>
                  ))}
                </div>

                {/* Run Batch Action */}
                <button
                  onClick={applyBatchSelectedFixes}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 border border-brand/20 text-brand text-xs font-bold py-2.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Fix Selected Backlog (
                  {Object.values(batchSelectedIds).filter(Boolean).length} Selected)
                </button>
              </div>
            )}

          </div>

        </section>

      </div>

      {/* SOLID STATUS BAR */}
      <footer className="h-6.5 bg-workbench-statusbar border-t border-slate-850 flex items-center justify-between px-4 text-[10.5px] font-mono text-slate-500 shrink-0 select-none">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <div className="bg-brand text-slate-950 font-bold px-2 py-0.5 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-pulse" />
            <span>OMNIAUDIT ENVIRONMENT</span>
          </div>
          <span className="text-slate-400">✓ Connected to secure local VM environment</span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <span>Ln {activeVuln?.line || 1}, Col 1</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span className="text-brand font-semibold">TypeScript</span>
        </div>
      </footer>

    </div>
  );
}
