// components/findr/FindrBottomNav.tsx
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
  Camera,
  Settings,
} from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';

interface NavLink {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const LINKS: NavLink[] = [
  { href: '/findr', label: 'findr', Icon: Fish },
  { href: '/findr/favourites', label: 'faves', Icon: Heart },
  { href: '/findr/log', label: 'catches', Icon: ClipboardList },
  { href: '/findr/my-catches', label: 'gallery', Icon: Camera },
  { href: '/findr/conditions', label: 'conditions', Icon: CloudSun },
  { href: '/findr/settings', label: 'settings', Icon: Settings },
  { href: '/findr/info', label: 'info', Icon: Info },
];

export function FindrBottomNav() {
  const router = useRouter();
  const pathname = router?.pathname ?? '';

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-200 z-50 safe-area-bottom safe-area-x">
      <nav className="flex justify-around items-center h-16">
        {LINKS.map((link) => {
          const isActive = pathname === link.href;
          const { Icon } = link;
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] min-h-[48px] transition-colors"
            >
              <Icon
                size={24}
                className={`shrink-0 ${isActive ? 'stroke-[2.5] text-cyan-700' : 'stroke-2 text-gray-700'}`}
                aria-hidden
              />
              <span
                className="text-xs font-medium leading-tight text-center"
                style={{ color: isActive ? '#0e7490' : '#374151' }}
              >
                <TranslatedText text={link.label} />
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default FindrBottomNav;
