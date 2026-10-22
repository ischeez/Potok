import { Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL, DEFAULT_DATABASE_URL } from './database.constants';

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
      useFactory: (): Pool =>
        new Pool({
          connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
          max: 10,
          connectionTimeoutMillis: 5_000,
          idleTimeoutMillis: 30_000,
        }),
    },
    DatabaseLifecycle,
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule {}
