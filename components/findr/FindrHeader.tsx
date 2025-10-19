// components/findr/FindrHeader.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { LanguageSelector } from '../LanguageSelector';
import { Fish } from 'lucide-react';

export function FindrHeader() {
  return (
    <header className="w-full bg-base-100 border-b border-base-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo and brand */}
        <Link href="/findr" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Fish size={24} className="text-primary" />
          <span className="text-xl font-bold">findr</span>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/findr" className="text-sm hover:text-primary transition-colors">
            Predictions
          </Link>
          <Link href="/findr/about" className="text-sm hover:text-primary transition-colors">
            About
          </Link>
          <Link href="/findr/support" className="text-sm hover:text-primary transition-colors">
            Support
          </Link>
        </nav>

        {/* Language selector */}
        <div className="flex items-center gap-2">
          <LanguageSelector compact />
        </div>
      </div>
    </header>
  );
}

export default FindrHeader;
