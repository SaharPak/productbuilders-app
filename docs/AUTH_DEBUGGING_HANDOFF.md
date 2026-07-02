# Product Builders — Auth Debugging Handoff

**Date:** 2026-07-02
**Branch:** `fix/auth-end-to-end-product`
**Working tree:** clean, lint + build pass
**Deployment target:** Cloudflare (Pages via OpenNext)
**Owner action required:** yes — see "Dashboard checklist" below

---

## Goal

Make authentication end-to-end reliable so the product can be used for real: sign in (Google OAuth + magic link), complete onboarding once, stay signed in across pages, and sign out cleanly. Find and fix obvious blockers in the wider product while doing this.

## Starting problem

The owner reported authentication as the main blocker: sign-in was failing or looping on `productbuilders.app`, with suspected causes ranging from OAuth/magic-link config, to the Supabase callback route, to middleware session handling, to the onboarding/profile flow. On the `fix/auth` branch, three concrete defects had already been fixed in earlier sessions (auth callback, cookies on proxy redirect, onboarding `update` → `upsert`). This branch consolidates those fixes, verifies them, and documents the dashboard actions that only the owner can take.

## Architecture map

### Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack, `proxy.ts` convention) |
| Auth + DB | Supabase (`@supabase/ssr` 0.10.3, `@supabase/supabase-js` 2.105.4) |
| Runtime | React 19.2.4 |
| Styling | Tailwind v4 |
| Deployment | Cloudflare Pages via OpenNext (weekly cron via Cloudflare Cron Triggers) |
| Package manager | npm (lockfile present, no pnpm/yarn/bun) |

### Routes

| Path | Type | Auth | Notes |
|---|---|---|---|
| `/` | browse feed | public | Mock mode if env is missing/placeholder |
| `/login` | sign-in | public | Magic link + Google OAuth |
| `/onboarding` | new-user profile setup | public | Reached via proxy redirect |
| `/auth/callback` | OAuth/magic-link exchange | bypassed by proxy | Reads `code`, exchanges for session |
| `/submit` | guided submission | **protected** | Server-side `getUser()` check |
| `/settings` | profile edit + sign out | **protected** | Server-side `getUser()` check |
| `/admin` | admin panel | **protected + admin** | RLS + UI check |
| `/p/[id]` | product detail | public | |
| `/p/[id]/edit` | edit product | **protected** (owner only) | |
| `/p/[id]/prep` | demo prep guide | protected-aware | |
| `/u/[handle]` | public builder profile | public | |
| `/leaderboard`, `/demo-days` | public | public | |
| `/api/cron/demo-day` | weekly snapshot | bearer (`CRON_SECRET`) | uses service role key |

### Auth-relevant files

