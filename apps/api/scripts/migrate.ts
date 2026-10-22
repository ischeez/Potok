import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { loadEnvironment } from '../src/config/environment';
import { DEFAULT_DATABASE_URL } from '../src/database/database.constants';

const MIGRATION_LOCK_ID = 2_076_514_823;
const migrationsDirectory = resolve(__dirname, '../migrations');

async function migrate(): Promise<void> {
  loadEnvironment();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(migrationsDirectory))
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();

    for (const file of files) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [file],
      );
      if (alreadyApplied.rowCount) continue;

      const sql = await readFile(resolve(migrationsDirectory, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        console.log(`Applied migration ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => undefined);
    client.release();
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration error';
  console.error(`Migration failed: ${message}`);
  process.exitCode = 1;
});
