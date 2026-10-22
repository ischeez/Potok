import { expect, test } from '@playwright/test';

test('creates, edits, moves, persists after reload, and deletes a task', async ({ page, request }) => {
  const title = `Проверка доски ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let id: string | undefined;
  try {
    await page.goto('/');
    await expect(page.getByText('Все изменения сохранены')).toBeVisible();
    await page.getByRole('button', { name: 'Новая задача' }).click();
    await page.getByRole('textbox', { name: 'Название задачи' }).fill(title);
    await page.getByRole('textbox', { name: 'Описание' }).fill('Проверить реальное сохранение в PostgreSQL');
    await page.getByRole('button', { name: 'Создать задачу', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const response = await request.get('/api/tasks');
    id = (await response.json()).find((task: { title: string }) => task.title === title)?.id;
    expect(id).toBeTruthy();
    await page.getByRole('heading', { name: title, exact: true }).click();
    await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
    await page.getByRole('textbox', { name: 'Название задачи' }).fill(`${title} ✓`);
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: `Действия: ${title} ✓`, exact: true }).click();
    await page.getByRole('menuitem', { name: 'В работе', exact: true }).click();
    await expect.poll(async () => (await (await request.get('/api/tasks')).json()).find((task: { id: string }) => task.id === id).status).toBe('in_progress');
    await page.reload();
    const mobileTab = page.getByRole('tab', { name: /В работе/ });
    if (await mobileTab.isVisible()) await mobileTab.click();
    const column = page.getByTestId('column-in_progress');
    await expect(column.getByRole('heading', { name: `${title} ✓`, exact: true })).toBeVisible();
    await column.getByRole('button', { name: `Действия: ${title} ✓`, exact: true }).click();
    await page.getByRole('menuitem', { name: 'Удалить', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: `${title} ✓`, exact: true })).toHaveCount(0);
    expect((await (await request.get('/api/tasks')).json()).some((task: { id: string }) => task.id === id)).toBe(false);
  } finally {
    if (id) await request.delete(`/api/tasks/${id}`);
  }
});

test('shows empty board and validates a blank title', async ({ page }) => {
  await page.route('**/api/tasks', route => route.fulfill({ json: [] }));
  await page.goto('/');
  await expect(page.getByText('Здесь начнётся ваш поток')).toBeVisible();
  await page.getByRole('button', { name: 'Создать первую задачу' }).click();
  await page.getByRole('textbox', { name: 'Название задачи' }).fill('   ');
  await expect(page.getByRole('button', { name: 'Создать задачу', exact: true })).toBeDisabled();
});

test('shows loading until the API responds', async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/tasks', async route => { await gate; await route.fulfill({ json: [] }); });
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Канбан-доска' })).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText('Загружаем задачи…')).toBeVisible();
  release();
  await expect(page.getByText('Здесь начнётся ваш поток')).toBeVisible();
});

test('fits small phones, tablets, laptops and wide monitors', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Все изменения сохранены')).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 950 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Новая задача' })).toBeVisible();
  }
});

test('drags a card between columns and persists its status', async ({ page, request, isMobile }) => {
  test.skip(isMobile, 'Touch users have the accessible status menu.');
  const title = `Проверка переноса ${Date.now()}`;
  const response = await request.post('/api/tasks', { data: { title } });
  expect(response.ok()).toBe(true);
  const task = await response.json();
  try {
    await page.goto('/');
    const card = page.getByTestId('task-card').filter({ has: page.getByRole('heading', { name: title }) });
    await card.dragTo(page.getByTestId('column-done'));
    await expect(page.getByTestId('column-done').getByRole('heading', { name: title })).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('column-done').getByRole('heading', { name: title })).toBeVisible();
  } finally { await request.delete(`/api/tasks/${task.id}`); }
});

test('shows retry after API failure and recovers', async ({ page }) => {
  await page.route('**/api/tasks', route => route.fulfill({ status: 503, json: { message: 'Unavailable' } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Доска пока недоступна' })).toBeVisible();
  await page.unroute('**/api/tasks');
  await page.getByRole('button', { name: 'Попробовать снова' }).click();
  await expect(page.getByText('Все изменения сохранены')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Доска пока недоступна' })).toHaveCount(0);
});

test('retains the form on save failure and fits the viewport', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Все изменения сохранены')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Новая задача' }).click();
  await page.getByRole('textbox', { name: 'Название задачи' }).fill('Задача, которая не потеряется');
  await page.route('**/api/tasks', async route => route.request().method() === 'POST' ? route.fulfill({ status: 503, json: {} }) : route.continue());
  await page.getByRole('button', { name: 'Создать задачу', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Изменения не сохранены');
  await expect(page.getByRole('textbox', { name: 'Название задачи' })).toHaveValue('Задача, которая не потеряется');
});

test('filters tasks, displays no matches and restores the board', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Все изменения сохранены')).toBeVisible();
  await page.getByRole('textbox', { name: 'Поиск задач' }).fill('абсолютно-несуществующая-задача');
  await expect(page.getByText('Найдено: 0')).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
  await expect(page.getByRole('textbox', { name: 'Поиск задач' })).toHaveValue('');
});
