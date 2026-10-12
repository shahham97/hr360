'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, Phone, Mail, Building, User, Send } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTier?: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  defaultPackage?: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  onSuccess?: () => void;
}

export default function PackageInquiryModal({
  isOpen,
  onClose,
  defaultTier = 'STARTER',
  defaultPackage = 'MONTHLY',
  onSuccess,
}: Props) {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedTier, setSelectedTier] = useState<'STARTER' | 'GROWTH' | 'ENTERPRISE'>(defaultTier);
  const [selectedPackage, setSelectedPackage] = useState<'MONTHLY' | 'ANNUAL' | 'LIFETIME'>(defaultPackage);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedTier(defaultTier);
      setSelectedPackage(defaultPackage);
      setSubmitted(false);
      setErrorMsg('');
    }
  }, [isOpen, defaultTier, defaultPackage]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          companyName,
          workEmail,
          phone,
          whatsapp: whatsapp || phone,
          selectedTier,
          selectedPackage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to submit inquiry.');
      }

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 shadow-2xl max-w-lg w-full p-6 sm:p-8 rounded-xl relative my-8">
        <button
          onClick={onClose}
          className="cursor-pointer absolute top-5 right-5 text-slate-400 hover:text-slate-800 transition-colors p-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Inquiry Received Successfully</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Thank you, <strong>{fullName}</strong>. Our enterprise team has received your order for the{' '}
              <strong>{selectedTier} ({selectedPackage})</strong> package. An executive will contact you directly via WhatsApp or phone to finalize your deployment.
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold text-xs rounded hover:bg-slate-800 transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                <span>Avail Package & Manual Billing</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                Confirm Package & Connect with Representative
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Fill out the form below. Our billing team will verify your organization and initiate your setup.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 text-xs text-red-700 rounded font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Tariq Mehmood"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Dynamics Ltd"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Corporate Email Address</label>
                <input
                  type="email"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="tariq@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Contact Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Two Mandatory Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Select Tier *</label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                  >
                    <option value="STARTER">Starter Tier ($99/mo)</option>
                    <option value="GROWTH">Growth & Scale ($179/mo)</option>
                    <option value="ENTERPRISE">Enterprise Core ($249/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">Billing Package *</label>
                  <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                  >
                    <option value="MONTHLY">Monthly Billing</option>
                    <option value="ANNUAL">Annual Billing (Discounted)</option>
                    <option value="LIFETIME">Lifetime Perpetual (One-Time)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center space-x-2"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  <span>{loading ? 'Submitting Inquiry...' : 'Submit Package Inquiry'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 text-center">
                Manual Verification: No automated credit card charges. A corporate rep will contact you via WhatsApp or phone.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
