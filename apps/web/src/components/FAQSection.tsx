'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string;
}

interface Props {
  items?: FAQItem[];
  title?: string;
  subtitle?: string;
}

const DEFAULT_FAQS: FAQItem[] = [
  {
    question: 'How does dedicated tenant database isolation work?',
    answer:
      'Unlike legacy multi-tenant systems that simply place a company_id column on shared tables, HR360 automatically provisions a dedicated, separate database schema (tenant_<company_slug>) in Dynamic Cloud DB when an administrator activates your account. Your tables, records, employee CNICs, and attendance are physically segregated with zero cross-tenant contamination.',
  },
  {
    question: 'How does the desktop application connect to biometric devices?',
    answer:
      'The HR360 Windows Desktop Client runs an integrated native biometric bridge that communicates over TCP/IP and HTTP ISAPI directly with ZKTeco and Hikvision terminals on your local network. It pulls raw device punches and syncs them dynamically to your dedicated cloud database.',
  },
  {
    question: 'Is my company data stored offline on the desktop machine?',
    answer:
      'No. In compliance with enterprise security requirements, HR360 adheres to a zero-offline persistence policy. The desktop app securely streams and manipulates data dynamically from your dedicated dynamic cloud database. If account access is suspended or expired, access is revoked immediately with zero cached employee records left on local disk.',
  },
  {
    question: 'How are Pakistani payroll rules (FBR Tax, EOBI, Provident Fund) computed?',
    answer:
      'The calculation engine uses 128-bit exact decimal math. It includes built-in statutory profiles for Pakistan tax brackets, employee & employer EOBI deductions (PKR 130 employee, PKR 650 employer), and configurable company provident fund match rates.',
  },
  {
    question: 'Can I switch between Monthly, Yearly, and Lifetime subscription plans?',
    answer:
      'Yes. Organizations can start on Monthly billing, upgrade to Annual billing for discounted rates, or secure our Lifetime Enterprise License for unlimited headcount with no recurring license renewal fees.',
  },
];

export default function FAQSection({
  items = DEFAULT_FAQS,
  title = 'Frequently Asked Questions',
  subtitle = 'Everything you need to know about HR360, dedicated cloud database tenancy, and desktop deployment.',
}: Props) {
  // Only ONE FAQ open at a time loop
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-1.5 py-1 px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 rounded-full shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-slate-800" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">{title}</h2>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
        </div>

        <div className="space-y-3">
          {items.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white border border-slate-200 rounded-md transition-shadow hover:shadow-xs overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="cursor-pointer select-none w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-slate-900 hover:text-slate-700 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'transform rotate-180 text-slate-900' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
