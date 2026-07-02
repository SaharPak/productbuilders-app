# Developer Handoff — Product Builders

Prepared for review and debugging. Read this before diving into the codebase.

---

## Project status

| Item | Value |
|---|---|
| **Current branch** | `fix/auth` |
| **Latest commit** | `917ba64` — tip of `fix/auth` (auth fixes + handoff in `888ceb3`) |
| **GitHub remote** | `https://github.com/SaharPak/productbuilders-app.git` |
| **Open PR (auth work)** | https://github.com/SaharPak/productbuilders-app/pull/54 |
| **Related draft PR** | https://github.com/SaharPak/productbuilders-app/pull/53 (broader Supabase/RLS fixes, not merged) |
| **Production URL** | https://productbuilders.app |
| **Local changes pushed?** | Yes — branch `fix/auth` pushed to `origin` (verify with `git status -sb`) |

---

## What changed recently

### On branch `fix/auth` (commit `8fa2829` and follow-ups)

- **Auth callback redirect fix** (`src/app/auth/callback/route.ts`): Production OAuth/magic-link callback no longer lets Cloudflare `x-forwarded-host` overwrite the onboarding redirect. New users should land on `/onboarding`, not skip it.
- **Open redirect protection** (`src/lib/safe-redirect.ts`): Login and callback only accept same-origin relative paths.
- **Onboarding enforcement in proxy** (`src/lib/supabase/middleware.ts`): Signed-in users without a profile handle are redirected to `/onboarding` on non-public routes.
- **Session validation** (several server pages): Replaced `getSession()` with `getUser()` so auth is verified server-side.
- **Centralized Supabase env** (`src/lib/supabase/env.ts`): Supports mock mode when env vars are absent (builds without secrets).

### Uncommitted-at-inspection fixes (saved in latest commit on this branch)

- **`redirectWithCookies` helper** in `src/lib/supabase/middleware.ts`: Forwards auth cookies set during `getUser()` when the proxy issues a redirect. Without this, session refresh cookies can be dropped on redirect and users may appear logged out.
- **Onboarding profile upsert** in `src/app/onboarding/actions.ts`: Changed from `.update()` to `.upsert()` so onboarding works even if the `handle_new_user` trigger did not create a profile row.
- **Callback error logging** in `src/app/auth/callback/route.ts`: Logs Supabase code-exchange failures with message and status before redirecting to `/login?error=auth`.

---

## Current problem / suspected issue

**Primary area of concern: authentication flow (sign-in, session persistence, onboarding).**

The owner has been stuck on auth for 2–3 weeks. Symptoms reported in recent debugging sessions:

1. **Sign-in appears to fail or loop** on production (Cloudflare behind proxy).
2. **New users may skip onboarding** or get stuck without a handle.
3. **Session may not persist** after proxy redirects (login → protected route, or home → onboarding redirect).

### Known root causes already addressed on `fix/auth`

| Issue | Location | Fix |
|---|---|---|
| `x-forwarded-host` overwrote onboarding redirect | `src/app/auth/callback/route.ts` | Build redirect from `redirectPath` + host separately |
| Auth cookies lost on proxy redirect | `src/lib/supabase/middleware.ts` | `redirectWithCookies()` |
| Profile row missing at onboarding | `src/app/onboarding/actions.ts` | `.upsert()` instead of `.update()` |
| Client-trusted session on server pages | Multiple `src/app/**/page.tsx` | `getUser()` instead of `getSession()` |

### Still unverified / may need production testing

- Google OAuth and magic-link flows end-to-end on **production** (not just localhost).
- Supabase Auth redirect URLs include `https://productbuilders.app/auth/callback` (and localhost for dev).
- Whether `handle_new_user` trigger in DB is present and firing (see migrations).
- Whether PR #53 migrations (004–006) are applied in production Supabase (storage RLS, additional RLS fixes, week cycle).

### Local checks run at handoff time

| Command | Result |
|---|---|
| `npm run lint` | **Passed** |
| `npm run build` | **Passed** |
| `npm test` | Not defined in `package.json` |
| `npm run typecheck` | Not defined; TypeScript runs as part of `npm run build` and passed |

No failing build or lint errors at handoff time.

---

## How to run locally

**Package manager:** npm (`package-lock.json` present)

```bash
git clone https://github.com/SaharPak/productbuilders-app.git
cd productbuilders-app
git checkout fix/auth
npm install
cp .env.example .env.local
# Fill in .env.local (see below)
npm run dev
```

Open http://localhost:3000

### Check commands

```bash
npm run lint
npm run build
```

### Required environment variables

Copy from `.env.example`. Do **not** commit `.env.local`.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron job only (`/api/cron/demo-day`) |
| `CRON_SECRET` | Bearer token for cron endpoint |

### Supabase setup (required for real auth)

