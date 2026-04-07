'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
import type { RankedEntry, DailyWinner } from './page';
import type { Golfer } from '@/types';
import MyTeamTracker from '@/components/MyTeamTracker';
import { computePayouts } from '@/lib/scoring';

function fmt(score: number | null): string {
  if (score === null) return '—';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : String(score);
}

function fmtIndividual(score: number | null, status?: string): string {
  if (score === null) return '—';
  if (score === 999 || status === 'cut' || status === 'wd') return 'MC';
  return fmt(score);
}

interface Props {
  ranked: RankedEntry[];
  hasScores: boolean;
  dailyWinners: (DailyWinner | null)[];
  entryCount: number;
}

// ── Payouts card ──────────────────────────────────────────────────────────────

function PayoutsCard({
  dailyWinners,
  overall,
  entryCount,
}: {
  dailyWinners: (DailyWinner | null)[];
  overall: RankedEntry | null;
  entryCount: number;
}) {
  const hasAny = dailyWinners.some((w) => w !== null) || overall !== null;
  if (!hasAny) return null;

  const payouts = computePayouts(entryCount);

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-4">
      <div className="bg-masters-green px-4 py-3">
        <p className="text-masters-gold text-[10px] font-bold uppercase tracking-[0.2em]">Payouts</p>
      </div>

      {/* Daily rounds grid */}
      <div className="grid grid-cols-2 divide-x divide-y divide-gray-50">
        {([1, 2, 3, 4] as const).map((round) => {
          const winner = dailyWinners[round - 1] ?? null;
          return (
            <div key={round} className="px-4 py-3">
              <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest mb-0.5">
                Round {round}
              </p>
              <p className="text-[10px] text-gray-400 font-mono mb-1">${payouts.dailyPrizePerRound.toFixed(2)}</p>
              {winner ? (
                <>
                  <p className="text-sm font-semibold text-gray-800 leading-tight truncate">
                    {winner.playerName.split(' ')[0]} {winner.playerName.split(' ').slice(-1)[0]}
                  </p>
                  <p className="text-xs font-bold font-mono text-masters-green mt-0.5">
                    {fmt(winner.dailyScore)}
                    {winner.tiebreakWin && (
                      <span className="text-[9px] text-gray-400 font-normal ml-1">TB</span>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-300 font-medium">—</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall leader */}
      {overall && (
        <div className="border-t border-gray-100 px-4 py-3 bg-masters-gold/5">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest">
              Overall Leader
            </p>
            <p className="text-[10px] text-gray-400 font-mono">${payouts.overallPrize.toFixed(2)}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">
              {overall.player_name}
              {overall.tied && <span className="text-[10px] text-gray-400 ml-1 font-normal">T1</span>}
            </p>
            <div className="text-right">
              <p className={cn(
                'text-base font-bold font-mono tabular-nums leading-tight',
                overall.total !== null && overall.total < 0 ? 'text-red-500' : 'text-gray-700'
              )}>
                {fmt(overall.total)}
              </p>
              {overall.totalStrokes !== null && (
                <p className="text-[10px] text-gray-400 font-mono">{overall.totalStrokes} strokes</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank, tied }: { rank: number; tied: boolean }) {
  if (rank === 1)
    return (
      <div className="w-9 h-9 rounded-full bg-masters-gold flex items-center justify-center shadow-md flex-shrink-0">
        <span className="text-masters-green-dark font-bold text-sm font-serif">1</span>
      </div>
    );
  if (rank === 2)
    return (
      <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
        <span className="text-gray-700 font-bold text-sm font-serif">2</span>
      </div>
    );
  if (rank === 3)
    return (
      <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm font-serif">3</span>
      </div>
    );
  return (
    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
      <span className="text-gray-400 font-semibold text-sm font-mono">
        {tied ? 'T' : ''}{rank}
      </span>
    </div>
  );
}

// ── Movement badge ────────────────────────────────────────────────────────────

function MovementBadge({ movement }: { movement: number | null }) {
  if (movement === null) return null;
  if (movement === 0) return <span className="text-[10px] text-gray-400 font-mono">—</span>;
  if (movement > 0)
    return <span className="text-[10px] font-bold text-emerald-500 font-mono">↑{movement}</span>;
  return <span className="text-[10px] font-bold text-red-400 font-mono">↓{Math.abs(movement)}</span>;
}

// ── Score display ─────────────────────────────────────────────────────────────

function ScoreDisplay({ total, totalStrokes, hasScores }: { total: number | null; totalStrokes: number | null; hasScores: boolean }) {
  if (!hasScores || total === null)
    return <span className="text-2xl font-bold font-mono text-gray-300">—</span>;
  return (
    <div className="text-right">
      <div className={cn(
        'text-2xl font-bold font-mono tabular-nums leading-tight',
        total < 0 ? 'text-red-500' : total === 0 ? 'text-gray-500' : 'text-gray-600'
      )}>
        {fmt(total)}
      </div>
      {totalStrokes !== null && (
        <div className="text-[10px] text-gray-400 font-mono tabular-nums">
          {totalStrokes} strokes
        </div>
      )}
    </div>
  );
}

// ── Golfer chip ───────────────────────────────────────────────────────────────

function GolferChip({
  golfer,
  score,
  status,
}: {
  golfer: Golfer;
  score: number | null;
  status: string | undefined;
}) {
  const mc = score === 999 || status === 'cut' || status === 'wd';
  const lastName = golfer.name.split(' ').slice(-1)[0];
  const scoreStr = score !== null ? fmtIndividual(score, status) : null;

  return (
    <div className={cn(
      'golfer-chip',
      mc ? 'bg-gray-100 text-gray-400 line-through' : 'bg-masters-green/10 text-masters-green'
    )}>
      <span>{lastName}</span>
      {scoreStr && (
        <span className={cn('font-mono font-bold', mc ? 'text-gray-400' : score !== null && score < 0 ? 'text-red-500' : '')}>
          {scoreStr}
        </span>
      )}
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  highlighted,
  hasScores,
  cardRef,
}: {
  entry: RankedEntry;
  highlighted: boolean;
  hasScores: boolean;
  cardRef?: React.RefObject<HTMLDivElement>;
}) {
  const isLeader = entry.rank === 1 && entry.total !== null;

  return (
    <div
      ref={cardRef}
      className={cn(
        'bg-white rounded-2xl overflow-hidden transition-all duration-300',
        highlighted
          ? 'ring-2 ring-masters-gold shadow-gold shadow-lg'
          : isLeader
          ? 'shadow-md border border-masters-gold/30'
          : 'shadow-card border border-transparent'
      )}
    >
      {/* Main row */}
      <div className={cn('flex items-center gap-3 px-4 py-4', isLeader && 'bg-masters-gold/5')}>
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <RankBadge rank={entry.rank} tied={entry.tied} />
          <MovementBadge movement={entry.movement} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-serif font-bold text-gray-900 text-base leading-tight truncate">
            {entry.player_name}
          </p>
          {entry.reserveUsed && (
            <p className="text-[10px] text-masters-gold font-semibold mt-0.5">Reserve active</p>
          )}
        </div>

        <ScoreDisplay total={entry.total} totalStrokes={entry.totalStrokes} hasScores={hasScores} />
      </div>

      {/* Golfer chips */}
      <div className="px-4 pb-3 border-t border-gray-50 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {entry.picks.map(({ golfer, score, status }) => {
            if (!golfer) return null;
            return (
              <GolferChip
                key={golfer.id}
                golfer={golfer}
                score={score}
                status={status}
              />
            );
          })}
        </div>

        {/* Reserve */}
        {entry.reserve && (
          <div className="mt-2.5 pt-2 border-t border-gray-50">
            <span className="text-[11px] text-gray-400">
              Rsv:{' '}
              <span className={cn('font-medium', entry.reserveUsed ? 'text-masters-green' : 'text-gray-500')}>
                {entry.reserve.name.split(' ').slice(-1)[0]}
                {entry.reserveUsed ? ' ✓' : ''}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Track My Team — expanded when entry is highlighted */}
      {highlighted && (
        <MyTeamTracker
          picks={entry.picks.map((p) => p.golfer)}
          reserve={entry.reserve}
        />
      )}
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export default function LeaderboardClient({ ranked, hasScores, dailyWinners, entryCount }: Props) {
  const [nameQuery, setNameQuery] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});

  ranked.forEach((entry) => {
    if (!cardRefs.current[entry.id]) {
      cardRefs.current[entry.id] = { current: null } as React.RefObject<HTMLDivElement>;
    }
  });

  useEffect(() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) { setHighlightedId(null); return; }
    const match = ranked.find((e) => e.player_name.toLowerCase().includes(q));
    setHighlightedId(match?.id ?? null);
  }, [nameQuery, ranked]);

  useEffect(() => {
    if (!highlightedId) return;
    cardRefs.current[highlightedId]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedId]);

  if (ranked.length === 0) {
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

  const overallLeader = ranked.length > 0 && ranked[0].total !== null ? ranked[0] : null;

  return (
    <div>
      <PayoutsCard dailyWinners={dailyWinners} overall={overallLeader} entryCount={entryCount} />

      {/* Look Up My Picks */}
      <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
        <label className="block text-[10px] text-masters-gold font-bold uppercase tracking-widest mb-2">
          Look Up My Picks
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Type your name…"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-masters-green focus:ring-1 focus:ring-masters-green/30 transition-all pr-8"
          />
          {nameQuery && (
            <button
              onClick={() => setNameQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
        {nameQuery.trim() && !highlightedId && (
          <p className="text-xs text-gray-400 mt-1.5">No entry found for &ldquo;{nameQuery.trim()}&rdquo;</p>
        )}
        {highlightedId && (
          <p className="text-xs text-masters-green mt-1.5">↓ Highlighted below</p>
        )}
      </div>

      {/* Entry cards */}
      <div className="space-y-3">
        {ranked.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            highlighted={highlightedId === entry.id}
            hasScores={hasScores}
            cardRef={cardRefs.current[entry.id] as React.RefObject<HTMLDivElement>}
          />
        ))}
      </div>
    </div>
  );
}
