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
    const sinceDecoded = since && since !== 'null' && since !== 'undefined' ? decodeURIComponent(since) : null;
    
    // Get server time as ISO string
    const timeRes = await sql`SELECT NOW() as t`;
    const serverNow = timeRes[0].t.toISOString();
    
    let rows;
    if (sinceDecoded) {
      rows = await sql`
        SELECT payload, created_at as ts 
        FROM demo_messages 
        WHERE created_at > ${sinceDecoded}
        ORDER BY created_at ASC
      `;
    } else {
      rows = await sql`
        SELECT payload, created_at as ts 
        FROM demo_messages 
        WHERE created_at > NOW() - INTERVAL '30 seconds'
        ORDER BY created_at ASC
      `;
    }

    let nextSince = serverNow;
    if (rows.length > 0) {
      // Use the timestamp of the last (newest) row as ISO string
      nextSince = rows[rows.length - 1].ts.toISOString();
    } else {
      // If no new rows, keep the requested since
      nextSince = sinceDecoded ? sinceDecoded : serverNow;
    }

    return NextResponse.json({ 
      events: rows.map(r => r.payload),
      nextSince: nextSince
    });
  } catch (err: any) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

