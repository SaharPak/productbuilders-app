"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
  }

  if (sent) {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card-bg p-6 text-center">
        <p className="font-display text-lg font-bold text-ink">
          Check your email
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          We sent a magic link to <strong className="text-ink">{email}</strong>.
          Click it to sign in.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 w-full space-y-4">
      <button
        onClick={handleGoogleLogin}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card-bg px-4 py-3 text-sm font-semibold text-ink transition-all hover:scale-[1.01] hover:border-border-strong active:scale-[0.99]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="font-mono text-xs text-ink-faint">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleMagicLink} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-persimmon px-4 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] hover:bg-persimmon-hover active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
      </form>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 pt-20">
      <h1 className="font-display text-3xl font-black text-ink">Sign in</h1>
      <p className="mt-2 text-center text-sm text-ink-muted">
        Join to share your projects, give feedback, and discover what others are building.
      </p>
      <Suspense
        fallback={
          <div className="mt-8 h-48 w-full animate-pulse rounded-xl bg-paper-bg-deep" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
