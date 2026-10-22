import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [DatabaseModule, TasksModule],
  controllers: [HealthController],
})
export class AppModule {}
