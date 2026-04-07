import { describe, it, expect } from 'vitest';
import { computeBestBallRound, computeBestBallTeam, sortEntries } from '../../src/lib/scoring';
import type { GolferHoleData } from '../../src/lib/scoring';
import { matchGolferName } from '../../src/lib/espn';

// Augusta par layout for reference
// [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4] = 72

/** Build hole data for a golfer: par every hole except overrides */
function makeHoles(
  golferId: string,
  round: number,
  overrides: Record<number, number> = {} // hole → scoreToPar
): GolferHoleData[] {
  const pars = [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4];
  return pars.map((par, i) => {
    const hole = i + 1;
    const stp = overrides[hole] ?? 0;
    return { golferId, round, hole, strokes: par + stp, scoreToPar: stp };
  });
}

describe('computeBestBallRound', () => {
  it('takes the lowest score per hole across all picks', () => {
    // Golfer A: birdies on holes 1 and 5
    // Golfer B: birdies on holes 3 and 7
    // Best ball: birdies on 1, 3, 5, 7 → -4
    const holeData: GolferHoleData[] = [
      ...makeHoles('A', 1, { 1: -1, 5: -1 }),
      ...makeHoles('B', 1, { 3: -1, 7: -1 }),
      ...makeHoles('C', 1),
      ...makeHoles('D', 1),
    ];
    const statusMap = new Map<string, string>();
    const result = computeBestBallRound(['A', 'B', 'C', 'D'], 'R', 1, holeData, statusMap);
    expect(result.scoreToPar).toBe(-4);
    expect(result.holesComplete).toBe(18);
  });

  it('returns null scoreToPar when no hole data exists for the round', () => {
    const result = computeBestBallRound(['A', 'B', 'C', 'D'], 'R', 1, [], new Map());
    expect(result.scoreToPar).toBeNull();
    expect(result.holesComplete).toBe(0);
  });

  it('correctly marks winner golfers per hole', () => {
    const holeData: GolferHoleData[] = [
      ...makeHoles('A', 1, { 1: -1 }), // birdie on 1
      ...makeHoles('B', 1, { 1: 1 }),  // bogey on 1
    ];
    const result = computeBestBallRound(['A', 'B'], 'R', 1, holeData, new Map());
    const hole1 = result.holes.find((h) => h.hole === 1)!;
    expect(hole1.bestScoreToPar).toBe(-1);
    expect(hole1.winnerGolferIds).toContain('A');
    expect(hole1.winnerGolferIds).not.toContain('B');
  });

  it('does NOT include reserve in R1/R2 even if a pick is cut', () => {
    const holeData: GolferHoleData[] = [
      ...makeHoles('A', 1, { 1: -1 }),
      ...makeHoles('RSV', 1, { 1: -2 }), // reserve has better score but shouldn't count
    ];
    const statusMap = new Map([['A', 'cut']]);
    const result = computeBestBallRound(['A'], 'RSV', 1, holeData, statusMap);
    expect(result.reserveIncluded).toBe(false);
    const hole1 = result.holes.find((h) => h.hole === 1)!;
    // Only golfer A's data should be used (birdie -1, not reserve's -2)
    expect(hole1.bestScoreToPar).toBe(-1);
  });

  it('includes reserve in R3 when a pick is cut', () => {
    const holeData: GolferHoleData[] = [
      ...makeHoles('A', 3, { 1: -1 }),
      ...makeHoles('RSV', 3, { 2: -2 }),
    ];
    const statusMap = new Map([['A', 'cut']]);
    const result = computeBestBallRound(['A'], 'RSV', 3, holeData, statusMap);
    expect(result.reserveIncluded).toBe(true);
    // Both golfers contribute: birdie on 1 from A, eagle on 2 from RSV
    expect(result.scoreToPar).toBe(-3);
  });

  it('does NOT include reserve in R3 when no picks are cut', () => {
    const holeData: GolferHoleData[] = [
      ...makeHoles('A', 3),
      ...makeHoles('RSV', 3, { 1: -3 }), // reserve hot, but shouldn't count
    ];
    const statusMap = new Map([['A', 'active']]);
    const result = computeBestBallRound(['A'], 'RSV', 3, holeData, statusMap);
    expect(result.reserveIncluded).toBe(false);
    expect(result.scoreToPar).toBe(0); // only A, who went E
  });
});

