import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { TASK_PRIORITIES, TASK_STATUSES, TaskPriority, TaskStatus } from '../task.types';
import { trim } from './create-task.dto';

export class UpdateTaskDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trim)
  @IsString({ message: 'Название должно быть строкой' })
  @MinLength(1, { message: 'Укажите название задачи' })
  @MaxLength(120, { message: 'Название не должно превышать 120 символов' })
  title?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(4000, { message: 'Описание не должно превышать 4000 символов' })
  description?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsIn(TASK_PRIORITIES, { message: 'Неизвестный приоритет' })
  priority?: TaskPriority;

  @ValidateIf((_, value) => value !== undefined)
  @IsIn(TASK_STATUSES, { message: 'Неизвестный статус' })
  status?: TaskStatus;
}
