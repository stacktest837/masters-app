# Masters Pool — Full Build Plan

**Goal:** Complete Phases 1–4: pick sheet, entry API, ESPN scoring, leaderboard, admin panel. Live by April 8.

## Approach

Build server-first: API routes → server page logic → client UI. All data mutations go through API routes using the service role key. Public reads use the anon client in server components.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout — header, cream bg, Georgia font |
| `src/app/page.tsx` | Redirect → /pick |
| `src/app/pick/page.tsx` | Server: fetch golfers + config |
| `src/app/pick/PickForm.tsx` | Client: tiered picks, name lookup, submit |
| `src/app/leaderboard/page.tsx` | Server: entries + scores → team scores → sorted table |
| `src/app/admin/page.tsx` | Client: password gate, lock toggle, ESPN sync, score override |
| `src/app/api/entries/route.ts` | GET (all/by name), POST (upsert), DELETE (admin), PATCH (lock toggle) |
| `src/app/api/scores/route.ts` | POST (override score, admin only) |
| `src/app/api/espn/route.ts` | GET (verify password), POST (ESPN sync, admin only) |

## Admin Auth Pattern

All admin API routes check `x-admin-password` header against `ADMIN_PASSWORD` env var. Admin page stores password in React state (not localStorage), validates via `GET /api/espn`.

## What Done Looks Like

- `npm run dev` loads /pick with 4 tiers and reserve selector
- Submit saves to Supabase, confirmation screen shows picks
- /leaderboard renders entries (null scores pre-tournament)
- /admin behind password: lock toggle, ESPN sync, score override, entry management
- `npm run seed` populates 88 golfers across 4 tiers

## Known Limitations

- Tiebreaker sort uses `Math.abs(tiebreaker)` not distance-from-winner. Fine pre-tournament; fix post-Sunday if needed.
- No cron — ESPN sync is manual-trigger from admin panel. Can add Vercel cron later.
