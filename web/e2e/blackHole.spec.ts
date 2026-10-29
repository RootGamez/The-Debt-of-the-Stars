// Fase 8 (hito 8A): el agujero negro nace a las 13:30 en Cicatriz y crece; antes no existe.
import { expect, test, type Page } from '@playwright/test';
import { startPlaying } from './helpers';

function hole(page: Page) {
  return page.evaluate(() => window.__juego?.blackHole?.() ?? null);
}

test('there is no black hole before 13:30', async ({ page }) => {
  await startPlaying(page);

  await expect.poll(async () => (await hole(page))?.visible).toBe(false);
  expect((await hole(page))?.radius).toBe(0);
});

test('the black hole is born at 13:30 and keeps growing', async ({ page }) => {
  await startPlaying(page);
  await page.evaluate(() => window.__juego?.skipTo?.(812));

  await expect.poll(async () => (await hole(page))?.visible).toBe(true);
  const young = (await hole(page))?.radius ?? 0;
  expect(young).toBeGreaterThan(0);

  await page.evaluate(() => window.__juego?.skipTo?.(850));
  await expect.poll(async () => (await hole(page))?.radius ?? 0).toBeGreaterThan(young * 5);
});
