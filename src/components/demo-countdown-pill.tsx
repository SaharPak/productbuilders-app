"use client";

import { useEffect, useState } from "react";
import { secondsUntilDemo, isDemoDay } from "@/lib/week";

export function DemoCountdownPill() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(secondsUntilDemo());
    const interval = setInterval(() => {
      setRemaining(secondsUntilDemo());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (remaining === null) {
    return null;
  }

  if (isDemoDay()) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-persimmon px-3 py-1 text-xs font-semibold text-white">
        <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        Showcase is live!
      </span>
    );
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);

  let label: string;
  if (days > 0) {
    label = `Showcase in ${days}d ${hours}h`;
  } else if (hours > 0) {
    label = `Showcase in ${hours}h ${mins}m`;
  } else {
    label = `Showcase in ${mins}m`;
  }

  return (
    <span className="hidden items-center gap-1.5 rounded-full bg-persimmon-light px-3 py-1 text-xs font-semibold text-persimmon sm:inline-flex">
      🎤 {label}
    </span>
  );
}
