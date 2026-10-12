import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | HR360',
};

export default function TermsPage() {
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
          <h1 className="text-2xl font-extrabold text-slate-900">Commercial Terms of Service</h1>
          <p className="text-xs text-slate-500 mt-1">Last Updated: October 2026</p>
        </div>

        <div className="prose prose-slate text-xs leading-relaxed space-y-4">
          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">1. Subscription Services</h2>
            <p className="text-slate-700">
              Subscription tiers (Starter, Growth, Enterprise) specify employee headcount thresholds, module inclusions, and terminal allocations. Subscriptions auto-renew according to the agreed billing interval unless terminated with 30 days prior written notice.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">2. Service Level Agreement (SLA) & Availability</h2>
            <p className="text-slate-700">
              HR360 guarantees a 99.9% monthly service uptime commitment for production tenant environments, excluding scheduled maintenance windows communicated 48 hours in advance.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">3. Payment Terms & Grace Periods</h2>
            <p className="text-slate-700">
              Invoices are due upon presentation. Accounts in arrears enter a 14-day administrative grace period during which full data read access is maintained. After expiration of grace, tenant access is locked until settlement.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">4. Termination & Data Export</h2>
            <p className="text-slate-700">
              Upon subscription termination, subscribers retain the right to export all historical personnel, payroll, and attendance ledger records in standard CSV and JSON formats within 60 days prior to database decommissioning.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Enterprise Master Services Terms</span>
          <Link href="/pricing" className="text-blue-600 font-semibold hover:underline">View Subscription Plans</Link>
        </div>
      </div>
    </div>
  );
}
