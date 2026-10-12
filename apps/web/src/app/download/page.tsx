'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Download, Monitor, CheckCircle, ShieldCheck, FileText, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

export default function DownloadPage() {
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadPayload, setDownloadPayload] = useState<{
    downloadUrl: string;
    version: string;
    sha256: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/download/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, workEmail, companyName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to request download.');
      }

      setDownloadPayload(data.data);
      // Automatically trigger download
      window.location.href = data.data.downloadUrl;
    } catch (err: any) {
      setError(err.message || 'An error occurred while requesting download.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <Header />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Client Details & Specs */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <div className="inline-flex items-center space-x-2 bg-blue-950/60 border border-blue-800 text-blue-300 px-3 py-1 rounded-full text-xs font-mono mb-4">
                <Monitor className="w-3.5 h-3.5" />
                <span>OFFICIAL WINDOWS 64-BIT CLIENT</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                Download HR360 Enterprise Client
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Install the certified Windows desktop application. Features real-time biometric synchronization, statutory payroll engine, and zero-local-data security.
              </p>
            </div>

            {/* Release Metadata Card */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-700/60 pb-3">
                <span className="text-xs text-slate-400 font-mono">Current Stable Version</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">v1.0.0 (Production Release)</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-700/60 pb-3">
                <span className="text-xs text-slate-400 font-mono">Platform</span>
                <span className="text-xs font-semibold text-slate-200">Windows 10 / 11 (64-bit Architecture)</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-700/60 pb-3">
                <span className="text-xs text-slate-400 font-mono">Installer Format</span>
                <span className="text-xs font-semibold text-slate-200">Certified NSIS Single-Binary Installer</span>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[11px] text-slate-400 font-mono block">SHA-256 Checksum Fingerprint:</span>
                <div className="font-mono text-[10px] bg-slate-950 px-3 py-2 rounded text-cyan-300 break-all select-all border border-slate-800">
                  725262a5d8d3fdba8b590cdcaeec7413ce05edbf190bae81b8bf382dc44288d1
                </div>
              </div>
            </div>

            {/* System Requirements */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider font-mono">Minimum System Requirements</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Windows 10/11 64-bit Edition</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>4 GB RAM (8 GB Recommended)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>500 MB Free Hard Disk Space</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Broadband Internet (TLS 1.3)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Download Form / Token Generator */}
          <div className="lg:col-span-5">
            <div className="bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Request Signed Installer</h3>
                  <p className="text-xs text-slate-500">Authorized package delivery</p>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {downloadPayload ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                    <p className="font-bold mb-1">Download Generated Successfully!</p>
                    <p className="text-slate-600">Your secure tokenized download link has been created and will expire in 5 minutes.</p>
                  </div>
                  <a
                    href={downloadPayload.downloadUrl}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded text-center block shadow transition-colors"
                  >
                    Click Here if Download Did Not Start
                  </a>
                  <button
                    onClick={() => setDownloadPayload(null)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded transition-colors text-center"
                  >
                    Request Another Link
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Tariq Siddiqui"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email Address *</label>
                    <input
                      type="email"
                      required
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      placeholder="e.g. t.siddiqui@company.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / Company Name *</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apex Industrial Systems"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    By downloading, you agree to the HR360 <Link href="/legal/eula" className="text-blue-600 underline">EULA</Link> and <Link href="/legal/privacy" className="text-blue-600 underline">Privacy Policy</Link>.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors shadow flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating Package...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download HR360 Installer (x64)
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