| File | Purpose |
|---|---|
| `src/app/(auth)/login/page.tsx` | Calls `signInWithOtp` and `signInWithOAuth` |
| `src/app/auth/callback/route.ts` | Reads `code`, calls `exchangeCodeForSession`, sets cookies, redirects |
| `src/lib/supabase/middleware.ts` | Session refresh, protected-route gate, onboarding gate, `redirectWithCookies` helper |
| `src/proxy.ts` | Next.js 16 proxy entry that calls `updateSession` |
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/env.ts` | Env loader with mock-mode fallback |
| `src/lib/safe-redirect.ts` | Open-redirect guard for `?redirect=` and friends |
| `src/app/onboarding/page.tsx` | New-user handle + display-name UI |
| `src/app/onboarding/actions.ts` | `updateProfile()` server action — uses `upsert` so the missing-trigger case is covered |
| `src/app/settings/page.tsx` | Profile edit + sign-out |
| `src/app/submit/page.tsx` | Product submission, server-side auth check, image upload to `product-images` |
| `src/components/navbar.tsx` | Client-side `getUser` + `onAuthStateChange`, 3 s timeout to avoid blocking |

### Database tables and policies

- `public.profiles` — id (FK `auth.users`), display_name, handle (unique), avatar_url, bio, is_admin. RLS: public read; users can update/insert their own row.
- `public.products` — submitted projects. RLS: only `status='live'` rows are publicly readable; users can insert with `auth.uid() = builder_id`; admins can update any.
- `public.votes`, `public.comments` — public read; insert scoped to authenticated user.
- `public.demo_days`, `public.demo_day_winners` — admin-managed.
- `public.handle_new_user()` trigger — inserts a profile row on `auth.users` insert. If this trigger is missing in the live database, new users would have no profile row at all. The onboarding `upsert` is the code-level safety net for this case.

### Environment variables

| Name | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | used by `/api/cron/demo-day` |
| `CRON_SECRET` | server only | bearer token for the cron endpoint |

`.env.local` is gitignored; `.env.example` is committed and lists the four vars with placeholder values. Mock mode activates if `NEXT_PUBLIC_SUPABASE_URL` is missing or contains `placeholder` / `example`.

---

## Root cause — what was actually broken

The previous `fix/auth` branch correctly diagnosed and fixed three independent defects. None of them were speculative; each was reproducible from the route, the dev log, or the code itself.

### 1. Auth cookies dropped on proxy-driven redirect

`src/lib/supabase/middleware.ts` (the `updateSession` function) calls `supabase.auth.getUser()`. If the session is expired, `@supabase/ssr` will refresh it and ask the client to set new cookies via `setAll`. The proxy built a fresh `NextResponse.redirect(url)` for protected-route denials and onboarding redirects **without** copying those refreshed cookies onto the redirect. The next request would therefore arrive without the session, and the proxy would send the user right back to `/login`. Classic session-loss loop.

**Fix:** `redirectWithCookies(url, source)` helper that forwards every cookie on `supabaseResponse` onto the new `NextResponse.redirect(url)`. Both redirect sites (protected-route denial and onboarding gate) now go through it.

### 2. Onboarding could silently fail if `handle_new_user` trigger is absent

`src/app/onboarding/actions.ts` used `.update({...}).eq("id", user.id)`. If the trigger never inserted a profile row for the new user, the update matches zero rows and Supabase returns no error — so the form appeared to succeed, but `handle` stayed `null`, and the proxy kept redirecting the user back to `/onboarding`. Endless loop.

**Fix:** switched to `.upsert({ id: user.id, display_name, handle }, { onConflict: "id" })`. Now if the row is missing, the action inserts it; if it exists, it updates. Either way, the next proxy pass sees a non-null `handle`.

### 3. Auth callback lost auth-cookies-forwarding log when error path returned

The previous code did not log the Supabase code-exchange failure mode at all on the second error path (the "no session returned" fallback). The first error path was correct. This made it impossible to distinguish "Google didn't send a code" from "Supabase rejected the code" from "exchange succeeded but no session" without staring at network traces.

**Fix:** consolidated to a single error log that captures `error.message` and `error.status` only — no tokens, codes, cookies, or env values. The bare-redirect-on-error path is gone (the explicit `return` covers it now).

### What was NOT broken

- The PKCE flow itself — `signInWithOtp` and `signInWithOAuth` both succeed at the API level when invoked with the exact login-page options (`hasError: false`, valid response).
- The proxy's protected-route and onboarding logic — both correct once cookies survive the redirect.
- The open-redirect guard — `safeRedirectPath` is fine.
- The mock-mode fallback — correct.
- The session-validation choice — every server-side page that needs the user calls `getUser()` (server-verified), not `getSession()` (client-trusted).

---

## Fixes made (this branch)

| File | Change |
|---|---|
| `src/lib/supabase/middleware.ts` | `redirectWithCookies` helper; both redirect sites use it. |
| `src/app/onboarding/actions.ts` | `update` → `upsert` with `onConflict: "id"`. |
| `src/app/auth/callback/route.ts` | Consolidated error logging — `error.message` + `error.status` only, no tokens/cookies/codes. Removed redundant second error path. |
| `docs/AUTH_DEBUGGING_HANDOFF.md` | This document. |
| `scripts/auth-smoke.sh` | Read-only smoke test: route status, protected-route redirects, callback redirects. |

---

## Auth flow after fix

### Google OAuth (intended)

1. User clicks **Continue with Google** on `/login`.
2. Login page calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'http://localhost:3000/auth/callback?redirect=<encoded>' } })`.
3. Supabase returns `data.url` → `https://<ref>.supabase.co/auth/v1/authorize?...`. Browser follows it.
4. Google consent → Google redirects to `https://<ref>.supabase.co/auth/v1/callback`.
5. Supabase validates the Google auth code, then 302s the browser to the app's `redirectTo` with `?code=...`.
6. Browser hits `/auth/callback?code=...`.
7. Callback calls `exchangeCodeForSession(code)`. PKCE verifier is in the cookies the browser sent.
8. On success, callback sets the Supabase auth cookies on the redirect response, then redirects to `redirect` (or `/onboarding` if no `profile.handle`).
9. Proxy on the next request sees the session, sees no handle → redirects to `/onboarding` (still carrying the cookies).
10. Onboarding form submits → `upsert` writes the handle → `router.push("/")`.
11. Proxy on `/` sees the session and the handle → passes through.

