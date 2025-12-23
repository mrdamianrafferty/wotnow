'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { 
  Home, 
  Calendar, 
  Sprout, 
  CloudSun, 
  Info, 
  LogOut, 
  ArrowLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { auth, type AuthUser } from '../../lib/grow/auth';
import { buildGrowLoginUrl, GROW_ROOT_PATH } from '../../lib/grow/routes';
import { GrowBottomNav } from './GrowBottomNav';

/**
 * Simple auth hook for GrowLayout
 */
function useGrowAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const userData = await auth.getUser();
        if (isMounted) {
          setUser(userData);
          setIsLoading(false);
        }
      } catch (_error) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    loadUser();

    // Listen for auth changes
    const unsubscribe = auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? '',
            name: session.user.user_metadata?.name ?? '',
          });
        } else {
          setUser(null);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { user, isLoading };
}

interface NavLink {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV_LINKS: NavLink[] = [
  { href: '/grow', label: 'Home', Icon: Home },
  { href: '/grow/plan', label: 'Plan', Icon: Calendar },
  { href: '/grow/garden', label: 'Garden', Icon: Sprout },
  { href: '/grow/weather', label: 'Weather', Icon: CloudSun },
  { href: '/grow/info', label: 'Info', Icon: Info },
];

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface GrowLayoutProps {
  children: React.ReactNode;
  /** Title shown in header on mobile when using back navigation */
  title?: string;
  /** Custom breadcrumb items - if not provided, auto-generated from path */
  breadcrumbs?: BreadcrumbItem[];
  /** Show back button (default: true on nested pages) */
  showBack?: boolean;
  /** Hide bottom nav (useful for fullscreen modals) */
  hideBottomNav?: boolean;
  /** Additional class names for main content area */
  className?: string;
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  
  // Always start with Grow
  if (segments[0] === 'grow') {
    breadcrumbs.push({ label: 'Grow', href: '/grow' });
    
    // Add subsequent segments
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      const href = '/' + segments.slice(0, i + 1).join('/');
      
      // Format segment label
      let label = segment.charAt(0).toUpperCase() + segment.slice(1);
      label = label.replace(/-/g, ' ');
      
      // Don't add href for the last segment (current page)
      if (i === segments.length - 1) {
        breadcrumbs.push({ label });
      } else {
        breadcrumbs.push({ label, href });
      }
    }
  }
  
  return breadcrumbs;
}

function isNestedPage(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  // Pages like /grow/species/[slug] have 3+ segments
  return segments.length >= 3;
}

export function GrowLayout({ 
  children, 
  title,
  breadcrumbs: customBreadcrumbs,
  showBack,
  hideBottomNav = false,
  className = '',
}: GrowLayoutProps) {
  const router = useRouter();
  const pathname = router?.pathname ?? '';
  const { user, isLoading } = useGrowAuth();
  
  const isNested = isNestedPage(pathname);
  const shouldShowBack = showBack ?? isNested;
  const breadcrumbs = customBreadcrumbs ?? generateBreadcrumbs(pathname);

  // Determine active nav link
  const isLinkActive = (href: string) => {
    if (href === '/grow') {
      return pathname === '/grow';
    }
    return pathname.startsWith(href);
  };

  const handleBack = () => {
    // Check if we have history to go back to
    if (typeof window !== 'undefined' && window.history.length > 1) {
      // Check if referrer is from same domain
      const referrer = document.referrer;
      const isSameDomain = referrer && new URL(referrer).origin === window.location.origin;
      
      if (isSameDomain) {
        router.back();
        return;
      }
    }
    
    // Fallback: go to parent route or /grow/garden
    const parentPath = pathname.split('/').slice(0, -1).join('/') || '/grow';
    router.push(parentPath);
  };

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/grow');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-green-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Desktop Navigation Header */}
      <header className="hidden md:block bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/grow" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Sprout className="h-8 w-8 text-green-600" aria-hidden="true" />
              <span className="font-semibold text-lg">Grow Daisy</span>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="flex items-center space-x-1" role="navigation" aria-label="Main navigation">
              {NAV_LINKS.map((link) => {
                const isActive = isLinkActive(link.href);
                const { Icon } = link;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              {/* User Menu */}
              {!isLoading && (
                user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2" aria-label="User account">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {(user.name?.charAt(0) ?? user.email?.charAt(0) ?? 'U').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          <p className="font-medium">{user.name ?? 'User'}</p>
                          <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email ?? ''}</p>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/grow/settings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                        <span>Sign out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button asChild size="sm" className="ml-2 bg-green-600 hover:bg-green-700 text-white">
                    <Link href={buildGrowLoginUrl(GROW_ROOT_PATH)}>Sign in</Link>
                  </Button>
                )
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Back Button or Logo */}
          {shouldShowBack ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors -ml-2 px-2 py-2 min-w-[44px] min-h-[44px]"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">Back</span>
            </button>
          ) : (
            <Link href="/grow" className="flex items-center space-x-2">
              <Sprout className="h-6 w-6 text-green-600" aria-hidden="true" />
              <span className="font-semibold">Grow</span>
            </Link>
          )}

          {/* Title or Breadcrumb */}
          {title ? (
            <span className="font-medium text-sm truncate max-w-[200px]">{title}</span>
          ) : breadcrumbs.length > 1 ? (
            <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
              {breadcrumbs.slice(-2).map((crumb, idx, arr) => (
                <React.Fragment key={crumb.label}>
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-foreground truncate max-w-[80px]">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium truncate max-w-[120px]">
                      {crumb.label}
                    </span>
                  )}
                  {idx < arr.length - 1 && (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : null}

          {/* Right side - User avatar (direct link to settings on mobile) */}
          <div className="flex items-center">
            {!isLoading && user && (
              <Link
                href="/grow/settings"
                className="flex items-center justify-center h-11 w-11 rounded-full bg-green-100 hover:bg-green-200 transition-colors"
                aria-label="Settings"
              >
                <span className="text-green-700 font-semibold text-lg">
                  {(user.name?.charAt(0) ?? user.email?.charAt(0) ?? 'U').toUpperCase()}
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main 
        id="main-content" 
        className={`flex-1 ${hideBottomNav ? '' : 'pb-20 md:pb-0'} ${className}`}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {!hideBottomNav && <GrowBottomNav />}
    </div>
  );
}

export default GrowLayout;
