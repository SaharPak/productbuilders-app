"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/settings");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setDisplayName(data.display_name ?? "");
        setHandle(data.handle ?? "");
        setBio(data.bio ?? "");
      }
    }
    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const cleanHandle = handle.replace(/^@/, "").toLowerCase().trim();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        handle: cleanHandle,
        bio: bio.trim() || null,
      })
      .eq("id", user.id);

    if (updateError) {
      if (
        updateError.message.includes("duplicate") ||
        updateError.message.includes("unique")
      ) {
        setError("That handle is already taken.");
      } else {
        setError(updateError.message);
      }
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }

    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-sm px-4 pt-24 pb-16 sm:px-6">
      <h1 className="font-display text-3xl font-black text-ink">Settings</h1>

      <form onSubmit={handleSave} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block font-mono text-xs text-ink-faint">
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
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
              required
              maxLength={30}
              className="w-full bg-transparent px-2 py-3 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block font-mono text-xs text-ink-faint">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="What are you building?"
            maxLength={200}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && (
          <p className="text-sm text-stage-launched">Profile updated.</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-persimmon px-4 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] hover:bg-persimmon-hover active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save changes"}
        </button>
      </form>

      <hr className="my-8 border-border" />

      <button
        onClick={handleSignOut}
        className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-ink-muted transition-all hover:border-red-300 hover:text-red-600"
      >
        Sign out
      </button>
    </div>
  );
}
