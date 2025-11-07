"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

// Utils
function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function mapSupabaseError(err: unknown): string {
  const m = getErrorMessage(err).toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) {
    return "Invalid email or password. If you signed up with Google or Apple, use that to sign in or reset your password.";
  }
  if (m.includes("email rate limit") || m.includes("rate limit")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (m.includes("pkce") || m.includes("code verifier")) {
    return "We had trouble completing sign-in in this browser. Please try again or use the magic link option.";
  }
  return getErrorMessage(err);
}

// ——————————————————————————————————————————————
// Config
const BASE_URL = (() => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (!envUrl) return "";
  return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
})();

type Mode = "signin" | "register" | "link";

function getErrorMessage(err: unknown): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message?: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return "Something went wrong. Please try again.";
}

export default function AuthClient() {
  const router = useRouter();
  const sp = useSearchParams();

  // UI state
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  function clearTransient() {
    setError(null);
    setHasInteracted(false);
    setSent(false);
  }

  // If already signed in, send to homepage
  // Also listen for auth state changes (e.g., OAuth popup completion)
  useEffect(() => {
    let active = true;

    // Check existing session
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (active && data.session) router.replace("/");
    })();

    // Listen for auth state changes (handles OAuth popup, magic links, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === 'SIGNED_IN' && session) {
        // Small delay to prevent race condition with initial session check
        setTimeout(() => {
          if (active) router.replace("/");
        }, 100);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // bubble up auth errors from callback
  const callbackError = sp?.get("error");
  useEffect(() => {
    if (callbackError) {
      setError(callbackError);
      setHasInteracted(true);
    }
  }, [callbackError]);

  // Derived flags
  const canSubmitSignin = useMemo(() => email.trim() && password.length >= 8, [email, password]);
  const canSubmitRegister = useMemo(
    () => email.trim() && password.length >= 8 && confirm === password,
    [email, password, confirm]
  );

  // ——————————————————————————————————————————————
  // Actions
  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setHasInteracted(true);
    setLoading(true);
    setError(null);
    try {
      const emailNorm = normalizeEmail(email);
      const { error: err } = await supabase.auth.signInWithPassword({ email: emailNorm, password });
      if (err) throw err;
      router.replace("/");
    } catch (err) {
      setError(mapSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink(e?: React.FormEvent) {
    e?.preventDefault();
    setHasInteracted(true);
    setLoading(true);
    setError(null);
    try {
      const emailNorm = normalizeEmail(email);
      const { error: err } = await supabase.auth.signInWithOtp({
        email: emailNorm,
        options: { emailRedirectTo: `${BASE_URL}/auth/callback` },
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(mapSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  async function startRecovery() {
    setHasInteracted(true);
    setLoading(true);
    setError(null);
    try {
      const emailNorm = normalizeEmail(email);
      const { error: err } = await supabase.auth.resetPasswordForEmail(emailNorm, {
        redirectTo: `${BASE_URL}/auth/callback?type=recovery`,
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(mapSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setHasInteracted(true);
    setLoading(true);
    setError(null);
    try {
      if (!email || !password) throw new Error("Please enter email and password.");
      if (password !== confirm) throw new Error("Passwords don’t match.");
      const emailNorm = normalizeEmail(email);
      const { error: err } = await supabase.auth.signUp({
        email: emailNorm,
        password,
        options: { emailRedirectTo: `${BASE_URL}/auth/callback` },
      });
      if (err) throw err;
      setSent(true);
      setMode("signin");
    } catch (err) {
      setError(mapSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  async function oAuth(provider: "google" | "github" | "apple") {
    setHasInteracted(true);
    setLoading(true);
    setError(null);
    try {
      // Use native Apple Sign In on iOS for better UX
      if (provider === "apple") {
        const { signInWithApple, isAppleSignInAvailable } = await import("../../lib/auth/appleSignIn");
        if (isAppleSignInAvailable()) {
          await signInWithApple(supabase, `${BASE_URL}/auth/callback`);
          return; // Native flow completed or user cancelled
        }
        // Fall through to web OAuth if native not available
      }

      // Standard OAuth flow for Google, GitHub, or web-based Apple
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${BASE_URL}/auth/callback`,
          queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
        },
      });
      if (err) throw err;
      // redirection handled by provider
    } catch (err) {
      setError(mapSupabaseError(err));
      setLoading(false);
    }
  }

  // ——————————————————————————————————————————————
  // UI helpers
  function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button
        type="button"
        className={[
          "tab flex-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          active
            ? "tab-active !bg-primary !text-primary-content font-semibold shadow-sm"
            : "bg-base-200/70 text-base-content/50 hover:bg-base-200/90"
        ].join(" ")}
        onClick={onClick}
        aria-pressed={active}
      >
        {label}
      </button>
    );
  }

  function SocialButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
      <button
        type="button"
        className="btn btn-outline w-full justify-center gap-2 min-h-0 h-11"
        onClick={onClick}
      >
        <span className="w-4 h-4 rounded-sm bg-base-300" aria-hidden />
        <span className="text-sm font-medium">{label}</span>
      </button>
    );
  }

  if (!BASE_URL) {
    console.warn("NEXT_PUBLIC_SITE_URL is not set; falling back to window.origin at runtime. Ensure this is configured in Vercel env vars.");
  }

  return (
    <main className="mx-auto w-full max-w-sm sm:max-w-md p-6 space-y-6" data-theme="light">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-semibold">Sign in to Go Daisy</h1>
        <p className="text-sm text-base-content/70">Welcome back! Please enter your details.</p>
      </div>

      {/* Tabs: Sign in / Register */}
      <div className="tabs tabs-boxed w-full">
        <TabButton label="Sign in" active={mode === "signin"} onClick={() => { clearTransient(); setMode("signin"); }} />
        <TabButton label="Register" active={mode === "register"} onClick={() => { clearTransient(); setMode("register"); }} />
      </div>

      {error && hasInteracted && (
        <div className="alert alert-error"><span>{error}</span></div>
      )}
      {mode === "signin" && error && hasInteracted && error.toLowerCase().includes("invalid") && (
        <p className="text-xs text-base-content/70 mt-1">
          If you created your account with Google or Apple, please use those options to sign in or reset your password.
        </p>
      )}

      {/* SIGN IN */}
      {mode === "signin" && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <form onSubmit={signInWithPassword} className="space-y-3" noValidate>
              <label className="form-control w-full">
                <span className="label-text">Email address</span>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => { clearTransient(); setEmail(normalizeEmail(e.target.value)); }}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text">Password</span>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    className="input input-bordered w-full pr-16"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { clearTransient(); setPassword(e.target.value); }}
                    autoComplete="current-password"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <p className="text-xs text-base-content/60 -mt-1">
                Tip: If you originally registered with Google or Apple, use those buttons below or reset your password.
              </p>

              <button className="btn btn-primary w-full" disabled={loading || !canSubmitSignin || !email}>
                {loading ? "Signing in…" : "Sign in"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="link link-primary"
                  onClick={startRecovery}
                  disabled={!email || loading}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  className="link link-secondary opacity-70 hover:opacity-100"
                  onClick={() => { clearTransient(); setMode("link"); }}
                >
                  Prefer a magic link?
                </button>
              </div>
            </form>

            <div className="divider">or continue with</div>
            <div className="flex flex-col gap-2">
              <SocialButton label="Continue with Google" onClick={() => oAuth("google")} />
              <SocialButton label="Continue with Apple" onClick={() => oAuth("apple")} />
            </div>
          </div>
        </div>
      )}

      {/* REGISTER */}
      {mode === "register" && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            {sent ? (
              <div className="alert alert-info"><span>Check your inbox to confirm your account.</span></div>
            ) : (
              <form onSubmit={signUp} className="space-y-3" noValidate>
                <label className="form-control w-full">
                  <span className="label-text">Email address</span>
                  <input
                    type="email"
                    className="input input-bordered w-full"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => { clearTransient(); setEmail(normalizeEmail(e.target.value)); }}
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Password</span>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      className="input input-bordered w-full pr-16"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => { clearTransient(); setPassword(e.target.value); }}
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Confirm password</span>
                  <input
                    type={showPw ? "text" : "password"}
                    className="input input-bordered w-full"
                    placeholder="Repeat password"
                    value={confirm}
                    onChange={(e) => { clearTransient(); setConfirm(e.target.value); }}
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </label>

                <p className="text-xs text-base-content/70">
                  By creating an account, you agree to our <a className="link" href="/terms" target="_blank" rel="noreferrer">Terms of Service</a> and <a className="link" href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
                </p>

                <button className="btn btn-primary w-full" disabled={loading || !canSubmitRegister}>
                  {loading ? "Creating…" : "Create account"}
                </button>
              </form>
            )}

            <div className="divider">or continue with</div>
            <div className="flex flex-col gap-2">
              <SocialButton label="Continue with Google" onClick={() => oAuth("google")} />
              <SocialButton label="Continue with Apple" onClick={() => oAuth("apple")} />
            </div>
          </div>
        </div>
      )}

      {/* MAGIC LINK (secondary path) */}
      {mode === "link" && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            {sent ? (
              <div className="alert alert-info">
                <span>Check your inbox for a magic link to sign in.</span>
              </div>
            ) : (
              <form onSubmit={sendMagicLink} className="space-y-3">
                <label className="form-control w-full">
                  <span className="label-text">Email address</span>
                  <input
                    type="email"
                    className="input input-bordered w-full"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => { clearTransient(); setEmail(normalizeEmail(e.target.value)); }}
                    autoComplete="email"
                    required
                  />
                </label>
                <button className="btn btn-primary w-full" disabled={loading || !email}>
                  {loading ? "Sending…" : "Send magic link"}
                </button>
                <div className="text-sm text-center">
                  <button type="button" className="link" onClick={() => { clearTransient(); setMode("signin"); }}>
                    Back to sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <p className="text-xs opacity-70 text-center">
        Problems? Email <a className="link" href="mailto:hello@godaisy.io">hello@godaisy.io</a>
      </p>
    </main>
  );
}
