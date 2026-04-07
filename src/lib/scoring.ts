// ── Types ─────────────────────────────────────────────────────────────────────

export interface GolferHoleData {
  golferId: string;
  round: number;
  hole: number;
  strokes: number;
  scoreToPar: number;
}

export interface BestBallHole {
  hole: number;
  bestStrokes: number;
  bestScoreToPar: number;
  winnerGolferIds: string[]; // golfer(s) whose score was selected
}

export interface BestBallRound {
  round: number;
  scoreToPar: number | null; // null = no holes played yet
  strokes: number | null;
  holesComplete: number; // 0-18
  holes: BestBallHole[];
  reserveIncluded: boolean;
}

export interface BestBallTeamResult {
  rounds: BestBallRound[];
  total: number | null;        // best-ball total score-to-par across all rounds
  totalStrokes: number | null; // best-ball total raw strokes across all rounds
  reserveUsed: boolean;
}

export interface DailyWinner {
  playerName: string;
  entryId: string;
  dailyScore: number; // score-to-par
  tiebreakWin: boolean;
}

// ── Core best-ball computation ────────────────────────────────────────────────

/**
 * Compute best-ball score for one round.
 * For each hole: take the lowest score among the active golfer pool.
 * Reserve included in R3/R4 only when 1+ picks are cut/wd.
 */
export function computeBestBallRound(
  pickIds: string[],
  reserveId: string,
  roundNumber: number,
  holeData: GolferHoleData[],
  statusMap: Map<string, string>
): BestBallRound {
  // Determine active pool for this round
  const anyPickCut = pickIds.some((id) => {
    const s = statusMap.get(id);
    return s === 'cut' || s === 'wd';
  });
  const reserveIncluded = roundNumber >= 3 && anyPickCut;
  const activePool = reserveIncluded ? [...pickIds, reserveId] : pickIds;

  // Filter hole data to this round + active pool
  const roundHoles = holeData.filter(
    (h) => h.round === roundNumber && activePool.includes(h.golferId)
  );

  const holes: BestBallHole[] = [];
  let totalScoreToPar = 0;
  let totalStrokes = 0;

  for (let holeNum = 1; holeNum <= 18; holeNum++) {
    const holeScores = roundHoles.filter((h) => h.hole === holeNum);
    if (holeScores.length === 0) continue; // not yet played

    const minStp = Math.min(...holeScores.map((h) => h.scoreToPar));
    const minStrokes = Math.min(...holeScores.map((h) => h.strokes));
    const winners = holeScores.filter((h) => h.scoreToPar === minStp).map((h) => h.golferId);

    holes.push({ hole: holeNum, bestStrokes: minStrokes, bestScoreToPar: minStp, winnerGolferIds: winners });
    totalScoreToPar += minStp;
    totalStrokes += minStrokes;
  }

  return {
    round: roundNumber,
    scoreToPar: holes.length > 0 ? totalScoreToPar : null,
    strokes: holes.length > 0 ? totalStrokes : null,
    holesComplete: holes.length,
    holes,
    reserveIncluded,
  };
}

/**
 * Compute best-ball scores for all 4 rounds for a team.
 */
export function computeBestBallTeam(
  pickIds: string[],
  reserveId: string,
  holeData: GolferHoleData[],
  statusMap: Map<string, string>
): BestBallTeamResult {
  const rounds = ([1, 2, 3, 4] as const).map((r) =>
    computeBestBallRound(pickIds, reserveId, r, holeData, statusMap)
  );

  const playedRounds = rounds.filter((r) => r.scoreToPar !== null);
  const total = playedRounds.length > 0
    ? playedRounds.reduce((sum, r) => sum + (r.scoreToPar ?? 0), 0)
    : null;
  const totalStrokes = playedRounds.length > 0
    ? playedRounds.reduce((sum, r) => sum + (r.strokes ?? 0), 0)
    : null;
  const reserveUsed = rounds.some((r) => r.reserveIncluded);

  return { rounds, total, totalStrokes, reserveUsed };
}

// ── Daily winners ─────────────────────────────────────────────────────────────

/**
 * Compute the daily best-ball winner for each of the 4 rounds.
 * Tiebreaker 1: lowest single best-ball round score anywhere in the tournament.
 * Tiebreaker 2: lowest individual golfer round score (sum of strokes from hole data).
 */
