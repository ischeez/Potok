import { Pool } from 'pg';
import { loadEnvironment } from '../src/config/environment';
import { DEFAULT_DATABASE_URL } from '../src/database/database.constants';

const tasks = [
  ['Собрать визуальные референсы', 'Подобрать фактуры, типографику и примеры спокойной цветовой системы.', 'medium', 'done'],
  ['Проверить контраст интерфейса', 'Пройти основные сценарии с WCAG Contrast Checker и зафиксировать спорные места.', 'high', 'in_progress'],
  ['Подготовить состояния карточки', 'Показать hover, focus, dragging и компактный вариант для телефона.', 'high', 'in_progress'],
  ['Согласовать тон микрокопирайта', 'Короткие и живые подписи без канцелярита.', 'low', 'new'],
  ['Собрать мобильный прототип', 'Проверить доску на ширине 360 px и управление одной рукой.', 'high', 'new'],
  ['Описать дизайн-токены', 'Цвета, радиусы, тени и интервалы в одном коротком документе.', 'medium', 'new'],
  ['Провести коридорный тест', 'Дать прототип трём людям и записать, где они замедляются.', 'medium', 'new'],
  ['Подготовить обложку проекта', 'Собрать аккуратный hero-кадр для README и портфолио.', 'low', 'done'],
  ['Проверить пустые состояния', 'Добавить понятный первый шаг для каждой пустой колонки.', 'medium', 'done'],
] as const;

async function seed(): Promise<void> {
  loadEnvironment();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [title, description, priority, status] of tasks) {
      await client.query(
        `INSERT INTO tasks (title, description, priority, status)
         SELECT $1::varchar(120), $2::varchar(4000), $3::varchar(10), $4::varchar(20)
         WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = $1)`,
        [title, description, priority, status],
      );
    }
    await client.query('COMMIT');
    console.log(`Seed complete: ${tasks.length} sample tasks are available`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed error';
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
});
