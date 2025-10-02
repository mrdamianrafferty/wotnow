'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { UserPreferencesProvider } from '../context/UserPreferencesContext';
import { LanguageProvider } from '../context/LanguageContext';
// Load Tailwind + DaisyUI globals so utilities and tokens are available in App Router pages
import '../styles/index.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en" data-theme="light">
      <body className="min-h-screen bg-base-100 text-base-content">
        <LanguageProvider>
          <UserPreferencesProvider>
            <QueryClientProvider client={queryClient}>
              {children}
              {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
              )}
            </QueryClientProvider>
          </UserPreferencesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
