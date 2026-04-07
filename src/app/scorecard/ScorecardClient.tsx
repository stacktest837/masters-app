'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { ScorecardRow } from './page';
import type { DailyWinner, GolferHoleData, PayoutSummary } from '@/lib/scoring';

function fmt(score: number | null): string {
  if (score === null) return '—';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : String(score);
}

interface Props {
  rows: ScorecardRow[];
  holeData: GolferHoleData[];
  dailyWinners: (DailyWinner | null)[];
  payouts: PayoutSummary;
  hasScores: boolean;
  statusMap: Record<string, string>;
}

// ── Payout summary card ───────────────────────────────────────────────────────

function PayoutCard({ dailyWinners, overallRow, payouts }: {
  dailyWinners: (DailyWinner | null)[];
  overallRow: ScorecardRow | null;
  payouts: PayoutSummary;
}) {
  const hasAny = dailyWinners.some((w) => w !== null) || overallRow !== null;
  if (!hasAny) return null;

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-4">
      <div className="bg-masters-green px-4 py-3 flex items-center justify-between">
        <p className="text-masters-gold text-[10px] font-bold uppercase tracking-[0.2em]">Payouts</p>
        <p className="text-masters-gold/60 text-[10px] font-mono">{payouts.entryCount} entries · ${payouts.entryCount * payouts.buyIn} pool</p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-gray-50">
        {([1, 2, 3, 4] as const).map((round) => {
          const winner = dailyWinners[round - 1] ?? null;
          return (
            <div key={round} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest">Round {round}</p>
                <p className="text-[10px] text-gray-400 font-mono">${payouts.dailyPrizePerRound.toFixed(2)}</p>
              </div>
              {winner ? (
                <>
                  <p className="text-sm font-semibold text-gray-800 leading-tight truncate">
                    {winner.playerName.split(' ')[0]} {winner.playerName.split(' ').slice(-1)[0]}
                  </p>
                  <p className="text-xs font-bold font-mono text-masters-green mt-0.5">
                    {fmt(winner.dailyScore)}
                    {winner.tiebreakWin && <span className="text-[9px] text-gray-400 font-normal ml-1">TB</span>}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-300">—</p>
              )}
            </div>
          );
        })}
      </div>

      {overallRow && (
        <div className="border-t border-gray-100 px-4 py-3 bg-masters-gold/5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest">Overall Winner</p>
            <p className="text-[10px] text-gray-400 font-mono">${payouts.overallPrize.toFixed(2)}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">
              {overallRow.player_name}
              {overallRow.tied && <span className="text-[10px] text-gray-400 ml-1 font-normal">T1</span>}
            </p>
            <div className="text-right">
              <p className={cn('text-base font-bold font-mono', overallRow.result.total !== null && overallRow.result.total < 0 ? 'text-red-500' : 'text-gray-700')}>
                {fmt(overallRow.result.total)}
              </p>
              {overallRow.result.totalStrokes !== null && (
                <p className="text-[10px] text-gray-400 font-mono">{overallRow.result.totalStrokes} strokes</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hole-by-hole expand view ──────────────────────────────────────────────────

function HoleExpand({ row, roundNum, holeData, statusMap }: {
  row: ScorecardRow;
  roundNum: number;
  holeData: GolferHoleData[];
  statusMap: Record<string, string>;
}) {
  const anyPickCut = row.pickIds.some((id) => {
    const s = statusMap[id];
    return s === 'cut' || s === 'wd';
  });
  const includeReserve = roundNum >= 3 && anyPickCut;
  const activeGolfers = [
    ...row.picks.map((g, i) => ({ golfer: g, id: row.pickIds[i], isReserve: false })),
    ...(includeReserve && row.reserve ? [{ golfer: row.reserve, id: row.reserveId, isReserve: true }] : []),
  ];

  const roundHoles = holeData.filter((h) => h.round === roundNum);
  if (roundHoles.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-3">No hole data for this round yet</p>;
  }

  // For each hole, find best score
  const holeMins = new Map<number, number>();
  for (let h = 1; h <= 18; h++) {
    const scores = activeGolfers
      .map((ag) => roundHoles.find((rh) => rh.golferId === ag.id && rh.hole === h)?.scoreToPar)
      .filter((s): s is number => s !== undefined);
    if (scores.length > 0) holeMins.set(h, Math.min(...scores));
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-[10px] border-collapse min-w-[340px]">
        <thead>
          <tr className="text-gray-400">
            <td className="py-1 pr-2 font-bold text-left w-16">Golfer</td>
            {Array.from({ length: 9 }, (_, i) => (
              <td key={i + 1} className="text-center w-5 font-mono">{i + 1}</td>
            ))}
            <td className="text-center w-6 font-bold text-gray-500">Out</td>
            {Array.from({ length: 9 }, (_, i) => (
              <td key={i + 10} className="text-center w-5 font-mono">{i + 10}</td>
            ))}
            <td className="text-center w-6 font-bold text-gray-500">In</td>
            <td className="text-center w-7 font-bold">Tot</td>
          </tr>
        </thead>
        <tbody>
          {activeGolfers.map(({ golfer, id, isReserve }) => {
            const lastName = golfer.name.split(' ').slice(-1)[0];
            const golferHoles = roundHoles.filter((h) => h.golferId === id);
            const front9 = Array.from({ length: 9 }, (_, i) => golferHoles.find((h) => h.hole === i + 1));
            const back9 = Array.from({ length: 9 }, (_, i) => golferHoles.find((h) => h.hole === i + 10));
            const outTotal = front9.reduce((s, h) => s + (h?.strokes ?? 0), 0);
            const inTotal = back9.reduce((s, h) => s + (h?.strokes ?? 0), 0);
            const roundTotal = outTotal + inTotal;

            const renderHole = (h: GolferHoleData | undefined, holeNum: number) => {
              if (!h) return <td key={holeNum} className="text-center text-gray-200 w-5">—</td>;
              const isBest = h.scoreToPar === holeMins.get(holeNum);
              return (
                <td
                  key={holeNum}
                  className={cn(
                    'text-center w-5 font-mono tabular-nums',
                    isBest
                      ? 'text-masters-green font-bold bg-masters-green/10 rounded'
                      : h.scoreToPar < 0
                      ? 'text-red-400'
                      : h.scoreToPar > 0
                      ? 'text-gray-500'
                      : 'text-gray-400'
                  )}
                >
                  {h.strokes}
                </td>
              );
            };

            return (
              <tr key={id} className={cn('border-t border-gray-50', isReserve && 'bg-masters-green/5')}>
                <td className="py-1 pr-2 font-semibold text-gray-700 truncate max-w-[4rem]">
                  {lastName}{isReserve ? ' (R)' : ''}
                </td>
                {front9.map((h, i) => renderHole(h, i + 1))}
                <td className="text-center w-6 font-bold text-gray-600 font-mono">{outTotal || '—'}</td>
                {back9.map((h, i) => renderHole(h, i + 10))}
                <td className="text-center w-6 font-bold text-gray-600 font-mono">{inTotal || '—'}</td>
                <td className={cn('text-center w-7 font-bold font-mono tabular-nums', roundTotal > 0 ? 'text-red-500' : 'text-gray-700')}>
                  {roundTotal || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Scorecard row ─────────────────────────────────────────────────────────────

function ScorecardRowItem({ row, dailyWinners, holeData, statusMap, hasScores }: {
  row: ScorecardRow;
  dailyWinners: (DailyWinner | null)[];
  holeData: GolferHoleData[];
  statusMap: Record<string, string>;
  hasScores: boolean;
}) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  const toggleRound = (round: number) => {
    setExpandedRound((prev) => (prev === round ? null : round));
  };

  const isOverallWinner = row.rank === 1 && row.result.total !== null;

  return (
    <div className={cn(
      'bg-white rounded-2xl overflow-hidden shadow-card',
      isOverallWinner && 'border border-masters-gold/40 shadow-md'
    )}>
      {/* Summary row */}
      <div className={cn('px-4 py-3', isOverallWinner && 'bg-masters-gold/5')}>
        {/* Player name + total */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              'text-xs font-bold font-mono flex-shrink-0 w-7',
              row.rank === 1 ? 'text-masters-gold' : 'text-gray-400'
            )}>
              {row.tied ? 'T' : ''}{row.rank}
            </span>
            <span className="font-serif font-bold text-gray-900 text-sm truncate">{row.player_name}</span>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            {hasScores && row.result.total !== null ? (
              <>
                <span className={cn(
                  'text-lg font-bold font-mono tabular-nums',
                  row.result.total < 0 ? 'text-red-500' : row.result.total === 0 ? 'text-gray-500' : 'text-gray-600'
                )}>
                  {fmt(row.result.total)}
                </span>
                {row.result.totalStrokes !== null && (
                  <span className="text-[10px] text-gray-400 font-mono ml-1.5">({row.result.totalStrokes})</span>
                )}
              </>
            ) : (
              <span className="text-lg font-bold font-mono text-gray-300">—</span>
            )}
          </div>
        </div>

        {/* Per-round cells */}
        <div className="grid grid-cols-4 gap-1.5">
          {row.result.rounds.map((r) => {
            const isDailyWinner = dailyWinners[r.round - 1]?.entryId === row.id;
            const isExpanded = expandedRound === r.round;
            const hasRoundData = r.scoreToPar !== null;

            return (
              <button
                key={r.round}
                type="button"
                onClick={() => toggleRound(r.round)}
                disabled={!hasRoundData}
                className={cn(
                  'rounded-lg px-2 py-1.5 text-center transition-colors',
                  isDailyWinner
                    ? 'bg-masters-gold/20 ring-1 ring-masters-gold/60'
                    : isExpanded
                    ? 'bg-masters-green/10'
                    : 'bg-gray-50 hover:bg-gray-100',
                  !hasRoundData && 'cursor-default'
                )}
              >
                <p className="text-[9px] text-gray-400 font-bold uppercase">R{r.round}</p>
                <p className={cn(
                  'text-sm font-bold font-mono tabular-nums mt-0.5',
                  !hasRoundData ? 'text-gray-300' :
                  isDailyWinner ? 'text-masters-gold' :
                  r.scoreToPar! < 0 ? 'text-red-500' :
                  r.scoreToPar === 0 ? 'text-gray-500' : 'text-gray-600'
                )}>
                  {r.scoreToPar !== null ? fmt(r.scoreToPar) : '—'}
                </p>
                {r.strokes !== null && (
                  <p className="text-[9px] text-gray-400 font-mono">{r.strokes}</p>
                )}
                {r.holesComplete > 0 && r.holesComplete < 18 && (
                  <p className="text-[8px] text-gray-300">{r.holesComplete}/18</p>
                )}
                {isDailyWinner && (
                  <p className="text-[8px] text-masters-gold font-bold mt-0.5">WIN</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded hole-by-hole view */}
      {expandedRound !== null && (
        <div className="px-4 pb-3 border-t border-gray-50 pt-2 bg-gray-50/50">
          <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest mb-2">
            Round {expandedRound} · Hole by Hole
            <span className="text-gray-400 font-normal ml-2 normal-case">Green = best ball pick</span>
          </p>
          <HoleExpand row={row} roundNum={expandedRound} holeData={holeData} statusMap={statusMap} />
        </div>
      )}
    </div>
  );
}

// ── Main client ───────────────────────────────────────────────────────────────

export default function ScorecardClient({ rows, holeData, dailyWinners, payouts, hasScores, statusMap }: Props) {
  const overallWinner = rows.length > 0 && rows[0].result.total !== null ? rows[0] : null;

  if (rows.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">⛳</p>
        <p className="font-serif text-gray-600 text-lg font-medium">No picks yet</p>
        <a href="/pick" className="text-masters-green text-sm mt-2 inline-block hover:underline">
          Be the first to pick →
        </a>
      </div>
    );
  }

  return (
    <div>
      <PayoutCard dailyWinners={dailyWinners} overallRow={overallWinner} payouts={payouts} />

      {!hasScores && (
        <div className="bg-white rounded-2xl shadow-card px-4 py-3 mb-4 text-center">
          <p className="text-sm text-gray-500">⏳ Scorecard updates once the tournament begins</p>
          <p className="text-xs text-gray-400 mt-0.5">Tap a round cell to see hole-by-hole detail</p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <ScorecardRowItem
            key={row.id}
            row={row}
            dailyWinners={dailyWinners}
            holeData={holeData}
            statusMap={statusMap}
            hasScores={hasScores}
          />
        ))}
      </div>
    </div>
  );
}
