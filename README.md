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
- **Deployment:** Cloudflare Pages (with a scheduled Worker for the weekly demo-day snapshot)

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
3. Under **Authentication → URL Configuration**, set:
   - **Site URL:** your production URL (e.g. `https://productbuilders.app`)
   - **Redirect URLs:** `https://productbuilders.app/auth/callback`, `http://localhost:3000/auth/callback` (add your `*.pages.dev` preview URL if needed)
4. Enable **Google OAuth** (optional) under Authentication, Providers, Google.
5. Create a public **Storage bucket** named `product-images`, then add upload/read policies in the SQL Editor:
   ```sql
   CREATE POLICY "Users upload own images"
   ON storage.objects FOR INSERT TO authenticated
   WITH CHECK (
     bucket_id = 'product-images'
     AND (storage.foldername(name))[1] = 'products'
   );

   CREATE POLICY "Public read product images"
   ON storage.objects FOR SELECT TO public
   USING (bucket_id = 'product-images');
   ```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values from your Supabase project settings:

- `NEXT_PUBLIC_SUPABASE_URL`: your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: the service_role key (used by the cron job)
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

## Deploy to Cloudflare Pages

1. Push to GitHub.
2. In [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → connect this repo.
3. Use these build settings:
   - **Framework preset:** Next.js (or your OpenNext setup if you use that adapter)
   - **Build command:** `npm run build`
   - **Build output:** follow Cloudflare’s Next.js guidance for your chosen adapter (often `.open-next/` when using OpenNext)
4. Add the environment variables from `.env.example` under **Settings → Environment variables** (Production and Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
5. Deploy and confirm auth redirects work against your Cloudflare URL (custom domain or `*.pages.dev`).

### Friday demo-day cron (required on Cloudflare)

Cloudflare Pages does **not** read `vercel.json`. Schedule something to call the snapshot endpoint every **Friday at 11:30 UTC** (14:30 Helsinki):

```
GET https://productbuilders.app/api/cron/demo-day
Authorization: Bearer YOUR_CRON_SECRET
```

Recommended: a **Cloudflare Cron Trigger** on a small Worker (see [OPERATIONS.md](./OPERATIONS.md)). Alternatives: the admin panel (“Take snapshot now”), an external cron service, or manual `curl`.

> **Vercel alternative:** `vercel.json` in this repo configures the same cron for Vercel deployments only. If you deploy there instead, set the same env vars in Vercel and skip the Worker setup.

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