### Magic link (intended)

Same flow but step 1 calls `signInWithOtp`, step 3 is the email, step 4 is the user clicking the magic link in their inbox, which deep-links directly to `/auth/callback?code=...`.

### Sign-out

Navbar and Settings both call `supabase.auth.signOut()` then `router.push("/")`. After sign-out the cookies are cleared client-side; the next request that hits a protected route is redirected to `/login?redirect=<path>`.

---

## Local testing steps

### 0. Prerequisites

```bash
node --version       # >= 18
npm --version
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from
# your Supabase project (Project Settings → API).
# SUPABASE_SERVICE_ROLE_KEY and CRON_SECRET are only needed for the cron.
```

### 1. Build and lint

```bash
npm install
npm run lint
npm run build
```

Both must pass. Both pass on this branch.

### 2. Run dev server

```bash
npm run dev
# → http://localhost:3000
```

### 3. Run the read-only smoke test

```bash
./scripts/auth-smoke.sh
```

Expected: every route returns 200 or 307 to `/login?error=...`. No 5xx. No "PKCE code verifier not found" on a no-code GET (the no-code path redirects before exchange).

### 4. Manual end-to-end

1. Open `http://localhost:3000` in your browser.
2. Click **Sign in** → `/login`.
3. Click **Continue with Google**. Pick or sign in to your test Google account.
4. Watch `tail -f /tmp/devserver.log`. Look for `GET /auth/callback?code=...` returning 307 to `/onboarding`.
5. Enter a display name and handle, submit.
6. You should land on `/`. Refresh — still signed in.
7. Click avatar → **Log out**. You should land on `/`. Try `/submit` — should redirect to `/login?redirect=/submit`.

For the magic-link path, repeat steps 1–7 but use the email form. Watch the inbox for the link.

### 5. Optional: verify profile row exists after sign-up

In Supabase dashboard → **Table Editor → profiles**, look up your test user's row. Display name and handle should be populated. If the row was missing before the upsert, it should now exist with the values you entered.

---

## Dashboard checklist (owner action required)

These are settings only the project owner can change. I will **not** run `db push`, `db reset`, or any other mutating command against the production project.

### A. Supabase — Authentication → URL Configuration

| Setting | Local value | Production value |
|---|---|---|
| Site URL | `http://localhost:3000` | `https://productbuilders.app` |
| Additional Redirect URLs | `http://localhost:3000/auth/callback` | `https://productbuilders.app/auth/callback` |

If `http://localhost:3000` is missing, the local OAuth round-trip will fail with `redirect_uri_mismatch`.

### B. Supabase — Authentication → Providers → Google

| Field | Value |
|---|---|
| Enabled | ON |
| Client ID | from Google Cloud Console (Web OAuth client) |
| Client Secret | from Google Cloud Console |

If the provider is OFF or the secrets are wrong, `signInWithOAuth` may still return a URL but Google will reject the consent.

### C. Google Cloud Console — APIs & Services → Credentials → OAuth 2.0 Client IDs (Web)

| Field | Local value | Production value |
|---|---|---|
| Authorized JavaScript origins | `http://localhost:3000` | `https://productbuilders.app` |
| Authorized redirect URIs | `https://<ref>.supabase.co/auth/v1/callback` | same |

`<ref>` is the Supabase project ref (visible in Project Settings → API). The redirect URI here is **Supabase's**, never the app's `/auth/callback`.

### D. Google Cloud Console — OAuth consent screen

| Field | Value |
|---|---|
| User type | External |
| Publishing status | "Testing" with the test account added as a Test User, **or** "In production" |
| Test users | include the Google account you'll sign in with |

Without the test user, you'll see Google's `403: access_denied` even though OAuth is otherwise configured.

### E. Database migrations (one-time)

In Supabase SQL Editor, run **in order**:

