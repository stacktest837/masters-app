import { createServiceClient } from '@/lib/supabase';
import type { Golfer } from '@/types';
import PickForm from './PickForm';

export const revalidate = 0;

export default async function PickPage() {
  const supabase = createServiceClient();

  const [{ data: golfers }, { data: config }] = await Promise.all([
    supabase.from('golfers').select('*').order('tier').order('display_order'),
    supabase.from('pool_config').select('*').single(),
  ]);

  const byTier = (t: number) => (golfers as Golfer[] || []).filter((g) => g.tier === t);

  return (
    <PickForm
      tier1={byTier(1)}
      tier2={byTier(2)}
      tier3={byTier(3)}
      tier4={byTier(4)}
      isLocked={config?.picks_locked ?? false}
    />
  );
}
