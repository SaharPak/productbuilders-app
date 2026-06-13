import {
  startOfWeek,
  nextFriday,
  addWeeks,
  isFriday,
  format,
  differenceInSeconds,
} from "date-fns";
import { TZDate } from "@date-fns/tz";

const TZ = "Europe/Helsinki";
const DEMO_START_HOUR = 14;
const DEMO_START_MINUTE = 30;
const DEMO_END_HOUR = 15;
const DEMO_END_MINUTE = 30;

export function helsinkiNow(): Date {
  return new TZDate(new Date(), TZ);
}

/**
 * Returns the Monday date key for the active Helsinki submission week.
 * Weekend submissions roll into the upcoming week for the next Friday demo.
 */
export function currentWeekOf(): string {
  const now = helsinkiNow();
  return format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

/**
 * Returns the next Friday 18:00 Helsinki demo cutoff.
 * Before that hour on Friday, the current day is still the next demo.
 */
export function nextDemoDate(): Date {
  const now = helsinkiNow();
  if (isFriday(now) && now.getHours() < DEMO_END_HOUR) {
    const today = new Date(now);
    today.setHours(DEMO_START_HOUR, DEMO_START_MINUTE, 0, 0);
    return today;
  }
  const fri = nextFriday(now);
  fri.setHours(DEMO_START_HOUR, DEMO_START_MINUTE, 0, 0);
  return fri;
}

/** Returns the next N upcoming Friday demo dates (formatted as yyyy-MM-dd). */
export function upcomingDemoFridays(count = 4): { date: string; label: string }[] {
  const now = helsinkiNow();
  const fridays: { date: string; label: string }[] = [];
  let candidate = nextFriday(now);

  if (isFriday(now)) {
    const cutoff = new Date(now);
    cutoff.setHours(DEMO_START_HOUR, 0, 0, 0);
    if (now < cutoff) candidate = new Date(now);
  }

  for (let i = 0; i < count; i++) {
    const d = i === 0 ? candidate : addWeeks(candidate, i);
    fridays.push({
      date: format(d, "yyyy-MM-dd"),
      label: format(d, "EEEE, MMMM d"),
    });
  }
  return fridays;
}

/**
 * Returns the non-negative countdown from now to the next Helsinki demo cutoff.
 */
export function secondsUntilDemo(): number {
  return Math.max(0, differenceInSeconds(nextDemoDate(), helsinkiNow()));
}

export function isDemoDay(): boolean {
  const now = helsinkiNow();
  return (
    isFriday(now) &&
    now.getHours() >= DEMO_START_HOUR &&
    (now.getHours() < DEMO_END_HOUR ||
      (now.getHours() === DEMO_END_HOUR && now.getMinutes() <= DEMO_END_MINUTE))
  );
}

export function demoTimeString(): string {
  return "Friday 3:00 – 4:00 PM (Iran)";
}

export function demoTimezones(): { tz: string; time: string }[] {
  return [
    { tz: "Iran (IRST)", time: "3:00 – 4:00 PM" },
  ];
}

export function nextDemoLabel(): string {
  const demo = nextDemoDate();
  return format(demo, "EEEE, MMMM d");
}