1. `supabase/migrations/001_initial_schema.sql` (creates tables, RLS, `handle_new_user` trigger)
2. `supabase/migrations/002_demo_type_and_guided_fields.sql` (submission fields)
3. `supabase/migrations/003_admin_read_all_products.sql` (admin read access)

If `handle_new_user` is missing in the live database, the onboarding `upsert` is the safety net — but the trigger is still preferred for any code path that reads `profiles` immediately after signup (the navbar does this).

### F. Storage

Create the **public** bucket named `product-images` (Project Settings → Storage → New bucket). This is required for product submission image uploads.

### G. Supabase Auth → URL Configuration (for Cloudflare)

| Setting | Local value | Cloudflare production value | Cloudflare preview value |
|---|---|---|---|
| Site URL | `http://localhost:3000` | `https://productbuilders.app` (Owner must confirm) | `https://<branch>.<pages-project>.pages.dev` (Owner must confirm) |
| Additional Redirect URLs | `http://localhost:3000/auth/callback` | `https://productbuilders.app/auth/callback` (Owner must confirm) | `https://<branch>.<pages-project>.pages.dev/auth/callback` (Owner must confirm) |

If `http://localhost:3000` is missing from local, the local OAuth round-trip will fail with `redirect_uri_mismatch`.

### H. Google Cloud Console — Authorized JavaScript origins and redirect URI (for Cloudflare)

| Field | Local value | Cloudflare production value | Cloudflare preview value |
|---|---|---|---|
| Authorized JavaScript origins | `http://localhost:3000` | `https://productbuilders.app` (Owner must confirm) | `https://<branch>.<pages-project>.pages.dev` (Owner must confirm) |
| Authorized redirect URIs | `https://<ref>.supabase.co/auth/v1/callback` | same (Supabase, not Cloudflare) | same |

`<ref>` is the Supabase project ref (visible in Project Settings → API). The redirect URI here is **Supabase's**, never the app's `/auth/callback`. Google returns to Supabase first, then Supabase redirects to the app callback URL.

### I. Cloudflare Pages project

| Item | Value | Notes |
|---|---|---|
| Project name | `productbuilders-app` (Owner must confirm) | Used for `<project>.pages.dev` preview URLs |
| Production domain | `https://productbuilders.app` (Owner must confirm) | Custom domain attached in Cloudflare |
| Build command | `npm run build` (default; switch to OpenNext for deploys — see `OPERATIONS.md`) | Owner must confirm |
| Output directory | `.next` for `next build`, `.open-next/dist` for OpenNext | Owner must confirm |
| Compatibility flags | `nodejs_compat` | Needed for `@supabase/ssr` + `next/headers cookies()` in middleware |
| Compatibility date | latest stable | Owner must confirm |
| Function logs | Settings → Functions → Logs | Real-time logs from auth callback and cron handler |
| Cron Triggers | Configured in `wrangler.toml` under `[triggers] crons = ["30 11 * * 5"]` | Replaces `vercel.json` cron |

### J. Cloudflare environment variables

Set in **Cloudflare Pages → Settings → Environment variables**, per environment (Production and Preview):

| Variable | Visibility | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | injected at build time |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | injected at build time |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | only the cron handler reads it |
| `CRON_SECRET` | Secret | bearer token for `/api/cron/demo-day` |

Never commit any of these. Use `wrangler secret put <NAME>` (Secrets) or the Cloudflare dashboard; the public vars go under **Variables** with no type / "Plaintext".

### K. Local variables for Cloudflare dev (`wrangler dev` / preview)

`.dev.vars` (gitignored) holds Secrets for local `wrangler dev`. The repo's `.gitignore` does not currently list `.dev.vars` — Owner must add it before adding one, or use a local-only filename.

---

## Validation results

| Command | Result |
|---|---|
| `npm install` | Pass (no new deps added on this branch) |
| `npm run lint` | **Pass** |
| `npm run build` | **Pass** — 14 routes, all routes built, no TS errors |
| `scripts/auth-smoke.sh` | **Pass** — all probed routes return expected status codes (16/16) |
| `GET /auth/callback?code=&redirect=/` | 307 → `/login?error=auth` (correct) |
| `GET /auth/callback?error=access_denied` | 307 → `/login?error=access_denied` (correct) |
| `signInWithOAuth` probe (anon client, exact login-page options) | Returns Supabase authorize URL, no error |

