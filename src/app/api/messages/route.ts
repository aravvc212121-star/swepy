export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../server/db/client';
import { uuidv7 } from '../../../server/lib/id';

// --- In-memory fallback to guarantee cross-device sync even if DB is down! ---
const g = globalThis as any;
if (!g.__demoMessages) {
  g.__demoMessages = [];
}
const memoryMessages = g.__demoMessages;

let tableCreated = false;
let tableCheckAttempted = false;

async function ensureTable() {
  if (tableCreated || tableCheckAttempted) return;
  tableCheckAttempted = true;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS demo_messages (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    tableCreated = true;
    console.log("✅ Database connected and demo_messages table is ready.");
  } catch (err: any) {
    console.log("⚠️ Postgres connection issue (" + (err?.message || err) + "). Using fast in-memory sync for live events.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const id = uuidv7();
    const ts = new Date().toISOString();

    // 1. In-memory cache
    memoryMessages.push({ id, payload, ts });
    if (memoryMessages.length > 500) memoryMessages.shift();

    // 2. Persist to Postgres database (so all deployed Render instances & devices see it)
    await ensureTable();
    if (tableCreated) {
      await sql`
        INSERT INTO demo_messages (id, payload)
        VALUES (${id}, ${sql.json(payload)})
      `.catch(e => console.warn("DB insert warning:", e.message));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/messages error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function extractActiveHelpers(messages: any[]): any[] {
  const helpersMap = new Map<string, any>();
  for (const m of messages) {
    const p = m.payload || m;
    if (!p || !p.helper_id) continue;
    if (p.type === 'helper_offline') {
      helpersMap.delete(p.helper_id);
    } else if (p.type === 'helper_online' || p.type === 'helper_location') {
      const existing = helpersMap.get(p.helper_id);
      helpersMap.set(p.helper_id, {
        helper_id: p.helper_id,
        name: p.name || existing?.name || 'Helper',
        lat: p.lat,
        lng: p.lng,
        last_ping: p.ts || Date.now(),
      });
    }
  }
  return Array.from(helpersMap.values());
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const sinceDecoded = since && since !== 'null' && since !== 'undefined' ? decodeURIComponent(since) : null;

    // Try DB first so Render instances and separate devices sync seamlessly
    try {
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
          WHERE created_at > NOW() - INTERVAL '45 seconds'
          ORDER BY created_at ASC
        `;
      }

      const recentRows = await sql`
        SELECT payload, created_at as ts 
        FROM demo_messages 
        WHERE created_at > NOW() - INTERVAL '45 seconds'
        ORDER BY created_at ASC
      `;
      const activeHelpers = extractActiveHelpers(recentRows);

      let nextSince = serverNow;
      if (rows.length > 0) {
        nextSince = new Date(rows[rows.length - 1].ts).toISOString();
      } else {
        nextSince = sinceDecoded ? sinceDecoded : serverNow;
      }

      return NextResponse.json({ 
        events: rows.map((r: any) => r.payload),
        nextSince,
        activeHelpers,
      });
    } catch {
      // Fallback to in-memory if DB is temporarily unreachable
      const serverNow = new Date().toISOString();
      const thirtySecsAgo = new Date(Date.now() - 45 * 1000).toISOString();
      let rows = memoryMessages;
      if (sinceDecoded) {
        rows = memoryMessages.filter((m: any) => m.ts > sinceDecoded);
      } else {
        rows = memoryMessages.filter((m: any) => m.ts > thirtySecsAgo);
      }

      const recentMem = memoryMessages.filter((m: any) => m.ts > thirtySecsAgo);
      const activeHelpers = extractActiveHelpers(recentMem);

      let nextSince = rows.length > 0 ? rows[rows.length - 1].ts : (sinceDecoded || serverNow);

      return NextResponse.json({ 
        events: rows.map((r: any) => r.payload),
        nextSince,
        activeHelpers,
      });
    }
  } catch (err: any) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
