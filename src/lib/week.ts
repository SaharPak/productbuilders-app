import {
  startOfWeek,
  endOfWeek,
  nextFriday,
  isFriday,
  isAfter,
  format,
  differenceInSeconds,
} from "date-fns";
import { TZDate } from "@date-fns/tz";

const TZ = "Europe/Helsinki";

export function helsinkiNow(): Date {
  return new TZDate(new Date(), TZ);
}

export function currentWeekOf(): string {
  const now = helsinkiNow();
  const day = now.getDay();
  // Week runs Sat 00:00 – Fri 17:59.
  // Sat (6) and Sun (0) submissions belong to the following Monday.
  if (day === 6 || day === 0) {
    const mon = startOfWeek(now, { weekStartsOn: 1 });
    const nextMon = new Date(mon);
    nextMon.setDate(nextMon.getDate() + (day === 6 ? 2 : 1));
    return format(nextMon, "yyyy-MM-dd");
  }
  return format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function nextDemoDate(): Date {
  const now = helsinkiNow();
  if (isFriday(now) && now.getHours() < 18) {
    const today = new Date(now);
    today.setHours(18, 0, 0, 0);
    return today;
  }
  const fri = nextFriday(now);
  fri.setHours(18, 0, 0, 0);
  return fri;
}

export function secondsUntilDemo(): number {
  return Math.max(0, differenceInSeconds(nextDemoDate(), helsinkiNow()));
}

export function isDemoDay(): boolean {
  const now = helsinkiNow();
  return isFriday(now) && now.getHours() >= 18;
}
