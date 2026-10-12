import React from 'react';
import Link from 'next/link';
import { Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Product Release Notes & Changelog | HR360',
};

export default function ChangelogPage() {
  const releases = [
    {
      version: 'v1.0.0',
      date: 'October 2026',
      badge: 'Current Stable',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      highlights: [
        'Production release of HR360 Windows 64-bit Enterprise Client with NSIS installer.',
        'Zero-local-data architecture: sensitive payroll and personnel records encrypted in cloud storage.',
        'Pakistan statutory tax slabs and EOBI contribution calculation engine with cent-level decimal precision.',
        'Biometric attendance synchronization endpoint supporting automated device punch logging.',
        'Cryptographic hash-chained audit trails ensuring tamper-evident accountability.',
        'Automated 4-hour background update polling with seamless local preference preservation.',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white text-sm font-black shadow-lg">
              360
            </span>
            <span className="font-bold text-lg text-white">HR360</span>
          </Link>
          <div className="flex items-center space-x-6 text-sm">
            <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors">Pricing</Link>
            <Link href="/download" className="text-slate-300 hover:text-white transition-colors">Download</Link>
            <Link href="/security" className="text-slate-300 hover:text-white transition-colors">Security</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 bg-blue-950/60 border border-blue-800 text-blue-300 px-3 py-1 rounded-full text-xs font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PRODUCT UPDATES</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            HR360 Release Notes & Updates
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Continuous enhancements, security hardening, and feature updates delivering enterprise workforce stability.
          </p>
        </div>

        {/* Release Timeline */}
        <div className="space-y-8">
          {releases.map((rel) => (
            <div key={rel.version} className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 sm:p-8 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-4 mb-6">
                <div className="flex items-center space-x-3">
                  <span className="text-xl font-bold text-white font-mono">{rel.version}</span>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${rel.badgeColor}`}>
                    {rel.badge}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">{rel.date}</span>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">Key Enhancements</h3>
                <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                  {rel.highlights.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} HR360 Systems. All rights reserved.
      </footer>
    </div>
  );
}
