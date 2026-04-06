interface GolferScore {
  golferId: string;
  scoreToPar: number | null; // null = no score yet, 999 = MC/WD
}

interface TeamScoreInput {
  pickIds: string[]; // [tier1Id, tier2Id, tier3Id, tier4Id]
  reserveId: string;
  tiebreaker: number;
}

interface TeamScoreResult {
  total: number | null;
  reserveUsed: boolean;
  golferDetails: {
    golferId: string;
    score: number | null;
    replaced: boolean;
  }[];
}

export function calculateTeamScore(
  team: TeamScoreInput,
  scoreMap: Map<string, number> // golferId → scoreToPar (999 = MC)
): TeamScoreResult {
  let total = 0;
  let counted = 0;
  let reserveUsed = false;
  const golferDetails: TeamScoreResult['golferDetails'] = [];

  for (const golferId of team.pickIds) {
    const score = scoreMap.get(golferId) ?? null;

    if (score === null) {
      golferDetails.push({ golferId, score: null, replaced: false });
    } else if (score === 999) {
      // MC/WD — try reserve
      if (!reserveUsed) {
        const reserveScore = scoreMap.get(team.reserveId) ?? null;
        if (reserveScore !== null && reserveScore !== 999) {
          total += reserveScore;
          counted++;
          reserveUsed = true;
          golferDetails.push({ golferId, score: 999, replaced: true });
        } else {
          golferDetails.push({ golferId, score: 999, replaced: false });
        }
      } else {
        golferDetails.push({ golferId, score: 999, replaced: false });
      }
    } else {
      total += score;
      counted++;
      golferDetails.push({ golferId, score, replaced: false });
    }
  }

  return {
    total: counted === 0 ? null : total,
    reserveUsed,
    golferDetails,
  };
}

// ── Daily scoring ─────────────────────────────────────────────────────────────

export interface DailyWinner {
  playerName: string;
  entryId: string;
  dailyScore: number;
  tiebreakWin: boolean; // true if tiebreaker was needed to decide
}

/**
 * Compute daily team score for one round.
 * Uses the same reserve-substitution logic as overall scoring.
 * MC/WD golfers with no round score trigger the reserve (same as 999 overall).
 */
function calculateDailyTeamScore(
  pickIds: string[],
  reserveId: string,
  roundMap: Map<string, number | null>, // golfer_id → round N score (null = didn't play)
  statusMap: Map<string, string>
): { total: number | null; bestGolferScore: number | null } {
  // Build effective map: real round scores + 999 sentinel for MC/WD with no round score
  const effectiveMap = new Map<string, number>();
  const allIds = [...pickIds, reserveId];
  for (const id of allIds) {
    const roundScore = roundMap.get(id) ?? null;
    if (roundScore !== null) {
      effectiveMap.set(id, roundScore);
    } else {
      const status = statusMap.get(id);
      if (status === 'cut' || status === 'wd') {
        effectiveMap.set(id, 999); // triggers reserve substitution
      }
      // null + not MC = hasn't played yet, omit
    }
  }

  const result = calculateTeamScore({ pickIds, reserveId, tiebreaker: 0 }, effectiveMap);
  if (result.total === null) return { total: null, bestGolferScore: null };

  // Best individual golfer score (tiebreaker)
  let best: number | null = null;
  for (const detail of result.golferDetails) {
    if (!detail.replaced && detail.score !== null && detail.score !== 999) {
      if (best === null || detail.score < best) best = detail.score;
    }
  }
  if (result.reserveUsed) {
    const rs = effectiveMap.get(reserveId);
    if (rs !== undefined && rs !== 999 && (best === null || rs < best)) best = rs;
  }

  return { total: result.total, bestGolferScore: best };
}

/**
 * Compute the winner for each of the 4 rounds.
 * Returns an array of 4 elements (null = no data for that round yet).
 * Tiebreaker: lowest individual golfer round score that day.
 */
export function computeDailyWinners(
  entries: { id: string; player_name: string; pickIds: string[]; reserveId: string }[],
  roundScoreMaps: Map<string, number | null>[], // [r1Map, r2Map, r3Map, r4Map]
  statusMap: Map<string, string>
): (DailyWinner | null)[] {
  return roundScoreMaps.map((roundMap) => {
    // Round has no data yet
    if (Array.from(roundMap.values()).every((v) => v === null)) return null;

    const daily = entries.map((e) => {
      const { total, bestGolferScore } = calculateDailyTeamScore(
        e.pickIds, e.reserveId, roundMap, statusMap
      );
      return { id: e.id, playerName: e.player_name, total, best: bestGolferScore };
    });

    const valid = daily.filter((e) => e.total !== null) as {
      id: string; playerName: string; total: number; best: number | null;
    }[];
    if (valid.length === 0) return null;

    const minScore = Math.min(...valid.map((e) => e.total));
    const tied = valid.filter((e) => e.total === minScore);

    if (tied.length === 1) {
      return { playerName: tied[0].playerName, entryId: tied[0].id, dailyScore: minScore, tiebreakWin: false };
    }

    // Tiebreaker: lowest individual golfer score that round
    const minBest = Math.min(...tied.map((e) => e.best ?? Infinity));
    const afterTb = tied.filter((e) => (e.best ?? Infinity) === minBest);

    return {
      playerName: afterTb[0].playerName,
      entryId: afterTb[0].id,
      dailyScore: minScore,
      tiebreakWin: true,
    };
  });
}

export function sortEntries<T extends { total: number | null; tiebreaker: number }>(
  entries: T[]
): T[] {
  return [...entries].sort((a, b) => {
    if (a.total === null && b.total === null) return 0;
    if (a.total === null) return 1;
    if (b.total === null) return -1;
    if (a.total === b.total) return Math.abs(a.tiebreaker) - Math.abs(b.tiebreaker);
    return a.total - b.total;
  });
}
