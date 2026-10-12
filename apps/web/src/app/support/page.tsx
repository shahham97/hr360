import React from 'react';
import Link from 'next/link';
import { LifeBuoy, Mail, Phone, BookOpen, Clock, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Customer Support & Help Desk | HR360',
};

export default function SupportPage() {
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
            <Link href="/security" className="text-slate-300 hover:text-white transition-colors">Security</Link>
            <Link href="/download" className="text-slate-300 hover:text-white transition-colors">Download</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 bg-blue-950/60 border border-blue-800 text-blue-300 px-3 py-1 rounded-full text-xs font-mono mb-4">
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>ENTERPRISE ASSISTANCE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            HR360 Support & Technical Operations
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Our engineering and HR solutions teams are dedicated to ensuring uninterrupted operations across your desktop fleet and cloud tenancy.
          </p>
        </div>

        {/* Contact Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 shadow-lg">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white mb-1">Corporate Help Desk</h3>
            <p className="text-xs text-slate-400 mb-4">For tier-2 incident reports, license modifications, and queries.</p>
            <a href="mailto:support@hr360.com" className="text-xs font-mono font-bold text-blue-400 hover:underline">
              support@hr360.com
            </a>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 shadow-lg">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white mb-1">Support Hours & SLAs</h3>
            <p className="text-xs text-slate-400 mb-2">Standard: Mon – Fri (9 AM – 6 PM PKT)</p>
            <p className="text-xs text-emerald-400 font-semibold">Enterprise SLA: 24/7 Severity 1 Response</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 shadow-lg">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white mb-1">Implementation Guides</h3>
            <p className="text-xs text-slate-400 mb-4">Documentation on biometric push synchronization and statutory tables.</p>
            <Link href="/security" className="text-xs font-semibold text-purple-400 hover:underline">
              View Architecture & Guides &rarr;
            </Link>
          </div>
        </div>

        {/* Biometric Integration Advisory */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 text-xs text-slate-300 leading-relaxed">
          <div className="flex items-center space-x-2 text-white font-bold mb-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Biometric Terminal Integration Support</span>
          </div>
          <p>
            HR360 connects with standard network biometric terminals (ZKTeco, Hikvision, and compatible attendance hardware). Each organization is entitled to 1 primary biometric integration endpoint. For configuration assistance on local static IP routing and punch push synchronization, contact your assigned technical account manager.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} HR360 Systems. All rights reserved.
      </footer>
    </div>
  );
}
