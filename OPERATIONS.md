# Operations Guide

## Weekly Cycle

The platform runs on a weekly cycle: **Saturday 00:00 → Friday 14:29** (Helsinki time).

- Builders submit products throughout the week
- The community votes and leaves feedback
- Every **Friday 14:30 – 15:30 Helsinki time**, top projects demo live on Google Meet

### Automated Cron

A Vercel Cron job runs every Friday at 11:30 UTC (14:30 EET/EEST):

- Endpoint: `GET /api/cron/demo-day`
- Authenticated via `CRON_SECRET` env var (Bearer token)
- What it does:
  1. Queries the top 3 products by votes for the current week
  2. Inserts rows into `demo_day_winners`
  3. Marks the `demo_days` row as `completed`

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

**Option C: Supabase SQL**
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
