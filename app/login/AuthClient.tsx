"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "Error sending magic link email";
}

export default function AuthClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, nudge to settings/home
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (active && data.session) {
        router.replace("/settings");
      }
    })();
    return () => { active = false; };
  }, [router]);

  // Optional: surface auth callback errors via query (?error=...)
  const callbackError = sp?.get("error");
  useEffect(() => {
    if (callbackError) setError(callbackError);
  }, [callbackError]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${BASE_URL}/auth/callback`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-5" data-theme="light">
      <h1 className="text-2xl font-semibold text-center">Sign in</h1>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {sent ? (
        <div className="alert alert-info">
          <span>Check your inbox for a magic link to sign in.</span>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="space-y-3">
          <label className="form-control w-full">
            <span className="label-text">Email</span>
            <input
              type="email"
              className="input input-bordered w-full"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}

      <p className="text-xs opacity-70 text-center">
        Problems? Email <a className="link" href="mailto:hello@godaisy.app">hello@godaisy.app</a>
      </p>
    </main>
  );
}
