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
