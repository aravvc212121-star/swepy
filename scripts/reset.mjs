import postgres from 'postgres';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/swepy';
const sql = postgres(url);

async function run() {
  console.log('Resetting database...');
  await sql`DROP SCHEMA public CASCADE;`;
  await sql`CREATE SCHEMA public;`;
  await sql`GRANT ALL ON SCHEMA public TO postgres;`;
  await sql`GRANT ALL ON SCHEMA public TO public;`;
  console.log('Database reset successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
