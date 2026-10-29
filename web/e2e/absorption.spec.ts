// Fase 8 (hito 8C): cada mundo, en su ventana, se estira hacia el agujero negro, suelta trozos y cae; quien
// está en el mundo que se traga nota la marea del agujero.
import { expect, test, type Page } from '@playwright/test';
import { snapshot, startPlaying } from './helpers';

function absorption(page: Page) {
  return page.evaluate(() => window.__juego?.absorption?.() ?? null);
}

function tide(page: Page) {
  return page.evaluate(() => window.__juego?.tide?.() ?? null);
}

test('nothing is being swallowed before 13:30', async ({ page }) => {
  await startPlaying(page);

  await expect.poll(async () => (await absorption(page))?.progress.cicatriz).toBe(0);
  const now = await absorption(page);
  expect(now?.debris).toBe(0);
  expect(now?.swallowed).toEqual([]);
});

test('Cicatriz loses pieces while it falls and is gone when its window ends', async ({ page }) => {
  await startPlaying(page);
  await page.evaluate(() => window.__juego?.skipTo?.(818));

  await expect.poll(async () => (await absorption(page))?.debris ?? 0).toBeGreaterThan(0);
  const during = await absorption(page);
  expect(during?.progress.cicatriz).toBeGreaterThan(0.4);
  expect(during?.swallowed).toEqual([]);

  await page.evaluate(() => window.__juego?.skipTo?.(830));
  await expect.poll(async () => (await absorption(page))?.swallowed).toContain('cicatriz');
  expect((await absorption(page))?.progress.taller).toBeGreaterThan(0);
});

test('on Cicatriz while it is being swallowed the tide of the hole builds up', async ({ page }) => {
  await startPlaying(page);
  expect(await page.evaluate(() => window.__juego?.warpTo?.('cicatriz') ?? false)).toBe(true);
  await expect.poll(async () => (await snapshot(page))?.grounded, { timeout: 15_000 }).toBe(true);
  expect((await tide(page))?.tide ?? 1).toBeLessThan(0.5);

  await page.evaluate(() => window.__juego?.skipTo?.(813));

  await expect.poll(async () => (await tide(page))?.tide ?? 0).toBeGreaterThan(0.5);
  await expect.poll(async () => (await tide(page))?.strain ?? 0).toBeGreaterThan(0);
});
