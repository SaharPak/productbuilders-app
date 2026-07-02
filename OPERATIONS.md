# Operations Guide

## Weekly Cycle

The platform runs on a weekly cycle: **Saturday 00:00 → Friday 14:29** (Helsinki time).

- Builders submit products throughout the week
- The community votes and leaves feedback
- Every **Friday 14:30 – 15:30 Helsinki time**, top projects demo live on Google Meet

### Automated Cron

The cron path (`GET /api/cron/demo-day`) is a **Next.js Route Handler**. It is triggered by authenticated HTTP requests — there is no built-in scheduled event wired up today.

Recommended ways to invoke it on a schedule (in order of current practicality):

1. **Admin panel "Take snapshot now" button** — calls the route handler from the browser. No schedule, but it's the simplest "snap it now" path.
2. **Manual API call** with the cron bearer token:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://productbuilders.app/api/cron/demo-day
   ```
3. **External scheduler** (any HTTP cron service: cron-job.org, EasyCron, GitHub Actions cron, etc.) — point it at `https://productbuilders.app/api/cron/demo-day` with the bearer header.
4. **Supabase SQL** — see "Manual Trigger" below.

> **Why not Wrangler Cron Triggers?** `@opennextjs/cloudflare` 1.20.1 does **not** expose a `scheduled` handler that bridges to a Next.js Route Handler. The OpenNext Worker entry only implements `fetch`. A future adapter release (or a customization) can wire this up; see `docs/CLOUDFLARE_ADAPTER.md` for status.

### Manual Trigger

If the cron fails or you need to trigger it manually:

**Option A: Admin panel**
1. Go to `/admin` (requires admin role)
2. Click "Take snapshot now"

**Option B: API call**
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://productbuilders.app/api/cron/demo-day
```

**Option C: External scheduler**
Point any HTTP cron service at `https://productbuilders.app/api/cron/demo-day` with header `Authorization: Bearer <CRON_SECRET>`. Recommended schedule: `30 11 * * 5` UTC (Friday 11:30 UTC = 14:30 Helsinki winter; adjust for DST).

**Option D: Supabase SQL**
```sql
-- Insert demo day
INSERT INTO demo_days (week_of, demo_date, status)
VALUES (current_week(), now(), 'completed')
ON CONFLICT (week_of) DO UPDATE SET status = 'completed';

-- Insert winners manually
INSERT INTO demo_day_winners (week_of, rank, product_id, vote_count)
SELECT current_week(), row_number() OVER (ORDER BY vote_count DESC), id, vote_count
FROM product_with_counts
WHERE week_of = current_week()
LIMIT 3;
```

---

## Cloudflare setup

The platform runs on **Cloudflare Workers** via OpenNext (`@opennextjs/cloudflare`). It is **not** a Cloudflare Pages project — OpenNext for Cloudflare compiles the Next.js app into a single Worker entry (`main: .open-next/worker.js`) and uses an `assets` binding for static files.

### 1. OpenNext adapter

```bash
npm install --save-dev @opennextjs/cloudflare wrangler
```

### 2. `wrangler.jsonc` template

The repo ships `wrangler.jsonc` at the project root. Fill in the values before deploying:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "productbuilders-app",
  "compatibility_date": "2025-03-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "services": [
    {
      "binding": "WORKER_SELF_REFERENCE",
      "service": "productbuilders-app"
    }
  ],
  "vars": {
    "NEXT_PUBLIC_SUPABASE_URL": "",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "",
    "NEXT_PUBLIC_SITE_URL": "https://productbuilders.app"
  }
}
```

- `name` MUST match the Workers project name in the Cloudflare dashboard.
- `compatibility_date` should be set to a recent stable date. Update it when bumping the worker runtime.
- `vars` here are build-time *public* values. Anything sensitive (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) MUST be set via `wrangler secret put <NAME>` or in the Cloudflare dashboard.

### 3. `open-next.config.ts`

The repo ships a minimal `open-next.config.ts` at the root. It calls `defineCloudflareConfig({})` with no overrides — no R2-backed incremental cache, no queue bindings, no image optimizer. Add overrides later if those become hard requirements.

### 4. Build & preview

```bash
npm run build         # standard next build (good for local sanity and CI)
npm run cf:build      # OpenNext build → .open-next/worker.js
npm run preview       # OpenNext build + local preview server (wrangler)
npm run deploy        # OpenNext build + push to Cloudflare Workers
```

### 5. Local secrets

Copy `.dev.vars.example` to `.dev.vars` for local `wrangler dev` / `npm run preview`. `.dev.vars` is gitignored.

### 6. Environment variables (production)

Set in **Cloudflare dashboard → Workers → productbuilders-app → Settings → Variables** (per environment: Production and Preview):

| Variable | Visibility | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | injected at build time (also set as `vars` in wrangler.jsonc) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | injected at build time (also set as `vars` in wrangler.jsonc) |
| `NEXT_PUBLIC_SITE_URL` | Public | trusted redirect origin for `/auth/callback` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | only the cron handler reads it |
| `CRON_SECRET` | Secret | bearer token for `/api/cron/demo-day` |

Never commit any of these.

### 7. Verifying a deployment

- Open the Cloudflare Workers deployment URL.
- `View logs` → real-time Worker logs (auth callback, cron handler).
- `View build logs` → OpenNext build output.

### 8. Deploy blocker (Next 16 `proxy.ts`)

`npm run cf:build` currently fails with:

```
ERROR Node.js middleware is not currently supported. Consider switching to Edge Middleware.
```

This is an upstream OpenNext issue (opennextjs-cloudflare#1277) — the adapter does not yet recognize Next.js 16's `proxy.ts` convention (which this project uses). The fix (PR #1280) is open and not yet merged. Until it lands, `npm run cf:build` will not produce a Worker and `npm run deploy` will not succeed.

Workaround today: use `wrangler dev` with `next.config.ts`'s `initOpenNextCloudflareForDev()` to verify the adapter shape locally — but do not attempt a real deploy until upstream lands.

## Admin Access

To make a user an admin:

```sql
UPDATE profiles SET is_admin = true WHERE handle = '<your_handle>';
```

The admin panel at `/admin` allows:
- Hiding/showing/removing products
- Manually triggering demo day snapshots

## Rate Limits

- **Submissions:** Max 3 products per user per week (enforced by DB trigger)
- **Comments:** Max 500 characters per comment
- **Votes:** One per user per product (enforced by primary key)

## Storage

Product images are stored in the `product-images` Supabase Storage bucket.
- Max file size: 2MB (enforced client-side)
- Path format: `products/{user_id}/{timestamp}.{ext}`