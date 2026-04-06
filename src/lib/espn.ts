const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';

interface ESPNCompetitor {
  athlete: { displayName: string; shortName?: string };
  score: { displayValue?: string; value?: string };
  status: {
    type: { name: string };
    period?: number;       // current round (1-4)
    thru?: number | string; // holes played; 18 or "F" = round complete
  };
  linescores?: { value?: string; displayValue?: string }[];
}

interface ESPNScoreResult {
  golferName: string;
  scoreToPar: number; // 999 = MC/WD
  status: 'active' | 'cut' | 'wd';
  todayScore: number | null;
  currentHole: number | null; // 0-18; 18 = finished round
  currentRound: number | null; // 1-4
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

      const currentRound = typeof c.status?.period === 'number' ? c.status.period : null;
      const thru = c.status?.thru;
      const currentHole = thru === 'F' || thru === 18 ? 18 : typeof thru === 'number' ? thru : null;

      // Today's round score from linescores array (index = round - 1)
      let todayScore: number | null = null;
      if (currentRound !== null && c.linescores && c.linescores.length >= currentRound) {
        const todayStr = c.linescores[currentRound - 1]?.displayValue ?? c.linescores[currentRound - 1]?.value;
        if (todayStr !== undefined && todayStr !== null) {
          const parsed = todayStr === 'E' ? 0 : parseInt(String(todayStr));
          if (!isNaN(parsed)) todayScore = parsed;
        }
      }

      if (cStatus === 'cut' || cStatus === 'wd') {
        scores.push({ golferName: name, scoreToPar: 999, status: cStatus as 'cut' | 'wd', todayScore: null, currentHole: null, currentRound: null });
      } else {
        const sv = c.score?.displayValue ?? c.score?.value;
        if (sv !== undefined) {
          const n = sv === 'E' ? 0 : parseInt(sv as string);
          if (!isNaN(n)) {
            scores.push({ golferName: name, scoreToPar: n, status: 'active', todayScore, currentHole, currentRound });
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
