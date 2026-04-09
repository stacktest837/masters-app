import { NextRequest, NextResponse } from 'next/server';
import { syncEspnScores } from '@/lib/sync';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncEspnScores();
    console.log(`Cron sync: ${result.synced} golfers, status=${result.status}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('Cron sync failed:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
