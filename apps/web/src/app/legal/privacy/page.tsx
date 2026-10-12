import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | HR360',
};

export default function PrivacyPage() {
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
          <h1 className="text-2xl font-extrabold text-slate-900">Privacy & Data Processing Policy</h1>
          <p className="text-xs text-slate-500 mt-1">Last Updated: October 2026</p>
        </div>

        <div className="prose prose-slate text-xs leading-relaxed space-y-4">
          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">1. Role as Data Processor</h2>
            <p className="text-slate-700">
              HR360 operates as a Data Processor on behalf of subscriber organizations (&quot;Data Controllers&quot;). All employee profiles, biometric records, and compensation calculations are maintained strictly within the subscriber&apos;s isolated tenant environment.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">2. Information Collection & Telemetry</h2>
            <p className="text-slate-700">
              The desktop client transmits telemetry limited strictly to workstation device signatures, operating system build versions, and software integrity attestations necessary to enforce tenant isolation and device quotas.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">3. Zero Local Storage Policy</h2>
            <p className="text-slate-700">
              No employee national identity numbers (CNIC), salary compensation records, or unencrypted personnel documents are persisted on client workstation drives. All sensitive tokens are encapsulated via Windows DPAPI hardware keychains.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">4. Contact Information</h2>
            <p className="text-slate-700">
              For inquiries regarding corporate data processing or GDPR/SOC-2 alignment, contact our Privacy Operations Office at <strong className="text-slate-900">privacy@hr360.com</strong>.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Enterprise Privacy Architecture</span>
          <Link href="/security" className="text-blue-600 font-semibold hover:underline">Security Architecture</Link>
        </div>
      </div>
    </div>
  );
}
