-- Align current_week() with the Sat–Fri submission cycle (matches src/lib/week.ts)

CREATE OR REPLACE FUNCTION public.current_week() RETURNS date AS $$
DECLARE
  helsinki_local timestamp;
  dow int;
  week_monday date;
BEGIN
  helsinki_local := (now() AT TIME ZONE 'Europe/Helsinki');
  dow := EXTRACT(DOW FROM helsinki_local)::int;
  week_monday := date_trunc('week', helsinki_local)::date;

  -- After Friday demo ends, or on weekends → next cycle (Saturday 00:00 onward)
  IF dow = 0 OR dow = 6 THEN
    week_monday := week_monday + 7;
  ELSIF dow = 5 AND (
    EXTRACT(HOUR FROM helsinki_local) > 15
    OR (EXTRACT(HOUR FROM helsinki_local) = 15 AND EXTRACT(MINUTE FROM helsinki_local) > 30)
  ) THEN
    week_monday := week_monday + 7;
  END IF;

  RETURN week_monday;
END;
$$ LANGUAGE plpgsql STABLE;
