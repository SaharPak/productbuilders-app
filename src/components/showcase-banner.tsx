"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  secondsUntilDemo,
  isDemoDay,
  demoTimezones,
  nextDemoLabel,
} from "@/lib/week";

export function ShowcaseBanner() {
  const [remaining, setRemaining] = useState(secondsUntilDemo());

  useEffect(() => {
    const interval = setInterval(() => setRemaining(secondsUntilDemo()), 1000);
    return () => clearInterval(interval);
  }, []);

  const live = isDemoDay();
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const timezones = demoTimezones();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card-bg">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border bg-ink px-5 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          {live ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-persimmon opacity-75" />
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-persimmon" />
            </span>
          ) : (
            <span className="text-base">🎤</span>
          )}
          <span className="font-display text-sm font-bold text-paper-bg sm:text-base">
            {live ? "Live Showcase — happening now!" : "Next Friday Showcase"}
          </span>
        </div>
        {!live && (
          <span className="shrink-0 rounded-full bg-paper-bg/10 px-3 py-1 font-mono text-xs text-paper-bg/70">
            {days > 0
              ? `${days}d ${hours}h`
              : hours > 0
                ? `${hours}h ${mins}m`
                : `${mins}m`}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 sm:px-6">
        <p className="font-display text-xl font-bold text-ink sm:text-2xl">
          {live ? "Join the Google Meet now" : nextDemoLabel()}
        </p>

        {/* Timezone grid */}
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
          {timezones.map((t) => (
            <div key={t.tz} className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-ink-faint">{t.tz}</span>
              <span className="font-mono text-xs font-medium text-ink-muted">
                {t.time}
              </span>
            </div>
          ))}
        </div>

        {/* Two paths */}
        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-paper-bg-deep px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <span>🎤</span>
            <span>Demo live on the call</span>
          </div>
          <span className="hidden text-ink-faint sm:inline">or</span>
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <span>💬</span>
            <span>Just share for async feedback</span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Every Friday we hop on a casual Google Meet. Builders demo what
          they&apos;re working on, and everyone shares feedback. Not ready to
          present? No problem — post your project and get comments from the
          community at your own pace.
        </p>

        <div className="mt-4">
          <Link
            href="/submit"
            className="inline-flex rounded-full bg-persimmon px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-persimmon-hover active:scale-[0.98]"
          >
            Submit your project
          </Link>
        </div>
      </div>
    </div>
  );
}
