'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FAQSection, { FAQItem } from '@/components/FAQSection';
import {
  Download,
  ShieldCheck,
  Users,
  Clock,
  Calculator,
  ArrowRight,
  Database,
  Building,
  CheckCircle2,
  FileText,
  Star,
  Quote,
  Zap,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [consent, setConsent] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadResult, setDownloadResult] = useState<{
    downloadUrl: string;
    version: string;
    sha256: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDownloading(true);

    try {
      const res = await fetch('/api/v1/download/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, workEmail, companyName, consent }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Download request failed.');
      }

      setDownloadResult(data.data);
      const link = document.createElement('a');
      link.href = data.data.downloadUrl;
      link.setAttribute('download', 'HR360-Setup-1.0.0.zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const HOME_FAQS: FAQItem[] = [
    {
      question: 'How do I download and install the HR360 desktop app on Windows?',
      answer:
        'Fill out the download form on this page to retrieve the officially signed installer ZIP. Unpack and run the application. Once installed, your company administrator creates an initial setup registration. As soon as the platform administrator approves the account, a dedicated database is created and your desktop app activates instantly.',
    },
    {
      question: 'Does the desktop app show existing demo or mock employee data when activated?',
      answer:
        'No. Every newly activated company database starts completely clean with 0 employees. All records, branches, biometric punch rules, and payroll components are entered dynamically by your authorized HR administrators.',
    },
    {
      question: 'Which biometric devices are natively supported?',
      answer:
        'HR360 supports ZKTeco standalone terminals (over TCP/IP port 4370 SilkID protocol) and Hikvision Face Recognition / Fingerprint terminals (over HTTP/HTTPS ISAPI port 80). The desktop app connects over your local network dynamically without requiring public static IPs.',
    },
    {
      question: 'Can employees view their payslips and submit leaves?',
      answer:
        'Yes. Through role-based access control, employees can be granted self-service logins to view generated PDF payslips, inspect their punch logs, and submit leave requests that trigger multi-tier approval workflows.',
    },
    {
      question: 'How is data encrypted in the cloud database?',
      answer:
        'All database traffic is encrypted in transit using TLS 1.3 with ISRG Root X1 certificates. Sensitive employee data (such as national CNICs and bank disbursement accounts) is additionally encrypted at the application layer using AES-256-GCM envelope cryptography before insertion.',
    },
  ];

  const TESTIMONIALS = [
    {
      quote:
        'The dynamic dedicated database architecture solved our compliance audit instantly. Having zero cross-tenant database sharing gave our legal board complete peace of mind.',
      author: 'Kamran Siddiqui',
      role: 'Chief Technology Officer',
      company: 'Apex Logistics & Tech',
    },
    {
      quote:
        'Our factory in Karachi has 3 ZKTeco biometric turnstiles. The HR360 desktop app auto-syncs every punch straight from our network to dynamic cloud payroll without a single missing minute.',
      author: 'Fatima Noor',
      role: 'Head of Human Capital',
      company: 'Indus Textile Mills',
    },
    {
      quote:
        'We migrated from manual Excel sheets. Calculating monthly Pakistan tax brackets, EOBI, and provident funds now takes 30 seconds with 100% mathematical precision.',
      author: 'Tariq Mehmood',
      role: 'Lead Payroll Director',
      company: 'Crescent Holdings Ltd',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <div className="inline-flex items-center space-x-2 py-1.5 px-4 mb-6 text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 border border-slate-300 rounded-full shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Dynamic Dedicated Tenancy</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
              Enterprise Workforce Management, <br className="hidden sm:inline" />
              <span className="text-slate-900 bg-clip-text">
                Biometric Network Sync & Statutory Payroll
              </span>
            </h1>

            <p className="text-base md:text-lg text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              HR360 delivers dedicated database tenancy in Dynamic Cloud DB, native local-network biometric device bridging (ZKTeco & Hikvision), and 128-bit exact decimal payroll with zero offline persistence.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <button
                onClick={() => setDownloadModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-sm font-bold rounded text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Desktop App (Windows x64)
              </button>

              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 border border-slate-300 text-sm font-semibold rounded text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-colors"
              >
                View Plans & Pricing
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>

            <div className="mt-4 text-[11px] text-slate-500 font-mono">
              Windows 10 / 11 (x64) • SHA-256 Verified • 151 MB Standalone Native Package
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section id="features" className="py-20 max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Built for Enterprise Security & Strict Compliance
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Engineered from the ground up to guarantee physical database isolation, uncompromised audit trails, and zero data leakage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center mb-5">
                <Database className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Dedicated Database Tenancy</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every organization receives an isolated database schema (<code className="text-slate-800 font-mono font-bold">tenant_&lt;slug&gt;</code>) in Dynamic Cloud DB. Zero cross-tenant data leakage by design.
              </p>
            </div>

            <div className="p-8 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center mb-5">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Biometric Device Bridge</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The desktop app connects directly to ZKTeco and Hikvision biometric terminals on your local network, synchronizing raw punches dynamically to cloud storage without open ports.
              </p>
            </div>

            <div className="p-8 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center mb-5">
                <Calculator className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Statutory Decimal Payroll</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Calculations execute using 128-bit exact decimal math. Pakistan FBR progressive tax brackets, EOBI quotas, and provident fund profiles computed to the cent.
              </p>
            </div>
          </div>
        </section>

        {/* Detailed Showcase Section */}
        <section className="py-20 bg-white border-t border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  All-in-One Desktop Client
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">
                  10 Specialized Enterprise Modules for Human Capital Management
                </h2>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  The HR360 desktop application provides complete enterprise operations with zero mock data. Everything operates dynamically against your dedicated schema.
                </p>

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="flex items-start">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2.5 mt-0.5 shrink-0" />
                    <span><strong>Employee Master Registry:</strong> Full digital personnel dossiers with AES-256 encrypted CNICs and CSV batch import.</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2.5 mt-0.5 shrink-0" />
                    <span><strong>Biometric Management:</strong> Automated polling of ZKTeco and Hikvision facial and fingerprint readers with punch deduplication.</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2.5 mt-0.5 shrink-0" />
                    <span><strong>Payslip & Document Studio:</strong> Built-in visual designer for watermarked payslips, experience certificates, and bank disbursement letters.</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2.5 mt-0.5 shrink-0" />
                    <span><strong>Blind ATS Sourcing:</strong> Unconscious-bias mitigation algorithms for merit-based CV shortlisting and interview pipeline tracking.</span>
                  </div>
                </div>
              </div>

              {/* Visual Showcase Card */}
              <div className="bg-slate-900 p-8 rounded-xl text-white shadow-xl space-y-6 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-2">
                    <img src="/icon.png" alt="Icon" className="w-6 h-6 rounded" />
                    <span className="font-bold text-sm">HR360 Enterprise Workspace</span>
                  </div>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                    (Dynamic)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-800/60 rounded border border-slate-700/60">
                    <div className="text-slate-400 mb-1">Architecture</div>
                    <div className="font-bold text-white">Dynamic Database Per Tenant</div>
                  </div>
                  <div className="p-3 bg-slate-800/60 rounded border border-slate-700/60">
                    <div className="text-slate-400 mb-1">Device Support</div>
                    <div className="font-bold text-white">ZKTeco & Hikvision (Dynamic)</div>
                  </div>
                  <div className="p-3 bg-slate-800/60 rounded border border-slate-700/60">
                    <div className="text-slate-400 mb-1">Tax Engine</div>
                    <div className="font-bold text-white">Pakistan FBR Slabs 2025-2026</div>
                  </div>
                  <div className="p-3 bg-slate-800/60 rounded border border-slate-700/60">
                    <div className="text-slate-400 mb-1">Storage Mode</div>
                    <div className="font-bold text-white">Zero Offline Persistence</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/40 rounded text-[11px] text-slate-400 font-mono">
                  &gt; SELECT COUNT(*) FROM tenant_yourcompany.employees;<br />
                  &gt; [Dynamic: 0 records at setup, populated by company admin]
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dummy Testimonials Section */}
        <section className="py-20 max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Customer Trust & Verification
            </span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Trusted by Progressive Enterprises Across Industries
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs hover:shadow-sm transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex text-amber-500 mb-3 space-x-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 italic leading-relaxed mb-6">
                    "{t.quote}"
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <div className="font-bold text-slate-900 text-xs">{t.author}</div>
                  <div className="text-[11px] text-slate-500">{t.role}</div>
                  <div className="text-[11px] font-semibold text-slate-700">{t.company}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section (Single-Open Accordion) */}
        <FAQSection
          items={HOME_FAQS}
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about the HR360 desktop app, dynamic cloud database, and activation."
        />

        {/* CTA Download Banner */}
        <section id="download" className="py-16 bg-slate-900 text-white text-center px-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to Modernize Your Workforce Management?
            </h2>
            <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Download the desktop installer now. Complete your first-time registration, receive activation from platform administration, and start with an empty, dedicated database in Dynamic Cloud DB.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-3">
              <button
                onClick={() => setDownloadModalOpen(true)}
                className="inline-flex items-center px-8 py-3.5 bg-white text-slate-900 font-bold text-sm rounded hover:bg-slate-100 shadow transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Windows Client
              </button>
              <a
                href="/builds/HR360-Setup-1.0.0.zip"
                download="HR360-Setup-1.0.0.zip"
                className="inline-flex items-center px-6 py-3.5 border border-slate-700 bg-slate-800 text-white font-semibold text-sm rounded hover:bg-slate-700 shadow transition-colors"
              >
                Direct Download (.zip)
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Download Verification Modal */}
      {downloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 shadow-xl max-w-md w-full p-6 m-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900">Download HR360 Desktop Client</h3>
              <button
                onClick={() => setDownloadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {downloadResult ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 text-xs rounded">
                  <div className="font-semibold text-slate-800 mb-1">Release Version: {downloadResult.version}</div>
                  <div className="text-slate-600 break-all">
                    SHA-256: <code className="font-mono text-slate-900">{downloadResult.sha256}</code>
                  </div>
                </div>
                <p className="text-xs text-slate-600">
                  Your download is ready. Click below to start your download:
                </p>
                <a
                  href={downloadResult.downloadUrl}
                  download="HR360-Setup-1.0.0.zip"
                  className="inline-flex w-full justify-center items-center px-4 py-2.5 bg-slate-900 text-white font-bold text-xs rounded hover:bg-slate-800"
                >
                  Download HR360-Setup-1.0.0.zip (151 MB)
                </a>
              </div>
            ) : (
              <form onSubmit={handleDownloadSubmit} className="space-y-3.5">
                <div className="p-2.5 bg-blue-50 border border-blue-200 text-xs rounded text-blue-900 flex justify-between items-center">
                  <span>Native Windows x64 Package (151 MB)</span>
                  <a
                    href="/builds/HR360-Setup-1.0.0.zip"
                    download="HR360-Setup-1.0.0.zip"
                    className="font-bold underline text-blue-700 hover:text-blue-900 ml-2 whitespace-nowrap"
                  >
                    Direct Download ⬇
                  </a>
                </div>
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded">
                    {errorMsg}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-800"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-800"
                    placeholder="jane@company.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-800"
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="consent"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 mr-2"
                  />
                  <label htmlFor="consent" className="text-[11px] text-slate-600">
                    I confirm this download is for corporate deployment on Windows systems with dynamic cloud database connectivity.
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={downloading}
                  className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded hover:bg-slate-800 disabled:opacity-50 mt-1"
                >
                  {downloading ? 'Preparing Signed Package...' : 'Get Desktop Installer (.zip)'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
