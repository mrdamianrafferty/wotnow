import { Suspense } from 'react';
import AuthClient from './AuthClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<main className="max-w-md mx-auto p-6">Loading…</main>}>
      <AuthClient />
    </Suspense>
  );
}