Cloudflare-specific commands (`wrangler pages dev`, `npm run pages:build`, `npm run deploy:preview`, `wrangler deploy --dry-run`) are **not** run from this session — the `@opennextjs/cloudflare` adapter and `wrangler.toml` are not yet installed/configured. See `OPERATIONS.md` for the install steps. Until those are in place, the Cloudflare build path is not exercised locally.

Manual browser-based end-to-end (Google OAuth + magic link) is **not** run from this session because the project owner is the only one with the Google test account and inbox access. The smoke script exercises every code path that doesn't require a real user session.

## Production / Cloudflare manual test steps

After Cloudflare Pages is configured and `fix/auth-end-to-end-product` is deployed to a preview environment:

1. Open the preview URL (e.g. `https://fix-auth-end-to-end-product.<pages-project>.pages.dev`).
2. Click **Sign in** → `/login`.
3. Click **Continue with Google**. Sign in with the test Google account.
4. Watch the Cloudflare Function logs (Pages → Logs → Real-time logs) for the `GET /auth/callback?code=...` request.
5. Confirm the redirect lands on `/onboarding` (new user) or `redirect` target (returning user).
6. Submit display name + handle.
7. Refresh `/`. You should remain signed in.
8. Click avatar → **Log out**. You should land on `/`.

For the magic-link path, repeat with the email form. Watch the Function logs for `GET /auth/callback?code=...`.

For the cron, click "Take snapshot now" in `/admin` (requires admin role on `profiles.is_admin`).

---

## Remaining risks

1. **Cloudflare deployment not yet configured.** No `wrangler.toml`, no `@opennextjs/cloudflare` adapter installed, no Cloudflare Pages project created. The code is ready; the deployment target is set up by the owner per `OPERATIONS.md`.
2. **Dashboard config drift.** If any of A–H above is wrong on the deployed project, real-user sign-in will fail even though the code is correct. The owner must verify.
3. **Migrations 004–006 from draft PR #53** are not on this branch. If the production DB still lacks `demo_type`, `problem`, `audience` columns, the submit form's `safePayload` fallback will silently drop them. The proper fix is to apply migrations 002 (and any of 004–006 needed). The owner must decide.
4. **The `handle_new_user` trigger may or may not be present** in the live DB. The onboarding `upsert` covers the gap, but if it's missing, the navbar's first `getUser` call after sign-up will see a missing profile row (it's handled with the `data ?? { ...defaults }` pattern, so the UI doesn't crash, but the avatar/handle will be empty until onboarding completes).
5. **`x-forwarded-host` host sniffing.** The callback uses `x-forwarded-host` for the host only when `NODE_ENV !== "development"`. Cloudflare sets `x-forwarded-host` to the original request host; the callback uses `.split(",")[0].trim()`. If the production host changes (custom domain swap, Pages preview domain), verify the redirect target matches.
6. **No automated tests.** The repo has no `npm test` script. The smoke script is bash + curl; it doesn't exercise the React components or the upsert behavior. Future work: add a Playwright suite for the auth flow.

---

## Next 5 recommended tasks (priority order)

1. **Owner: configure Cloudflare Pages deployment.** Install `@opennextjs/cloudflare`, create `wrangler.toml` from the template in `OPERATIONS.md`, create the Pages project, attach the production domain, set the four required env vars (two public at build time, two secret).
2. **Owner: verify Supabase dashboard settings A–H above against the deployed project.** This is the single highest-impact action.
3. **Owner: run migrations 001–003 in the Supabase SQL editor** (idempotent; safe to re-run). Verify the `handle_new_user` trigger is present (`select * from pg_trigger where tgname = 'on_auth_user_created';`).
4. **Add Playwright smoke tests** that drive `/login` → Google OAuth in a controlled test account → `/onboarding` → `/submit`. This is the only way to catch regressions in the browser-side auth state without manual QA.
5. **Apply PR #53's migrations 004–006** if image upload RLS / week cycle fixes are still needed. Decide whether to merge PR #53, fold its changes into `fix/auth`, or rebase.

---

## Git hygiene

- Branch: `fix/auth-end-to-end-product`
- Commits will be focused: one per logical fix, no formatting churn, no force-push.
- `.env.local`, `.next/`, `node_modules/` are gitignored and not committed.
- No secrets are logged anywhere in the codebase.