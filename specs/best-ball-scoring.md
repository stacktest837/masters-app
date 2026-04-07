# Best Ball Scoring Overhaul

## Goal
Replace total-strokes scoring with true best-ball scoring using hole-by-hole ESPN data. Add a Scorecard tab with per-round grid and payout summary.

## Approach

### Data Source
ESPN scoreboard endpoint already returns hole-by-hole data:
`competitor.linescores[roundIndex].linescores[holeIndex]`
- `.value` — strokes (float)
- `.scoreType.displayValue` — "+1", "E", "-1" (score to par string)
- `.period` — hole number (1–18)

Par per hole = strokes - parsed(scoreType). No separate endpoint needed.

### New DB Table — `golfer_holes`
```sql
CREATE TABLE golfer_holes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  golfer_id    uuid NOT NULL REFERENCES golfers(id) ON DELETE CASCADE,
  round_number smallint NOT NULL CHECK (round_number BETWEEN 1 AND 4),
  hole_number  smallint NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  strokes      smallint,          -- null = not yet played
  score_to_par smallint,          -- null = not yet played
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (golfer_id, round_number, hole_number)
);
```

### Scoring Logic (new)

**Best ball round score:**
For each of 18 holes, take MIN(strokes) among the active golfer pool for that round.
Sum 18 minimums = team round score (in raw strokes — compare as score-to-par vs Augusta's par 72).

**Active golfer pool per round:**
- R1/R2: The 4 picked golfers. Golfers with no hole data for a given hole are excluded from that hole's min (mid-round / not yet played).
- R3/R4: Same 4 golfers. If 1+ are cut (status='cut'), ADD reserve to the pool. Reserve is always included once activated — no replacement, just an additional option.

**Reserve activation:** Any golfer with status='cut' or status='wd' triggers reserve inclusion for R3/R4.

**Daily winner:** Lowest best-ball round score for that day.

**Overall winner:** Lowest sum of 4 round best-ball scores.

**Tiebreaker (daily and overall):**
1. Lowest single best-ball round score across all 4 rounds of the tournament
2. Still tied → lowest individual golfer's single round score from that bettor's picks
3. Still tied → split pot

### Payout Calculation (display only)
Given N entries at $100 buy-in:
- Daily prize per round = $7.50 × N
- Overall prize = $100N − 4 × ($7.50 × N) = $70 × N

### Scorecard Tab
- Visibility: same as leaderboard (locked or preview param)
- Route: `/scorecard`
- Nav tab: between Leaderboard and Admin

**Grid layout:**
| Player | R1 | R2 | R3 | R4 | Total |
- Scores shown as score-to-par (E, -3, +1)
- Lowest score per round column highlighted gold (daily winner)
- Lowest total highlighted gold (overall winner)
- Tap row → expands to 18-hole breakdown per golfer per round, best-ball hole highlighted

**Payout card at top:** daily winner + amount per round, overall winner + amount.

---

## Files Changed

| File | Change |
|------|--------|
| `docs/migration-005-golfer-holes.sql` | New table |
| `src/types/index.ts` | Add `GolferHole` type |
| `src/lib/espn.ts` | Parse nested linescores → hole array |
| `src/app/api/espn/route.ts` | Upsert `golfer_holes` rows on sync |
| `src/lib/scoring.ts` | Rewrite: best-ball per hole, daily/overall winners, payouts |
| `src/app/leaderboard/page.tsx` | Fetch hole data, compute best-ball scores |
| `src/app/leaderboard/LeaderboardClient.tsx` | Update score display |
| `src/components/MyTeamTracker.tsx` | Show best-ball round scores |
| `src/components/NavTabs.tsx` | Add Scorecard tab |
| `src/app/scorecard/page.tsx` | New server page |
| `src/app/scorecard/ScorecardClient.tsx` | New client grid + expand |

---

## Open Questions (need Gary's answer before coding)

1. **Scorecard tab visibility:** Same lock/preview rule as leaderboard, or always visible to participants?

2. **Mid-round display:** If a round is in progress (some holes complete, some not), do we show the partial best-ball score through completed holes, or show "—" until the round is done?

3. **Tiebreaker clarification:** "Compare picked player with lowest round" — is this the individual golfer's raw round score (e.g., Rory shot 65 in R2), not the best-ball score?

4. **WD in R1/R2:** If a golfer withdraws mid-round (partial hole data), do we use whatever holes they completed, or treat them as absent for the whole round?

5. **Overall score on leaderboard:** The existing leaderboard shows a single "total" number. After this change, that total = sum of 4 best-ball round scores. Should we continue showing score-to-par (vs par 288 for 72×4), or raw strokes, or something else?
