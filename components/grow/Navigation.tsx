"use client";

import React from 'react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Home, Calendar, Sprout, CloudSun, Info, LogOut } from 'lucide-react';
import { type AuthUser } from '../../lib/grow/auth';
import { buildGrowLoginUrl, GROW_ROOT_PATH } from '../../lib/grow/routes';
import { GrowLanguageSelector } from './GrowLanguageSelector';
import { useTranslationMap } from '../../lib/translation/useTranslationMap';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: 'home' | 'plan' | 'garden' | 'conditions' | 'info') => void;
  currentUser: AuthUser | null;
  onSignOut: () => void;
}

const pageButton = (
  page: 'home' | 'plan' | 'garden' | 'conditions' | 'info',
  currentPage: string,
  onPageChange: NavigationProps['onPageChange'],
  icon: React.ReactNode,
  label: string,
) => {
  const isActive = currentPage === page;
  return (
    <Button
      variant={isActive ? 'default' : 'ghost'}
      size="sm"
      onClick={() => onPageChange(page)}
      className="flex items-center space-x-1"
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      role="tab"
      aria-selected={isActive}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
};

export function Navigation({ currentPage, onPageChange, currentUser, onSignOut }: NavigationProps) {
  const translationInputs = React.useMemo(
    () => ['My Home', 'Plan', 'Garden', 'Conditions', 'Info', 'Sign out', 'Sign in', 'Skip to main content', 'User account'],
    [],
  );
  const { t } = useTranslationMap(translationInputs);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-green-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        {t('Skip to main content')}
      </a>
      <nav className="bg-card border-b border-border" role="navigation" aria-label="Main navigation">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Sprout className="h-8 w-8 text-green-600" aria-hidden="true" />
              <span className="font-semibold text-lg">Grow Daisy</span>
            </div>

          <div className="flex items-center space-x-1">
            {/* Hide nav buttons on mobile - they're in the bottom nav */}
            <div className="hidden md:flex items-center space-x-1">
              {pageButton('home', currentPage, onPageChange, <Home className="h-4 w-4" aria-hidden="true" />, t('My Home'))}
              {pageButton('plan', currentPage, onPageChange, <Calendar className="h-4 w-4" aria-hidden="true" />, t('Plan'))}
              {pageButton('garden', currentPage, onPageChange, <Sprout className="h-4 w-4" aria-hidden="true" />, t('Garden'))}
              {pageButton('conditions', currentPage, onPageChange, <CloudSun className="h-4 w-4" aria-hidden="true" />, t('Conditions'))}
              {pageButton('info', currentPage, onPageChange, <Info className="h-4 w-4" aria-hidden="true" />, t('Info'))}
            </div>
            <GrowLanguageSelector className="ml-1 hidden sm:inline-flex" />

            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label={t('User account')}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {(currentUser.name?.charAt(0) ?? currentUser.email?.charAt(0) ?? 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{currentUser.name ?? 'User'}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">{currentUser.email ?? ''}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut}>
                    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>{t('Sign out')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <a
                href={buildGrowLoginUrl(GROW_ROOT_PATH)}
                className="ml-2 inline-flex items-center justify-center h-8 px-4 rounded-md text-sm font-medium transition-colors shadow-sm"
                style={{ backgroundColor: '#059669', color: '#ffffff' }}
              >
                {t('Sign in')}
              </a>
            )}
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
