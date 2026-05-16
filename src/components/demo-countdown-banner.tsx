"use client";

import { useEffect, useState } from "react";
import { secondsUntilDemo, isDemoDay } from "@/lib/week";

export function DemoCountdownBanner() {
  const [remaining, setRemaining] = useState(secondsUntilDemo());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(secondsUntilDemo());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isDemoDay()) {
    return (
      <p className="mt-3 text-lg text-persimmon font-medium">
        Demo day is today — tune in at 18:00 Helsinki time
      </p>
    );
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);

  return (
    <p className="mt-3 text-lg text-ink-muted">
      {days > 0
        ? `${days} day${days !== 1 ? "s" : ""} and ${hours} hour${hours !== 1 ? "s" : ""} until demo day`
        : `${hours} hour${hours !== 1 ? "s" : ""} until demo day`}
    </p>
  );
}
