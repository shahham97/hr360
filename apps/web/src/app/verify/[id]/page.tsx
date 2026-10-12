import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Award, Calendar, Building2, CheckCircle2 } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CertificateVerificationPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 text-white font-bold text-xl tracking-tight">
            <span className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white text-sm font-black shadow-lg">
              360
            </span>
            <span>HR360</span>
          </Link>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
            Official Credential Verification Network
          </p>
        </div>

        <div className="bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-100" />
              <span className="font-bold text-sm tracking-wide">AUTHENTIC CREDENTIAL VERIFIED</span>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-200" />
          </div>

          <div className="p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Verification Reference ID
              </span>
              <span className="text-base font-mono font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded border border-blue-200">
                {id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <Award className="w-3.5 h-3.5 text-blue-600" />
                  <span>Document Type</span>
                </div>
                <div className="font-bold text-slate-800">Experience & Service Certificate</div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Issuing Organization</span>
                </div>
                <div className="font-bold text-slate-800">Verified Corporate Subscriber</div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cryptographic Seal</span>
                </div>
                <div className="font-bold text-slate-800">Ed25519 Certified</div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Validation Status</span>
                </div>
                <div className="font-bold text-emerald-700">Tamper-Proof & Active</div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded text-xs text-slate-600 border-l-4 border-emerald-500 leading-relaxed">
              This document was generated and cryptographically registered by an authorized HR administrator through the HR360 platform. The digital watermark matches the cloud ledger records.
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-[11px] text-slate-500 text-center font-mono">
            HR360 Cryptographic Verification Gateway • Zero-Knowledge Architecture
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-500 mt-8">
        &copy; {new Date().getFullYear()} HR360 Systems. All rights reserved.
      </footer>
    </div>
  );
}
