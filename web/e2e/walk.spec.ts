// Prueba de humo de la Fase 2: el juego carga, el jugador aparece sobre el suelo, camina, salta,
// pausa y la gravedad cambia según el mundo. Usa `?debug` para leer window.__juego.
// En headless WebGL va por software (lento): las pruebas esperan condiciones, no tiempos fijos.
import { expect, test, type Page } from '@playwright/test';
import type { DebugSnapshot } from '../src/ui/debugOverlay';

async function snapshot(page: Page): Promise<DebugSnapshot | null> {
  return page.evaluate(() => window.__juego?.snapshot() ?? null);
}

async function value<K extends keyof DebugSnapshot>(
  page: Page,
  key: K,
): Promise<DebugSnapshot[K] | null> {
  return (await snapshot(page))?.[key] ?? null;
}

async function ready(page: Page, query = ''): Promise<void> {
  await page.goto(`/?debug${query}`);
  await expect(page.locator('.overlay')).toBeVisible();
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
}

async function startPlaying(page: Page, query = ''): Promise<void> {
  await ready(page, query);
  await page.locator('.overlay').click();
  await expect(page.locator('.overlay')).toBeHidden();
  await expect.poll(() => value(page, 'playing')).toBe(true);
}

test('loads Umbral without errors and shows the start screen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await ready(page);

  await expect(page.locator('.overlay strong')).toHaveText('Umbral');
  await expect(page.locator('.overlay')).toContainText('para empezar');
  expect(errors).toEqual([]);
});

test('the player spawns on the ground and stays there', async ({ page }) => {
  await startPlaying(page);

  await expect.poll(() => value(page, 'speed')).toBeLessThan(0.1);
  expect(await value(page, 'grounded')).toBe(true);
  expect(await value(page, 'respawns')).toBe(0);
});

test('walks forward at walking speed and stops when released', async ({ page }) => {
  await startPlaying(page);

  await page.keyboard.down('KeyW');
  await expect.poll(() => value(page, 'speed')).toBeGreaterThan(3.5);
  expect(await value(page, 'speed')).toBeLessThan(4.5);
  await page.keyboard.up('KeyW');

  await expect.poll(() => value(page, 'speed')).toBeLessThan(0.2);
  expect(await value(page, 'respawns')).toBe(0);
});

test('jumping leaves the ground and lands again', async ({ page }) => {
  await startPlaying(page);
  const before = (await value(page, 'takeoffs')) ?? 0;

  await page.keyboard.down('Space');
  await expect.poll(() => value(page, 'takeoffs')).toBe(before + 1);
  await page.keyboard.up('Space');

  await expect.poll(() => value(page, 'grounded')).toBe(true);
});

test('Escape pauses the game', async ({ page }) => {
  await startPlaying(page);

  await page.keyboard.press('Escape');

  await expect(page.locator('.overlay strong')).toHaveText('Pausa');
  await expect.poll(() => value(page, 'playing')).toBe(false);
});

test('each world has its own gravity', async ({ page }) => {
  await ready(page, '&mundo=archivo');

  expect(await value(page, 'world')).toBe('archivo');
  expect(await value(page, 'gravity')).toBeCloseTo(14.7, 1);
});
