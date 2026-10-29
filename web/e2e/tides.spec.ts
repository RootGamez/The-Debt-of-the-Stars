// Fase 7 (hito 7D): las mareas. Junto al Borde de Cicatriz la marea se nota desde el principio, pero solo
// mata hacia el final del ciclo, cuando la tensión se acumula; en el Nudo se nota sobre la cáscara y dentro
// solo si se sube hacia la semilla.
import { expect, test, type Page } from '@playwright/test';
import { snapshot, startPlaying } from './helpers';

function tide(page: Page) {
  return page.evaluate(() => window.__juego?.tide?.() ?? null);
}

async function toEdge(page: Page): Promise<void> {
  expect(await page.evaluate(() => window.__juego?.teleportTo?.('cicatriz.borde') ?? false)).toBe(
    true,
  );
}

test('at the Edge early in the cycle the tide is felt but does no harm', async ({ page }) => {
  await startPlaying(page);
  await toEdge(page);

  await expect.poll(async () => (await tide(page))?.tide ?? 0).toBeGreaterThan(0.12);
  await expect(page.locator('.tide')).toBeVisible();
  await page.waitForTimeout(2000);

  const now = await tide(page);
  expect(now?.tide ?? 1).toBeLessThan(0.5);
  expect(now?.strain).toBe(0);
});

test('at the Edge near 13:30 the strain builds up and the tide kills', async ({ page }) => {
  test.setTimeout(90_000);
  await startPlaying(page);
  await toEdge(page);
  await page.evaluate(() => window.__juego?.skipTo?.(780));

  await expect.poll(async () => (await tide(page))?.strain ?? 0).toBeGreaterThan(0.2);
  await expect
    .poll(async () => (await snapshot(page))?.loop.phase, { timeout: 30_000 })
    .toBe('dying');
  expect((await tide(page))?.strain).toBe(1);
});

test('inside the Nudo, walking on the inner face, there is no tide', async ({ page }) => {
  await startPlaying(page);
  expect(await page.evaluate(() => window.__juego?.warpTo?.('laboratorio') ?? false)).toBe(true);
  await expect.poll(async () => (await snapshot(page))?.grounded, { timeout: 15_000 }).toBe(true);

  await page.waitForTimeout(500);

  expect((await tide(page))?.tide).toBe(0);
  await expect(page.locator('.tide')).toBeHidden();
});
