# Manual Test Plan — Product Builders v0.1

Two run modes:

- **Demo mode:** no env vars (or placeholders). Read-only sample data. Good for
  verifying UI, empty/loading/error states, and graceful degradation.
- **Live mode:** real Supabase env vars in `.env.local` after applying
  migrations `001`–`004`. Required for the write flows (submit, vote, approve,
  Demo Day curation).

Legend: ✅ pass · ⬜ to verify

---

## A. Build & tooling

| # | Step | Expected |
| --- | --- | --- |
| A1 | `npm install` | Installs without errors |
| A2 | `npm run lint` | No errors |
| A3 | `npm run build` | Build succeeds, all routes compile |
| A4 | `npm run dev` | Dev server starts, home loads |

## 1. Homepage

| # | Step | Expected |
| --- | --- | --- |
| 1.1 | Open `/` | Hero, CTAs, and the project feed render |
| 1.2 | Demo mode | Approved sample projects show; pending one does **not** |
| 1.3 | No approved projects | Friendly empty state with a submit CTA |
| 1.4 | Toggle Hot/New | Sort order changes |

## 2. Browse projects

| # | Step | Expected |
| --- | --- | --- |
| 2.1 | View cards | Name, tagline, stage, category, vote button visible |
| 2.2 | Leaderboard `/leaderboard` | Top 3 podium + the rest, or empty state |

## 3. Project detail

| # | Step | Expected |
| --- | --- | --- |
| 3.1 | Open an approved project | Detail, problem/audience, comments, vote button |
| 3.2 | Open a non-existent id `/p/does-not-exist` | 404 (not a crash) |
| 3.3 | Owner opens own **pending** project | "Pending review" banner; no public vote button |

## 4. Signup / login

| # | Step | Expected |
| --- | --- | --- |
| 4.1 | `/login` | Magic link + Google options render |
| 4.2 | Send magic link | "Check your email" confirmation |
| 4.3 | First login without handle | Redirect to `/onboarding` |
| 4.4 | Provider error (`/login?error=auth`) | Friendly error message, no blank page |
| 4.5 | Demo mode protected route (`/submit`) | No infinite redirect; demo notice shown |

## 5. Submit project (live mode)

| # | Step | Expected |
| --- | --- | --- |
| 5.1 | Logged-out → `/submit` | Redirect to `/login?redirect=/submit` |
| 5.2 | Choose path → fill form → submit | Saved as **pending**; redirect to project (or prep) |
| 5.3 | After submit | Project visible to owner with pending banner; not on home feed |
| 5.4 | Demo mode `/submit` | "Demo mode" message instead of the form |

## 6. Submit validation

| # | Step | Expected |
| --- | --- | --- |
| 6.1 | Empty name/tagline | Submit disabled; required fields enforced |
| 6.2 | URL without scheme (`foo.com`) | Saved as `https://foo.com` |
| 6.3 | Image > 2 MB | "Image must be under 2 MB" error |

## 7. Public listing after approval

| # | Step | Expected |
| --- | --- | --- |
| 7.1 | Admin approves a pending project | Status → approved |
| 7.2 | Reload home | Approved project now appears publicly |
| 7.3 | Admin rejects a project | Owner sees "Not approved"; not public |

## 8. Voting / support

| # | Step | Expected |
| --- | --- | --- |
| 8.1 | Logged-in user votes | Count +1, heart filled |
| 8.2 | Remove vote | Count -1 (never below 0) |
| 8.3 | Logged-out votes | Redirect to login |

## 9. Duplicate vote

| # | Step | Expected |
| --- | --- | --- |
| 9.1 | Vote twice (same user/project) | Second insert blocked by PK; count stays correct |

## 10. Admin access

| # | Step | Expected |
| --- | --- | --- |
| 10.1 | Non-admin → `/admin` | Redirect to `/` |
| 10.2 | Logged-out → `/admin` | Redirect to login |
| 10.3 | Admin → `/admin` | Review queue + Demo Day tools load |

## 11. Approve / reject project

| # | Step | Expected |
| --- | --- | --- |
| 11.1 | Pending filter | Pending submissions listed with Approve/Reject |
| 11.2 | Approve | Moves to approved; appears publicly |
| 11.3 | Reject | Marked not approved |
| 11.4 | Hide / Remove approved | Status changes; removed from public feed |

## 12. Create / select Demo Day

| # | Step | Expected |
| --- | --- | --- |
| 12.1 | Create demo day (pick a date) | New upcoming Demo Day appears |
| 12.2 | Manage line-up → add approved project | Project added to the line-up |
| 12.3 | Remove from line-up | Project removed |
| 12.4 | Mark presented | Line-up status updates |
| 12.5 | Mark completed / upcoming | Demo Day status toggles |

## 13. Demo Day public page

| # | Step | Expected |
| --- | --- | --- |
| 13.1 | `/demo-days` with an upcoming day | "Upcoming" section + selected line-up |
| 13.2 | With a completed day | Archive entry (winners or line-up, recording link) |
| 13.3 | No demo days | Empty state with submit CTA |

## 14. Missing env vars

| # | Step | Expected |
| --- | --- | --- |
| 14.1 | Remove Supabase env | App boots in demo mode, no crash |
| 14.2 | "Demo data" banner | Visible on all pages |
| 14.3 | Proxy | No redirect loops on protected routes |

## 15. Database error

| # | Step | Expected |
| --- | --- | --- |
| 15.1 | Invalid Supabase URL/key | Pages render empty/error states, no white screen |
| 15.2 | Vote/comment fails | Error surfaced; count not corrupted |

## 16. Mobile layout

| # | Step | Expected |
| --- | --- | --- |
| 16.1 | Narrow viewport (375px) | Nav, cards, forms, admin, demo-days are usable |

## 17. Build verification

| # | Step | Expected |
| --- | --- | --- |
| 17.1 | `npm run build` | Succeeds with the changes |
| 17.2 | No server-only secret in client bundle | Service role key never referenced in `_next/static` |

## 18. RLS / security checks (live mode, SQL Editor)

| # | Step | Expected |
| --- | --- | --- |
| 18.1 | As a normal user, `update profiles set is_admin=true` on own row | `is_admin` stays false (trigger blocks it) |
| 18.2 | As a builder, `update products set status='live'` on own pending row | Status stays pending (trigger blocks it) |
| 18.3 | As a builder, set own product `status='removed'` | Allowed (withdraw) |
| 18.4 | Anonymous select on a pending product | Returns nothing (only approved are public) |
| 18.5 | Non-admin insert into `demo_day_projects` | Blocked by RLS |
