const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';

interface ESPNLinescoreHole {
  value?: string | number;
  displayValue?: string;
  period?: number;       // hole number (1-18)
  scoreType?: { displayValue?: string }; // "+1", "E", "-1"
}

interface ESPNLinescoreRound {
  value?: string | number;
  displayValue?: string;
  period?: number;       // round number (1-4)
  linescores?: ESPNLinescoreHole[];
}

interface ESPNCompetitor {
  athlete: { displayName: string; shortName?: string };
  score: string | { displayValue?: string; value?: string };
  status?: {
    type: { name: string };
    period?: number;       // current round (1-4)
    thru?: number | string; // holes played; 18 or "F" = round complete
  };
  linescores?: ESPNLinescoreRound[];
}

export interface ESPNHoleScore {
  round: number;
  hole: number;
  strokes: number;
  scoreToPar: number;
}

interface ESPNScoreResult {
  golferName: string;
  scoreToPar: number; // 999 = MC/WD
  status: 'active' | 'cut' | 'wd';
  todayScore: number | null;
  currentHole: number | null; // 0-18; 18 = finished round
  currentRound: number | null; // 1-4
  round1Score: number | null;
  round2Score: number | null;
  round3Score: number | null;
  round4Score: number | null;
  holeScores: ESPNHoleScore[];
}

const normalize = (name: string): string =>
  name.toLowerCase().replace(/[^a-z]/g, '');

export function matchGolferName(
  espnName: string,
  poolNames: string[]
): string | null {
  const key = normalize(espnName);

  // Exact match after normalization
  const exact = poolNames.find((p) => normalize(p) === key);
  if (exact) return exact;

  // First + last name match (handles middle name / suffix differences)
  const parts = espnName.split(' ');
  const espnFirst = normalize(parts[0]);
  const espnLast = normalize(parts[parts.length - 1]);

  for (const poolName of poolNames) {
    const pp = poolName.split(' ');
    const poolFirst = normalize(pp[0]);
    const poolLast = normalize(pp[pp.length - 1]);

    if (espnLast === poolLast && espnFirst === poolFirst) return poolName;
    if (
      espnLast === poolLast &&
      espnFirst.slice(0, 3) === poolFirst.slice(0, 3)
    )
      return poolName;
  }

  return null;
}

function parseScoreToPar(displayValue: string | undefined): number {
  if (!displayValue || displayValue === 'E') return 0;
  const n = parseInt(displayValue.replace('+', ''));
  return isNaN(n) ? 0 : n;
}

export async function fetchMastersScores(): Promise<{
  scores: ESPNScoreResult[];
  status: 'pre' | 'live' | 'completed' | 'not_found';
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(ESPN_SCOREBOARD_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`ESPN returned ${res.status}`);
    const data = await res.json();

    const mastersEvent = data.events?.find(
      (e: { name?: string; shortName?: string }) =>
        e.name?.toLowerCase().includes('masters') ||
        e.shortName?.toLowerCase().includes('masters')
    );

    if (!mastersEvent) return { scores: [], status: 'not_found' };

    const state = mastersEvent.status?.type?.state;
    if (state === 'pre') return { scores: [], status: 'pre' };

    const competition = mastersEvent.competitions?.[0];
    const scores: ESPNScoreResult[] = [];

    for (const c of (competition?.competitors || []) as ESPNCompetitor[]) {
      const name = c.athlete?.displayName || c.athlete?.shortName || '';
      const cStatus = c.status?.type?.name;

      // Derive current round from the last linescore that has actual score data
      const activeRoundLs = [...(c.linescores ?? [])].reverse().find(
        (ls) => ls.value !== undefined || ls.displayValue !== undefined
      );
      const currentRound = activeRoundLs?.period ?? (typeof c.status?.period === 'number' ? c.status.period : null);

      // Derive holes played from nested linescores count in the active round
      const holesPlayed = activeRoundLs?.linescores?.length ?? 0;
      const currentHole = holesPlayed === 18 ? 18 : (holesPlayed > 0 ? holesPlayed : (
        c.status?.thru === 'F' || c.status?.thru === 18 ? 18 :
        typeof c.status?.thru === 'number' ? c.status.thru : null
      ));

      // Parse round totals from outer linescores
      const parseLinescoreRound = (round: number): number | null => {
        const ls = c.linescores?.[round - 1];
        if (!ls) return null;
        const str = ls.displayValue ?? String(ls.value ?? '');
        if (!str) return null;
        const n = str === 'E' ? 0 : parseInt(str);
        return isNaN(n) ? null : n;
      };

      const todayScore = currentRound !== null ? parseLinescoreRound(currentRound) : null;
      const round1Score = parseLinescoreRound(1);
      const round2Score = parseLinescoreRound(2);
      const round3Score = parseLinescoreRound(3);
      const round4Score = parseLinescoreRound(4);

      // Parse hole-by-hole data from nested linescores
      const holeScores: ESPNHoleScore[] = [];
      for (const roundLs of c.linescores ?? []) {
        const roundNum = roundLs.period ?? 0;
        if (roundNum < 1 || roundNum > 4) continue;

        for (const hole of roundLs.linescores ?? []) {
          const holeNum = hole.period;
          if (!holeNum || holeNum < 1 || holeNum > 18) continue;

          const strokes = parseFloat(String(hole.value ?? '0'));
          if (isNaN(strokes) || strokes < 1) continue; // 0 or invalid = not played

          const scoreToPar = parseScoreToPar(hole.scoreType?.displayValue);
          holeScores.push({ round: roundNum, hole: holeNum, strokes: Math.round(strokes), scoreToPar });
        }
      }

      const roundScores = { round1Score, round2Score, round3Score, round4Score };

      if (cStatus === 'cut' || cStatus === 'wd') {
        scores.push({
          golferName: name,
          scoreToPar: 999,
          status: cStatus as 'cut' | 'wd',
          todayScore: null,
          currentHole: null,
          currentRound: null,
          holeScores: holeScores, // R1/R2 hole data still valid for MC golfers
          ...roundScores,
        });
      } else {
        const sv = typeof c.score === 'string' ? c.score : (c.score?.displayValue ?? c.score?.value);
        if (sv !== undefined) {
          const n = sv === 'E' ? 0 : parseInt(sv as string);
          if (!isNaN(n)) {
            scores.push({
              golferName: name,
              scoreToPar: n,
              status: 'active',
              todayScore,
              currentHole,
              currentRound,
              holeScores,
              ...roundScores,
            });
          }
        }
      }
    }

    return {
      scores,
      status: state === 'in' ? 'live' : 'completed',
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}
