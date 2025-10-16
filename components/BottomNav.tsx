'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, Mountain, CloudSun, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase/client';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = React.useState<string | null>(null);

  // Check auth state
  React.useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: authSub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        setUserId(session?.user?.id ?? null);
      });
      unsub = () => authSub.subscription.unsubscribe();
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  const navItems = [
    {
      href: '/',
      icon: Home,
      label: 'Home',
      match: (path: string) => path === '/',
    },
    {
      href: '/activities',
      icon: Mountain,
      label: 'Activities',
      match: (path: string) => path.startsWith('/activities'),
    },
    {
      href: '/weather',
      icon: CloudSun,
      label: 'Weather',
      match: (path: string) => path.startsWith('/weather'),
    },
    {
      href: userId ? '/settings' : '/login',
      icon: Settings,
      label: 'Settings',
      match: (path: string) => path.startsWith('/settings') || path.startsWith('/login'),
    },
  ];

  return (
    <div className="btm-nav md:hidden fixed bottom-0 left-0 right-0 z-50 bg-base-100 border-t border-base-200">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.match(pathname);

        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={isActive ? 'active' : ''}
          >
            <Icon size={20} />
            <span className="btm-nav-label text-xs">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
