// Fase 5A: el sistema. Los mundos orbitan con el reloj del ciclo, el marco de referencia sigue al jugador y
// el reloj doble marca el ritmo del mundo donde estás. `warpTo` (solo con ?debug) pasa a pie a otro mundo.
import { expect, test, type Page } from '@playwright/test';
import { loopValue, ready, snapshot, startPlaying } from './helpers';

const WORLDS = ['taller', 'cicatriz', 'archivo', 'umbral', 'observatorio'];

async function bodies(page: Page): Promise<Record<string, [number, number, number]>> {
  return (await snapshot(page))?.system.bodies ?? {};
}

async function warpTo(page: Page, world: string): Promise<void> {
  const ok = await page.evaluate((id) => window.__juego?.warpTo?.(id) ?? false, world);
  expect(ok).toBe(true);
}

test('the five worlds orbit the Brasa and keep their distance', async ({ page }) => {
  await startPlaying(page);
  const before = await bodies(page);
  const beforeTime = await loopValue(page, 'umbral');

  await expect
    .poll(() => loopValue(page, 'umbral'), { timeout: 15_000 })
    .toBeGreaterThan(beforeTime ?? 0);
  await expect
    .poll(async () => (await bodies(page)).taller?.[0], { timeout: 15_000 })
    .not.toBe(before.taller?.[0]);

  const after = await bodies(page);
  expect(Object.keys(after).sort()).toEqual([...WORLDS].sort());
  const orbit = (b: [number, number, number] | undefined): number =>
    Math.hypot(b?.[0] ?? 0, b?.[2] ?? 0);
  expect(orbit(after.taller)).toBeCloseTo(500, 3);
  expect(orbit(after.umbral)).toBeCloseTo(1900, 3);
});

test('starts in Umbral with its own frame of reference and the normal clock', async ({ page }) => {
  await startPlaying(page);

  const s = await snapshot(page);

  expect(s?.system.reference).toBe('umbral');
  expect(s?.world).toBe('umbral');
  expect(s?.loop.rate).toBeCloseTo(1);
});

test('warping to another world changes the frame, the gravity and the clock rate', async ({
  page,
}) => {
  await startPlaying(page);

  await warpTo(page, 'archivo');

  await expect.poll(() => snapshot(page).then((s) => s?.system.reference)).toBe('archivo');
  await expect.poll(() => snapshot(page).then((s) => s?.grounded)).toBe(true);
  const s = await snapshot(page);
  expect(s?.world).toBe('archivo');
  expect(s?.loop.rate).toBeCloseTo(0.8);
  expect(s?.gravity).toBeCloseTo(9.8 * 1.5, 1);
});

test('refuses to warp to a world that is not in the game', async ({ page }) => {
  await startPlaying(page);

  expect(await page.evaluate(() => window.__juego?.warpTo?.('narnia') ?? true)).toBe(false);
});

test('a new cycle always begins in the world of arrival', async ({ page }) => {
  await startPlaying(page, '&ciclo=12');
  await warpTo(page, 'archivo');

  await expect.poll(() => loopValue(page, 'loops'), { timeout: 60_000 }).toBe(1);

  await expect.poll(() => snapshot(page).then((s) => s?.system.reference)).toBe('umbral');
  expect((await snapshot(page))?.world).toBe('umbral');
});

test('a source can be read from a world the player is not in', async ({ page }) => {
  await startPlaying(page);
  await warpTo(page, 'taller');

  const ok = await page.evaluate(() => window.__juego?.teleportTo?.('umbral.placa') ?? false);

  expect(ok).toBe(true);
  await expect.poll(() => snapshot(page).then((s) => s?.world)).toBe('umbral');
  await expect(page.locator('.prompt')).toBeVisible();
});

test('a world outside the system (Hogar) stands alone with no orbits', async ({ page }) => {
  await ready(page, '&mundo=hogar');

  const s = await snapshot(page);

  expect(s?.world).toBe('hogar');
  expect(s?.system.bodies).toEqual({});
});
