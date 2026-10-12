'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FAQSection, { FAQItem } from '@/components/FAQSection';
import PackageInquiryModal from '@/components/PackageInquiryModal';
import { Check, ShieldCheck, Zap, Database, ArrowRight, HelpCircle } from 'lucide-react';
import Link from 'next/link';

interface PlanData {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  priceLifetime: number;
  maxEmployees: number;
  maxBranches: number;
  maxInstalls: number;
  features: string[];
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL' | 'LIFETIME'>('ANNUAL');
  const [plans, setPlans] = useState<PlanData[]>([
    {
      id: 'plan_starter',
      code: 'STARTER',
      name: 'Starter Tier',
      description: 'Ideal for smaller organizations starting automated attendance and payroll.',
      priceMonthly: 99,
      priceAnnual: 79,
      priceLifetime: 899,
      maxEmployees: 50,
      maxBranches: 1,
      maxInstalls: 1,
      features: [
        'Up to 50 Active Employees',
        'Dedicated Cloud Database Tenancy',
        '1 Biometric Device Connection (ZKTeco / Hikvision)',
        'Standard Leave & Holiday Management',
        'Pakistan Tax & EOBI Basic Reports',
      ],
    },
    {
      id: 'plan_growth',
      code: 'GROWTH',
      name: 'Growth & Scale',
      description: 'For mid-size enterprises requiring department management and advanced payroll.',
      priceMonthly: 179,
      priceAnnual: 149,
      priceLifetime: 1699,
      maxEmployees: 250,
      maxBranches: 5,
      maxInstalls: 1,
      features: [
        'Up to 250 Active Employees',
        'Dedicated Cloud Database Tenancy',
        '1 Biometric Device Connection',
        'Multi-Department & Branch Scoping',
        'Full Statutory Decimal Payroll Engine & Bank CSV',
        'Payslip & Certificate Attestation Designer',
        'Recruitment ATS with Blind Screening',
      ],
    },
    {
      id: 'plan_enterprise',
      code: 'ENTERPRISE',
      name: 'Enterprise Core',
      description: 'Comprehensive human capital management for large-scale operations with unlimited headcount.',
      priceMonthly: 249,
      priceAnnual: 199,
      priceLifetime: 2399,
      maxEmployees: 999999,
      maxBranches: 99,
      maxInstalls: 1,
      features: [
        'Unlimited Active Employees & Headcount',
        'Dedicated Cloud Database Tenancy',
        '1 Biometric Device Connection',
        'Multi-Tier Approval Hierarchies',
        'Custom AES-256 Envelope KMS Encryption',
        'Priority Technical Support',
      ],
    },
  ]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTierForModal, setSelectedTierForModal] = useState<'STARTER' | 'GROWTH' | 'ENTERPRISE'>('STARTER');

