"use client";

import React from 'react';
import Link from 'next/link';
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
) => (
  <Button
    variant={currentPage === page ? 'default' : 'ghost'}
    size="sm"
    onClick={() => onPageChange(page)}
    className="flex items-center space-x-1"
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </Button>
);

export function Navigation({ currentPage, onPageChange, currentUser, onSignOut }: NavigationProps) {
  const translationInputs = React.useMemo(
    () => ['My Home', 'Plan', 'Garden', 'Conditions', 'Info', 'Sign out', 'Sign in'],
    [],
  );
  const { t } = useTranslationMap(translationInputs);

  return (
    <nav className="bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Sprout className="h-8 w-8 text-green-600" />
            <span className="font-semibold text-lg">Grow Daisy</span>
          </div>

          <div className="flex items-center space-x-1">
            {pageButton('home', currentPage, onPageChange, <Home className="h-4 w-4" />, t('My Home'))}
            {pageButton('plan', currentPage, onPageChange, <Calendar className="h-4 w-4" />, t('Plan'))}
            {pageButton('garden', currentPage, onPageChange, <Sprout className="h-4 w-4" />, t('Garden'))}
            {pageButton('conditions', currentPage, onPageChange, <CloudSun className="h-4 w-4" />, t('Conditions'))}
            {pageButton('info', currentPage, onPageChange, <Info className="h-4 w-4" />, t('Info'))}
            <GrowLanguageSelector className="ml-1 hidden sm:inline-flex" />

            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
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
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('Sign out')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="ml-2 bg-green-600 hover:bg-green-700 text-white">
                <Link href={buildGrowLoginUrl(GROW_ROOT_PATH)}>{t('Sign in')}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
