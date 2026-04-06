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
  { name: 'Rory McIlroy', tier: 1 },
  { name: 'Jon Rahm', tier: 1 },
  { name: 'Xander Schauffele', tier: 1 },
  { name: 'Collin Morikawa', tier: 1 },
  { name: 'Bryson DeChambeau', tier: 1 },
  { name: 'Ludvig Aberg', tier: 1 },
  // Tier 2
  { name: 'Justin Thomas', tier: 2 },
  { name: 'Hideki Matsuyama', tier: 2 },
  { name: 'Brooks Koepka', tier: 2 },
  { name: 'Jordan Spieth', tier: 2 },
  { name: 'Joaquin Niemann', tier: 2 },
  { name: 'Viktor Hovland', tier: 2 },
  { name: 'Tommy Fleetwood', tier: 2 },
  // Tier 3
  { name: 'Patrick Cantlay', tier: 3 },
  { name: 'Shane Lowry', tier: 3 },
  { name: 'Tyrrell Hatton', tier: 3 },
  { name: 'Russell Henley', tier: 3 },
  { name: 'Robert MacIntyre', tier: 3 },
  { name: 'Min Woo Lee', tier: 3 },
  { name: 'Cameron Smith', tier: 3 },
  // Tier 4
  { name: 'Akshay Bhatia', tier: 4 },
  { name: 'Will Zalatoris', tier: 4 },
  { name: 'Sergio Garcia', tier: 4 },
  { name: 'Corey Conners', tier: 4 },
  { name: 'Sepp Straka', tier: 4 },
  { name: 'Tony Finau', tier: 4 },
  { name: 'Jason Day', tier: 4 },
  { name: 'Wyndham Clark', tier: 4 },
  { name: 'Tom Kim', tier: 4 },
  { name: 'Keegan Bradley', tier: 4 },
  { name: 'Brian Harman', tier: 4 },
  { name: 'Sahith Theegala', tier: 4 },
  { name: 'Patrick Reed', tier: 4 },
  { name: 'Dustin Johnson', tier: 4 },
  { name: 'Sungjae Im', tier: 4 },
  { name: 'Aaron Rai', tier: 4 },
  { name: 'Justin Rose', tier: 4 },
  { name: 'Daniel Berger', tier: 4 },
  { name: 'Davis Thompson', tier: 4 },
  { name: 'Phil Mickelson', tier: 4 },
  { name: 'Byeong-Hun An', tier: 4 },
  { name: 'Sam Burns', tier: 4 },
  { name: 'J.J. Spaun', tier: 4 },
  { name: 'Lucas Glover', tier: 4 },
  { name: 'Adam Scott', tier: 4 },
  { name: 'Taylor Pendrith', tier: 4 },
  { name: 'Matt Fitzpatrick', tier: 4 },
  { name: 'Maverick McNealy', tier: 4 },
  { name: 'Billy Horschel', tier: 4 },
  { name: 'Michael Kim', tier: 4 },
  { name: 'Thomas Detry', tier: 4 },
  { name: 'Denny McCarthy', tier: 4 },
  { name: 'Harris English', tier: 4 },
  { name: 'Stephan Jaeger', tier: 4 },
  { name: 'Laurie Canter', tier: 4 },
  { name: 'Rasmus Hojgaard', tier: 4 },
  { name: 'Cameron Young', tier: 4 },
  { name: 'Nicolai Hojgaard', tier: 4 },
  { name: 'Nick Taylor', tier: 4 },
  { name: 'Max Greyserman', tier: 4 },
  { name: 'J.T. Poston', tier: 4 },
  { name: 'Max Homa', tier: 4 },
  { name: 'Tom Hoge', tier: 4 },
  { name: 'Nicolas Echavarria', tier: 4 },
  { name: 'Christiaan Bezuidenhout', tier: 4 },
  { name: 'Cameron Davis', tier: 4 },
  { name: 'Joe Highsmith', tier: 4 },
  { name: 'Nick Dunlap', tier: 4 },
  { name: 'Austin Eckroat', tier: 4 },
  { name: 'Chris Kirk', tier: 4 },
  { name: 'Matthieu Pavon', tier: 4 },
  { name: 'Kevin Yu', tier: 4 },
  { name: 'Matthew McCarty', tier: 4 },
  { name: 'Jhonattan Vegas', tier: 4 },
  { name: 'Bubba Watson', tier: 4 },
  { name: 'Charl Schwartzel', tier: 4 },
  { name: 'Davis Riley', tier: 4 },
  { name: 'Danny Willett', tier: 4 },
  { name: 'Thriston Lawrence', tier: 4 },
  { name: 'Adam Schenk', tier: 4 },
  { name: 'Zach Johnson', tier: 4 },
  { name: 'Brian Campbell', tier: 4 },
  { name: 'Patton Kizzire', tier: 4 },
  { name: 'Jose Luis Ballester', tier: 4 },
  { name: 'Justin Hastings', tier: 4 },
  { name: 'Evan Beck', tier: 4 },
  { name: 'Bernhard Langer', tier: 4 },
  { name: 'Noah Kent', tier: 4 },
  { name: 'Rafael Campos', tier: 4 },
  { name: 'Angel Cabrera', tier: 4 },
  { name: 'Fred Couples', tier: 4 },
  { name: 'Hiroshi Tai', tier: 4 },
  { name: 'Mike Weir', tier: 4 },
  { name: 'Jose Maria Olazabal', tier: 4 },
];

async function seed() {
  console.log(`Seeding ${GOLFERS.length} golfers...`);

  for (let i = 0; i < GOLFERS.length; i++) {
    const g = GOLFERS[i];
    const { error } = await supabase
      .from('golfers')
      .upsert(
        { name: g.name, tier: g.tier, display_order: i },
        { onConflict: 'name' }
      );

    if (error) {
      console.error(`Failed to seed ${g.name}:`, error.message);
    }
  }

  console.log('Done! Verifying...');
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

seed().catch(console.error);
