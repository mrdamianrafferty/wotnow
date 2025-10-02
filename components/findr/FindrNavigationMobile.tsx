'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Fish,
  Heart,
  ClipboardList,
  CloudSun,
  Info,
} from 'lucide-react';
import { LanguageSelector } from '../LanguageSelector';
import { TranslatedText } from '../translation/TranslatedFishCard';
import FindrUserMenu from './FindrUserMenu';

interface NavLink {
  href: string;
  label: string;
  translationKey: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const LINKS: NavLink[] = [
  { href: '/findr', label: 'findr', translationKey: 'findr', Icon: Fish },
  { href: '/findr/favourites', label: 'faves', translationKey: 'favourites', Icon: Heart },
  { href: '/findr/log', label: 'catches', translationKey: 'catches', Icon: ClipboardList },
  { href: '/findr/conditions', label: 'conditions', translationKey: 'conditions', Icon: CloudSun },
  { href: '/findr/info', label: 'info', translationKey: 'info', Icon: Info },
];

export function FindrNavigation() {
  const router = useRouter();
  const pathname = router?.pathname ?? '';

  return (
    <>
      {/* Desktop Navigation - Horizontal Menu */}
      <div className="hidden md:flex items-center justify-between w-full max-w-none">
        <nav className="overflow-x-auto flex-1">
          <ul className="menu menu-horizontal rounded-box bg-base-100/80 border border-base-200 px-3 py-1 text-sm">
            {LINKS.map((link) => {
              const isActive = pathname === link.href;
              const { Icon } = link;
              return (
                <li key={link.href} className="whitespace-nowrap">
                  <Link
                    href={link.href}
                    className="px-3 py-2 font-medium transition-colors flex items-center gap-2"
                  >
                    <Icon 
                      size={16} 
                      aria-hidden 
                      className={`shrink-0 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}
                    />
                    <span style={{ color: isActive ? '#22d3ee' : '#6b7280' }}>
                      <TranslatedText text={link.label} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-4 flex-shrink-0 flex items-center gap-3">
          <FindrUserMenu />
          <LanguageSelector compact />
        </div>
      </div>

      {/* Mobile Navigation - Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-200 z-50 safe-area-bottom">
        <nav className="flex justify-around items-center h-16">
          {LINKS.map((link) => {
            const isActive = pathname === link.href;
            const { Icon } = link;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] min-h-[48px] transition-colors"
              >
                <Icon
                  size={24}
                  className={`shrink-0 ${isActive ? 'stroke-[2.5] text-cyan-400' : 'stroke-2 text-gray-500'}`}
                  aria-hidden
                />
                <span 
                  className="text-xs font-medium leading-tight text-center"
                  style={{ color: isActive ? '#22d3ee' : '#6b7280' }}
                >
                  <TranslatedText text={link.label} />
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Language Selector - Floating Button */}
      <div className="md:hidden fixed top-4 right-4 z-40 flex items-center gap-2">
        <FindrUserMenu />
        <LanguageSelector compact />
      </div>
    </>
  );
}

export default FindrNavigation;
