"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DemoCountdownPill } from "./demo-countdown-pill";
import type { Profile } from "@/types/database";

export function Navbar() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      try {
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
        const authPromise = supabase.auth.getUser().then((r) => r.data.user);
        const authUser = await Promise.race([authPromise, timeout]);
        if (authUser) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();
          setUser(
            data ?? {
              id: authUser.id,
              display_name: authUser.user_metadata?.full_name ?? "Builder",
              handle: null,
              avatar_url: authUser.user_metadata?.avatar_url ?? null,
              bio: null,
              is_admin: false,
              created_at: new Date().toISOString(),
            }
          );
        }
      } catch {
        // Auth check failed, treat as logged out
      }
      setLoading(false);
    }
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();
          setUser(
            data ?? {
              id: session.user.id,
              display_name: session.user.user_metadata?.full_name ?? "Builder",
              handle: null,
              avatar_url: session.user.user_metadata?.avatar_url ?? null,
              bio: null,
              is_admin: false,
              created_at: new Date().toISOString(),
            }
          );
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
    router.push("/");
  }

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

          {loading ? null : user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/submit"
                className="rounded-full bg-persimmon px-4 py-1.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-persimmon-hover active:scale-[0.98]"
              >
                Share
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Open account menu"
                  aria-expanded={menuOpen}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-bg-deep text-xs font-semibold text-ink-muted transition-colors hover:bg-border-strong"
                >
                  {user.display_name?.charAt(0).toUpperCase() ?? "?"}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-card-bg py-1 shadow-lg">
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-paper-bg-deep hover:text-ink"
                    >
                      Settings
                    </Link>
                    {user.is_admin && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-paper-bg-deep hover:text-ink"
                      >
                        Admin
                      </Link>
                    )}
                    <div className="my-1 h-px bg-border" />
                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 py-2 text-left text-sm text-red-500 transition-colors hover:bg-paper-bg-deep"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
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