export function computeDailyWinners(
  entries: { id: string; player_name: string; pickIds: string[]; reserveId: string }[],
  holeData: GolferHoleData[],
  statusMap: Map<string, string>
): (DailyWinner | null)[] {
  return ([1, 2, 3, 4] as const).map((roundNum) => {
    const roundHoles = holeData.filter((h) => h.round === roundNum);
    if (roundHoles.length === 0) return null;

    const daily = entries.map((e) => {
      const round = computeBestBallRound(e.pickIds, e.reserveId, roundNum, holeData, statusMap);
      return { id: e.id, playerName: e.player_name, score: round.scoreToPar };
    });

    const valid = daily.filter((e) => e.score !== null) as {
      id: string; playerName: string; score: number;
    }[];
    if (valid.length === 0) return null;

    const minScore = Math.min(...valid.map((e) => e.score));
    const tied = valid.filter((e) => e.score === minScore);

    if (tied.length === 1) {
      return { playerName: tied[0].playerName, entryId: tied[0].id, dailyScore: minScore, tiebreakWin: false };
    }

    // Tiebreaker 1: lowest single best-ball round across ALL tournament rounds
    const tiedWithBestRound = tied.map((t) => {
      const entry = entries.find((e) => e.id === t.id)!;
      const allRounds = ([1, 2, 3, 4] as const).map((r) =>
        computeBestBallRound(entry.pickIds, entry.reserveId, r, holeData, statusMap)
      );
      const scores = allRounds.map((r) => r.scoreToPar).filter((s) => s !== null) as number[];
      const best = scores.length > 0 ? Math.min(...scores) : Infinity;
      return { ...t, bestRound: best };
    });

    const minBestRound = Math.min(...tiedWithBestRound.map((e) => e.bestRound));
    const afterTb1 = tiedWithBestRound.filter((e) => e.bestRound === minBestRound);

    if (afterTb1.length === 1) {
      return { playerName: afterTb1[0].playerName, entryId: afterTb1[0].id, dailyScore: minScore, tiebreakWin: true };
    }

    // Tiebreaker 2: lowest individual golfer round score (raw strokes per golfer per round)
    const tiedWithIndividual = afterTb1.map((t) => {
      const entry = entries.find((e) => e.id === t.id)!;
      const allIds = [...entry.pickIds, entry.reserveId];
      // Sum strokes per golfer per round from hole data
      const golferRoundTotals: number[] = [];
      for (const golferId of allIds) {
        for (const r of [1, 2, 3, 4] as const) {
          const gh = holeData.filter((h) => h.golferId === golferId && h.round === r);
          if (gh.length > 0) {
            golferRoundTotals.push(gh.reduce((sum, h) => sum + h.strokes, 0));
          }
        }
      }
      const best = golferRoundTotals.length > 0 ? Math.min(...golferRoundTotals) : Infinity;
      return { ...t, bestIndividual: best };
    });

    const minIndividual = Math.min(...tiedWithIndividual.map((e) => e.bestIndividual));
    const afterTb2 = tiedWithIndividual.filter((e) => e.bestIndividual === minIndividual);

    // Still tied = split pot; return first
    return { playerName: afterTb2[0].playerName, entryId: afterTb2[0].id, dailyScore: minScore, tiebreakWin: true };
  });
}

// ── Sort ──────────────────────────────────────────────────────────────────────

export function sortEntries<T extends { total: number | null }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.total === null && b.total === null) return 0;
    if (a.total === null) return 1;
    if (b.total === null) return -1;
    return a.total - b.total;
  });
}

// ── Payout calculation ────────────────────────────────────────────────────────

export interface PayoutSummary {
  entryCount: number;
  buyIn: number;           // $100
  dailyPrizePerRound: number;
  overallPrize: number;
}

export function computePayouts(entryCount: number): PayoutSummary {
  const buyIn = 100;
  const dailyPrizePerRound = Math.round(entryCount * 7.5 * 100) / 100;
  const overallPrize = Math.round((entryCount * buyIn - 4 * dailyPrizePerRound) * 100) / 100;
  return { entryCount, buyIn, dailyPrizePerRound, overallPrize };
}
