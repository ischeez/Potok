import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getDatabaseUrl, getFrontendOrigin, getPort } from '../src/config/environment';

describe('production environment', () => {
  test('allows local defaults only outside production', () => {
    assert.equal(getFrontendOrigin({}), 'http://localhost:5173');
    assert.equal(getPort({}), 3001);
    assert.match(getDatabaseUrl({}), /^postgres:/);
    assert.throws(() => getDatabaseUrl({ NODE_ENV: 'production' }), /required/);
    assert.throws(() => getFrontendOrigin({ NODE_ENV: 'production' }), /valid origin/);
  });

  test('requires strong production DB credentials without leaking them in errors', () => {
    const valid = 'postgres://potok:long-random-password-for-test@db:5432/potok';
    assert.equal(getDatabaseUrl({ NODE_ENV: 'production', DATABASE_URL: valid }), valid);
    assert.throws(() => getDatabaseUrl({ NODE_ENV: 'production', DATABASE_URL: 'postgres://potok:potok@db/potok' }), /at least 24/);
    assert.throws(() => getDatabaseUrl({ DATABASE_URL: 'https://secret@example.com/database' }), /PostgreSQL host/);
    assert.throws(() => getDatabaseUrl({ DATABASE_URL: 'bad-secret-value' }), { message: 'DATABASE_URL must be a valid PostgreSQL connection URL' });
  });

  test('validates HTTPS origin and port before starting the server', () => {
    assert.equal(getFrontendOrigin({ NODE_ENV: 'production', FRONTEND_ORIGIN: 'https://korotkov.click' }), 'https://korotkov.click');
    for (const origin of ['http://korotkov.click', 'https://korotkov.click/path', 'https://korotkov.click?query=1', '*']) {
      assert.throws(() => getFrontendOrigin({ NODE_ENV: 'production', FRONTEND_ORIGIN: origin }));
    }
    for (const port of ['0', '65536', '3001x', '1.5', '-2']) assert.throws(() => getPort({ PORT: port }));
  });
});
