import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createApp } from '../src/app';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe('tasks API (PostgreSQL integration)', { skip: !testDatabaseUrl }, () => {
  let app: INestApplication;
  let pool: Pool;
  const createdIds: string[] = [];

  before(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    pool = new Pool({ connectionString: testDatabaseUrl });
    app = await createApp();
    await app.init();
  });

  after(async () => {
    if (app) await app.close();
    if (pool) {
      await pool.query('DELETE FROM tasks WHERE id = ANY($1::uuid[])', [createdIds]);
      await pool.end();
    }
  });

  test('persists a task and moves it through the board', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ title: '  Проверить drag and drop  ', priority: 'high' })
      .expect(201);
    createdIds.push(created.body.id);

    assert.equal(created.body.title, 'Проверить drag and drop');
    assert.equal(created.body.description, '');
    assert.equal(created.body.status, 'new');

    const moved = await request(app.getHttpServer())
      .patch(`/api/tasks/${created.body.id}`)
      .send({ status: 'in_progress' })
      .expect(200);
    assert.equal(moved.body.status, 'in_progress');

    const list = await request(app.getHttpServer()).get('/api/tasks').expect(200);
    const saved = list.body.find((task: { id: string }) => task.id === created.body.id);
    assert.equal(saved.status, 'in_progress');

    const database = await pool.query('SELECT status FROM tasks WHERE id = $1', [saved.id]);
    assert.equal(database.rows[0].status, 'in_progress');

    await request(app.getHttpServer()).delete(`/api/tasks/${saved.id}`).expect(204);
    await request(app.getHttpServer()).delete(`/api/tasks/${saved.id}`).expect(404);
    assert.equal((await pool.query('SELECT 1 FROM tasks WHERE id = $1', [saved.id])).rowCount, 0);
  });

  test('returns useful 400 and 404 responses', async () => {
    await request(app.getHttpServer())
      .patch('/api/tasks/not-a-uuid')
      .send({ status: 'done' })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/api/tasks/47be84a5-b12c-4a9a-a99c-19d55965e899')
      .send({ status: 'done' })
      .expect(404);

    await request(app.getHttpServer())
      .patch('/api/tasks/47be84a5-b12c-4a9a-a99c-19d55965e899')
      .send({})
      .expect(400);
  });

  test('accepts creation directly into a chosen column; rejects null and unknown fields', async () => {
    const created = await request(app.getHttpServer()).post('/api/tasks')
      .send({ title: 'Уже готовая задача', status: 'done', description: 'Результат', priority: 'low' }).expect(201);
    createdIds.push(created.body.id);
    assert.equal(created.body.status, 'done');
    await request(app.getHttpServer()).patch(`/api/tasks/${created.body.id}`).send({ title: null }).expect(400);
    await request(app.getHttpServer()).post('/api/tasks').send({ title: 'Название', owner: 'x' }).expect(400);
    await request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 'ok', database: 'connected' });
  });
});
