"use client";

import { useEffect, useState } from "react";
import { secondsUntilDemo, isDemoDay } from "@/lib/week";

export function DemoCountdownPill() {
  const [remaining, setRemaining] = useState(secondsUntilDemo());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(secondsUntilDemo());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isDemoDay()) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-persimmon-light px-3 py-1 font-mono text-xs text-persimmon">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-persimmon" />
        Demo day is live
      </span>
    );
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);

  let label: string;
  if (days > 0) {
    label = `${days}d ${hours}h to demo day`;
  } else if (hours > 0) {
    label = `${hours}h ${mins}m to demo day`;
  } else {
    label = `${mins}m to demo day`;
  }

  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1 font-mono text-xs text-ink-faint sm:inline-flex">
      <span className="h-1.5 w-1.5 rounded-full bg-stage-building" />
      {label}
    </span>
  );
}
