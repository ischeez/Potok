import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Capture the running application. Start with `npm run dev` and optionally `npm run db:seed`.
const directory = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173');
  await page.getByText('Все изменения сохранены').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${directory}desktop.png`, fullPage: true, animations: 'disabled' });
  await page.getByTestId('task-card').first().getByRole('heading').click();
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
  await page.screenshot({ path: `${directory}task-editor.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Закрыть', exact: true }).first().click();
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mobile.goto('http://localhost:5173');
  await mobile.getByText('Все изменения сохранены').waitFor();
  await mobile.evaluate(() => document.fonts.ready);
  await mobile.screenshot({ path: `${directory}mobile.png`, fullPage: true, animations: 'disabled' });
  // Empty state is a UI fixture only; existing database contents stay untouched.
  await page.route('**/api/tasks', route => route.fulfill({ json: [] }));
  await page.reload();
  await page.getByText('Здесь начнётся ваш поток').waitFor();
  await page.screenshot({ path: `${directory}empty-board.png`, animations: 'disabled' });
  console.log(`Screenshots saved to ${directory}`);
} finally { await browser.close(); }
