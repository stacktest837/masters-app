'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import type { Golfer } from '@/types';
import { computeBestBallTeam, type GolferHoleData } from '@/lib/scoring';

interface ScoreData {
  score_to_par: number | null;
  status: string | null;
  today_score: number | null;
  current_hole: number | null;
  current_round: number | null;
  round1_score: number | null;
  round2_score: number | null;
  round3_score: number | null;
  round4_score: number | null;
}

interface Props {
  picks: (Golfer | null)[]; // 4 golfers in tier order [T1, T2, T3, T4]
  reserve: Golfer | null;
}

// ── Formatters ────────────────────────────────────────────────────────────────

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

function fmtBB(score: number | null): string {
  if (score === null) return '—';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : String(score);
}

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusDot({ status, hasScore }: { status: string | null; hasScore: boolean }) {
  if (!hasScore) return <span className="text-[10px]">⚪</span>;
  if (status === 'cut' || status === 'wd') return <span className="text-[10px]">🔴</span>;
  return <span className="text-[10px]">🟢</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MyTeamTracker({ picks, reserve }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [scores, setScores] = useState<Record<string, ScoreData>>({});
  const [holeData, setHoleData] = useState<GolferHoleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [scoresRes, holesRes] = await Promise.all([
        fetch('/api/scores'),
        fetch('/api/holes'),
      ]);
      if (!scoresRes.ok || !holesRes.ok) return;

      const [scoresJson, holesJson] = await Promise.all([
        scoresRes.json(),
        holesRes.json(),
      ]);

      const map: Record<string, ScoreData> = {};
      for (const s of scoresJson.scores ?? []) {
        map[s.golfer_id] = {
          score_to_par: s.score_to_par ?? null,
          status: s.status ?? null,
          today_score: s.today_score ?? null,
          current_hole: s.current_hole ?? null,
          current_round: s.current_round ?? null,
          round1_score: s.round1_score ?? null,
          round2_score: s.round2_score ?? null,
          round3_score: s.round3_score ?? null,
          round4_score: s.round4_score ?? null,
        };
      }
      setScores(map);

      const holes: GolferHoleData[] = (holesJson.holes ?? []).map((h: { golfer_id: string; round_number: number; hole_number: number; strokes: number; score_to_par: number }) => ({
        golferId: h.golfer_id,
        round: h.round_number,
        hole: h.hole_number,
        strokes: h.strokes,
        scoreToPar: h.score_to_par,
      }));
      setHoleData(holes);

      const latest = (scoresJson.scores ?? []).reduce(
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
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const validPicks = picks.filter((g): g is Golfer => g !== null);
  const pickIds = validPicks.map((g) => g.id);
  const reserveId = reserve?.id ?? '';

  // Build status map for reserve rule computation
  const statusMap = new Map<string, string>(
    Object.entries(scores).map(([id, s]) => [id, s.status ?? 'active'])
  );

  // Compute best-ball rounds
  const bbResult = pickIds.length > 0
    ? computeBestBallTeam(pickIds, reserveId, holeData, statusMap)
    : null;

  const tierLabels = ['T1', 'T2', 'T3', 'T4'];
  const roundLabels = ['R1', 'R2', 'R3', 'R4'];

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
          <span className={cn('text-gray-400 text-xs transition-transform duration-200', isOpen ? 'rotate-0' : '-rotate-90')}>
            ▾
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="bg-masters-green/5 px-4 pb-4 animate-fade-in">
          {/* Individual golfer rows */}
          <div className="space-y-2 pt-2">
            {validPicks.map((golfer, i) => {
              const s = scores[golfer.id] ?? null;
              const mc = s !== null && (s.score_to_par === 999 || s.status === 'cut' || s.status === 'wd');
              const hasScore = s !== null && s.score_to_par !== null;

              return (
                <div key={golfer.id} className={cn('flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-white', mc && 'opacity-50')}>
                  <StatusDot status={s?.status ?? null} hasScore={hasScore} />
                  <span className="text-[10px] font-bold text-masters-gold/70 w-6 text-center flex-shrink-0">
                    {tierLabels[i]}
                  </span>
                  <span className={cn('flex-1 text-sm font-medium truncate', mc ? 'line-through text-gray-400' : 'text-gray-800')}>
                    {golfer.name}
                  </span>
                  {s !== null && !mc && s.today_score !== null && (
                    <span className="text-[10px] text-gray-400 font-mono flex-shrink-0 text-right">
                      {fmtHole(s.current_hole, s.current_round) && (
                        <span className="mr-1">{fmtHole(s.current_hole, s.current_round)}</span>
                      )}
                      <span className={cn('font-bold', s.today_score < 0 ? 'text-red-500' : s.today_score === 0 ? 'text-gray-500' : 'text-gray-600')}>
                        {fmtToday(s.today_score)}
                      </span>
                    </span>
                  )}
                  <span className={cn(
                    'text-sm font-bold font-mono tabular-nums flex-shrink-0 w-10 text-right',
                    mc ? 'text-gray-400' : s !== null && s.score_to_par !== null && s.score_to_par < 0 ? 'text-red-500' : 'text-gray-600'
                  )}>
                    {fmtTotal(s?.score_to_par ?? null, s?.status ?? null)}
                  </span>
                </div>
              );
            })}

            {/* Reserve */}
            {reserve && (() => {
              const anyPickCut = validPicks.some((g) => {
                const s = scores[g.id];
                return s && (s.score_to_par === 999 || s.status === 'cut' || s.status === 'wd');
              });
              const rs = scores[reserve.id];
              return (
                <div className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5',
                  anyPickCut ? 'bg-masters-green/15 ring-1 ring-masters-green/30' : 'bg-white opacity-50'
                )}>
                  <StatusDot
                    status={anyPickCut ? (rs?.status ?? 'active') : null}
                    hasScore={anyPickCut && (rs?.score_to_par ?? null) !== null}
                  />
                  <span className="text-[10px] font-bold text-masters-gold/70 w-6 text-center flex-shrink-0">Rsv</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{reserve.name}</p>
                    {anyPickCut && (
                      <p className="text-[9px] text-masters-green font-bold uppercase tracking-wide leading-none mt-0.5">
                        Reserve active
                      </p>
                    )}
                  </div>
                  {anyPickCut && rs && (
                    <>
                      {rs.today_score !== null && (
                        <span className={cn('text-[10px] font-bold font-mono flex-shrink-0', (rs.today_score ?? 0) < 0 ? 'text-red-500' : 'text-gray-500')}>
                          {fmtToday(rs.today_score)}
                        </span>
                      )}
                      <span className={cn('text-sm font-bold font-mono tabular-nums flex-shrink-0 w-10 text-right', (rs.score_to_par ?? 0) < 0 ? 'text-red-500' : 'text-gray-600')}>
                        {fmtTotal(rs.score_to_par ?? null, rs.status ?? null)}
                      </span>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Best Ball round summary */}
          {bbResult && (
            <div className="mt-3 pt-2.5 border-t border-masters-green/10">
              <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest mb-2">
                Best Ball Rounds
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {bbResult.rounds.map((r) => (
                  <div key={r.round} className="bg-white rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">{roundLabels[r.round - 1]}</p>
                    <p className={cn(
                      'text-sm font-bold font-mono tabular-nums mt-0.5',
                      r.scoreToPar === null ? 'text-gray-300' :
                      r.scoreToPar < 0 ? 'text-red-500' :
                      r.scoreToPar === 0 ? 'text-gray-500' : 'text-gray-600'
                    )}>
                      {fmtBB(r.scoreToPar)}
                    </p>
                    {r.strokes !== null && (
                      <p className="text-[9px] text-gray-400 font-mono">{r.strokes}</p>
                    )}
                    {r.holesComplete > 0 && r.holesComplete < 18 && (
                      <p className="text-[8px] text-gray-300">{r.holesComplete}/18</p>
                    )}
                  </div>
                ))}
              </div>
              {bbResult.total !== null && (
                <div className="mt-1.5 flex items-center justify-between px-1">
                  <span className="text-[10px] text-gray-500 font-semibold">Total</span>
                  <div className="text-right">
                    <span className={cn(
                      'text-sm font-bold font-mono tabular-nums',
                      bbResult.total < 0 ? 'text-red-500' : bbResult.total === 0 ? 'text-gray-500' : 'text-gray-600'
                    )}>
                      {fmtBB(bbResult.total)}
                    </span>
                    {bbResult.totalStrokes !== null && (
                      <span className="text-[10px] text-gray-400 font-mono ml-1.5">({bbResult.totalStrokes})</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer: refresh */}
          <div className="mt-3 pt-2.5 border-t border-masters-green/10 flex justify-end">
            <button
              type="button"
              onClick={fetchData}
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
