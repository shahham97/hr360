'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Home', exact: true },
  { href: '/pricing', label: 'Pricing' },
  { href: '/download', label: 'Download App' },
  { href: '/register', label: 'Register' },
  { href: '/blog', label: 'Blog' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isCurrent = (href: string, exact?: boolean) => {
    if (exact || href === '/') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo Only (No redundant HR360 text) */}
        <Link href="/" className="flex items-center group py-1">
          <img
            src="/logo.png"
            alt="HR360 Logo"
            className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold">
          {NAV_ITEMS.map((item) => {
            const active = isCurrent(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-1.5 transition-all border-b-2 ${
                  active
                    ? 'text-slate-950 font-bold border-slate-900'
                    : 'text-slate-600 hover:text-slate-950 font-medium border-transparent'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA & Actions */}
        <div className="hidden md:flex items-center space-x-3">
          <Link
            href="/register"
            className="text-xs font-bold text-slate-700 hover:text-slate-950 px-3 py-2 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            Register Company
          </Link>
          <Link
            href="/download"
            className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded shadow-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Get Desktop App
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-700 hover:text-slate-950 cursor-pointer"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-3">
          {NAV_ITEMS.map((item) => {
            const active = isCurrent(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-sm py-1.5 transition-colors ${
                  active
                    ? 'text-slate-950 font-bold border-b-2 border-slate-900 inline-block'
                    : 'text-slate-700 hover:text-slate-950 font-medium'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/download"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex w-full items-center justify-center px-4 py-2 text-xs font-bold rounded text-white bg-slate-900"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download Desktop App (x64)
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
