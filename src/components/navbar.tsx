"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DemoCountdownPill } from "./demo-countdown-pill";
import type { Profile } from "@/types/database";

export function Navbar() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        setUser(data);
      }
      setLoading(false);
    }
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setUser(data);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-paper-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-lg font-bold text-ink"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-persimmon text-sm text-white">
              PB
            </span>
            <span className="hidden sm:inline">productbuilders</span>
          </Link>
          <DemoCountdownPill />
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/leaderboard"
            className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Favorites
          </Link>
          <Link
            href="/demo-days"
            className="hidden text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:inline"
          >
            Archive
          </Link>

          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-full bg-paper-bg-deep" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/submit"
                className="rounded-full bg-persimmon px-4 py-1.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-persimmon-hover active:scale-[0.98]"
              >
                Share
              </Link>
              <Link
                href={user.handle ? `/u/${user.handle}` : "/settings"}
                aria-label={
                  user.handle ? `View @${user.handle} profile` : "Open profile settings"
                }
                className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-bg-deep text-xs font-semibold text-ink-muted transition-colors hover:bg-border-strong"
              >
                {user.display_name?.charAt(0).toUpperCase() ?? "?"}
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-persimmon px-4 py-1.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-persimmon-hover active:scale-[0.98]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
