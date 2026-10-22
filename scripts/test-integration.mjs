import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL ?? 'postgres://potok:potok@localhost:5432/potok_test';
const parsed = new URL(databaseUrl);
const databaseName = parsed.pathname.slice(1);
if (!/^[a-zA-Z0-9_]+_test$/.test(databaseName)) throw new Error('Use a dedicated database with a name ending in _test.');
parsed.pathname = '/postgres';
const pool = new Pool({ connectionString: parsed.toString(), connectionTimeoutMillis: 5000 });
try {
  const exists = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if (!exists.rowCount) await pool.query(`CREATE DATABASE "${databaseName}"`);
} finally { await pool.end(); }
const env = { ...process.env, DATABASE_URL: databaseUrl, TEST_DATABASE_URL: databaseUrl };
for (const args of [['run', 'db:migrate'], ['test', '-w', '@potok/api']]) {
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { stdio: 'inherit', env });
}
