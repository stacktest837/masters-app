export interface Golfer {
  id: string;
  name: string;
  tier: number;
  display_order: number;
}

export interface Entry {
  id: string;
  player_name: string;
  pick_tier1_id: string;
  pick_tier2_id: string;
  pick_tier3_id: string;
  pick_tier4_id: string;
  reserve_id: string;
  tiebreaker: number;
  created_at: string;
  updated_at: string;
}

export interface EntryWithGolfers extends Entry {
  pick_tier1: Golfer;
  pick_tier2: Golfer;
  pick_tier3: Golfer;
  pick_tier4: Golfer;
  reserve: Golfer;
}

export interface Score {
  id: string;
  golfer_id: string;
  score_to_par: number; // 999 = missed cut / WD
  status: 'active' | 'cut' | 'wd';
  today_score: number | null;
  current_hole: number | null; // 0-18; 18 = finished round
  current_round: number | null; // 1-4
  round1_score: number | null;
  round2_score: number | null;
  round3_score: number | null;
  round4_score: number | null;
  updated_at: string;
}

export interface PoolConfig {
  id: string;
  picks_locked: boolean;
  rank_snapshot: Record<string, number>; // entryId → rank before last sync
  updated_at: string;
}

export interface GolferHole {
  id: string;
  golfer_id: string;
  round_number: number;
  hole_number: number;
  strokes: number | null;
  score_to_par: number | null;
  updated_at: string;
}

export interface TeamScore {
  entry: EntryWithGolfers;
  total: number | null;
  golfer_scores: { golfer: Golfer; score: number | null; status: string }[];
  reserve_used: boolean;
}
