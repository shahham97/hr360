import React from 'react';
import Link from 'next/link';
import { Shield, Lock, Key, Server, Database, CheckCircle, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Enterprise Security Architecture | HR360',
  description: 'HR360 enterprise security architecture: zero local data storage, multi-tenant database isolation, TLS 1.3 encryption, and cryptographic audit logs.',
};

export default function SecurityPage() {
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
            <Link href="/support" className="text-slate-300 hover:text-white transition-colors">Support</Link>
            <Link href="/download" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded text-xs transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 bg-blue-950/60 border border-blue-800 text-blue-300 px-3 py-1 rounded-full text-xs font-mono mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>ENTERPRISE-GRADE ASSURANCE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Security & Data Protection Architecture
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            HR360 was engineered from the foundation up to protect workforce and payroll records with multi-layer defense, tenant isolation, and cryptographic auditing.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-lg">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Isolated Database Architecture</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every subscribing organization operates in a dedicated, cryptographically isolated cloud database environment. Cross-tenant data co-mingling is physically prevented at the storage layer.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-lg">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Zero Local Client Data</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The Windows Desktop Client operates as a hardened thin client. No employee salaries, CNIC numbers, or attendance punch histories are ever stored in plaintext on local user hard drives.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-lg">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Argon2id & DPAPI Encryption</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Passwords are protected using memory-hard Argon2id hashing algorithms. Desktop session tokens are stored in the Windows Data Protection API (DPAPI) hardware keyring.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-lg">
            <div className="w-10 h-10 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center mb-4">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">TLS 1.3 & Certificate Pinning</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              All communications between desktop clients and cloud services utilize strict TLS 1.3 transport encryption. Subject Public Key Info (SPKI) pinning prevents Man-in-the-Middle inspection.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-lg">
            <div className="w-10 h-10 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Tamper-Evident Audit Trails</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Administrative actions, payroll runs, and biometric synchronizations are recorded in a cryptographically hash-chained audit ledger. Any retroactive ledger modification is mathematically detectable.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-lg">
            <div className="w-10 h-10 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center mb-4">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Role-Based Access Control</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Granular permission matrices govern staff access. Sensitive fields like national identity numbers and compensation are automatically masked on the client and enforced on the server.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-800/50 rounded-2xl p-8 text-center max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-2">Ready to explore enterprise workforce management?</h2>
          <p className="text-xs text-slate-300 mb-6">
            Schedule an architectural demonstration or test the certified Windows client with your team.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/download" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded transition-colors inline-flex items-center">
              <span>Download Desktop Client</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} HR360 Systems. All rights reserved.
      </footer>
    </div>
  );
}
