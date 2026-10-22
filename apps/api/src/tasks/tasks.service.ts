import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.constants';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskRow, toTask } from './task.types';

@Injectable()
export class TasksService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<Task[]> {
    try {
      const result = await this.pool.query<TaskRow>(
        `SELECT id, title, description, priority, status, created_at, updated_at
         FROM tasks
         ORDER BY created_at DESC, id DESC`,
      );
      return result.rows.map(toTask);
    } catch {
      throw new ServiceUnavailableException('Не удалось загрузить задачи');
    }
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    try {
      const result = await this.pool.query<TaskRow>(
        `INSERT INTO tasks (title, description, priority, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id, title, description, priority, status, created_at, updated_at`,
        [
          dto.title,
          dto.description ?? '',
          dto.priority ?? 'medium',
          dto.status ?? 'new',
        ],
      );
      return toTask(result.rows[0]);
    } catch {
      throw new ServiceUnavailableException('Не удалось создать задачу');
    }
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const columns: Record<keyof UpdateTaskDto, string> = {
      title: 'title',
      description: 'description',
      priority: 'priority',
      status: 'status',
    };
    const entries = Object.entries(dto).filter(([, value]) => value !== undefined) as [keyof UpdateTaskDto, string][];
    const assignments = entries.map(
      ([key], index) => `${columns[key]} = $${index + 2}`,
    );

    try {
      const result = await this.pool.query<TaskRow>(
        `UPDATE tasks
         SET ${assignments.join(', ')}, updated_at = NOW()
         WHERE id = $1
         RETURNING id, title, description, priority, status, created_at, updated_at`,
        [id, ...entries.map(([, value]) => value)],
      );
      if (result.rowCount === 0) {
        throw new NotFoundException('Задача не найдена');
      }
      return toTask(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('Не удалось обновить задачу');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const result = await this.pool.query('DELETE FROM tasks WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        throw new NotFoundException('Задача не найдена');
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('Не удалось удалить задачу');
    }
  }
}
