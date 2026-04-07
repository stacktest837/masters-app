/**
 * Clear script: wipes all entries, scores, golfer_holes and unlocks picks.
 * Safe to run multiple times.
 *
 * Usage: npm run seed:clear
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clear() {
  console.log('🧹 Clearing test data...\n');

  // Delete golfer_holes
  const { error: holesErr, count: holesCount } = await supabase
    .from('golfer_holes')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // match all rows
  if (holesErr) console.error(`  ✗ golfer_holes: ${holesErr.message}`);
  else console.log(`  ✓ Deleted ${holesCount ?? '?'} golfer_holes rows`);

  // Delete scores
  const { error: scoresErr, count: scoresCount } = await supabase
    .from('scores')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (scoresErr) console.error(`  ✗ scores: ${scoresErr.message}`);
  else console.log(`  ✓ Deleted ${scoresCount ?? '?'} scores rows`);

  // Delete entries
  const { error: entriesErr, count: entriesCount } = await supabase
    .from('entries')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (entriesErr) console.error(`  ✗ entries: ${entriesErr.message}`);
  else console.log(`  ✓ Deleted ${entriesCount ?? '?'} entries rows`);

  // Unlock picks + reset rank snapshot
  const { data: config, error: configErr } = await supabase
    .from('pool_config')
    .select('id')
    .single();
  if (configErr) {
    console.error(`  ✗ pool_config fetch: ${configErr.message}`);
  } else {
    const { error: updateErr } = await supabase
      .from('pool_config')
      .update({ picks_locked: false, rank_snapshot: {}, updated_at: new Date().toISOString() })
      .eq('id', config.id);
    if (updateErr) console.error(`  ✗ pool_config update: ${updateErr.message}`);
    else console.log('  ✓ Picks unlocked, rank snapshot cleared');
  }

  console.log('\n✅ Done — app is back to pre-tournament state.\n');
}

clear().catch((err) => {
  console.error('Clear failed:', err);
  process.exit(1);
});
