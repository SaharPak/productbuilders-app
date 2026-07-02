# Product Builders

A friendly weekly product showcase for builders. Share what you are building, get real feedback from the community, and demo live every Friday.

**Live at:** [productbuilders.app](https://productbuilders.app)

## How it works

The platform runs on a weekly cycle (Helsinki time):

1. **Submit** any time during the week, whether it is a rough idea or a shipped product.
2. **Vote and comment** on what others are building.
3. **Demo live** every Friday on Google Meet, where top projects present to the community.

Builders choose one of two paths when they submit:

- **Showcase it live:** reserve a Friday slot, pick a demo language (English or Farsi), and get a built-in prep guide.
- **Share for feedback:** post the project and collect comments and encouragement, no live call required.

## Features

- Weekly browse feed with Hot and New sorting
- Leaderboard with a live countdown and a top-3 podium
- Demo day archive of past winners
- Guided, multi-step submission flow (problem, audience, stage, category, image)
- Demo prep guide with a 7-minute presentation structure
- Voting and threaded comments
- Magic-link and Google OAuth sign in, with new-user onboarding
- Public builder profiles and account settings
- Role-gated admin panel (hide, show, or remove products, and trigger demo-day snapshots)
- Automated Friday cron that snapshots the week's top 3

## Stack

- **Framework:** Next.js 16 (App Router, Server Components, Turbopack)
- **Database, Auth, Storage:** Supabase (Postgres, Row Level Security, Auth, Storage)
- **Styling:** Tailwind CSS v4
- **Fonts:** Fraunces (display), Manrope (body), JetBrains Mono (metadata)
- **Deployment:** Cloudflare (via OpenNext on Cloudflare Pages)

## Local setup

### Prerequisites

- Node.js 18 or newer
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/SaharPak/productbuilders-app.git
cd productbuilders-app
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_demo_type_and_guided_fields.sql`
   - `supabase/migrations/003_admin_read_all_products.sql`
3. Enable **Google OAuth** (optional) under Authentication, Providers, Google.
4. Create a public **Storage bucket** named `product-images`.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values from your Supabase project settings:

- `NEXT_PUBLIC_SUPABASE_URL`: your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: the service_role key (used by the cron job)
- `NEXT_PUBLIC_SITE_URL`: the canonical origin of the deployed app (e.g. `https://productbuilders.app`). Used by the auth callback to build the post-login redirect host. **Required in production.** The callback deliberately does not trust `x-forwarded-host`.
- `CRON_SECRET`: generate with `openssl rand -base64 32`

The service role key and cron secret are server-only. Never commit them or expose them to the browser.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> Tip: if Supabase env vars are not set, the app runs in a built-in mock-data mode so you can browse the UI without a database.

### 5. Seed data (optional)

After creating your first account, grab your user UUID from the Supabase Auth dashboard, then edit and run `supabase/seed.sql`.

## Scripts

- `npm run dev`: start the dev server
- `npm run build`: production build
- `npm run start`: serve the production build
- `npm run lint`: run ESLint

## Deploy to Cloudflare

The deployment target is **Cloudflare Workers** via OpenNext (`@opennextjs/cloudflare`). It is **not** a Cloudflare Pages project — OpenNext compiles the Next.js app into a single Worker entry.

> **Deploy blocker:** `@opennextjs/cloudflare` 1.20.1 does not yet support Next.js 16's `proxy.ts` convention (which this project uses). `npm run cf:build` fails with "Node.js middleware is not currently supported. Consider switching to Edge Middleware." until the upstream fix lands (opennextjs-cloudflare#1280). Track the PR or watch the repo. `wrangler.jsonc`, `open-next.config.ts`, and the deploy scripts are already in place so the deploy command will work as soon as upstream lands.

### 1. Install the OpenNext Cloudflare adapter

Already installed (devDependencies):

```bash
npm install --save-dev @opennextjs/cloudflare wrangler
```

### 2. `wrangler.jsonc`

A `wrangler.jsonc` template ships at the project root. Fill in:

- `name` — your Cloudflare Workers project name
- `compatibility_date` — a recent stable date
- `compatibility_flags` — `["nodejs_compat"]` (already set)
- `vars` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) — set via `wrangler secret put <NAME>` or in the Cloudflare dashboard, not in this file.

### 3. Build & deploy

```bash
npm run cf:build      # OpenNext build → .open-next/worker.js
npm run preview       # OpenNext build + local preview server (wrangler)
npm run deploy        # OpenNext build + push to Cloudflare Workers
```

### 4. Configure environment variables

In the Cloudflare dashboard for the Workers project, set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (e.g. `https://productbuilders.app`) — **required in production** so the auth callback can build a trusted post-login redirect host
- `SUPABASE_SERVICE_ROLE_KEY` (used by `/api/cron/demo-day`)
- `CRON_SECRET` (used by `/api/cron/demo-day`)

See `OPERATIONS.md` for the exact locations and for the cron-trigger guidance (HTTP-only today; no `scheduled` export wired up).

## Project structure

```
src/
├── app/
│   ├── (auth)/login/    # Magic link + Google OAuth
│   ├── admin/           # Admin panel (role-gated)
│   ├── api/cron/        # Demo day cron endpoint
│   ├── auth/callback/   # OAuth callback handler
│   ├── demo-days/       # Demo day archive
│   ├── leaderboard/     # Weekly leaderboard with podium
│   ├── onboarding/      # New user profile setup
│   ├── p/[id]/          # Product detail page
│   │   ├── edit/        # Edit a product
│   │   └── prep/        # Live demo prep guide
│   ├── settings/        # Profile settings
│   ├── submit/          # Guided submission flow
│   ├── u/[handle]/      # Public user profile
│   ├── layout.tsx       # Root layout with fonts + nav
│   └── page.tsx         # Home / browse page
├── components/          # Shared UI components
├── lib/
│   ├── supabase/        # Supabase clients (browser, server, session)
│   └── week.ts          # Weekly cycle date utilities
├── types/
│   └── database.ts      # TypeScript types for all tables
└── proxy.ts             # Request proxy (session refresh)
```

## License

Released under the [MIT License](LICENSE).
