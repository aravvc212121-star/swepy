export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../server/db/client';
import { uuidv7 } from '../../../server/lib/id';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    await sql`
      INSERT INTO demo_messages (id, payload)
      VALUES (${uuidv7()}, ${sql.json(payload)})
    `;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/messages error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    
    let rows;
    if (since) {
      const sinceDate = new Date(Number(since));
      rows = await sql`
        SELECT payload FROM demo_messages 
        WHERE created_at > ${sinceDate}
        ORDER BY created_at ASC
      `;
    } else {
      rows = await sql`
        SELECT payload FROM demo_messages 
        WHERE created_at > NOW() - INTERVAL '30 seconds'
        ORDER BY created_at ASC
      `;
    }

    return NextResponse.json({ events: rows.map(r => r.payload) });
  } catch (err: any) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

