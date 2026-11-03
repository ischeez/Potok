import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { DEFAULT_DATABASE_URL } from '../database/database.constants';

export function loadEnvironment(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
  ];
  const environmentFile = candidates.find(existsSync);

  if (environmentFile) {
    loadEnvFile(environmentFile);
  }
}

export function getDatabaseUrl(environment: NodeJS.ProcessEnv = process.env): string {
  const value = environment.DATABASE_URL;
  if (!value && environment.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production');
  }
  const connectionString = value ?? DEFAULT_DATABASE_URL;
  let parsed: URL;
  try { parsed = new URL(connectionString); }
  catch { throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname.slice(1)) {
    throw new Error('DATABASE_URL must specify a PostgreSQL host and database');
  }
  if (environment.NODE_ENV === 'production' && (!parsed.username || parsed.password.length < 24)) {
    throw new Error('Production DATABASE_URL requires a user and a password of at least 24 characters');
  }
  return connectionString;
}

export function getFrontendOrigin(environment: NodeJS.ProcessEnv = process.env): string {
  const origin = environment.FRONTEND_ORIGIN ?? (environment.NODE_ENV === 'production' ? '' : 'http://localhost:5173');
  let parsed: URL;
  try { parsed = new URL(origin); }
  catch { throw new Error('FRONTEND_ORIGIN must be a valid origin'); }
  if (parsed.origin !== origin || (environment.NODE_ENV === 'production' && parsed.protocol !== 'https:')) {
    throw new Error('FRONTEND_ORIGIN must be an exact origin; HTTPS is required in production');
  }
  return origin;
}

export function getPort(environment: NodeJS.ProcessEnv = process.env): number {
  const value = environment.PORT ?? '3001';
  const port = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}
