'use client';

import React, { useEffect, useState } from 'react';
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
  const [isNavigating, setIsNavigating] = useState(false);

  // Show loading indicator during navigation
  useEffect(() => {
    const handleStart = () => setIsNavigating(true);
    const handleComplete = () => setIsNavigating(false);
    
    router.events?.on('routeChangeStart', handleStart);
    router.events?.on('routeChangeComplete', handleComplete);
    router.events?.on('routeChangeError', handleComplete);
    
    return () => {
      router.events?.off('routeChangeStart', handleStart);
      router.events?.off('routeChangeComplete', handleComplete);
      router.events?.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <>
      {/* Loading indicator during navigation */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-primary/20 z-[100] overflow-hidden">
          <div className="h-full bg-primary w-full animate-pulse" />
        </div>
      )}
      
      <div className="flex items-center justify-between w-full max-w-none">
        <nav className="overflow-x-auto flex-1">
          <ul className="menu menu-horizontal rounded-box bg-base-100/80 border border-base-200 px-3 py-1 text-sm">
            {LINKS.map((link) => {
              const isActive = pathname === link.href;
              const linkClasses = `px-3 py-2 font-medium transition-colors flex items-center gap-2 ${
                isActive ? 'text-primary' : 'text-base-content/70 hover:text-base-content'
              }`;
              const { Icon } = link;
              return (
                <li key={link.href} className="whitespace-nowrap">
                  <Link
                    href={link.href}
                    prefetch={true}
                    onMouseEnter={() => router.prefetch(link.href)}
                    className={linkClasses}
                  >
                    <Icon size={16} aria-hidden className="shrink-0" />
                    <TranslatedText text={link.label} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-4 flex-shrink-0">
          <LanguageSelector compact />
        </div>
      </div>
    </>
  );
}

export default FindrNavigation;
