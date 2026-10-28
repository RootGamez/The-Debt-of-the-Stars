// El sonido sintetizado: arranca con el primer gesto, sigue al mundo y a los eventos, y la M lo silencia.
import { expect, test, type Page } from '@playwright/test';
import { startPlaying } from './helpers';

function audio(page: Page) {
  return page.evaluate(() => window.__juego?.audio?.() ?? null);
}

test('the sound starts with the first click and follows the world', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startPlaying(page);

  await expect.poll(async () => (await audio(page))?.running, { timeout: 20_000 }).toBe(true);
  await expect.poll(async () => (await audio(page))?.voices).toContain('mundo:umbral');

  expect(await page.evaluate(() => window.__juego?.warpTo?.('taller') ?? false)).toBe(true);
  await expect.poll(async () => (await audio(page))?.voices).toContain('mundo:taller');
  expect(errors).toEqual([]);
});

test('an event adds its own layer while it lasts', async ({ page }) => {
  await startPlaying(page);
  await expect.poll(async () => (await audio(page))?.running, { timeout: 20_000 }).toBe(true);

  await page.evaluate(() => window.__juego?.skipTo?.(545));

  await expect.poll(async () => (await audio(page))?.voices).toContain('evento:cielo_rojo');
});

test('M mutes and unmutes the game, and remembers it', async ({ page }) => {
  await startPlaying(page);
  expect((await audio(page))?.muted).toBe(false);

  await page.keyboard.press('KeyM');
  await expect.poll(async () => (await audio(page))?.muted).toBe(true);

  await page.reload();
  await expect.poll(async () => (await audio(page))?.muted, { timeout: 20_000 }).toBe(true);

  await page.evaluate(() => {
    window.localStorage.removeItem('bucle-tiempo:silencio');
  });
});
