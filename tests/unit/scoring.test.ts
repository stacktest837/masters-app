import { describe, it, expect } from 'vitest';
import { calculateTeamScore, sortEntries } from '../../src/lib/scoring';
import { matchGolferName } from '../../src/lib/espn';

describe('calculateTeamScore', () => {
  const scores = new Map([
    ['g1', -5],
    ['g2', -3],
    ['g3', -2],
    ['g4', 1],
    ['reserve', -1],
  ]);

  it('sums scores for all 4 golfers', () => {
    const result = calculateTeamScore(
      { pickIds: ['g1', 'g2', 'g3', 'g4'], reserveId: 'reserve', tiebreaker: -10 },
      scores
    );
    expect(result.total).toBe(-9); // -5 + -3 + -2 + 1
    expect(result.reserveUsed).toBe(false);
  });

  it('returns null when no scores available', () => {
    const result = calculateTeamScore(
      { pickIds: ['x1', 'x2', 'x3', 'x4'], reserveId: 'reserve', tiebreaker: -10 },
      scores
    );
    expect(result.total).toBeNull();
  });

  it('swaps in reserve when a golfer misses cut', () => {
    const scoresWithMC = new Map([
      ['g1', -5],
      ['g2', 999], // missed cut
      ['g3', -2],
      ['g4', 1],
      ['reserve', -1],
    ]);
    const result = calculateTeamScore(
      { pickIds: ['g1', 'g2', 'g3', 'g4'], reserveId: 'reserve', tiebreaker: -10 },
      scoresWithMC
    );
    expect(result.total).toBe(-7); // -5 + -1(reserve) + -2 + 1
    expect(result.reserveUsed).toBe(true);
  });

  it('only replaces one golfer with reserve', () => {
    const scoresWithTwoMC = new Map([
      ['g1', -5],
      ['g2', 999],
      ['g3', 999],
      ['g4', 1],
      ['reserve', -1],
    ]);
    const result = calculateTeamScore(
      { pickIds: ['g1', 'g2', 'g3', 'g4'], reserveId: 'reserve', tiebreaker: -10 },
      scoresWithTwoMC
    );
    expect(result.total).toBe(-5); // -5 + -1(reserve) + (g3 not replaced) + 1
    expect(result.reserveUsed).toBe(true);
  });
});

describe('sortEntries', () => {
  it('sorts by total ascending, tiebreaker breaks ties', () => {
    const entries = [
      { total: -5, tiebreaker: -10 },
      { total: -5, tiebreaker: -8 },
      { total: -3, tiebreaker: -12 },
      { total: null, tiebreaker: -10 },
    ];
    const sorted = sortEntries(entries);
    expect(sorted[0].total).toBe(-5);
    expect(sorted[0].tiebreaker).toBe(-8);
    expect(sorted[2].total).toBe(-3);
    expect(sorted[3].total).toBeNull();
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