  // Load live dynamic plans from master database
  useEffect(() => {
    fetch('/api/v1/plans')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setPlans(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const openInquiryModal = (tier: string) => {
    const validTier = (['STARTER', 'GROWTH', 'ENTERPRISE'].includes(tier?.toUpperCase())
      ? tier.toUpperCase()
      : 'STARTER') as 'STARTER' | 'GROWTH' | 'ENTERPRISE';
    setSelectedTierForModal(validTier);
    setModalOpen(true);
  };

  const PRICING_FAQS: FAQItem[] = [
    {
      question: 'How does manual billing and purchase confirmation work?',
      answer:
        'When you select a package, a simple inquiry form collects your organization name and WhatsApp / phone contact. Our account team contacts you directly to answer onboarding requirements, verify your details, and guide your deployment with zero automated card lock-ins.',
    },
    {
      question: 'How many biometric devices can be integrated across each plan?',
      answer:
        'In accordance with our streamlined infrastructure architecture, exactly 1 biometric device (ZKTeco or Hikvision) is integrated per company across Starter, Growth, and Enterprise plans.',
    },
    {
      question: 'What is included in the Lifetime plan?',
      answer:
        'The Lifetime plan grants your organization perpetual rights to the platform, dedicated cloud database provisioning, and regular compliance updates with zero recurring subscription renewals.',
    },
    {
      question: 'Is my data hosted on a dedicated database for all plans?',
      answer:
        'Yes. Regardless of whether you choose Monthly, Annually, or Lifetime, every company receives its own isolated database schema (tenant_<slug>). Records are never mixed between organizations.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 sm:py-20 bg-slate-950 text-white text-center px-4 sm:px-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <span className="inline-block py-1 px-3 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/90 border border-emerald-700 rounded-full">
              Transparent, Scalable Pricing
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Flexible Plans for Every Organization
            </h1>
            <p className="text-sm sm:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed">
              Dedicated cloud database tenancy, local LAN biometric integration (1 device included), and automated statutory payroll. Choose the license cadence that matches your roadmap.
            </p>

            {/* Interval Toggle */}
            <div className="pt-6 flex justify-center">
              <div className="bg-slate-900 p-1.5 rounded-xl inline-flex space-x-1 border border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`cursor-pointer px-4 sm:px-5 py-2 rounded-lg transition-all ${
                    billingCycle === 'MONTHLY'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('ANNUAL')}
                  className={`cursor-pointer px-4 sm:px-5 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
                    billingCycle === 'ANNUAL'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Annually</span>
                  <span className="bg-emerald-950 text-[10px] px-1.5 py-0.5 rounded text-emerald-300 uppercase font-extrabold">
                    Save 20%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('LIFETIME')}
                  className={`cursor-pointer px-4 sm:px-5 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
                    billingCycle === 'LIFETIME'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Lifetime</span>
                  <span className="bg-amber-950 text-[10px] px-1.5 py-0.5 rounded text-amber-300 uppercase font-extrabold">
                    Perpetual
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards Grid */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((p) => {
              const isFeatured = p.code === 'GROWTH';
              const price =
                billingCycle === 'MONTHLY'
                  ? p.priceMonthly
                  : billingCycle === 'ANNUAL'
                  ? p.priceAnnual
                  : p.priceLifetime;

              const priceSuffix =
                billingCycle === 'LIFETIME' ? '/ perpetual license' : '/ month';

              return (
                <div
                  key={p.code}
                  className={`border rounded-xl p-6 sm:p-8 flex flex-col justify-between transition-all bg-white relative ${
                    isFeatured
                      ? 'border-2 border-slate-900 shadow-xl'
                      : 'border-slate-300 shadow-xs hover:shadow-md'
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-xs">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">{p.name}</h3>
                    <p className="text-xs text-slate-600 mb-6 leading-relaxed">{p.description}</p>

                    <div className="mb-6 pb-6 border-b border-slate-100">
                      <div className="flex items-baseline">
                        <span className="text-4xl sm:text-5xl font-extrabold text-slate-950">${price}</span>
                        <span className="text-xs text-slate-600 font-semibold ml-2">{priceSuffix}</span>
                      </div>
                      {billingCycle === 'ANNUAL' && (
                        <div className="text-xs text-emerald-700 font-bold mt-1.5">
                          Billed annually (${price * 12}/year)
                        </div>
                      )}
                      {billingCycle === 'LIFETIME' && (
                        <div className="text-xs text-amber-700 font-bold mt-1.5">
                          Single one-time payment. Own forever.
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 text-xs sm:text-sm text-slate-800">
                      <div className="flex items-center font-semibold text-slate-900">
                        <Check className="w-4 h-4 text-emerald-600 mr-2.5 shrink-0" />
                        <span>
                          Headcount: <strong>{p.maxEmployees > 9000 ? 'Unlimited' : `Up to ${p.maxEmployees}`}</strong> Employees
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Check className="w-4 h-4 text-emerald-600 mr-2.5 shrink-0" />
                        <span>Dedicated Cloud Database Tenancy</span>
                      </div>
                      <div className="flex items-center font-bold text-slate-900">
                        <Check className="w-4 h-4 text-emerald-600 mr-2.5 shrink-0" />
                        <span>1 Biometric Device Integration (LAN)</span>
                      </div>
                      {p.features
                        .filter(
                          (f) =>
                            !f.toLowerCase().includes('backup') &&
                            !f.toLowerCase().includes('device') &&
                            !f.toLowerCase().includes('employee')
                        )
                        .map((f, i) => (
                          <div key={i} className="flex items-center">
                            <Check className="w-4 h-4 text-emerald-600 mr-2.5 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="pt-8 space-y-2">
                    <button
                      type="button"
                      onClick={() => openInquiryModal(p.code)}
                      className={`cursor-pointer w-full py-3 px-4 text-center font-bold rounded-lg text-xs sm:text-sm transition-all shadow-xs ${
                        isFeatured
                          ? 'bg-slate-900 hover:bg-slate-800 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300'
                      }`}
                    >
                      Inquire / Avail {p.name}
                    </button>
                    <Link
                      href={`/register?tier=${p.code}&interval=${billingCycle}`}
                      className="block text-center text-xs font-semibold text-slate-600 hover:text-slate-950 py-1 transition-colors"
                    >
                      Or Register Company Directly &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-16 bg-white border-t border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center mb-8">
              Plan Comparison Breakdown
            </h2>

            <div className="border border-slate-300 rounded-lg overflow-x-auto shadow-xs text-xs sm:text-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold">
                    <th className="p-4">Feature / Resource</th>
                    <th className="p-4 text-center">Starter</th>
                    <th className="p-4 text-center">Growth</th>
                    <th className="p-4 text-center bg-slate-200/60">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  <tr>
                    <td className="p-4 font-semibold text-slate-900">Monthly Price</td>
                    <td className="p-4 text-center font-bold">$99</td>
                    <td className="p-4 text-center font-bold">$179</td>
                    <td className="p-4 text-center font-bold bg-slate-50">$249</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-slate-900">Biometric Devices Included</td>
                    <td className="p-4 text-center font-bold text-slate-900">1 Device</td>
                    <td className="p-4 text-center font-bold text-slate-900">1 Device</td>
                    <td className="p-4 text-center font-bold text-slate-900 bg-slate-50">1 Device</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-slate-900">Dedicated Cloud Database</td>
                    <td className="p-4 text-center text-emerald-700 font-bold">✓ Included</td>
                    <td className="p-4 text-center text-emerald-700 font-bold">✓ Included</td>
                    <td className="p-4 text-center text-emerald-700 font-bold bg-slate-50">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-slate-900">Statutory Decimal Payroll</td>
                    <td className="p-4 text-center text-emerald-700 font-bold">✓ Included</td>
                    <td className="p-4 text-center text-emerald-700 font-bold">✓ Included</td>
                    <td className="p-4 text-center text-emerald-700 font-bold bg-slate-50">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-slate-900">Manual Billing & Corporate Support</td>
                    <td className="p-4 text-center text-emerald-700 font-bold">✓ Direct</td>
                    <td className="p-4 text-center text-emerald-700 font-bold">✓ Priority</td>
                    <td className="p-4 text-center text-emerald-700 font-bold bg-slate-50">✓ Dedicated SLA</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Pricing FAQs with Single-Open Accordion */}
        <FAQSection
          items={PRICING_FAQS}
          title="Pricing & Licensing FAQ"
          subtitle="Answers to common questions regarding manual billing, tiers, and 1 device limits."
        />
      </main>

      {/* Package Inquiry Popup Modal */}
      <PackageInquiryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTier={selectedTierForModal}
        defaultPackage={billingCycle}
      />

      <Footer />
    </div>
  );
}
