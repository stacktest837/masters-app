import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GOLFERS: { name: string; tier: number }[] = [
  // Tier 1
  { name: 'Scottie Scheffler', tier: 1 },
  { name: 'Jon Rahm', tier: 1 },
  { name: 'Rory McIlroy', tier: 1 },
  { name: 'Bryson DeChambeau', tier: 1 },
  { name: 'Ludvig Aberg', tier: 1 },
  { name: 'Xander Schauffele', tier: 1 },
  { name: 'Cameron Young', tier: 1 },
  // Tier 2
  { name: 'Tommy Fleetwood', tier: 2 },
  { name: 'Matt Fitzpatrick', tier: 2 },
  { name: 'Collin Morikawa', tier: 2 },
  { name: 'Justin Rose', tier: 2 },
  { name: 'Jordan Spieth', tier: 2 },
  { name: 'Brooks Koepka', tier: 2 },
  { name: 'Hideki Matsuyama', tier: 2 },
  // Tier 3
  { name: 'Robert MacIntyre', tier: 3 },
  { name: 'Russell Henley', tier: 3 },
  { name: 'Chris Gotterup', tier: 3 },
  { name: 'Patrick Reed', tier: 3 },
  { name: 'Viktor Hovland', tier: 3 },
  { name: 'Si Woo Kim', tier: 3 },
  { name: 'Min Woo Lee', tier: 3 },
  // Tier 4
  { name: 'Justin Thomas', tier: 4 },
  { name: 'Patrick Cantlay', tier: 4 },
  { name: 'Adam Scott', tier: 4 },
  { name: 'Akshay Bhatia', tier: 4 },
  { name: 'Sepp Straka', tier: 4 },
  { name: 'Tyrrell Hatton', tier: 4 },
  { name: 'Jason Day', tier: 4 },
  { name: 'Jake Knapp', tier: 4 },
  { name: 'Shane Lowry', tier: 4 },
  { name: 'Sam Burns', tier: 4 },
  { name: 'Corey Conners', tier: 4 },
  { name: 'Nicolai Hojgaard', tier: 4 },
  { name: 'J.J. Spaun', tier: 4 },
  { name: 'Kurt Kitayama', tier: 4 },
  { name: 'Jacob Bridgeman', tier: 4 },
  { name: 'Maverick McNealy', tier: 4 },
  { name: 'Matthew McCarty', tier: 4 },
  { name: 'Cameron Smith', tier: 4 },
  { name: 'Harris English', tier: 4 },
  { name: 'Ben Griffin', tier: 4 },
  { name: 'Daniel Berger', tier: 4 },
  { name: 'Gary Woodland', tier: 4 },
  { name: 'Max Homa', tier: 4 },
  { name: 'Sungjae Im', tier: 4 },
  { name: 'Rasmus Hojgaard', tier: 4 },
  { name: 'Keegan Bradley', tier: 4 },
  { name: 'Marco Penge', tier: 4 },
  { name: 'Harry Hall', tier: 4 },
  { name: 'Alexander Noren', tier: 4 },
  { name: 'Ryan Gerard', tier: 4 },
  { name: 'Aaron Rai', tier: 4 },
  { name: 'Nick Taylor', tier: 4 },
  { name: 'Brian Harman', tier: 4 },
  { name: 'Sam Stevens', tier: 4 },
  { name: 'Ryan Fox', tier: 4 },
  { name: 'Wyndham Clark', tier: 4 },
  { name: 'Sergio Garcia', tier: 4 },
  { name: 'Max Greyserman', tier: 4 },
  { name: 'Dustin Johnson', tier: 4 },
  { name: 'Casey Jarvis', tier: 4 },
  { name: 'Carlos Ortiz', tier: 4 },
  { name: 'Hao-Tong Li', tier: 4 },
  { name: 'Tom McKibbin', tier: 4 },
  { name: 'Nicolas Echavarria', tier: 4 },
  { name: 'Kristoffer Reitan', tier: 4 },
  { name: 'Rasmus Neergaard-Petersen', tier: 4 },
  { name: 'John Keefer', tier: 4 },
  { name: 'Michael Kim', tier: 4 },
  { name: 'Andrew Novak', tier: 4 },
  { name: 'Aldrich Potgieter', tier: 4 },
  { name: 'Michael Brennan', tier: 4 },
  { name: 'Sami Valimaki', tier: 4 },
  { name: 'Davis Riley', tier: 4 },
  { name: 'Bubba Watson', tier: 4 },
  { name: 'Charl Schwartzel', tier: 4 },
  { name: 'Zach Johnson', tier: 4 },
  { name: 'Brian Campbell', tier: 4 },
  { name: 'Danny Willett', tier: 4 },
  { name: 'Ethan Fang', tier: 4 },
  { name: 'Fifa Laopakdee', tier: 4 },
  { name: 'Angel Cabrera', tier: 4 },
  { name: 'Jackson Herrington', tier: 4 },
  { name: 'Mason Howell', tier: 4 },
  { name: 'Mateo Pulcini', tier: 4 },
  { name: 'Naoyuki Kataoka', tier: 4 },
  { name: 'Brandon Holtz', tier: 4 },
  { name: 'Fred Couples', tier: 4 },
  { name: 'Jose Maria Olazabal', tier: 4 },
  { name: 'Mike Weir', tier: 4 },
  // Skipped: Vijay Singh, Phil Mickelson (WITHDRAWN), Tiger Woods (WITHDRAWN)
];

async function resetAndSeed() {
  console.log('--- Clearing existing data ---');

  // Delete in FK dependency order
  const tables = ['golfer_holes', 'scores', 'entries', 'golfers'] as const;
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.error(`Failed to delete ${table}:`, error.message);
      process.exit(1);
    }
    console.log(`  Cleared ${table}`);
  }

  // Reset picks_locked
  const { error: configError } = await supabase
    .from('pool_config')
    .update({ picks_locked: false })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (configError) {
    console.error('Failed to reset pool_config:', configError.message);
    process.exit(1);
  }
  console.log('  Reset picks_locked = false');

  console.log(`\n--- Seeding ${GOLFERS.length} golfers ---`);

  for (let i = 0; i < GOLFERS.length; i++) {
    const g = GOLFERS[i];
    const { error } = await supabase
      .from('golfers')
      .insert({ name: g.name, tier: g.tier, display_order: i });

    if (error) {
      console.error(`Failed to seed ${g.name}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n--- Verifying ---');
  const { data, error } = await supabase
    .from('golfers')
    .select('tier, name')
    .order('tier')
    .order('display_order');

  if (error) {
    console.error('Verify failed:', error.message);
    return;
  }

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const g of data || []) {
    counts[g.tier as keyof typeof counts]++;
  }
  console.log(`Tier 1: ${counts[1]} | Tier 2: ${counts[2]} | Tier 3: ${counts[3]} | Tier 4: ${counts[4]}`);
  console.log(`Total: ${data?.length} golfers`);
}

resetAndSeed().catch(console.error);
