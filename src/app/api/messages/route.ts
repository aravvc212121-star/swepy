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
    const sinceParam = url.searchParams.get('since');
    const since = sinceParam && sinceParam !== 'null' && sinceParam !== 'undefined' ? sinceParam : null;
    
    const timeRes = await sql`SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint as t`;
    const serverNow = timeRes[0].t;
    
    let rows;
    if (since) {
      const sinceDate = new Date(Number(since));
      rows = await sql`
        SELECT payload, (EXTRACT(EPOCH FROM created_at) * 1000)::bigint as ts 
        FROM demo_messages 
        WHERE created_at > ${sinceDate}
        ORDER BY created_at ASC
      `;
    } else {
      rows = await sql`
        SELECT payload, (EXTRACT(EPOCH FROM created_at) * 1000)::bigint as ts 
        FROM demo_messages 
        WHERE created_at > NOW() - INTERVAL '30 seconds'
        ORDER BY created_at ASC
      `;
    }

    let nextSince = serverNow;
    if (rows.length > 0) {
      const lastRowTs = rows[rows.length - 1].ts;
      if (lastRowTs >= serverNow) {
        nextSince = lastRowTs;
      }
    }

    return NextResponse.json({ 
      events: rows.map(r => r.payload),
      nextSince: String(nextSince)
    });
  } catch (err: any) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

