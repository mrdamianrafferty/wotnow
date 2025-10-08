import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import AuthClient from './AuthClient';

export const dynamic = 'force-dynamic';

// Page metadata (British English tone)
export const metadata: Metadata = {
  title: 'Sign in · Go Daisy',
  description: 'Sign in to Go Daisy to save your interests and locations across devices.',
  robots: {
    index: false, // Login pages typically shouldn’t be indexed
    follow: false,
  },
  alternates: {
    canonical: 'https://www.godaisy.io/login',
  },
  openGraph: {
    title: 'Sign in · Go Daisy',
    description: 'Sign in to Go Daisy to save your interests and locations across devices.',
    url: 'https://www.godaisy.io/login',
    siteName: 'Go Daisy',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Sign in · Go Daisy',
    description: 'Sign in to Go Daisy to save your interests and locations across devices.',
  },
};

export default function Page() {
  return (
    <main className="min-h-[60vh] max-w-2xl mx-auto p-6">


      <Suspense
        fallback={
          <section className="max-w-md mx-auto">
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <div className="skeleton h-6 w-1/2 mb-2"></div>
                <div className="skeleton h-12 w-full mb-2"></div>
                <div className="skeleton h-12 w-full mb-2"></div>
                <div className="skeleton h-10 w-full"></div>
              </div>
            </div>
          </section>
        }
      >
        <AuthClient />
      </Suspense>
      <footer className="mt-6 text-center text-xs opacity-70">
        By continuing you agree to our{' '}
        <Link className="link" href="/TermsAndConditions" rel="nofollow">Terms</Link> and{' '}
        <Link className="link" href="/PrivacyPolicy" rel="nofollow">Privacy Policy</Link>.
        <p className="text-xs opacity-60 text-center">Build: {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0,7) || 'local'}</p>
      </footer>
      
    </main>
  );
}