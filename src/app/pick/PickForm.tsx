'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
import type { Golfer } from '@/types';

interface Props {
  tier1: Golfer[];
  tier2: Golfer[];
  tier3: Golfer[];
  tier4: Golfer[];
  isLocked: boolean;
}

interface Picks {
  tier1: string;
  tier2: string;
  tier3: string;
  tier4: string;
  reserve: string;
}

type ViewMode = 'picking' | 'confirmation' | 'editing';

const EMPTY_PICKS: Picks = { tier1: '', tier2: '', tier3: '', tier4: '', reserve: '' };

const TIER_META: Record<number, { label: string; description: string }> = {
  1: { label: 'Tier 1', description: 'The Favorites' },
  2: { label: 'Tier 2', description: 'The Contenders' },
  3: { label: 'Tier 3', description: 'Dark Horses' },
  4: { label: 'Tier 4', description: 'The Field' },
};

function fmtTB(n: number) {
  return n < 0 ? String(n) : n === 0 ? 'E' : `+${n}`;
}

// ── Shared: Golfer card ──────────────────────────────────────────────────────

function GolferCard({ golfer, selected, onClick }: { golfer: Golfer; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'pressable select-none flex items-center gap-2.5 w-full p-3 rounded-xl border-2 text-left transition-all duration-150',
        selected
          ? 'bg-masters-green border-masters-gold shadow-gold'
          : 'bg-white border-gray-100 hover:border-masters-green/20 hover:shadow-sm active:bg-gray-50'
      )}
    >
      <span
        className={cn(
          'flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-150',
          selected ? 'border-masters-gold bg-masters-gold' : 'border-gray-300 bg-white'
        )}
      >
        {selected && <span className="w-1.5 h-1.5 rounded-full bg-masters-green-dark block" />}
      </span>
      <span className={cn('text-sm font-medium leading-tight', selected ? 'text-white' : 'text-gray-800')}>
        {golfer.name}
      </span>
      {selected && <span className="ml-auto text-masters-gold text-xs font-bold">✓</span>}
    </button>
  );
}

// ── Picking view: full-form tier section ────────────────────────────────────

function TierSection({
  tier, golfers, selected, onSelect, scrollable = false,
}: {
  tier: number; golfers: Golfer[]; selected: string; onSelect: (id: string) => void; scrollable?: boolean;
}) {
  const meta = TIER_META[tier];
  const hasPick = Boolean(selected);
  return (
    <div className="mb-4 rounded-2xl overflow-hidden shadow-card animate-fade-in">
      <div className="bg-masters-green px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-masters-gold text-[10px] font-bold uppercase tracking-[0.2em]">{meta.label}</p>
          <p className="text-white font-serif text-base mt-0.5">{meta.description}</p>
        </div>
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200',
          hasPick ? 'bg-masters-gold text-masters-green-dark scale-110' : 'bg-white/10 text-white/40'
        )}>
          {hasPick ? '✓' : tier}
        </div>
      </div>
      <div className="bg-white p-3">
        <div className={cn('grid grid-cols-2 gap-2', scrollable ? 'max-h-60 overflow-y-auto no-scrollbar pr-0.5' : '')}>
          {golfers.map((g) => (
            <GolferCard key={g.id} golfer={g} selected={selected === g.id} onClick={() => onSelect(g.id)} />
          ))}
        </div>
        {!hasPick && <p className="text-xs text-red-400/80 mt-2 pl-1">Select one golfer</p>}
      </div>
    </div>
  );
}

// ── Shared: Name input ───────────────────────────────────────────────────────

type LookupStatus = 'idle' | 'loading' | 'found' | 'not-found';

function NameInput({ value, onChange, status }: { value: string; onChange: (v: string) => void; status: LookupStatus }) {
  return (
    <div>
      <label htmlFor="playerName" className="block text-[10px] text-masters-gold font-bold uppercase tracking-widest mb-2">
        Your Name
      </label>
      <div className="relative">
        <input
          id="playerName"
          type="text"
          placeholder="First Last"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-masters-green focus:ring-1 focus:ring-masters-green/30 transition-all pr-8"
          autoComplete="name"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
          {status === 'loading' && <span className="text-gray-300 animate-pulse">…</span>}
          {status === 'found' && <span className="text-masters-green">✓</span>}
          {status === 'not-found' && value.includes(' ') && <span className="text-gray-300">+</span>}
        </span>
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">
        {status === 'not-found' && value.includes(' ')
          ? 'New entry — fill in your picks below'
          : 'First and last name required'}
      </p>
    </div>
  );
}

