import postgres from 'postgres';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("No database URL found in environment variables.");
  process.exit(1);
}

const sql = postgres(url);

async function run() {
  console.log('Creating demo_messages table...');
  await sql`
    CREATE TABLE IF NOT EXISTS demo_messages (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log('Created demo_messages successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
