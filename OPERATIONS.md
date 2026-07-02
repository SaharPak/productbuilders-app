# Operations Guide

## Weekly Cycle

The platform runs on a weekly cycle: **Saturday 00:00 → Friday 14:29** (Helsinki time).

- Builders submit products throughout the week
- The community votes and leaves feedback
- Every **Friday 14:30 – 15:30 Helsinki time**, top projects demo live on Google Meet

### Automated Cron (Cloudflare Cron Triggers)

The platform runs on **Cloudflare Pages** (via OpenNext). Cron jobs are configured via Cloudflare Cron Triggers in `wrangler.toml`:

```toml
[triggers]
crons = ["30 11 * * 5"]   # Every Friday 11:30 UTC (14:30 Helsinki)
```

The trigger calls the same handler that the old `vercel.json` cron did:

- Endpoint: `GET /api/cron/demo-day`
- Authenticated via `CRON_SECRET` env var (Bearer token)
- What it does:
  1. Queries the top 3 products by votes for the current week
  2. Inserts rows into `demo_day_winners`
  3. Marks the `demo_days` row as `completed`

> Legacy: the repo still contains `vercel.json` from an earlier Vercel deployment. It is harmless on Cloudflare (Cloudflare ignores it) and is kept as a historical reference. Delete it once you confirm Cloudflare Cron Triggers are working.

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

**Option C: Cloudflare dashboard**
1. Open the Pages project → **Settings → Functions → Cron Triggers**.
2. Click **Trigger** next to the demo-day entry.

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

### 1. OpenNext adapter

```bash
npm install --save-dev @opennextjs/cloudflare
```

### 2. `wrangler.toml` template

```toml
name = "productbuilders-app"
compatibility_date = "2025-01-01"   # Owner must confirm latest stable date
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".open-next/dist"

[vars]
# Public vars only. Secrets go under [[secrets]] or in the dashboard.
# Owner must confirm: NEXT_PUBLIC_SUPABASE_URL
# Owner must confirm: NEXT_PUBLIC_SUPABASE_ANON_KEY

# Secrets (set via `wrangler secret put <NAME>` or in the Cloudflare dashboard):
# SUPABASE_SERVICE_ROLE_KEY
# CRON_SECRET

[triggers]
crons = ["30 11 * * 5"]   # Friday 11:30 UTC = 14:30 Helsinki (winter). Adjust for DST if needed.
```

### 3. Build & preview

```bash
npm run build              # standard next build (good for local sanity)
npm run preview            # OpenNext build + local preview server
npm run deploy             # OpenNext build + push to Cloudflare Pages
```

If you add those scripts to `package.json`:

```json
"scripts": {
  "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
  "deploy":  "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
  "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
}
```

### 4. Environment variables

Set in **Cloudflare dashboard → Pages → productbuilders-app → Settings → Environment variables** (per environment: Production and Preview):

| Variable | Visibility | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | injected at build time |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | injected at build time |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | only the cron handler reads it |
| `CRON_SECRET` | Secret | bearer token for `/api/cron/demo-day` |

Never commit any of these.

### 5. Verifying a deployment

- Open the Cloudflare Pages deployment URL.
- `View logs` → real-time Function logs (auth callback, cron handler).
- `View build logs` → OpenNext build output.

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
