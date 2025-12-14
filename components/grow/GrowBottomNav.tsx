'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Home,
  Calendar,
  Sprout,
  CloudSun,
  Info,
} from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const LINKS: NavLink[] = [
  { href: '/grow', label: 'Home', Icon: Home },
  { href: '/grow/plan', label: 'Plan', Icon: Calendar },
  { href: '/grow/garden', label: 'Garden', Icon: Sprout },
  { href: '/grow/weather', label: 'Weather', Icon: CloudSun },
  { href: '/grow/info', label: 'Info', Icon: Info },
];

export function GrowBottomNav() {
  const router = useRouter();
  const pathname = router?.pathname ?? '';

  // Match exact paths or paths that start with the link (for nested routes)
  const isLinkActive = (href: string) => {
    if (href === '/grow') {
      // Home is only active on exact /grow path
      return pathname === '/grow';
    }
    // Other links are active if pathname starts with their href
    return pathname.startsWith(href);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <nav className="flex justify-around items-center h-16">
        {LINKS.map((link) => {
          const isActive = isLinkActive(link.href);
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
                className={`shrink-0 ${isActive ? 'stroke-[2.5] text-green-600' : 'stroke-2 text-gray-500'}`}
                aria-hidden
              />
              <span 
                className={`text-xs font-medium leading-tight text-center ${isActive ? 'text-green-600' : 'text-gray-500'}`}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default GrowBottomNav;
