import React, { useState } from 'react';
import { 
  ShieldCheck, FileText, Download, ArrowLeft, Calendar, FileCode, CheckCircle,
  AlertTriangle, ShieldAlert, Sparkles, Printer, Lock, ExternalLink
} from 'lucide-react';
import { FileRecord, Vulnerability, Settings } from '../types';
import { jsPDF } from 'jspdf';

interface SecurityReportViewProps {
  files: FileRecord[];
  vulnerabilities: Vulnerability[];
  settings: Settings;
  onClose: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function SecurityReportView({
  files,
  vulnerabilities,
  settings,
  onClose,
  onShowToast
}: SecurityReportViewProps) {

  const [isExporting, setIsExporting] = useState(false);

  // Get current date formatted
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate stats
  const totalScanned = files.length;
  const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
  const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
  const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
  const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;
  
  const criticalFixed = vulnerabilities.filter(v => v.severity === 'critical' && v.fixed).length;
  const highFixed = vulnerabilities.filter(v => v.severity === 'high' && v.fixed).length;
  const mediumFixed = vulnerabilities.filter(v => v.severity === 'medium' && v.fixed).length;
  const lowFixed = vulnerabilities.filter(v => v.severity === 'low' && v.fixed).length;

  const totalFixed = vulnerabilities.filter(v => v.fixed).length;
  const outstandingCount = vulnerabilities.length - totalFixed;

  // Calculate pre and post score
  const getPreScore = () => {
    let score = 100;
    vulnerabilities.forEach(v => {
      if (v.severity === 'critical') score -= 12;
      else if (v.severity === 'high') score -= 6;
      else if (v.severity === 'medium') score -= 3;
      else if (v.severity === 'low') score -= 1;
    });
    return Math.max(0, score);
  };

  const getPostScore = () => {
    let score = 100;
    vulnerabilities.forEach(v => {
      if (!v.fixed) {
        if (v.severity === 'critical') score -= 12;
        else if (v.severity === 'high') score -= 6;
        else if (v.severity === 'medium') score -= 3;
        else if (v.severity === 'low') score -= 1;
      }
    });
    return Math.max(0, score);
  };

  const preScore = getPreScore();
  const postScore = getPostScore();

  // Export to high fidelity PDF via jsPDF
  const handleExportPDF = () => {
    setIsExporting(true);
    onShowToast('Compiling secure metadata and compiling PDF...', 'info');

    setTimeout(() => {
      try {
        const doc = new jsPDF('p', 'pt', 'a4');
        const margin = 50;
        let y = 60;

        // Cover Page Top Banner
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 595.27, 240, 'F');

        // Cover Title
        doc.setTextColor(14, 165, 233); // sky-500
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(28);
        doc.text('OMNIAUDIT 2.0', margin, 100);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text('Automated Repository Security Audit Report', margin, 140);

        doc.setFontSize(10);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`AUDITED ON: ${currentDate}   |   WORKSPACE ID: sandbox-local-v2`, margin, 180);

        // Section: Executive Summary
        y = 280;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('1. EXECUTIVE SUMMARY', margin, y);
        y += 20;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105); // slate-600
        const execText = `OmniAudit 2.0 conducted a comprehensive static application security scan (SAST) of the loaded directory containing ${totalScanned} repository files. The audit detected a total of ${vulnerabilities.length} security alerts across different severity thresholds. Currently, ${totalFixed} issue(s) have been successfully patched via our automated remediation compiler, improving the overall security index from ${preScore}/100 to ${postScore}/100.`;
        const lines = doc.splitTextToSize(execText, 595.27 - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 15 + 20;

        // Score Table Box
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(margin, y, 495.27, 80, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('Security Profile Progress Metrics', margin + 20, y + 25);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Initial Security Score: ${preScore}/100`, margin + 20, y + 45);
        doc.text(`Post-Remediation Score: ${postScore}/100`, margin + 20, y + 60);
        doc.text(`Patches Successfully Deployed: ${totalFixed} of ${vulnerabilities.length} Resolved`, margin + 240, y + 45);
        doc.text(`Outstanding Threat Backlog: ${outstandingCount} Issues`, margin + 240, y + 60);
        
        y += 110;

        // Section: Diagnostics Summary Grid
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('2. AUDIT FINDINGS BREAKDOWN', margin, y);
        y += 25;

        // Draw basic table header
        doc.setFillColor(226, 232, 240); // slate-200
        doc.rect(margin, y, 495.27, 20, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Severity Threshold', margin + 15, y + 13);
        doc.text('Detected Alerts', margin + 180, y + 13);
        doc.text('Remediated Patches', margin + 320, y + 13);
        y += 20;

        // Draw table rows
        const rowData = [
          { name: 'CRITICAL', color: [244, 63, 94], count: criticalCount, fixed: criticalFixed },
          { name: 'HIGH', color: [245, 158, 11], count: highCount, fixed: highFixed },
          { name: 'MEDIUM', color: [16, 185, 129], count: mediumCount, fixed: mediumFixed },
          { name: 'LOW', color: [100, 116, 139], count: lowCount, fixed: lowFixed }
        ];

        rowData.forEach(row => {
          doc.setFont('Helvetica', 'bold');
          doc.setFillColor(row.color[0], row.color[1], row.color[2]);
          doc.rect(margin + 15, y + 5, 60, 12, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text(row.name, margin + 22, y + 13);

          doc.setTextColor(71, 85, 105);
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.text(`${row.count} alert(s)`, margin + 180, y + 14);
          doc.text(`${row.fixed} fixed`, margin + 320, y + 14);

          // bottom line
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y + 20, margin + 495.27, y + 20);
          y += 20;
        });

        // Add a new page for detailed vulnerability disclosures
        doc.addPage();
        y = 50;

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('3. DETAILED VULNERABILITY CATALOGUE', margin, y);
        y += 30;

        vulnerabilities.forEach((v, vIdx) => {
          if (y > 720) {
            doc.addPage();
            y = 50;
          }

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(15, 23, 42);
          doc.text(`${vIdx + 1}. [${v.severity.toUpperCase()}] ${v.type}`, margin, y);
          y += 15;

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text(`File: ${v.filePath}   |   Line: ${v.line}   |   Status: ${v.fixed ? 'Remediated' : 'Outstanding'}`, margin, y);
          y += 15;

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          const linesDesc = doc.splitTextToSize(v.description, 495.27);
          doc.text(linesDesc, margin, y);
          y += linesDesc.length * 12 + 10;

          // code snippet block
          doc.setFillColor(248, 250, 252); // slate-50
          doc.setDrawColor(226, 232, 240);
          doc.rect(margin, y, 495.27, 24, 'FD');
          doc.setFont('Courier', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          doc.text(v.codeSnippet.substring(0, 85), margin + 10, y + 15);
          y += 35;
        });

        // Save PDF File
        doc.save(`OmniAudit-SecurityReport-${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExporting(false);
        onShowToast('✓ PDF compiled and downloaded successfully!', 'success');
      } catch (err) {
        console.error(err);
        setIsExporting(false);
        onShowToast('Could not compile PDF document. Check variables.', 'error');
      }
    }, 1200);
  };

  return (
    <div className="bg-slate-950 min-h-[calc(100vh-62px)] pb-24 font-sans text-slate-100 overflow-y-auto">
      
      {/* Navbar Sub Header actions */}
      <div className="border-b border-slate-850 bg-slate-900/40 py-4 px-6 sticky top-[62px] z-30 backdrop-blur-md">
        <div className="mx-auto max-w-4xl flex items-center justify-between w-full">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Dashboard
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-850 hover:border-slate-750 bg-slate-900 text-slate-300 hover:text-white px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors font-mono"
            >
              <Printer className="h-3.5 w-3.5" />
              Print HTML
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600 text-white px-5 py-2 text-xs font-bold shadow-lg shadow-emerald-500/10 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all font-mono"
            >
              {isExporting ? (
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {isExporting ? 'Compiling PDF...' : 'Download PDF Report'}
            </button>
          </div>
        </div>
      </div>

      {/* REPORT SHEETS PREVIEW CONTAINER */}
      <div className="mx-auto max-w-4xl px-6 mt-8">
        
        {/* On screen preview (Light Mode Sheet for Readability) */}
        <article className="bg-white text-slate-900 rounded-2xl shadow-2xl p-12 space-y-8 select-text">
          
          {/* Cover Header block */}
          <div className="border-b-4 border-slate-900 pb-8 flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-sky-400 font-extrabold border border-slate-800 shadow">
                  OA
                </div>
                <h1 className="font-sans text-xl font-black text-slate-900 tracking-tight">OMNIAUDIT 2.0</h1>
              </div>
              <p className="text-xs text-slate-500 font-mono font-bold tracking-wider uppercase">AUTONOMOUS AUDIT ANALYSIS</p>
            </div>

            <div className="text-right text-xs text-slate-500 font-mono space-y-1">
              <p className="font-bold text-slate-900">DATE: <span className="font-normal text-slate-600">{currentDate}</span></p>
              <p className="font-bold text-slate-900">TARGET: <span className="font-normal text-slate-600">sandbox-local-v2</span></p>
              <p className="font-bold text-slate-900">STANDARD: <span className="font-normal text-slate-600">OWASP TOP 10 / CWE</span></p>
            </div>
          </div>

          {/* executive summary text */}
          <section className="space-y-3">
            <h2 className="font-sans text-sm font-black text-slate-900 tracking-wider uppercase">1. Executive Audit Overview</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              OmniAudit 2.0 conducted a comprehensive static application security scan (SAST) of the loaded directory containing {totalScanned} repository files. The audit detected a total of {vulnerabilities.length} security alerts across different severity thresholds. Currently, {totalFixed} issue(s) have been successfully patched via our automated remediation compiler, improving the overall security index from {preScore}/100 to {postScore}/100.
            </p>
          </section>

          {/* Metrics score and count table */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-200 rounded-xl p-6">
            {/* Score indexes */}
            <div className="space-y-4">
              <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wide">POSTURE SCORE METRICS</h3>
              
              <div className="flex items-center gap-5">
                {/* Pre Score circle */}
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="h-14 w-14 rounded-full border-4 border-rose-500 flex items-center justify-center text-rose-500 font-mono font-extrabold text-sm bg-rose-500/5">
                    {preScore}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 mt-1.5 uppercase font-bold">INITIAL INDEX</span>
                </div>

                <div className="h-6 w-[2px] bg-slate-300"></div>

                {/* Post Score circle */}
                <div className="flex flex-col items-center justify-center text-center">
                  <div className={`h-14 w-14 rounded-full border-4 flex items-center justify-center font-mono font-extrabold text-sm ${
                    postScore >= 80 ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 'border-amber-500 text-amber-500 bg-amber-500/5'
                  }`}>
                    {postScore}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 mt-1.5 uppercase font-bold">POST-PATCH INDEX</span>
                </div>
              </div>
            </div>

            {/* Patch counts */}
            <div className="space-y-3.5">
              <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wide">REMEDIATION STATUS</h3>
              <div className="space-y-2 font-mono text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span>Total Files Scanned:</span> <span className="font-bold text-slate-850">{totalScanned} files</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span>Total Identified Threats:</span> <span className="font-bold text-slate-850">{vulnerabilities.length} items</span>
                </div>
                <div className="flex justify-between">
                  <span>Patches Successfully Applied:</span> <span className="font-bold text-emerald-600">{totalFixed} resolved</span>
                </div>
              </div>
            </div>
          </section>

          {/* Finding inventory breakdown table */}
          <section className="space-y-3">
            <h2 className="font-sans text-sm font-black text-slate-900 tracking-wider uppercase">2. Severity Threshold Audit Matrix</h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 text-slate-850 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Severity Group</th>
                    <th className="p-3">Identified Alerts</th>
                    <th className="p-3">Remediated Items</th>
                    <th className="p-3">Backlog Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-3 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" /><span className="font-extrabold text-rose-600">CRITICAL</span></td>
                    <td className="p-3">{criticalCount} alerts</td>
                    <td className="p-3 text-emerald-600 font-bold">{criticalFixed} fixed</td>
                    <td className="p-3">{criticalCount - criticalFixed} left</td>
                  </tr>
                  <tr>
                    <td className="p-3 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /><span className="font-extrabold text-amber-600">HIGH</span></td>
                    <td className="p-3">{highCount} alerts</td>
                    <td className="p-3 text-emerald-600 font-bold">{highFixed} fixed</td>
                    <td className="p-3">{highCount - highFixed} left</td>
                  </tr>
                  <tr>
                    <td className="p-3 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /><span className="font-extrabold text-emerald-600">MEDIUM</span></td>
                    <td className="p-3">{mediumCount} alerts</td>
                    <td className="p-3 text-emerald-600 font-bold">{mediumFixed} fixed</td>
                    <td className="p-3">{mediumCount - mediumFixed} left</td>
                  </tr>
                  <tr>
                    <td className="p-3 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" /><span className="font-extrabold text-slate-600">LOW</span></td>
                    <td className="p-3">{lowCount} alerts</td>
                    <td className="p-3 text-emerald-600 font-bold">{lowFixed} fixed</td>
                    <td className="p-3">{lowCount - lowFixed} left</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* OWASP TOP 10 MAPPING */}
          <section className="space-y-3">
            <h2 className="font-sans text-sm font-black text-slate-900 tracking-wider uppercase">3. OWASP Top 10 Core Alignment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-200 rounded-lg p-4 space-y-2">
                <h4 className="font-bold text-slate-800">A03:2021-Injection Vectors</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Static rules identified SQL interpolations, commands execution shells, and arbitrary evaluation targets. Swapping inputs with parametrized fields completely mitigates code executions.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 space-y-2">
                <h4 className="font-bold text-slate-800">A05:2021-Security Misconfiguration</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Hardcoded AWS API key tokens, plaintext master connection passwords, and CORS wildcard protocols represent configuration leaks. Moving fields to system containers neutralizes files leaks.
                </p>
              </div>
            </div>
          </section>

          {/* Recommendations checklist */}
          <section className="space-y-3.5 border-t border-slate-200 pt-6">
            <h2 className="font-sans text-sm font-black text-slate-900 tracking-wider uppercase">4. Auditor Security Recommendations</h2>
            <ul className="space-y-2.5 text-xs text-slate-600 font-sans list-none pl-0">
              <li className="flex items-start gap-2.5">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Secrets Isolation:</strong> Ensure all credential keys are fully isolated from the code tree. Implement runtime environments and leverage secret store backends.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Strict Input Whitelists:</strong> Avoid shell commands executions entirely. Force inputs through robust socket IP address resolutions and path basenames validation checks.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Security Testing (SAST):</strong> Maintain static analysis code scanner hooks inside your local pre-commit and pipeline deployment hooks (CI/CD) to enforce compliance.</span>
              </li>
            </ul>
          </section>

          {/* Footer sheet */}
          <div className="border-t border-slate-200 pt-6 flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>OMNIAUDIT SECURITY REPORT v2.0.0</span>
            <span>&copy; 2026 OmniAudit Systems</span>
          </div>

        </article>

      </div>

    </div>
  );
}
