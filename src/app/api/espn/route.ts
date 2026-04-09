import { NextRequest, NextResponse } from 'next/server';
import { syncEspnScores } from '@/lib/sync';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

// GET /api/espn — verify admin password
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true });
}

// POST /api/espn — fetch ESPN scores and sync to Supabase
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await syncEspnScores();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('POST /api/espn:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
