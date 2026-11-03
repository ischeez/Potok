import { Global, Inject, Injectable, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from './database.constants';
import { getDatabaseUrl } from '../config/environment';

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: (): Pool => {
        const pool = new Pool({
          connectionString: getDatabaseUrl(),
          max: 5,
          connectionTimeoutMillis: 5_000,
          idleTimeoutMillis: 30_000,
        });
        pool.on('error', () => new Logger('Database').warn('An idle database connection was closed; the pool will reconnect'));
        return pool;
      },
    },
    DatabaseLifecycle,
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule {}
