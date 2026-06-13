"use client";

import { useSyncExternalStore } from "react";
import { secondsUntilDemo, isDemoDay } from "@/lib/week";

function subscribeToClock(callback: () => void) {
  const interval = setInterval(callback, 1000);
  return () => clearInterval(interval);
}

export function DemoCountdownBanner() {
  const remaining = useSyncExternalStore(
    subscribeToClock,
    () => secondsUntilDemo(),
    () => 0
  );

  if (isDemoDay()) {
    return (
      <p className="mt-3 text-lg text-persimmon font-medium">
        Friday Showcase is happening now — join the Google Meet!
      </p>
    );
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);

  return (
    <p className="mt-3 text-lg text-ink-muted">
      {days > 0
        ? `${days} day${days !== 1 ? "s" : ""} and ${hours} hour${hours !== 1 ? "s" : ""} until Friday Showcase`
        : `${hours} hour${hours !== 1 ? "s" : ""} until Friday Showcase`}
    </p>
  );
}
