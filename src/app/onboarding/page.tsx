"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanHandle = handle.replace(/^@/, "").toLowerCase().trim();

    if (!/^[a-z0-9_]{3,30}$/.test(cleanHandle)) {
      setError("Handle must be 3-30 characters, lowercase letters, numbers, or underscores.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), handle: cleanHandle })
      .eq("id", user.id);

    if (updateError) {
      if (updateError.message.includes("duplicate") || updateError.message.includes("unique")) {
        setError("That handle is already taken. Try another.");
      } else {
        setError(updateError.message);
      }
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 pt-20">
      <h1 className="font-display text-3xl font-black text-ink">
        Welcome, builder
      </h1>
      <p className="mt-2 text-center text-sm text-ink-muted">
        Set up your profile before you can submit or comment.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 w-full space-y-4">
        <div>
          <label className="mb-1 block font-mono text-xs text-ink-faint">
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Sahar"
            required
            maxLength={50}
            className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
          />
        </div>

        <div>
          <label className="mb-1 block font-mono text-xs text-ink-faint">
            Handle
          </label>
          <div className="flex items-center rounded-xl border border-border bg-card-bg transition-colors focus-within:border-persimmon">
            <span className="pl-4 text-sm text-ink-faint">@</span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="saharpk"
              required
              maxLength={30}
              className="w-full bg-transparent px-2 py-3 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            Your Telegram, X, or any handle you go by.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-persimmon px-4 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] hover:bg-persimmon-hover active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? "Saving..." : "Start building"}
        </button>
      </form>
    </div>
  );
}
