# Product Builders

A platform for builders in the Tech Immigrants ecosystem. Builders submit the
projects they are working on, the community supports them with votes and
comments, and selected projects demo live at **Tech Immigrants Demo Day** with
feedback from technical and business advisors.

**Live at:** [productbuilders.app](https://productbuilders.app)

## The v0.1 workflow

This release supports the real, end-to-end Demo Day workflow:

```
submit  →  admin review/approve  →  public project  →  vote/support  →  select for Demo Day  →  public Demo Day page
```

1. A builder **submits** a project. New submissions start as **pending review**
   and are only visible to the builder (and admins) until approved.
2. An **admin reviews** the queue and **approves** or **rejects** each project.
3. **Approved** projects appear publicly on the home feed and project pages.
4. The community **votes/supports** approved projects (one vote per user per
   project).
5. The admin **creates a Demo Day** and **selects approved projects** for the
   live line-up, with an optional running order.
6. Everyone sees **upcoming and past Demo Days** with the selected line-up.

There is also a legacy weekly "Friday showcase" flavor (countdown, leaderboard,
and an automated top-3 snapshot) that remains available but is secondary to the
curated Demo Day flow above.

## Demo mode (no setup required)

If Supabase env vars are missing or still placeholders, the app runs in a
read-only **demo mode** backed by sample data (`src/lib/mock-data.ts`). You can
browse the home feed, project pages, and an upcoming Demo Day with a sample
line-up without any database. A "Demo data" banner is shown, and write actions
(submit/vote) are disabled with a friendly message.

```bash
npm install
npm run dev   # open http://localhost:3000 — works immediately in demo mode
```

## Tech stack

- **Framework:** Next.js 16 (App Router, Server Components, Turbopack). Note:
  middleware is called **Proxy** (`src/proxy.ts`) in Next.js 16.
- **Database / Auth / Storage:** Supabase (Postgres, Row Level Security, Auth,
  Storage)
- **Styling:** Tailwind CSS v4
- **Deployment:** Vercel (with an optional weekly cron job)

## Local setup with Supabase

### Prerequisites

- Node.js 18+ (developed on Node 20+)
- A [Supabase](https://supabase.com) project

### 1. Install

```bash
git clone https://github.com/SaharPak/productbuilders-app.git
cd productbuilders-app
npm install
```

### 2. Apply the database schema

In the Supabase **SQL Editor**, run the migrations in order:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_demo_type_and_guided_fields.sql`
- `supabase/migrations/003_admin_read_all_products.sql`
- `supabase/migrations/004_review_workflow_and_demo_curation.sql`

Migration `004` adds the review workflow (`pending`/`rejected` statuses), the
`demo_day_projects` curation table, and closes two RLS privilege-escalation
holes (self-promotion to admin, and builders self-approving their own projects).

Optionally create a public **Storage bucket** named `product-images` (for
project screenshots) and enable **Google OAuth** under Authentication →
Providers.

### 3. Seed demo data (optional)

Run `supabase/seed.sql` in the SQL Editor. It is idempotent and creates a demo
admin account, sample projects (including a pending one), votes, an upcoming
Demo Day with a curated line-up, and a completed Demo Day with winners.

### 4. Configure environment

```bash
cp .env.example .env.local
```

Fill in from Supabase → Project Settings → API:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Cron + admin auto-promote. **Never expose to the browser.** |
| `CRON_SECRET` | server-only | Bearer token for the cron endpoint |
| `ADMIN_EMAILS` | optional | Comma-separated emails auto-promoted to admin on sign-in |
| `NEXT_PUBLIC_SITE_URL` | optional | Absolute links / OG metadata |

### 5. Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint + type-aware rules
```

## Admin setup

Admin authority lives in `profiles.is_admin` and is enforced by RLS. To make
someone an admin, use either:

- **Env allowlist (reproducible):** set `ADMIN_EMAILS=you@example.com` (and
  `SUPABASE_SERVICE_ROLE_KEY`). The user is promoted automatically when they
  sign in.
- **SQL:** `update public.profiles set is_admin = true where handle = 'yourhandle';`

The admin panel at `/admin` lets you review/approve/reject submissions, create
Demo Days, select approved projects for the line-up, mark projects as presented,
add recording URLs, and run the automatic top-3 snapshot. Non-admins are
redirected away, and the database triggers prevent privilege escalation even if
a request bypasses the UI.

## Deploy to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add the environment variables from `.env.example`.
3. Deploy. `vercel.json` configures an optional Friday cron job
   (`/api/cron/demo-day`) that snapshots the week's top 3 approved projects.

## Security notes

- The service role key and cron secret are server-only and never sent to the
  browser (only `NEXT_PUBLIC_*` values are).
- Public users can only read **approved** projects. Builders can read and edit
  their own (including pending) projects. Only admins can approve/reject/feature
  projects and manage Demo Days. See `MANUAL_TEST_PLAN.md` for the RLS checks.

## Known limitations

- Demo Day line-up ordering is set by add-order (no drag-to-reorder yet).
- Anonymous voting is not supported; voting requires sign-in.
- The legacy auto-snapshot and the manual curation flow coexist; the curated
  `demo_day_projects` line-up is the primary public surface.

## Roadmap

See `STABILIZATION_REPORT.md` for the recommended next tasks.

## License

Released under the [MIT License](LICENSE).
