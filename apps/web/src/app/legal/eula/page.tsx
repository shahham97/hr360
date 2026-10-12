import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'End User License Agreement (EULA) | HR360',
};

export default function EulaPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-2xl border border-slate-200">
        <div className="border-b border-slate-200 pb-4 mb-6">
          <Link href="/" className="inline-flex items-center space-x-2 text-slate-900 font-bold text-xl mb-4">
            <span className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white text-sm font-black">
              360
            </span>
            <span>HR360</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Software End User License Agreement (EULA)</h1>
          <p className="text-xs text-slate-500 mt-1">Last Updated: October 2026</p>
        </div>

        <div className="prose prose-slate text-xs leading-relaxed space-y-4">
          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">1. Grant of License</h2>
            <p className="text-slate-700">
              Subject to the terms of your organization subscription agreement, HR360 grants you a non-exclusive, non-transferable, revocable license to install and execute the HR360 Desktop Client on authorized workstations solely for internal business operations.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">2. Scope of Use & Prohibitions</h2>
            <p className="text-slate-700">
              Licensee shall not: (a) reverse engineer, decompile, disassemble, or derive source code from compiled binaries; (b) defeat or bypass runtime cryptographic integrity checks, license enforcement engines, or hardware device limits; (c) redistribute, sublicense, or rent the software to unauthorized third parties.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">3. Automatic Updates</h2>
            <p className="text-slate-700">
              The software periodically checks for certified updates to ensure protocol compliance and security integrity. Licensee acknowledges that critical security updates may be enforced to preserve tenant connectivity.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">4. Limited Warranty & Liability</h2>
            <p className="text-slate-700">
              The software is provided &quot;as is&quot; without warranty of any kind. Under no circumstances shall HR360 Systems be liable for indirect, incidental, or consequential damages resulting from workstation disruption or local operating system incompatibility.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Official Corporate EULA Document</span>
          <Link href="/support" className="text-blue-600 font-semibold hover:underline">Contact Legal Desk</Link>
        </div>
      </div>
    </div>
  );
}
