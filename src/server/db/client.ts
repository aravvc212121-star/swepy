/**
 * Database client — single connection pool for the entire server.
 * Uses the `postgres` (porsager/postgres) driver with prepared statements
 * DISABLED so it works through PgBouncer/Supabase transaction pooler.
 *
 * PORTABILITY: swap DATABASE_URL to any Postgres and it works.
 */

import postgres from 'postgres';

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return url;
}

function getMigrationConnectionString(): string {
  return process.env.DIRECT_URL || getConnectionString();
}

/** Runtime pool — used by repositories. Prepared statements disabled for pooler compat. */
export const sql = postgres(getConnectionString(), {
  prepare: false,
  idle_timeout: 20,
  max: 10,
  connection: {
    application_name: 'swepy-server',
  },
});

/** Direct connection for migrations — bypasses pooler. */
export function createMigrationClient() {
  return postgres(getMigrationConnectionString(), {
    max: 1,
    idle_timeout: 5,
    connection: {
      application_name: 'swepy-migrations',
    },
  });
}

export type SqlClient = typeof sql;
