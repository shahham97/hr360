'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FAQSection, { FAQItem } from '@/components/FAQSection';
import { Calendar, User, ArrowRight, ShieldCheck, Clock, FileText } from 'lucide-react';
import Link from 'next/link';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  author: string;
  readTime: string;
}

const POSTS: BlogPost[] = [
  {
    slug: 'pakistan-fbr-tax-compliance-2026',
    title: 'Navigating Pakistan Income Tax Slabs & Statutory EOBI Deductions in 2026',
    excerpt:
      'A deep dive into 128-bit exact decimal calculation for Pakistani payroll: how to ensure zero rounding drift across employee tax brackets, monthly EOBI contribution quotas, and automated bank file generation.',
    category: 'Payroll & Compliance',
    date: 'October 8, 2026',
    author: 'Hammad Saifullah',
    readTime: '6 min read',
  },
  {
    slug: 'lan-biometric-integration-architecture',
    title: 'Bridging ZKTeco & Hikvision Terminals on Corporate Networks without Open Ports',
    excerpt:
      'Why exposing local biometric devices to the public internet creates massive attack surfaces, and how the HR360 desktop client operates as an internal secure proxy bridging TCP/IP and HTTP ISAPI data to Dynamic Cloud DB.',
    category: 'Hardware & Architecture',
    date: 'September 29, 2026',
    author: 'Principal Systems Architect',
    readTime: '8 min read',
  },
  {
    slug: 'zero-cross-tenant-data-isolation',
    title: 'Why Shared-Table Multi-Tenancy Fails Enterprise HR Standards',
    excerpt:
      'Understanding the architecture of on-demand dedicated database schema generation: how HR360 automatically provisions isolated schemas in Dynamic Cloud DB to eliminate cross-tenant data leakage risks.',
    category: 'Security & Cloud',
    date: 'September 15, 2026',
    author: 'DevOps Security Team',
    readTime: '5 min read',
  },
  {
    slug: 'blind-screening-ats-hiring-biases',
    title: 'Mitigating Unconscious Bias with Application-Layer Blind ATS Screening',
    excerpt:
      'How modern recruiters anonymize applicant names, gender indicators, and contact points during early CV review cycles, boosting merit-based candidate progression while retaining full candidate dossiers.',
    category: 'Recruitment & Talent',
    date: 'August 30, 2026',
    author: 'Talent Acquisition Lead',
    readTime: '4 min read',
  },
];

const BLOG_FAQS: FAQItem[] = [
  {
    question: 'How often does HR360 update Pakistani tax slabs and statutory profiles?',
    answer:
      'Statutory profiles (such as FBR tax schedules and EOBI contribution rates) are maintained within the core engine and automatically update in accordance with official Ministry and FBR notifications.',
  },
  {
    question: 'Can our technical team contribute guest compliance insights to this blog?',
    answer:
      'Yes, enterprise clients and verified HR compliance officers are welcome to submit regional payroll and labor compliance articles to enterprise@hr360.local.',
  },
];

export default function BlogPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-800">
      <Header />

      <main className="flex-1">
        {/* Blog Header */}
        <section className="py-16 bg-slate-900 text-white text-center px-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <span className="inline-block py-1 px-3 text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800 rounded-full">
              HR360 Engineering & Compliance Insights
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Workforce Tech, Biometrics & Payroll
            </h1>
            <p className="text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              In-depth articles on distributed cloud multi-tenancy, LAN biometric device integration, and Pakistani labor law automation.
            </p>
          </div>
        </section>

        {/* Blog Grid */}
        <section className="py-16 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {POSTS.map((post) => (
              <article
                key={post.slug}
                className="border border-slate-200 rounded-lg p-6 bg-white hover:border-slate-400 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3">
                    <span className="px-2.5 py-0.5 bg-slate-100 font-semibold text-slate-700 rounded">
                      {post.category}
                    </span>
                    <span>{post.readTime}</span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 mb-3 hover:text-blue-600 transition-colors">
                    {post.title}
                  </h2>

                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{post.date}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Blog FAQs with Single-Open Accordion */}
        <FAQSection
          items={BLOG_FAQS}
          title="Industry & Compliance FAQ"
          subtitle="Frequently asked questions about HR regulations, hardware drivers, and security standards."
        />
      </main>

      <Footer />
    </div>
  );
}
