import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTaskDto } from '../src/tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../src/tasks/dto/update-task.dto';

describe('task DTO validation', () => {
  test('trims a valid title and accepts defaults', async () => {
    const dto = plainToInstance(CreateTaskDto, { title: '  Новый макет  ' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

    assert.equal(errors.length, 0);
    assert.equal(dto.title, 'Новый макет');
  });

  test('rejects blank and overlong content', async () => {
    const dto = plainToInstance(CreateTaskDto, {
      title: '   ',
      description: 'x'.repeat(4001),
      priority: 'urgent',
    });
    const errors = await validate(dto);

    assert.deepEqual(
      errors.map((error) => error.property).sort(),
      ['description', 'priority', 'title'],
    );
  });

  test('rejects fields that do not belong to task creation', async () => {
    const dto = plainToInstance(CreateTaskDto, {
      title: 'Новая задача',
      owner: 'someone',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    assert.equal(errors.length, 1);
    assert.equal(errors[0]?.property, 'owner');
  });

  test('accepts status transitions in a partial update', async () => {
    const dto = plainToInstance(UpdateTaskDto, { status: 'in_progress' });
    const errors = await validate(dto);

    assert.equal(errors.length, 0);
    assert.equal(dto.status, 'in_progress');
  });

  test('rejects null values instead of forwarding them to SQL constraints', async () => {
    for (const property of ['title', 'description', 'priority', 'status']) {
      const dto = plainToInstance(UpdateTaskDto, { [property]: null });
      assert.equal((await validate(dto))[0]?.property, property);
    }
  });
});
