'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserPreferencesProvider } from '../context/UserPreferencesContext';
import { LanguageProvider } from '../context/LanguageContext';
import { AuthProvider } from '../context/AuthContext';
import { UnifiedLocationProvider } from '../context/UnifiedLocationContext';
// Load Tailwind + DaisyUI globals so utilities and tokens are available in App Router pages
import '../styles/index.css';

// Lazy load devtools only in development - completely excluded from production bundle
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then(mod => ({ default: mod.ReactQueryDevtools })),
  { ssr: false, loading: () => null }
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en" data-theme="light">
      <body className="min-h-screen bg-base-100 text-base-content">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LanguageProvider>
              <UnifiedLocationProvider>
                <UserPreferencesProvider>
                  {children}
                  {process.env.NODE_ENV === 'development' && (
                    <ReactQueryDevtools initialIsOpen={false} />
                  )}
                </UserPreferencesProvider>
              </UnifiedLocationProvider>
            </LanguageProvider>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
