-- Product Builders — reproducible demo seed
--
-- Run this in the Supabase SQL Editor AFTER applying all migrations
-- (001 → 004). It is idempotent: re-running it will not create duplicates.
--
-- It creates one demo builder (a confirmed auth user + profile, marked admin),
-- a handful of products in different review states, votes, an upcoming demo day
-- with a curated line-up, and one completed demo day with winners.
--
-- The demo builder's email is demo-builder@productbuilders.local with password
-- "demo-password" (for local testing only — change or remove for production).

do $$
declare
  demo_uid uuid := '00000000-0000-0000-0000-0000000000aa';
  this_week date := public.current_week();
  next_friday date := (date_trunc('week', now() at time zone 'Europe/Helsinki')::date + 4);
  last_week date := public.current_week() - 7;
  p_cv uuid;
  p_standup uuid;
  p_trail uuid;
  p_inbox uuid;
begin
  -- 1) Demo auth user (skip if it already exists) -----------------------------
  if not exists (select 1 from auth.users where id = demo_uid) then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', demo_uid, 'authenticated', 'authenticated',
      'demo-builder@productbuilders.local',
      crypt('demo-password', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Builder"}',
      now(), now()
    );
  end if;

  -- The handle_new_user trigger creates the profile row. Ensure it exists, then
  -- finish setting it up as an admin demo account.
  insert into public.profiles (id, display_name, handle, bio, is_admin)
  values (demo_uid, 'Demo Builder', 'demobuilder', 'Seeded demo account.', true)
  on conflict (id) do update
    set display_name = excluded.display_name,
        handle = excluded.handle,
        bio = excluded.bio,
        is_admin = true;

  -- 2) Products ---------------------------------------------------------------
  delete from public.products where builder_id = demo_uid;

  insert into public.products (builder_id, name, tagline, description, problem, audience, url, category, stage, status, demo_type, demo_language, demo_week, week_of)
  values (demo_uid, 'CV Roast', 'AI-powered CV feedback that tells you what recruiters actually think.',
    'Upload your CV and get brutally honest, actionable feedback powered by AI.',
    'Most job seekers get zero feedback on their CV.',
    'Job seekers in tech.', 'https://example.com/cvroast', 'AI', 'building', 'live', 'live_demo', 'english', next_friday, this_week)
  returning id into p_cv;

  insert into public.products (builder_id, name, tagline, description, problem, audience, url, category, stage, status, demo_type, week_of)
  values (demo_uid, 'StandupSync', 'Async standups that actually save your team time.',
    'Replace the daily call with a 2-minute written update.',
    'Daily standup calls eat focus time.',
    'Remote engineering teams.', 'https://example.com/standupsync', 'Developer Tool', 'launched', 'live', 'feedback_only', this_week)
  returning id into p_standup;

  insert into public.products (builder_id, name, tagline, description, category, stage, status, demo_type, week_of)
  values (demo_uid, 'TrailLog', 'A simple, private journal for tracking your hikes and runs.',
    'Log routes, distance, and how you felt.', 'Mobile', 'idea', 'live', 'feedback_only', last_week)
  returning id into p_trail;

  -- A pending submission awaiting admin review (won't show publicly yet).
  insert into public.products (builder_id, name, tagline, description, category, stage, status, demo_type, week_of)
  values (demo_uid, 'InboxZeroBot', 'A Telegram bot that summarizes your unread newsletters.',
    'Forward newsletters, get a daily digest.', 'AI', 'building', 'pending', 'feedback_only', this_week)
  returning id into p_inbox;

  -- 3) Votes (self-vote from the demo account just to show counts) -------------
  insert into public.votes (user_id, product_id)
  values (demo_uid, p_cv), (demo_uid, p_standup), (demo_uid, p_trail)
  on conflict do nothing;

  -- 4) Upcoming demo day + curated line-up ------------------------------------
  insert into public.demo_days (week_of, demo_date, status, notes)
  values (this_week, (next_friday + time '14:30') at time zone 'Europe/Helsinki', 'upcoming', 'Tech Immigrants Demo Day. Live on Google Meet.')
  on conflict (week_of) do update set status = 'upcoming', notes = excluded.notes, demo_date = excluded.demo_date;

  delete from public.demo_day_projects where week_of = this_week;
  insert into public.demo_day_projects (week_of, product_id, display_order, status)
  values (this_week, p_cv, 0, 'selected'), (this_week, p_standup, 1, 'selected');

  -- 5) A completed demo day with winners --------------------------------------
  insert into public.demo_days (week_of, demo_date, status, notes)
  values (last_week, (last_week + 4 + time '14:30') at time zone 'Europe/Helsinki', 'completed', 'A great session with live demos.')
  on conflict (week_of) do update set status = 'completed';

  delete from public.demo_day_winners where week_of = last_week;
  insert into public.demo_day_winners (week_of, rank, product_id, vote_count)
  values (last_week, 1, p_trail, 22), (last_week, 2, p_standup, 17);
end $$;
