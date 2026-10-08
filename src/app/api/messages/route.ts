export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../server/db/client';
import { uuidv7 } from '../../../server/lib/id';

let tableCreated = false;

async function ensureTable() {
  if (tableCreated) return;
  await sql`
    CREATE TABLE IF NOT EXISTS demo_messages (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  tableCreated = true;
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();

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
    await ensureTable();

    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const sinceDecoded = since && since !== 'null' && since !== 'undefined' ? decodeURIComponent(since) : null;
    
    // Get server time as ISO string
    const timeRes = await sql`SELECT NOW() as t`;
    const serverNow = new Date(timeRes[0].t).toISOString();
    
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
      nextSince = new Date(rows[rows.length - 1].ts).toISOString();
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