Run migrations in order in Supabase SQL Editor:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_demo_type_and_guided_fields.sql`
3. `supabase/migrations/003_admin_read_all_products.sql`

Optional (from draft PR #53, may be needed for image upload / RLS):

4. `004_storage_product_images.sql`
5. `005_rls_fixes.sql`
6. `006_current_week_cycle.sql`

Also configure in Supabase dashboard:

- Authentication → URL Configuration → add redirect URL: `http://localhost:3000/auth/callback` and production callback URL.
- Google OAuth provider (if testing Google sign-in).
- Storage bucket `product-images` (public).

### Mock mode

If `NEXT_PUBLIC_SUPABASE_URL` is missing or contains `placeholder`/`example`, the app runs in mock mode (`src/lib/mock-data.ts`). **Auth will not work in mock mode** — use real Supabase env vars to test sign-in.

---

## Files worth reviewing first

### Auth / session

| File | Why |
|---|---|
| `src/app/auth/callback/route.ts` | OAuth + magic-link code exchange, cookie setting, redirect logic |
| `src/lib/supabase/middleware.ts` | Session refresh, protected routes, onboarding gate, cookie forwarding on redirect |
| `src/proxy.ts` | Next.js 16 proxy entry (replaces old `middleware.ts` convention) |
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/env.ts` | Env + mock mode |
| `src/lib/safe-redirect.ts` | Open redirect guard |
| `src/app/(auth)/login/page.tsx` | Magic link + Google OAuth initiation |
| `src/app/onboarding/page.tsx` | New user handle setup UI |
| `src/app/onboarding/actions.ts` | Server action for profile upsert |

### Database / RLS

| File | Why |
|---|---|
| `supabase/migrations/001_initial_schema.sql` | Profiles, `handle_new_user` trigger, RLS policies |
| `supabase/migrations/002_demo_type_and_guided_fields.sql` | Submission fields |
| `supabase/migrations/003_admin_read_all_products.sql` | Admin read access |

### Deployment

| File | Why |
|---|---|
| `wrangler.toml` (to be added by owner) | Cloudflare Pages / Workers config |
| `OPERATIONS.md` | Weekly cron + admin tasks (Cloudflare Cron Triggers) |
| `README.md` | Setup and project structure |

---

## Debugging notes

### Next.js 16 proxy convention

The project uses `src/proxy.ts` exporting `proxy()`, not `src/middleware.ts`. Session logic lives in `src/lib/supabase/middleware.ts` and is imported by the proxy.

### Supabase SSR cookie pattern

Two patterns are used intentionally:

1. **Proxy** (`updateSession`): mutates `supabaseResponse` via `setAll`, returns it or a redirect with cookies copied via `redirectWithCookies`.
2. **Auth callback route**: collects cookies in an array during `exchangeCodeForSession`, then sets them on the final `NextResponse.redirect`.

If auth "works once then fails", inspect whether cookies are present on redirect responses (DevTools → Network → Set-Cookie headers).

### Production proxy headers

On production, `x-forwarded-host` may be comma-separated. Callback uses `.split(",")[0].trim()`. Verify this matches the actual Cloudflare deployment host. Older commits in the project history mention a Vercel/Cloudflare migration — the current target is **Cloudflare** (via OpenNext).

### Profile creation

Schema defines `handle_new_user()` trigger on `auth.users` insert. If trigger is missing in the live DB, onboarding upsert is the fallback. Check Supabase Auth → Users and `public.profiles` for mismatches.

### PR #53 overlap

Draft PR #53 (`cursor/fix-supabase-bugs-44a5`) contains overlapping auth fixes plus DB migrations 004–006, week cycle fixes, submit flow, and cron changes. **Not merged into `main` or `fix/auth` at handoff time.** Review before merging either PR to avoid duplicate/conflicting changes.

### `.env.local` present locally

A local `.env.local` exists (gitignored). It was **not** committed. Developer must supply their own.

---

## Next recommended steps for developer

- [ ] Check out `fix/auth` and pull latest from `origin/fix/auth`
- [ ] Confirm `.env.local` with real Supabase credentials
- [ ] Run `npm install`, `npm run lint`, `npm run build`
- [ ] Test locally: Google sign-in, magic link, onboarding, then visit `/submit`
- [ ] Inspect Network tab: `/auth/callback` response must include `Set-Cookie` for Supabase auth tokens
- [ ] Verify Supabase redirect URLs and OAuth provider config match deployment domain
- [ ] Confirm DB migrations 001–003 applied; check if 004–006 from PR #53 are needed
- [ ] Verify `handle_new_user` trigger exists: new auth user should get a row in `public.profiles`
- [ ] Test on production/staging after merge: new user → `/onboarding` → home → protected routes
- [ ] Review PR #54 diff against `main`; decide whether to merge `fix/auth` or fold into PR #53
- [ ] If auth still fails, capture `[auth/callback]` server logs (code exchange error message + status)

---

## Git hygiene notes

**Intentionally not committed:**

- `.env.local` (secrets)
- `.next/` (build output)
- `node_modules/`
- `next-env.d.ts` (generated)

**Do not:** force-push, rebase shared branches, or delete files without owner approval.
