import { Suspense } from 'react';
import AuthCallbackClient from './AuthCallbackClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<main className="max-w-md mx-auto p-6">Finishing sign‑in…</main>}>
      <AuthCallbackClient />
    </Suspense>
  );
}