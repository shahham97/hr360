import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Mail, Globe, MapPin, Database } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-300 bg-slate-950 text-slate-300 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info (Logo only, removed redundant HR360 text) */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-10 w-auto object-contain brightness-0 invert"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </Link>
            <p className="text-slate-300 leading-relaxed text-xs">
              Complete Human Capital Management platform. Dedicated per-company cloud database isolation, biometric LAN synchronization, and high-precision statutory payroll.
            </p>
            <div className="flex items-center text-xs text-emerald-400 space-x-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Clustered Cloud Multi-Tenancy</span>
            </div>
          </div>

          {/* Solutions & Core Modules */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">
              Platform Modules
            </h4>
            <ul className="space-y-2 text-slate-300">
              <li>Core Employee Directory</li>
              <li>Biometric Device Bridge (ZKTeco / Hikvision)</li>
              <li>Pakistan Statutory Payroll (EOBI & FBR Tax)</li>
              <li>Leaves & Multi-Level Approvals</li>
              <li>Payslip & Document Attestation Designer</li>
              <li>Recruitment & Blind Resume ATS</li>
            </ul>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">
              Resources & Pricing
            </h4>
            <ul className="space-y-2 text-slate-300">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Product Overview
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Subscription Plans (Monthly / Annual / Lifetime)
                </Link>
              </li>
              <li>
                <Link href="/download" className="hover:text-white transition-colors">
                  Download Windows Client
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Register Organization
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  HR Tech & Compliance Insights
                </Link>
              </li>
            </ul>
          </div>

          {/* Enterprise Support & Security */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">
              Security & Contact
            </h4>
            <div className="space-y-2 text-slate-300">
              <div className="flex items-center space-x-2">
                <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Encrypted AES-256-GCM Envelope Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Zero Cross-Tenant Data Access Guarantee</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>enterprise@hr360.local</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Karachi, Pakistan (Global Deployment)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-3">
          <div>
            © 2026. All rights reserved. Clustered Database Architecture.
          </div>
          <div className="flex space-x-6">
            <span>Dynamic Tenant Isolation</span>
            <span>Local LAN Biometrics</span>
            <span>Zero-Offline Enforcement</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
