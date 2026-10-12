'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import {
  Building,
  User,
  Mail,
  Lock,
  Phone,
  Globe,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function RegisterPage() {
  const [companyName, setCompanyName] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('PK');
  const [estimatedEmployees, setEstimatedEmployees] = useState(25);
  const [selectedPlanTier, setSelectedPlanTier] = useState<'STARTER' | 'GROWTH' | 'ENTERPRISE'>('STARTER');
  const [selectedInterval, setSelectedInterval] = useState<'MONTHLY' | 'ANNUAL' | 'LIFETIME'>('ANNUAL');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<{
    registrationId: string;
    companyName: string;
    adminEmail: string;
  } | null>(null);

  // Sync with URL query parameters if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tierParam = params.get('tier')?.toUpperCase();
      const intervalParam = params.get('interval')?.toUpperCase();
      if (tierParam && ['STARTER', 'GROWTH', 'ENTERPRISE'].includes(tierParam)) {
        setSelectedPlanTier(tierParam as any);
      }
      if (intervalParam && ['MONTHLY', 'ANNUAL', 'LIFETIME'].includes(intervalParam)) {
        setSelectedInterval(intervalParam as any);
      }
    }
  }, []);

  // Password validation checks
  const hasMinLength = adminPassword.length >= 12;
  const hasUpper = /[A-Z]/.test(adminPassword);
  const hasLower = /[a-z]/.test(adminPassword);
  const hasDigit = /[0-9]/.test(adminPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(adminPassword);
  const passwordsMatch = adminPassword === confirmPassword && confirmPassword.length > 0;
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isPasswordValid) {
      setErrorMsg('Password does not meet the minimum complexity requirements.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          adminFullName,
          adminEmail,
          adminPassword,
          phone,
          country,
          estimatedEmployees: Number(estimatedEmployees) || 1,
          selectedPlanTier,
          selectedInterval,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Company registration failed.');
      }

      setSuccessData(data.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <main className="flex-1 py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {successData ? (
            <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-8 sm:p-10 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Registration Submitted Successfully
                </h1>
                <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                  Your organization registration for <strong>{successData.companyName}</strong> has been received and queued for platform approval.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-left text-xs text-slate-700 space-y-2 max-w-lg mx-auto">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-500">Registration ID:</span>
                  <span className="font-mono font-bold text-slate-900">{successData.registrationId}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-500">Administrator Email:</span>
                  <span className="font-semibold text-slate-900">{successData.adminEmail}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-500">Selected Plan:</span>
                  <span className="font-bold text-slate-900">{selectedPlanTier} ({selectedInterval})</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-semibold text-slate-500">Current Status:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                    PENDING APPROVAL
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Next Steps:</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Download the certified HR360 Windows Desktop client now. Once your account is approved in the platform admin console, you can activate your license and sign in immediately.
                </p>

                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
                  <Link
                    href="/download"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-slate-900 text-white font-bold text-xs rounded hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Windows Desktop Client
                  </Link>
                  <Link
                    href="/"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-slate-300 text-slate-700 font-semibold text-xs rounded hover:bg-slate-100 transition-colors"
                  >
                    Return to Homepage
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-8 sm:p-10">
              <div className="mb-8 border-b border-slate-100 pb-6">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                  <span>Enterprise Onboarding</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Register Your Organization
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Create your company account for HR360. Upon platform approval, your dedicated local vault and administrator license will be provisioned.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Organization Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    1. Company Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Company Legal Name *
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Apex Dynamics Ltd"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Operating Country *
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900 bg-white"
                        >
                          <option value="PK">Pakistan (PK)</option>
                          <option value="AE">United Arab Emirates (AE)</option>
                          <option value="SA">Saudi Arabia (SA)</option>
                          <option value="GB">United Kingdom (GB)</option>
                          <option value="US">United States (US)</option>
                          <option value="CA">Canada (CA)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Primary Contact Phone / WhatsApp *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+92 300 1234567"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Estimated Headcount
                      </label>
                      <select
                        value={estimatedEmployees}
                        onChange={(e) => setEstimatedEmployees(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900 bg-white"
                      >
                        <option value={10}>1 - 25 Employees</option>
                        <option value={50}>26 - 50 Employees</option>
                        <option value={150}>51 - 250 Employees</option>
                        <option value={500}>250+ Employees</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    2. Select Subscription Tier
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPlanTier('STARTER')}
                      className={`cursor-pointer select-none p-3 text-left border rounded-lg transition-all relative ${
                        selectedPlanTier === 'STARTER'
                          ? 'border-2 border-slate-900 bg-slate-50 ring-1 ring-slate-900 shadow-xs'
                          : 'border-slate-200 hover:border-slate-400 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-900">Starter Tier</div>
                        {selectedPlanTier === 'STARTER' && (
                          <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Up to 50 staff • 1 Biometric</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPlanTier('GROWTH')}
                      className={`cursor-pointer select-none p-3 text-left border rounded-lg transition-all relative ${
                        selectedPlanTier === 'GROWTH'
                          ? 'border-2 border-slate-900 bg-slate-50 ring-1 ring-slate-900 shadow-xs'
                          : 'border-slate-200 hover:border-slate-400 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-900">Growth & Scale</div>
                        {selectedPlanTier === 'GROWTH' && (
                          <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Up to 250 staff • ATS & Studio</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPlanTier('ENTERPRISE')}
                      className={`cursor-pointer select-none p-3 text-left border rounded-lg transition-all relative ${
                        selectedPlanTier === 'ENTERPRISE'
                          ? 'border-2 border-slate-900 bg-slate-50 ring-1 ring-slate-900 shadow-xs'
                          : 'border-slate-200 hover:border-slate-400 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-900">Enterprise Core</div>
                        {selectedPlanTier === 'ENTERPRISE' && (
                          <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Unlimited • Priority Support</div>
                    </button>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-semibold text-slate-700 pt-1">
                    <span className="text-slate-500">Billing Cadence:</span>
                    <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="interval"
                        checked={selectedInterval === 'MONTHLY'}
                        onChange={() => setSelectedInterval('MONTHLY')}
                      />
                      <span>Monthly</span>
                    </label>
                    <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="interval"
                        checked={selectedInterval === 'ANNUAL'}
                        onChange={() => setSelectedInterval('ANNUAL')}
                      />
                      <span>Annual (20% Off)</span>
                    </label>
                    <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="interval"
                        checked={selectedInterval === 'LIFETIME'}
                        onChange={() => setSelectedInterval('LIFETIME')}
                      />
                      <span>Lifetime</span>
                    </label>
                  </div>
                </div>

                {/* Administrator Credentials */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    3. Company Administrator Credentials
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Admin Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={adminFullName}
                          onChange={(e) => setAdminFullName(e.target.value)}
                          placeholder="e.g. Asad Ali"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Admin Corporate Email *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="email"
                          required
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="admin@company.com"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Master Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Confirm Master Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Requirement Indicators */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-700 mb-1">Password Requirements:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      <span className={hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                        {hasMinLength ? '✓' : '•'} 12+ Characters
                      </span>
                      <span className={hasUpper ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                        {hasUpper ? '✓' : '•'} Uppercase Letter
                      </span>
                      <span className={hasLower ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                        {hasLower ? '✓' : '•'} Lowercase Letter
                      </span>
                      <span className={hasDigit ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                        {hasDigit ? '✓' : '•'} Number (0-9)
                      </span>
                      <span className={hasSpecial ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                        {hasSpecial ? '✓' : '•'} Symbol (!@#$)
                      </span>
                      <span className={passwordsMatch ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                        {passwordsMatch ? '✓' : '•'} Passwords Match
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500 text-center sm:text-left">
                    By submitting, you agree to HR360's{' '}
                    <Link href="/legal/terms" className="underline hover:text-slate-900">Terms</Link> and{' '}
                    <Link href="/legal/eula" className="underline hover:text-slate-900">EULA</Link>.
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !isPasswordValid || !passwordsMatch}
                    className="w-full sm:w-auto px-8 py-3 bg-slate-900 text-white font-bold text-xs rounded hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {loading ? 'Submitting Registration...' : 'Submit Organization Registration'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
