# PRD: Masters Pool

## Document Info
- **Author:** Gary Stack
- **Created:** 2026-04-06
- **Status:** Draft
- **Last Updated:** 2026-04-06

## Problem Statement
Running a golf pick'em pool with friends requires either paying for a service that limits entries (Easy Office Pools caps at 4 on the free tier), manually tracking picks in spreadsheets, or texting scores around all weekend. Gary wants a simple, free, shareable web app where friends pick golfers from tiered groups, scores auto-update from ESPN during the tournament, and everyone can check a live leaderboard.

## Target User
Gary's friend group (10-20 people) who follow golf casually. They need a frictionless experience: open a link, pick golfers, submit. No account creation, no app download. They'll check the leaderboard on their phones during the tournament.

## Success Metrics
- All friends submit picks before tournament starts (Thursday April 9, 8am ET)
- Leaderboard auto-updates during all 4 rounds without manual intervention
- Zero "how do I use this" questions from friends (UX is self-explanatory)
- App stays live and responsive through Sunday April 12

## Competitive Landscape
| Competitor | Strength | Gap |
|------------|----------|-----|
| Easy Office Pools | Polished UI, tiered pick'em format | Free tier caps at 4 entries |
| Masters Madness | Masters-specific, live scoring | Generic tiers, no customization |
| Group texts / spreadsheets | Free, simple | Manual scoring, no live updates, messy |

**Our gap:** Unlimited entries, custom tiers matching Gary's preferred format, auto-scoring, zero cost, fully owned.

## MVP Scope — What's In

### Feature 1: Pick Sheet
- **Description:** Public page where players select 1 golfer from each of 4 tiers, 1 reserve from Tier 4, enter tiebreaker guess, and submit with first+last name
- **User story:** As a player, I want to pick my golfers and submit my entry so I'm in the pool
- **Acceptance criteria:**
  - [ ] 4 tiers displayed with correct golfers from the Masters field
  - [ ] Radio-style selection: 1 pick per tier
  - [ ] Reserve selection from Tier 4 only, cannot be same as Tier 4 pick
  - [ ] First and last name required (validated: must contain a space)
  - [ ] Tiebreaker input (winning score, integer)
  - [ ] Submit saves to Supabase, shows confirmation screen with pick summary
  - [ ] If name already exists, loads existing picks for editing and updates on resubmit
  - [ ] Disabled/locked state when tournament has started
- **Priority:** Must-have

### Feature 2: Leaderboard
- **Description:** Public page showing all entries ranked by total strokes-to-par
- **User story:** As a player, I want to see how I'm doing compared to my friends during the tournament
- **Acceptance criteria:**
  - [ ] All entries displayed, sorted by combined score (lowest first)
  - [ ] Each entry shows: rank, player name, 4 golfers with individual scores, reserve, total score, tiebreaker
  - [ ] Missed cut golfers shown with strikethrough, reserve auto-swapped into total
  - [ ] Tiebreaker used to break ties (closest to winning score)
  - [ ] Live/Final/Pre-tournament status indicator
  - [ ] Last updated timestamp
  - [ ] Manual refresh button
- **Priority:** Must-have

### Feature 3: ESPN Auto-Scoring
- **Description:** Server-side job that fetches scores from ESPN's public golf API and syncs to Supabase
- **User story:** As the pool admin, I want scores to update automatically so I don't have to manually enter them
- **Acceptance criteria:**
  - [ ] API route fetches from ESPN scoreboard endpoint
  - [ ] Fuzzy name matching maps ESPN golfer names to pool golfer records
  - [ ] Handles missed cut (MC) and withdrawal (WD) statuses → score = 999
  - [ ] Scores cached in Supabase, not fetched from ESPN on every page load
  - [ ] Can be triggered manually from admin panel or via cron/interval
  - [ ] Graceful handling when Masters event not yet on ESPN
- **Priority:** Must-have

### Feature 4: Admin Panel
- **Description:** Password-protected page for Gary to manage the pool
- **User story:** As the admin, I want to lock picks, trigger score updates, override scores, and manage entries
- **Acceptance criteria:**
  - [ ] Password gate (env var, not Supabase auth)
  - [ ] Lock/unlock picks toggle (prevents new submissions and edits)
  - [ ] Manual ESPN score fetch trigger
  - [ ] Manual score override for individual golfers
  - [ ] View all entries with delete capability
  - [ ] Entry count displayed
- **Priority:** Must-have

### Feature 5: Golfer Seed Data
- **Description:** Script to populate Supabase with the Masters field organized into tiers
- **User story:** As the admin, I want the golfer list pre-loaded so I don't have to enter them manually
- **Acceptance criteria:**
  - [ ] Seed script loads all 88 golfers across 4 tiers
  - [ ] Each golfer has: name, tier number, display order
  - [ ] Idempotent — can run multiple times without duplicates
- **Priority:** Must-have

## MVP Scope — What's NOT In
- User accounts / authentication for participants
- Payment or entry fees
- Multiple pool support (this is one pool, one tournament)
- Chat or commenting
- Push notifications
- Historical data or past tournament tracking
- Mobile app (responsive web only)
- Custom tier configuration UI (tiers are seeded via script)
- Odds or world ranking display (keep it simple)

## Technical Approach
- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (Postgres), Vercel
- **Architecture:** Server components for pages, API routes for mutations, Supabase for persistence
- **Data sources:** ESPN public API (no auth), Supabase Postgres
- **Third-party dependencies:** @supabase/supabase-js, ESPN public API (no SDK)
- **Hosting:** Vercel (free tier sufficient)

## Phase Plan
| Phase | Description | Features | Status |
|-------|-------------|----------|--------|
| 1 | Foundation | Project scaffold, Supabase schema, golfer seed, types | Not Started |
| 2 | Pick Sheet | Pick page UI, entry API routes, edit flow | Not Started |
| 3 | Live Scoring | ESPN integration, leaderboard page, score sync | Not Started |
| 4 | Admin & Deploy | Admin panel, lock picks, Vercel deploy, share URL | Not Started |

**Timeline:** Phase 1-4 in one focused build session (3-4 hours). Must be live by Wednesday April 8 evening.

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ESPN API changes or blocks requests | Low | High | Manual score override in admin as fallback |
| ESPN name mismatches | Medium | Medium | Fuzzy matching with normalization + manual override |
| Masters not on ESPN scoreboard until Thursday | High | Low | Graceful "pre-tournament" state, scores sync once available |
| Friends can't figure out the UI | Low | Medium | Demo artifact already tested, clean mobile-first design |
| Supabase free tier limits | Very Low | Low | Tiny data set, well within free tier |

## Open Questions
- Should entries have a deadline or just use the lock mechanism? → Using lock (simpler)
- Do we need email collection? → No, just name. Keep it minimal.
- Should the leaderboard be the default landing page during the tournament? → TBD, decide during Phase 4
