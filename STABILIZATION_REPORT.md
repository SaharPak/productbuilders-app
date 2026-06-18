# Stabilization Report — Product Builders v0.1

Branch: `stabilize-v0.1`

## Goal

Stabilize the app into a clean, reliable, end-to-end v0.1 that supports the real
Tech Immigrants Demo Day workflow:

```
submit → admin review/approve → public project → vote/support → select for Demo Day → public Demo Day page
```

## Current status: stable

- ✅ Installs (`npm install`)
- ✅ Runs locally (`npm run dev`)
- ✅ Build passes (`npm run build`, Next.js 16 / Turbopack)
- ✅ Lint passes (`npm run lint`)
- ✅ Demo mode verified by smoke-testing routes with placeholder env
- ✅ The full Demo Day workflow is implemented end-to-end

## What the app is

Next.js 16 (App Router, Server Components) + Supabase (Postgres, RLS, Auth,
Storage) + Tailwind v4. The repo already had a working weekly "Friday showcase"
with immediate publishing and an automated top-3 snapshot. This stabilization
adds the missing **review/approve gate** and **manual Demo Day curation** so the
requested workflow works, while keeping the existing weekly features.

## What worked before

- Next.js app structure, routing, fonts, styling
- Supabase browser/server/proxy clients, magic-link + Google OAuth, onboarding
- Submit form, project pages, voting, comments, profiles, settings
- Leaderboard, countdown, auto top-3 snapshot, cron endpoint
- A basic demo (mock) mode on a few pages

## What was broken or missing (and fixed)

### Workflow gaps (core ask)
- **No review/approve step.** Submissions published immediately. → Added
  `pending`/`rejected` statuses; new submissions default to **pending**; admin
  **Approve/Reject** in `/admin`; only approved projects are public.
- **No manual Demo Day selection.** Demo days were only auto top-3 snapshots. →
  Added `demo_day_projects` table + admin UI to **create a Demo Day and select
  approved projects** (with order, "mark presented", recording URL), and a
  rebuilt public `/demo-days` showing **upcoming line-ups + past archive**.
- **Builders could not see their own pending work.** → Product detail now lets
  owners/admins view non-public projects with a status banner; profile shows an
  "In review & not public" section; added an RLS policy so builders can read
  their own projects.

### Security (found during audit, fixed)
- **Privilege escalation: any user could self-promote to admin** via
  `update profiles set is_admin=true` (the update policy had no column guard). →
  Added a `protect_admin_flag` trigger; `is_admin` can only change via an
  existing admin or a privileged (service-role/SQL) connection.
- **Builders could self-approve** by setting their product `status='live'`. →
  Added a `protect_product_status` trigger; builders may only withdraw
  (`removed`); approve/feature is admin-only.
- Removed noisy per-request `console.log` in the proxy and verbose auth-callback
  logs that printed cookie/session details.

### Robustness / DX
- **Demo mode hardened:** richer mock data (approved + pending projects,
  upcoming/past Demo Days, curated line-up), a global "Demo data" banner, a
  demo-mode guard on `/submit`, and the proxy now skips auth entirely when env
  is missing (no redirect loops, no blank crashes).
- `.env.example` documents every variable with server-only warnings; added
  `ADMIN_EMAILS` and `NEXT_PUBLIC_SITE_URL`.
- Reproducible, idempotent `supabase/seed.sql` (demo admin, projects, votes,
  Demo Days, line-up, winners).
- `ADMIN_EMAILS` allowlist auto-promotes trusted emails to admin on sign-in
  (server-only, uses the service role key safely).

## Database / auth problems found

- RLS policies allowed two privilege escalations (fixed via triggers in
  migration `004`).
- Default `status='live'` meant no approval gate (changed to `pending`).
- Builders lacked a self-read policy once non-live statuses existed (added).
- Seed data was entirely commented out / not reproducible (rewritten).

## What still needs manual setup

To run with real data (not required for a demo — demo mode works with zero
setup):

1. Create a Supabase project.
2. Run migrations `001`–`004` in the SQL Editor.
3. (Optional) run `supabase/seed.sql`; (optional) create the `product-images`
   Storage bucket; (optional) enable Google OAuth.
4. Copy `.env.example` → `.env.local` and fill in the keys.
5. Make yourself admin via `ADMIN_EMAILS` or
   `update profiles set is_admin=true ...`.

## What is safe to demo publicly

- Demo mode (no secrets, no real personal data) is safe to show anywhere.
- In live mode, only approved projects are public; admin writes are protected by
  RLS **and** DB triggers; the service role key and cron secret are server-only.

## Known limitations

- Demo Day line-up order is add-order (no drag-to-reorder yet).
- Voting requires sign-in (no anonymous voting).
- Auto top-3 snapshot and manual curation coexist; the curated line-up is the
  primary public surface.
- `seed.sql` inserts an `auth.users` row directly (relies on pgcrypto, enabled
  by default on Supabase); it is a convenience for fresh projects, not tested
  against every Supabase version.

## Next 5 recommended tasks

1. **Drag-to-reorder** the Demo Day line-up and persist `display_order`.
2. **Email/notify builders** when their project is approved/rejected or selected
   for a Demo Day.
3. **"My projects" dashboard** consolidating a builder's submissions and statuses.
4. **Admin server actions + tests:** move admin writes to `"use server"` actions
   with `revalidatePath`, and add unit tests for status transitions + RLS.
5. **Playwright e2e** covering home, project detail, submit validation, demo-day
   page, and admin access protection.

## Verification log

- `npm install` — ok
- `npm run lint` — ok (no warnings)
- `npm run build` — ok (13 routes)
- Demo-mode smoke test (placeholder env): `/`, `/demo-days`, `/submit`,
  `/leaderboard`, `/p/p1`, `/p/p4` (pending banner), `/u/alexbuilds` all return
  200 with expected content and the Demo data banner.
