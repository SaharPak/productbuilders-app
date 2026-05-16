# Product Builders

Weekly product showcase platform. Builders submit, the community votes, top 3 demo live every Friday.

**Live at:** [productbuilders.app](https://productbuilders.app)

## Stack

- **Framework:** Next.js 15 (App Router, Server Components)
- **Database + Auth + Storage:** Supabase (Postgres, RLS, Auth, Storage)
- **Styling:** Tailwind CSS v4
- **Fonts:** Fraunces (display), Manrope (body), JetBrains Mono (metadata)
- **Deployment:** Vercel

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/SaharPak/productbuilders-app.git
cd productbuilders-app
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration:

```bash
# Copy the contents of supabase/migrations/001_initial_schema.sql
# and paste it into the Supabase SQL Editor, then run it.
```

3. Enable **Google OAuth** (optional) in Authentication → Providers → Google
4. Create a **Storage bucket** called `product-images` (public)

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values from your Supabase project settings:
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (for cron job)
- `CRON_SECRET` — generate with `openssl rand -base64 32`

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Seed data (optional)

After creating your first account, grab your user UUID from Supabase Auth dashboard, then edit and run `supabase/seed.sql`.

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

The `vercel.json` configures a cron job that runs every Friday at 15:00 UTC (18:00 Helsinki) to snapshot demo day winners.

## Project Structure

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
│   ├── settings/        # Profile settings
│   ├── submit/          # Product submission form
│   ├── u/[handle]/      # Public user profile
│   ├── layout.tsx       # Root layout with fonts + nav
│   └── page.tsx         # Home / browse page
├── components/          # Shared UI components
├── lib/
│   ├── supabase/        # Supabase client (browser, server, middleware)
│   └── week.ts          # Weekly cycle date utilities
└── types/
    └── database.ts      # TypeScript types for all tables
```