describe('computeBestBallTeam', () => {
  it('sums best-ball scores across completed rounds', () => {
    const holeData: GolferHoleData[] = [
      ...makeHoles('A', 1, { 1: -1, 2: -1 }), // -2 in R1
      ...makeHoles('B', 1, { 3: -1 }),          // -1 in R1, best ball R1 = -3
      ...makeHoles('A', 2, { 5: -1 }),           // -1 in R2
      ...makeHoles('B', 2, { 6: -1, 7: -1 }),   // -2 in R2, best ball R2 = -3
    ];
    const statusMap = new Map<string, string>();
    const result = computeBestBallTeam(['A', 'B'], 'RSV', holeData, statusMap);
    expect(result.total).toBe(-6); // R1: -3 + R2: -3
    expect(result.rounds[0].scoreToPar).toBe(-3);
    expect(result.rounds[1].scoreToPar).toBe(-3);
    expect(result.rounds[2].scoreToPar).toBeNull(); // R3: no data
    expect(result.rounds[3].scoreToPar).toBeNull(); // R4: no data
  });

  it('returns null total when no hole data exists', () => {
    const result = computeBestBallTeam(['A', 'B', 'C', 'D'], 'R', [], new Map());
    expect(result.total).toBeNull();
    expect(result.totalStrokes).toBeNull();
  });

  it('reports reserveUsed when reserve was included in any round', () => {
    const holeData: GolferHoleData[] = [
      ...makeHoles('A', 3),
      ...makeHoles('RSV', 3, { 1: -1 }),
    ];
    const statusMap = new Map([['A', 'cut']]);
    const result = computeBestBallTeam(['A'], 'RSV', holeData, statusMap);
    expect(result.reserveUsed).toBe(true);
  });
});

describe('sortEntries', () => {
  it('sorts by total ascending, nulls last', () => {
    const entries = [
      { total: -5 as number | null },
      { total: -8 as number | null },
      { total: -3 as number | null },
      { total: null },
    ];
    const sorted = sortEntries(entries);
    expect(sorted[0].total).toBe(-8);
    expect(sorted[1].total).toBe(-5);
    expect(sorted[2].total).toBe(-3);
    expect(sorted[3].total).toBeNull();
  });

  it('keeps equal totals in stable relative order', () => {
    const entries = [
      { total: -5 as number | null, id: 'first' },
      { total: -5 as number | null, id: 'second' },
    ];
    const sorted = sortEntries(entries);
    expect(sorted[0].total).toBe(-5);
    expect(sorted[1].total).toBe(-5);
  });
});

describe('matchGolferName', () => {
  const poolNames = [
    'Scottie Scheffler',
    'Rory McIlroy',
    'Byeong-Hun An',
    'J.J. Spaun',
    'J.T. Poston',
    'Robert MacIntyre',
  ];

  it('matches exact names', () => {
    expect(matchGolferName('Scottie Scheffler', poolNames)).toBe('Scottie Scheffler');
  });

  it('matches names with different punctuation', () => {
    expect(matchGolferName('Byeong Hun An', poolNames)).toBe('Byeong-Hun An');
  });

  it('matches abbreviated first names', () => {
    expect(matchGolferName('Rob MacIntyre', poolNames)).toBe('Robert MacIntyre');
  });

  it('returns null for unknown golfers', () => {
    expect(matchGolferName('Tiger Woods', poolNames)).toBeNull();
  });
});
