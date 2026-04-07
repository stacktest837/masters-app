/**
 * Seed script: populates fake tournament data for local testing.
 * Safe to run multiple times (idempotent via upsert/update).
 *
 * Usage: npm run seed:test
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Augusta National par layout (holes 1–18)
const AUGUSTA_PARS = [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4];

// Fake entries: [player_name, T1, T2, T3, T4, reserve]
const ENTRIES = [
  ['Gary Johnson',  'Scottie Scheffler', 'Justin Thomas',   'Patrick Cantlay',  'Akshay Bhatia',  'Tony Finau'],
  ['Mike Smith',    'Rory McIlroy',      'Hideki Matsuyama','Shane Lowry',       'Will Zalatoris', 'Sergio Garcia'],
  ['Dave Wilson',   'Jon Rahm',          'Brooks Koepka',   'Tyrrell Hatton',    'Corey Conners',  'Sepp Straka'],
  ['Sarah Brown',   'Xander Schauffele', 'Jordan Spieth',   'Russell Henley',    'Jason Day',      'Wyndham Clark'],
  ['Chris Davis',   'Collin Morikawa',   'Viktor Hovland',  'Robert MacIntyre',  'Tom Kim',        'Keegan Bradley'],
  ['Tom Anderson',  'Bryson DeChambeau', 'Tommy Fleetwood', 'Min Woo Lee',       'Sam Burns',      'J.J. Spaun'],
] as const;

// Scores for every golfer that appears in any entry above
// score_to_par: 999 = MC/WD
// Designed for varied daily winners:
//   R1 winner → Dave Wilson  (Rahm -6 + Koepka -4, birdies spread across different holes)
//   R2 winner → Mike Smith   (McIlroy -5 + Matsuyama -5, both hot in round 2)
//   Overall   → Sarah Brown  (Xander + Spieth, consistent -4/-4 both rounds, deep team)
const GOLFER_SCORES: Record<string, { totalStp: number; r1: number; r2: number; status: 'active' | 'cut' | 'wd'; currentRound: number | null }> = {
  // T1 — spread across entries so no team monopolises
  'Scottie Scheffler':  { totalStp:  -7, r1: -2, r2: -5, status: 'active', currentRound: 2 }, // Gary  — slow start
  'Rory McIlroy':       { totalStp:  -8, r1: -3, r2: -5, status: 'active', currentRound: 2 }, // Mike  — dominant R2
  'Jon Rahm':           { totalStp:  -8, r1: -6, r2: -2, status: 'active', currentRound: 2 }, // Dave  — dominant R1
  'Xander Schauffele':  { totalStp:  -8, r1: -4, r2: -4, status: 'active', currentRound: 2 }, // Sarah — consistent
  'Collin Morikawa':    { totalStp:  -6, r1: -3, r2: -3, status: 'active', currentRound: 2 }, // Chris
  'Bryson DeChambeau':  { totalStp:  -4, r1: -3, r2: -1, status: 'active', currentRound: 2 }, // Tom   — fades R2
  // T2
  'Justin Thomas':      { totalStp:  -5, r1: -3, r2: -2, status: 'active', currentRound: 2 }, // Gary
  'Hideki Matsuyama':   { totalStp:  -6, r1: -1, r2: -5, status: 'active', currentRound: 2 }, // Mike  — strong R2
  'Brooks Koepka':      { totalStp:  -5, r1: -4, r2: -1, status: 'active', currentRound: 2 }, // Dave  — strong R1
  'Jordan Spieth':      { totalStp:  -7, r1: -4, r2: -3, status: 'active', currentRound: 2 }, // Sarah — strong both
  'Viktor Hovland':     { totalStp:  -3, r1: -1, r2: -2, status: 'active', currentRound: 2 }, // Chris
  'Tommy Fleetwood':    { totalStp:  -5, r1: -1, r2: -4, status: 'active', currentRound: 2 }, // Tom   — strong R2
  // T3
  'Patrick Cantlay':    { totalStp:  -3, r1: -1, r2: -2, status: 'active', currentRound: 2 }, // Gary
  'Shane Lowry':        { totalStp:  -3, r1: -2, r2: -1, status: 'active', currentRound: 2 }, // Mike
  'Tyrrell Hatton':     { totalStp:  -2, r1: -1, r2: -1, status: 'active', currentRound: 2 }, // Dave
  'Russell Henley':     { totalStp:  -4, r1: -2, r2: -2, status: 'active', currentRound: 2 }, // Sarah — solid support
  'Robert MacIntyre':   { totalStp:  -2, r1: -1, r2: -1, status: 'active', currentRound: 2 }, // Chris
  'Min Woo Lee':        { totalStp:   2, r1:  1, r2:  1, status: 'active', currentRound: 2 }, // Tom   — liability
  // T4
  'Akshay Bhatia':      { totalStp:  -2, r1: -1, r2: -1, status: 'active', currentRound: 2 }, // Gary
  'Will Zalatoris':     { totalStp:  -1, r1:  0, r2: -1, status: 'active', currentRound: 2 }, // Mike
  'Corey Conners':      { totalStp: 999, r1:  3, r2:  4, status: 'cut',    currentRound: null }, // Dave — MC, reserve activates R3/R4
  'Jason Day':          { totalStp:   1, r1:  1, r2:  0, status: 'active', currentRound: 2 }, // Sarah — weak T4
  'Tom Kim':            { totalStp:  -2, r1: -1, r2: -1, status: 'active', currentRound: 2 }, // Chris
  'Sam Burns':          { totalStp:   1, r1:  1, r2:  0, status: 'active', currentRound: 2 }, // Tom
  // Reserves
  'Tony Finau':         { totalStp:  -1, r1:  0, r2: -1, status: 'active', currentRound: 2 },
  'Sergio Garcia':      { totalStp:  -2, r1: -1, r2: -1, status: 'active', currentRound: 2 },
  'Sepp Straka':        { totalStp:  -2, r1: -1, r2: -1, status: 'active', currentRound: 2 }, // Dave's reserve — activates R3/R4
  'Wyndham Clark':      { totalStp:  -1, r1:  0, r2: -1, status: 'active', currentRound: 2 },
  'Keegan Bradley':     { totalStp:   0, r1:  0, r2:  0, status: 'active', currentRound: 2 },
  'J.J. Spaun':         { totalStp:   1, r1:  1, r2:  0, status: 'active', currentRound: 2 },
};

// ── Deterministic hole generator ──────────────────────────────────────────────

function deterministicShuffle(indices: number[], seed: number): number[] {
  const result = [...indices];
  let s = (seed ^ 0xdeadbeef) >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = (s ^ (s >>> 16)) >>> 0;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateRound(
  golferId: string,
  round: number,
  targetStp: number,
  now: string
): { golfer_id: string; round_number: number; hole_number: number; strokes: number; score_to_par: number; updated_at: string }[] {
  const holes = AUGUSTA_PARS.map((par, i) => ({
    golfer_id: golferId,
    round_number: round,
    hole_number: i + 1,
    strokes: par,
    score_to_par: 0,
    updated_at: now,
  }));

  // Deterministic seed from golfer ID characters + round
  const idSeed = golferId.split('').reduce((acc, c) => Math.imul(acc, 31) + c.charCodeAt(0) | 0, 0);
  const shuffled = deterministicShuffle(
    Array.from({ length: 18 }, (_, i) => i),
    Math.abs(idSeed) + round * 997
  );

  let remaining = targetStp;
  for (const idx of shuffled) {
    if (remaining === 0) break;
    if (remaining < 0) {
      // Birdie: subtract 1 stroke
      holes[idx].strokes = AUGUSTA_PARS[idx] - 1;
      holes[idx].score_to_par = -1;
      remaining++;
    } else {
      // Bogey: add 1 stroke
      holes[idx].strokes = AUGUSTA_PARS[idx] + 1;
      holes[idx].score_to_par = 1;
      remaining--;
    }
  }

  return holes;
}

// ── Main seed function ────────────────────────────────────────────────────────

async function seed() {
  const now = new Date().toISOString();
  console.log('🌱 Seeding test data...\n');

  // 1. Fetch all golfers to get IDs
  const { data: golfers, error: golfersErr } = await supabase
    .from('golfers')
    .select('id, name');
  if (golfersErr) throw new Error(`Failed to fetch golfers: ${golfersErr.message}`);
  if (!golfers?.length) throw new Error('No golfers found — run "npm run seed" first to seed golfers.');

  const golferByName = new Map(golfers.map((g) => [g.name, g.id]));

  const getGolferId = (name: string): string => {
    const id = golferByName.get(name);
    if (!id) throw new Error(`Golfer not found: "${name}"`);
    return id;
  };

  // 2. Upsert entries
  console.log('📋 Upserting entries...');
  for (const [playerName, t1, t2, t3, t4, reserve] of ENTRIES) {
    const entryData = {
      player_name: playerName,
      pick_tier1_id: getGolferId(t1),
      pick_tier2_id: getGolferId(t2),
      pick_tier3_id: getGolferId(t3),
      pick_tier4_id: getGolferId(t4),
      reserve_id: getGolferId(reserve),
      tiebreaker: 0,
      updated_at: now,
    };

    // Check if entry exists
    const { data: existing } = await supabase
      .from('entries')
      .select('id')
      .ilike('player_name', playerName)
      .maybeSingle();

    if (existing) {
      await supabase.from('entries').update(entryData).eq('id', existing.id);
      console.log(`  ✓ Updated: ${playerName}`);
    } else {
      await supabase.from('entries').insert(entryData);
      console.log(`  ✓ Created: ${playerName}`);
    }
  }

  // 3. Upsert scores
  console.log('\n🏌️  Upserting scores...');
  for (const [name, data] of Object.entries(GOLFER_SCORES)) {
    const golferId = golferByName.get(name);
    if (!golferId) { console.warn(`  ⚠ Golfer not found: ${name}`); continue; }

    const { error } = await supabase.from('scores').upsert(
      {
        golfer_id: golferId,
        score_to_par: data.totalStp,
        status: data.status,
        today_score: data.r2,
        current_hole: data.status === 'cut' ? null : 18,
        current_round: data.currentRound,
        round1_score: data.r1,
        round2_score: data.r2,
        round3_score: null,
        round4_score: null,
        updated_at: now,
      },
      { onConflict: 'golfer_id' }
    );
    if (error) console.error(`  ✗ ${name}: ${error.message}`);
    else console.log(`  ✓ ${name}: ${data.totalStp === 999 ? 'MC' : data.totalStp > 0 ? `+${data.totalStp}` : data.totalStp} (R1:${data.r1 > 0 ? '+' : ''}${data.r1} R2:${data.r2 > 0 ? '+' : ''}${data.r2})`);
  }

  // 4. Upsert golfer_holes for R1 and R2
  console.log('\n🕳️  Upserting hole-by-hole data (R1 + R2)...');
  const allHoleRows: ReturnType<typeof generateRound> = [];

  for (const [name, data] of Object.entries(GOLFER_SCORES)) {
    const golferId = golferByName.get(name);
    if (!golferId) continue;

    // All golfers get R1 and R2 hole data (even MC ones — they played before the cut)
    allHoleRows.push(...generateRound(golferId, 1, data.r1, now));
    allHoleRows.push(...generateRound(golferId, 2, data.r2, now));
  }

  // Upsert in batches of 200
  const BATCH = 200;
  for (let i = 0; i < allHoleRows.length; i += BATCH) {
    const batch = allHoleRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('golfer_holes')
      .upsert(batch, { onConflict: 'golfer_id,round_number,hole_number' });
    if (error) console.error(`  ✗ Hole batch ${i}–${i + BATCH}: ${error.message}`);
  }
  console.log(`  ✓ ${allHoleRows.length} hole rows upserted (${Object.keys(GOLFER_SCORES).length} golfers × 2 rounds × 18 holes)`);

  // 5. Lock picks
  console.log('\n🔒 Locking picks...');
  const { data: config, error: configErr } = await supabase
    .from('pool_config')
    .select('id')
    .single();
  if (configErr) throw new Error(`Failed to fetch pool_config: ${configErr.message}`);

  const { error: lockErr } = await supabase
    .from('pool_config')
    .update({ picks_locked: true, updated_at: now })
    .eq('id', config.id);
  if (lockErr) console.error(`  ✗ Lock failed: ${lockErr.message}`);
  else console.log('  ✓ Picks locked');

  console.log('\n✅ Test data seeded. Visit /scorecard or /leaderboard to preview.\n');
  console.log('Tip: Dave Wilson\'s team has Corey Conners (MC) → reserve Sepp Straka activates in R3/R4.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
