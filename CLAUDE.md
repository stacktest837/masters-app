# CLAUDE.md — Masters Pool

## Project Overview
Masters Pool is a golf pick'em web app for friend groups to compete during the Masters Tournament. Each player picks 1 golfer from each of 4 tiers (plus a reserve from Tier 4), and the lowest combined strokes-to-par wins. Scores auto-update from ESPN's public golf API.

**Stack:** Next.js 14 (App Router) · Supabase (Postgres + Auth for admin) · Tailwind CSS · Vercel  
**Target:** Live for the 2026 Masters, April 9–12  
**Users:** Gary's friend group (~10-20 people), no accounts needed for participants  

## Directory Structure
```
masters-pool/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with fonts and metadata
│   │   ├── page.tsx                # Landing → redirects to /pick
│   │   ├── pick/page.tsx           # Pick sheet (public, no auth)
│   │   ├── leaderboard/page.tsx    # Live leaderboard (public)
│   │   ├── admin/page.tsx          # Admin panel (password-protected)
│   │   └── api/
│   │       ├── entries/route.ts    # CRUD for player entries
│   │       ├── scores/route.ts     # Manual score override
│   │       └── espn/route.ts       # ESPN score fetch + sync
│   ├── components/                 # Shared UI components
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client setup
│   │   ├── espn.ts                # ESPN API fetch + name matching
│   │   └── scoring.ts             # Team score calculation logic
│   └── types/
│       └── index.ts               # TypeScript types for all models
├── tests/
│   ├── unit/                      # Unit tests (scoring, name matching)
│   ├── integration/               # API route tests
│   └── fixtures/                  # Mock ESPN data, seed entries
├── docs/
│   └── supabase-schema.sql        # Database migration
├── scripts/
│   └── seed-golfers.ts            # Seed script for golfer tiers
├── public/                        # Static assets
├── .env.example
├── .gitignore
├── CLAUDE.md
├── PRD.md
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Session Protocol

### Starting a Session
1. Read this file completely
2. Check PRD.md for current phase and open items
3. Run `npm test` to verify baseline
4. Ask Gary what we're working on today

### During a Session
- Commit after each working feature with conventional commits: `feat:`, `fix:`, `refactor:`
- Run tests before and after major changes
- Keep Gary informed of trade-off decisions
- If blocked on a Supabase or API issue, suggest alternatives rather than stalling

### Ending a Session
1. Run `npm test` — all tests must pass
2. Update this CLAUDE.md with any new design decisions or gotchas
3. Update PRD.md phase status and TODO checkboxes
4. Commit with descriptive message
5. Summarize what was done and what's next

## Communication Preferences
- Gary is direct. Match his energy — be concise, not verbose
- Lead with what you did, then explain why if needed
- If something breaks, say so immediately with the fix plan
- Don't ask permission for obvious improvements — just do them and note it
- Gary has limited build time (evenings, weekends). Respect his bandwidth

## Coding Standards
- **TypeScript** everywhere, strict mode
- **Server Components** by default, `'use client'` only when needed
- **Tailwind** for styling — no CSS modules, no styled-components
- **API routes** for all data mutations — no direct Supabase calls from client components
- **Error handling:** try/catch on all async, user-facing error messages, console.error for debugging
- **Naming:** camelCase for functions/variables, PascalCase for components, kebab-case for files
- **No `any` types.** Define interfaces in `types/index.ts`

## Key Technical Decisions

### ESPN Integration
- ESPN public API: `site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard`
- No auth required, no API key
- Fuzzy name matching needed — ESPN names may differ from pool names (e.g. "Byeong Hun An" vs "Byeong-Hun An")
- Fetch via API route (server-side) to avoid CORS, cache for 5 minutes
- Store scores in Supabase so leaderboard loads from DB, not live ESPN on every page load
- Cron or manual trigger to sync scores during tournament

### Authentication
- Participants: NO auth. Just name + picks. Identified by first+last name (required).
- Admin: Simple password check (env var `ADMIN_PASSWORD`), not full Supabase auth
- Edit flow: Enter your name → if entry exists, load picks for editing → resubmit overwrites

### Scoring
- Lowest combined strokes-to-par across 4 picked golfers wins
- If a golfer misses the cut or withdraws (score = 999), reserve auto-swaps in
- Reserve only replaces ONE golfer — if two miss the cut, only one gets replaced
- Tiebreaker: closest guess to the winner's final score

### Data Model
- Golfers are seeded via script, not user-created
- Entries reference golfer IDs, not names (prevents name mismatch issues)
- Scores table: one row per golfer per tournament, updated by ESPN sync

## Design Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | No participant auth | Friend group, low stakes, reduces friction to zero |
| 2026-04-06 | ESPN public API over paid sports APIs | Free, no key needed, sufficient for this use case |
| 2026-04-06 | Server-side ESPN fetch | Avoids CORS, allows caching, keeps API logic controlled |
| 2026-04-06 | First+last name required | Multiple people with same first name in the group |

## Gotchas Log
| Issue | Context | Resolution |
|-------|---------|------------|
| ESPN name mismatches | ESPN may list "Byeong Hun An" without hyphen | Fuzzy matching: normalize to lowercase alpha, fall back to first 3 chars + last name |
| ESPN Masters event ID | Tournament may not appear on scoreboard endpoint until week-of | Check for event name containing "masters", show graceful message if not found |
| Artifact storage unreliable | Initial prototype used Claude artifact storage — picks didn't persist | Moving to Supabase for reliable persistence |

## Current TODOs
- [ ] Phase 1: Core scaffold, Supabase setup, golfer seed
- [ ] Phase 2: Pick sheet page, entry API
- [ ] Phase 3: ESPN integration, leaderboard
- [ ] Phase 4: Admin panel, lock picks, deploy
