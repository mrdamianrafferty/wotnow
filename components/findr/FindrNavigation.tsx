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
  );
}

export default FindrNavigation;
