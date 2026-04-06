'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import type { Golfer } from '@/types';

interface ScoreData {
  score_to_par: number | null;
  status: string | null;
  today_score: number | null;
  current_hole: number | null;
  current_round: number | null;
}

interface Props {
  picks: Golfer[]; // 4 golfers in tier order [T1, T2, T3, T4]
  reserve: Golfer | null;
}

// ── Formatters ───────────────────────────────────────────────────────────────

function fmtTotal(score: number | null, status: string | null): string {
  if (score === null) return '—';
  if (score === 999 || status === 'cut' || status === 'wd') return status === 'wd' ? 'WD' : 'MC';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : String(score);
}

function fmtToday(today: number | null): string {
  if (today === null) return '';
  if (today === 0) return 'E';
  return today > 0 ? `+${today}` : String(today);
}

function fmtHole(hole: number | null, round: number | null): string {
  if (hole === null || round === null) return '';
  if (hole === 18) return `R${round} F`;
  if (hole === 0) return `R${round}`;
  return `R${round}·${hole}`;
}

// ── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status, hasScore }: { status: string | null; hasScore: boolean }) {
  if (!hasScore) return <span className="text-[10px]">⚪</span>;
  if (status === 'cut' || status === 'wd') return <span className="text-[10px]">🔴</span>;
  return <span className="text-[10px]">🟢</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MyTeamTracker({ picks, reserve }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [scores, setScores] = useState<Record<string, ScoreData>>({});
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scores');
      if (!res.ok) return;
      const json = await res.json();
      const map: Record<string, ScoreData> = {};
      for (const s of json.scores ?? []) {
        map[s.golfer_id] = {
          score_to_par: s.score_to_par ?? null,
          status: s.status ?? null,
          today_score: s.today_score ?? null,
          current_hole: s.current_hole ?? null,
          current_round: s.current_round ?? null,
        };
      }
      setScores(map);
      // Use the latest updated_at across all scores
      const latest = (json.scores ?? []).reduce(
        (acc: string, s: { updated_at?: string }) => ((s.updated_at ?? '') > acc ? (s.updated_at ?? '') : acc),
        ''
      );
      if (latest) {
        setUpdatedAt(
          new Date(latest).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'America/New_York',
          }) + ' ET'
        );
      }
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // First MC/WD pick gets replaced by the reserve
  const replacedIdx = picks.findIndex((g) => {
    const s = scores[g.id];
    return s && (s.score_to_par === 999 || s.status === 'cut' || s.status === 'wd');
  });
  const reserveUsed = replacedIdx !== -1;

  const tierLabels = ['T1', 'T2', 'T3', 'T4'];

  return (
    <div className="border-t border-masters-green/10 rounded-b-2xl overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-masters-green/5 hover:bg-masters-green/10 transition-colors"
      >
        <span className="text-[10px] text-masters-gold font-bold uppercase tracking-widest">
          Track My Team
        </span>
        <div className="flex items-center gap-2">
          {updatedAt && !loading && (
            <span className="text-[10px] text-gray-400 font-mono">{updatedAt}</span>
          )}
          {loading && <span className="text-[10px] text-gray-400 animate-pulse">Updating…</span>}
          <span
            className={cn(
              'text-gray-400 text-xs transition-transform duration-200',
              isOpen ? 'rotate-0' : '-rotate-90'
            )}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="bg-masters-green/5 px-4 pb-4 animate-fade-in">
          <div className="space-y-2 pt-2">
            {picks.map((golfer, i) => {
              const s = scores[golfer.id] ?? null;
              const mc = s !== null && (s.score_to_par === 999 || s.status === 'cut' || s.status === 'wd');
              const replaced = i === replacedIdx;
              const hasScore = s !== null && s.score_to_par !== null;

              return (
                <div
                  key={golfer.id}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-white',
                    replaced && 'opacity-40'
                  )}
                >
                  <StatusDot status={s?.status ?? null} hasScore={hasScore} />

                  <span className="text-[10px] font-bold text-masters-gold/70 w-6 text-center flex-shrink-0">
                    {tierLabels[i]}
                  </span>

                  <span
                    className={cn(
                      'flex-1 text-sm font-medium truncate',
                      replaced ? 'line-through text-gray-400' : 'text-gray-800'
                    )}
                  >
                    {golfer.name}
                  </span>

                  {/* Today's score + hole */}
                  {s !== null && !mc && s.today_score !== null && (
                    <span className="text-[10px] text-gray-400 font-mono flex-shrink-0 text-right">
                      {fmtHole(s.current_hole, s.current_round) && (
                        <span className="mr-1">{fmtHole(s.current_hole, s.current_round)}</span>
                      )}
                      <span
                        className={cn(
                          'font-bold',
                          s.today_score < 0
                            ? 'text-red-500'
                            : s.today_score === 0
                            ? 'text-gray-500'
                            : 'text-gray-600'
                        )}
                      >
                        {fmtToday(s.today_score)}
                      </span>
                    </span>
                  )}

                  {/* Total */}
                  <span
                    className={cn(
                      'text-sm font-bold font-mono tabular-nums flex-shrink-0 w-10 text-right',
                      mc
                        ? 'text-gray-400'
                        : s !== null && s.score_to_par !== null && s.score_to_par < 0
                        ? 'text-red-500'
                        : 'text-gray-600'
                    )}
                  >
                    {fmtTotal(s?.score_to_par ?? null, s?.status ?? null)}
                  </span>
                </div>
              );
            })}

            {/* Reserve */}
            {reserve && (
              <div
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5',
                  reserveUsed
                    ? 'bg-masters-green/15 ring-1 ring-masters-green/30'
                    : 'bg-white opacity-50'
                )}
              >
                <StatusDot
                  status={reserveUsed ? (scores[reserve.id]?.status ?? 'active') : null}
                  hasScore={reserveUsed && scores[reserve.id]?.score_to_par != null}
                />

                <span className="text-[10px] font-bold text-masters-gold/70 w-6 text-center flex-shrink-0">
                  Rsv
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{reserve.name}</p>
                  {reserveUsed && (
                    <p className="text-[9px] text-masters-green font-bold uppercase tracking-wide leading-none mt-0.5">
                      Reserve activated
                    </p>
                  )}
                </div>

                {reserveUsed && scores[reserve.id] && (
                  <>
                    {scores[reserve.id].today_score !== null && (
                      <span
                        className={cn(
                          'text-[10px] font-bold font-mono flex-shrink-0',
                          (scores[reserve.id].today_score ?? 0) < 0 ? 'text-red-500' : 'text-gray-500'
                        )}
                      >
                        {fmtToday(scores[reserve.id].today_score)}
                      </span>
                    )}
                    <span
                      className={cn(
                        'text-sm font-bold font-mono tabular-nums flex-shrink-0 w-10 text-right',
                        (scores[reserve.id].score_to_par ?? 0) < 0 ? 'text-red-500' : 'text-gray-600'
                      )}
                    >
                      {fmtTotal(scores[reserve.id].score_to_par, scores[reserve.id].status)}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer: refresh */}
          <div className="mt-3 pt-2.5 border-t border-masters-green/10 flex justify-end">
            <button
              type="button"
              onClick={fetchScores}
              disabled={loading}
              className="flex items-center gap-1 text-[11px] font-semibold text-masters-green hover:text-masters-green-dark transition-colors disabled:opacity-40"
            >
              <span className={cn('inline-block', loading && 'animate-spin')}>↻</span>
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