// ── Confirmation view ────────────────────────────────────────────────────────

interface PicksDisplay {
  tier1: Golfer; tier2: Golfer; tier3: Golfer; tier4: Golfer; reserve: Golfer;
}

function ConfirmationView({
  playerName,
  picksDisplay,
  tiebreaker,
  isNew,
  isLocked,
  savedPin,
  onEditRequest,
  onChangeName,
}: {
  playerName: string;
  picksDisplay: PicksDisplay;
  tiebreaker: number;
  isNew: boolean;
  isLocked: boolean;
  savedPin?: string | null;
  onEditRequest?: () => void;
  onChangeName?: () => void;
}) {
  const [pinInput, setPinInput] = useState('');
  const [showPinGate, setShowPinGate] = useState(false);
  const [pinError, setPinError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const firstName = playerName.split(' ')[0];
  const tierGolfers = [picksDisplay.tier1, picksDisplay.tier2, picksDisplay.tier3, picksDisplay.tier4];

  async function handleEditClick() {
    // New submission this session — PIN already known, skip gate
    if (savedPin) { onEditRequest?.(); return; }
    setShowPinGate(true);
    setPinError('');
    setPinInput('');
  }

  async function handlePinVerify() {
    if (pinInput.length !== 4) { setPinError('Enter your 4-digit PIN'); return; }
    setVerifying(true);
    setPinError('');
    try {
      const res = await fetch(
        `/api/entries?name=${encodeURIComponent(playerName)}&pin=${pinInput}&verify=1`
      );
      const json = await res.json();
      if (json.ok) {
        onEditRequest?.();
      } else {
        setPinError('Incorrect PIN — try again');
      }
    } catch {
      setPinError('Connection error — try again');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="animate-scale-in">
      {/* Header card */}
      <div className="bg-masters-green rounded-2xl px-5 py-6 mb-4 text-center">
        <div className="text-3xl mb-2 select-none">{isLocked ? '🔒' : '⛳'}</div>
        <p className="text-masters-gold/70 text-[10px] font-bold uppercase tracking-widest mb-1">
          {isLocked ? 'Picks Locked' : isNew ? "You're In!" : 'Your Picks'}
        </p>
        <h2 className="font-serif text-white text-xl font-bold">{firstName}</h2>
        <p className="text-white/50 text-xs mt-1">
          {isLocked ? 'Tournament underway — good luck!' : isNew ? 'Good luck this week.' : 'Looking good.'}
        </p>
      </div>

      {/* Picks summary */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-4">
        {tierGolfers.map((g, i) => (
          <div key={g.id} className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest">Tier {i + 1}</p>
              <p className="text-gray-800 font-medium text-sm mt-0.5">{g.name}</p>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3.5 bg-masters-surface border-t border-gray-100">
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Reserve</p>
            <p className="text-gray-600 font-medium text-sm mt-0.5">{picksDisplay.reserve.name}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 bg-masters-surface border-t border-gray-100">
          <p className="text-xs text-gray-500">Tiebreaker guess</p>
          <p className="text-sm font-bold text-masters-green font-mono">{fmtTB(tiebreaker)}</p>
        </div>
      </div>

      {/* PIN display — shown once after first submit */}
      {savedPin && (
        <div className="bg-masters-gold/10 border border-masters-gold/30 rounded-2xl px-4 py-4 mb-4 animate-fade-in">
          <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest mb-1">
            Your Edit PIN — save this!
          </p>
          <p className="font-mono text-3xl font-bold text-masters-green tracking-[0.3em] my-1">
            {savedPin}
          </p>
          <p className="text-xs text-gray-500">
            You&apos;ll need this PIN to edit your picks. It won&apos;t be shown again.
          </p>
        </div>
      )}

      {/* PIN gate — shown when Edit Picks is tapped on a returning visit */}
      {showPinGate && !savedPin && (
        <div className="bg-white rounded-2xl shadow-card p-4 mb-4 animate-fade-in">
          <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest mb-3">
            Enter Your Edit PIN
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="· · · ·"
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '')); setPinError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handlePinVerify()}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-[0.4em] focus:outline-none focus:border-masters-green focus:ring-1 focus:ring-masters-green/30 transition-all"
              autoFocus
            />
            <button
              onClick={handlePinVerify}
              disabled={verifying || pinInput.length !== 4}
              className="bg-masters-green text-white font-semibold px-5 py-3 rounded-xl hover:bg-masters-green-dark transition-colors pressable disabled:opacity-50"
            >
              {verifying ? '…' : 'Enter'}
            </button>
          </div>
          {pinError && <p className="text-red-500 text-xs mt-2">{pinError}</p>}
          <button
            onClick={() => setShowPinGate(false)}
            className="text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Actions */}
      {!isLocked && (
        <div className="flex gap-3 mb-3">
          <button
            onClick={handleEditClick}
            className="flex-1 border-2 border-masters-green text-masters-green font-semibold py-3.5 rounded-2xl hover:bg-masters-green/5 transition-colors pressable text-sm"
          >
            Edit Picks
          </button>
          <a
            href="/leaderboard"
            className="flex-1 bg-masters-green text-white font-semibold py-3.5 rounded-2xl hover:bg-masters-green-dark transition-colors text-center text-sm pressable"
          >
            Leaderboard →
          </a>
        </div>
      )}
      {isLocked && (
        <a
          href="/leaderboard"
          className="flex items-center justify-center w-full bg-masters-green text-white font-semibold py-4 rounded-2xl hover:bg-masters-green-dark transition-colors pressable mb-3"
        >
          View Live Leaderboard →
        </a>
      )}
      {onChangeName && (
        <button
          onClick={onChangeName}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
        >
          Not {firstName}? Change name →
        </button>
      )}
    </div>
  );
}

// ── Editing view: per-tier inline expand ────────────────────────────────────

type EditField = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'reserve' | 'tiebreaker';

function EditView({
  playerName,
  picks,
  tiebreaker,
  pin,
  tier1,
  tier2,
  tier3,
  tier4,
  onPicksChange,
  onTiebreakerChange,
  onBack,
}: {
  playerName: string;
  picks: Picks;
  tiebreaker: number;
  pin: string;
  tier1: Golfer[];
  tier2: Golfer[];
  tier3: Golfer[];
  tier4: Golfer[];
  onPicksChange: (p: Picks) => void;
  onTiebreakerChange: (n: number) => void;
  onBack: () => void;
}) {
  const [expanded, setExpanded] = useState<EditField | null>(null);
  const [saving, setSaving] = useState<EditField | null>(null);
  const [saved, setSaved] = useState<EditField | null>(null);
  const [tbInput, setTbInput] = useState(String(tiebreaker));
  const allGolfers = [...tier1, ...tier2, ...tier3, ...tier4];
  const golferById = (id: string) => allGolfers.find((g) => g.id === id);

  async function saveEntry(newPicks: Picks, newTiebreaker: number) {
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_name: playerName,
        pick_tier1_id: newPicks.tier1,
        pick_tier2_id: newPicks.tier2,
        pick_tier3_id: newPicks.tier3,
        pick_tier4_id: newPicks.tier4,
        reserve_id: newPicks.reserve,
        tiebreaker: newTiebreaker,
        pin,
      }),
    });
  }

  async function handlePickChange(field: keyof Picks, newId: string) {
    const newPicks = { ...picks, [field]: newId };
    // if tier4 changes to what was the reserve, clear reserve
    if (field === 'tier4' && picks.reserve === newId) newPicks.reserve = '';
    setExpanded(null);
    setSaving(field as EditField);
    onPicksChange(newPicks);
    try { await saveEntry(newPicks, tiebreaker); } catch { /* silent — user sees optimistic update */ }
    setSaving(null);
    setSaved(field as EditField);
    setTimeout(() => setSaved(null), 2000);
  }

  async function handleTiebreakerSave() {
    const val = Number(tbInput);
    if (isNaN(val)) return;
    setExpanded(null);
    setSaving('tiebreaker');
    onTiebreakerChange(val);
    try { await saveEntry(picks, val); } catch { /* silent */ }
    setSaving(null);
    setSaved('tiebreaker');
    setTimeout(() => setSaved(null), 2000);
  }

  const tierGolfers: Record<EditField, Golfer[]> = {
    tier1, tier2, tier3, tier4,
    reserve: tier4.filter((g) => g.id !== picks.tier4),
    tiebreaker: [],
  };

  const tierLabels: Record<EditField, string> = {
    tier1: 'Tier 1 — Favorites',
    tier2: 'Tier 2 — Contenders',
    tier3: 'Tier 3 — Dark Horses',
    tier4: 'Tier 4 — The Field',
    reserve: 'Reserve (Tier 4)',
    tiebreaker: 'Tiebreaker',
  };

  const currentValueFor = (field: EditField): string => {
    if (field === 'tiebreaker') return fmtTB(tiebreaker);
    const g = golferById(picks[field as keyof Picks]);
    return g?.name ?? '—';
  };

  function EditRow({ field }: { field: EditField }) {
    const isOpen = expanded === field;
    const isSaving = saving === field;
    const isSaved = saved === field;

    return (
      <div className="border-b border-gray-50 last:border-0">
        {/* Row header */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest">{tierLabels[field]}</p>
            <p className={cn('text-sm font-medium mt-0.5', field === 'reserve' || field === 'tiebreaker' ? 'text-gray-600' : 'text-gray-800')}>
              {currentValueFor(field)}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            {isSaved && <span className="text-masters-green text-xs font-semibold">Saved ✓</span>}
            {isSaving ? (
              <span className="text-gray-400 text-xs">Saving…</span>
            ) : (
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : field)}
                className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-full border transition-all',
                  isOpen
                    ? 'bg-gray-100 border-gray-200 text-gray-600'
                    : 'border-masters-green/40 text-masters-green hover:bg-masters-green/5'
                )}
              >
                {isOpen ? 'Cancel' : 'Edit'}
              </button>
            )}
          </div>
        </div>

        {/* Expanded: golfer grid */}
        {isOpen && field !== 'tiebreaker' && (
          <div className="px-3 pb-3 bg-masters-surface border-t border-gray-100 animate-fade-in">
            {field === 'reserve' && !picks.tier4 ? (
              <p className="text-sm text-gray-400 italic py-3 px-1">Select your Tier 4 pick first</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-3 max-h-56 overflow-y-auto no-scrollbar pr-0.5">
                {tierGolfers[field].map((g) => (
                  <GolferCard
                    key={g.id}
                    golfer={g}
                    selected={picks[field as keyof Picks] === g.id}
                    onClick={() => handlePickChange(field as keyof Picks, g.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expanded: tiebreaker input */}
        {isOpen && field === 'tiebreaker' && (
          <div className="px-4 pb-4 bg-masters-surface border-t border-gray-100 animate-fade-in">
            <div className="flex items-center gap-3 pt-3">
              <input
                type="number"
                value={tbInput}
                onChange={(e) => setTbInput(e.target.value)}
                className="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono text-center focus:outline-none focus:border-masters-green focus:ring-1 focus:ring-masters-green/30 transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={handleTiebreakerSave}
                className="bg-masters-green text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-masters-green-dark transition-colors pressable"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Guess for winner&apos;s final score (e.g. -12)</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-card text-masters-green hover:bg-masters-surface transition-colors pressable"
        >
          ←
        </button>
        <div>
          <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest">Editing</p>
          <p className="font-serif text-gray-800 font-semibold text-sm">{playerName}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4 px-1">
        Tap <strong>Edit</strong> next to any pick to change it. Changes save automatically.
      </p>

      {/* Edit rows */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-4">
        {(['tier1', 'tier2', 'tier3', 'tier4', 'reserve', 'tiebreaker'] as EditField[]).map((field) => (
          <EditRow key={field} field={field} />
        ))}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="w-full bg-masters-green text-white font-semibold py-4 rounded-2xl hover:bg-masters-green-dark transition-colors pressable"
      >
        Done
      </button>
    </div>
  );
}

// ── Main orchestrator ────────────────────────────────────────────────────────

export default function PickForm({ tier1, tier2, tier3, tier4, isLocked }: Props) {
  const allGolfers = [...tier1, ...tier2, ...tier3, ...tier4];
  const golferById = (id: string) => allGolfers.find((g) => g.id === id);

  const [viewMode, setViewMode] = useState<ViewMode>('picking');
  const [isNew, setIsNew] = useState(true);

  const [nameInput, setNameInput] = useState('');
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle');

  const [picks, setPicks] = useState<Picks>(EMPTY_PICKS);
  const [tiebreaker, setTiebreaker] = useState(0);
  // PIN for the current session: set after first submit, used to skip PIN gate for immediate edits
  const [sessionPin, setSessionPin] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const lookupTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Auto-lookup on name change
  useEffect(() => {
    clearTimeout(lookupTimeout.current);
    const trimmed = nameInput.trim();
    if (!trimmed.includes(' ')) { setLookupStatus('idle'); return; }
    setLookupStatus('loading');
    lookupTimeout.current = setTimeout(() => doLookup(trimmed), 600);
    return () => clearTimeout(lookupTimeout.current);
  }, [nameInput]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doLookup(name: string) {
    try {
      const res = await fetch(`/api/entries?name=${encodeURIComponent(name)}`);
      const json = await res.json();
      if (json.entry) {
        const e = json.entry;
        setPicks({ tier1: e.pick_tier1_id, tier2: e.pick_tier2_id, tier3: e.pick_tier3_id, tier4: e.pick_tier4_id, reserve: e.reserve_id });
        setTiebreaker(e.tiebreaker);
        setIsNew(false);
        setLookupStatus('found');
        if (!isLocked) setViewMode('confirmation'); // jump straight to confirmation
      } else {
        setIsNew(true);
        setLookupStatus('not-found');
      }
    } catch {
      setLookupStatus('idle');
    }
  }

  function handlePick(tier: keyof Picks, id: string) {
    setPicks((prev) => {
      const next = { ...prev, [tier]: id };
      if (tier === 'tier4' && prev.reserve === id) next.reserve = '';
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    const name = nameInput.trim();
    if (!name.includes(' ')) { setSubmitError('Enter your first and last name'); return; }
    if (!picks.tier1 || !picks.tier2 || !picks.tier3 || !picks.tier4 || !picks.reserve) {
      setSubmitError('Make all picks and choose a reserve before submitting'); return;
    }
    if (isNaN(tiebreaker)) { setSubmitError('Enter your tiebreaker guess'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: name, pick_tier1_id: picks.tier1, pick_tier2_id: picks.tier2, pick_tier3_id: picks.tier3, pick_tier4_id: picks.tier4, reserve_id: picks.reserve, tiebreaker }),
      });
      const json = await res.json();
      if (!res.ok) { setSubmitError(json.error || 'Submission failed'); }
      else {
        setIsNew(true);
        if (json.pin) setSessionPin(json.pin); // store PIN for this session
        setViewMode('confirmation');
      }
    } catch {
      setSubmitError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  // Build display picks (requires all 5 golfer objects resolved)
  function buildPicksDisplay(): PicksDisplay | null {
    const t1 = golferById(picks.tier1);
    const t2 = golferById(picks.tier2);
    const t3 = golferById(picks.tier3);
    const t4 = golferById(picks.tier4);
    const rv = golferById(picks.reserve);
    if (!t1 || !t2 || !t3 || !t4 || !rv) return null;
    return { tier1: t1, tier2: t2, tier3: t3, tier4: t4, reserve: rv };
  }

  // ── Locked: name lookup → show locked confirmation or lock screen ─────────
  if (isLocked) {
    const pd = buildPicksDisplay();
    if (lookupStatus === 'found' && pd) {
      return (
        <ConfirmationView
          playerName={nameInput.trim()}
          picksDisplay={pd}
          tiebreaker={tiebreaker}
          isNew={false}
          isLocked={true}
          onChangeName={() => { setNameInput(''); setLookupStatus('idle'); setPicks(EMPTY_PICKS); }}
        />
      );
    }
    return (
      <div>
        <div className="bg-white rounded-2xl shadow-card p-5 mb-4 animate-fade-in">
          <div className="text-center mb-5">
            <div className="text-4xl mb-3 select-none">🔒</div>
            <h2 className="font-serif text-masters-green text-xl font-bold mb-1">Picks Are Locked</h2>
            <p className="text-gray-400 text-sm">The tournament has started.</p>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-3">Look up your picks:</p>
          <NameInput value={nameInput} onChange={setNameInput} status={lookupStatus} />
          {lookupStatus === 'not-found' && (
            <p className="text-xs text-gray-400 mt-2">No entry found for that name.</p>
          )}
        </div>
        <a href="/leaderboard" className="flex items-center justify-center w-full bg-masters-green text-white font-semibold py-4 rounded-2xl hover:bg-masters-green-dark transition-colors pressable">
          View Leaderboard →
        </a>
      </div>
    );
  }

  // ── Editing view ──────────────────────────────────────────────────────────
  if (viewMode === 'editing') {
    return (
      <EditView
        playerName={nameInput.trim()}
        picks={picks}
        tiebreaker={tiebreaker}
        pin={sessionPin ?? ''}
        tier1={tier1} tier2={tier2} tier3={tier3} tier4={tier4}
        onPicksChange={setPicks}
        onTiebreakerChange={setTiebreaker}
        onBack={() => setViewMode('confirmation')}
      />
    );
  }

  // ── Confirmation view ─────────────────────────────────────────────────────
  if (viewMode === 'confirmation') {
    const pd = buildPicksDisplay();
    if (pd) {
      return (
        <ConfirmationView
          playerName={nameInput.trim()}
          picksDisplay={pd}
          tiebreaker={tiebreaker}
          isNew={isNew}
          isLocked={false}
          savedPin={sessionPin}
          onEditRequest={() => setViewMode('editing')}
          onChangeName={() => { setNameInput(''); setLookupStatus('idle'); setPicks(EMPTY_PICKS); setTiebreaker(0); setSessionPin(null); setViewMode('picking'); }}
        />
      );
    }
    // Fallback (shouldn't happen but be safe)
    setViewMode('picking');
    return null;
  }

  // ── Picking view (new user) ───────────────────────────────────────────────
  const reserveOptions = tier4.filter((g) => g.id !== picks.tier4);
  const allPicksMade = picks.tier1 && picks.tier2 && picks.tier3 && picks.tier4 && picks.reserve;

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      {/* Name input */}
      <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
        <NameInput value={nameInput} onChange={setNameInput} status={lookupStatus} />
      </div>

      {/* Tiers */}
      <TierSection tier={1} golfers={tier1} selected={picks.tier1} onSelect={(id) => handlePick('tier1', id)} />
      <TierSection tier={2} golfers={tier2} selected={picks.tier2} onSelect={(id) => handlePick('tier2', id)} />
      <TierSection tier={3} golfers={tier3} selected={picks.tier3} onSelect={(id) => handlePick('tier3', id)} />
      <TierSection tier={4} golfers={tier4} selected={picks.tier4} onSelect={(id) => handlePick('tier4', id)} scrollable />

      {/* Reserve */}
      <div className="rounded-2xl overflow-hidden shadow-card animate-fade-in">
        <div className="bg-masters-green-dark px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-masters-gold text-[10px] font-bold uppercase tracking-[0.2em]">Reserve</p>
            <p className="text-white font-serif text-base mt-0.5">Tier 4 Backup</p>
          </div>
          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200', picks.reserve ? 'bg-masters-gold text-masters-green-dark scale-110' : 'bg-white/10 text-white/40')}>
            {picks.reserve ? '✓' : 'R'}
          </div>
        </div>
        <div className="bg-white p-3">
          {!picks.tier4 ? (
            <p className="text-sm text-gray-400 italic py-1 px-1">Select your Tier 4 pick first</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto no-scrollbar pr-0.5">
              {reserveOptions.map((g) => (
                <GolferCard key={g.id} golfer={g} selected={picks.reserve === g.id} onClick={() => handlePick('reserve', g.id)} />
              ))}
            </div>
          )}
          {picks.tier4 && !picks.reserve && <p className="text-xs text-red-400/80 mt-2 pl-1">Select a reserve</p>}
          <p className="text-xs text-gray-400 mt-2 px-1">Replaces your Tier 4 pick if they miss the cut</p>
        </div>
      </div>

      {/* Tiebreaker */}
      <div className="bg-white rounded-2xl shadow-card p-4 !mt-4">
        <label className="block text-[10px] text-masters-gold font-bold uppercase tracking-widest mb-3">Tiebreaker</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            placeholder="-12"
            value={tiebreaker === 0 ? '' : tiebreaker}
            onChange={(e) => setTiebreaker(Number(e.target.value))}
            className="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono text-center focus:outline-none focus:border-masters-green focus:ring-1 focus:ring-masters-green/30 transition-all"
          />
          <p className="text-xs text-gray-400 flex-1">Winner&apos;s final score guess. Closest wins a tie.</p>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 !mt-3 animate-fade-in">
          <p className="text-red-600 text-sm">{submitError}</p>
        </div>
      )}

      <div className="!mt-5 space-y-2">
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'pressable w-full font-bold py-4 rounded-2xl transition-all duration-200 text-base shadow-md',
            allPicksMade && nameInput.trim().includes(' ')
              ? 'bg-masters-green hover:bg-masters-green-dark text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            submitting && 'opacity-70'
          )}
        >
          {submitting ? 'Saving…' : 'Submit Picks'}
        </button>
        <p className="text-center text-[11px] text-gray-400">Picks lock Thursday April 9, 8 AM ET</p>
      </div>
    </form>
  );
}
