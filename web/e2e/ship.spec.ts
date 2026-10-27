// Fase 5B: la nave. Espera junto a La Boca; se sube con F, se despega, se fija un objetivo, se aterriza
// en otro mundo bajando con C y se baja a pie. Con ?debug, `toShip` deja al jugador en la escotilla y
// `shipTo` planta la nave pilotada sobre un mundo (sin el viaje entero, que en CI sería lento).
import { expect, test, type Page } from '@playwright/test';
import { snapshot, startPlaying } from './helpers';

async function ship(page: Page) {
  return (await snapshot(page))?.ship ?? null;
}

async function board(page: Page): Promise<void> {
  expect(await page.evaluate(() => window.__juego?.toShip?.() ?? false)).toBe(true);
  await expect(page.locator('.board-prompt')).toBeVisible();
  await page.keyboard.press('KeyF');
  await expect.poll(() => ship(page).then((s) => s?.piloting)).toBe(true);
}

async function shipTo(page: Page, world: string, altitude: number): Promise<void> {
  const ok = await page.evaluate(([id, height]) => window.__juego?.shipTo?.(id, height) ?? false, [
    world,
    altitude,
  ] as const);
  expect(ok).toBe(true);
}

test('the ship waits by La Boca, landed, and boarding shows the flight interface', async ({
  page,
}) => {
  await startPlaying(page);

  expect(await ship(page)).toMatchObject({ piloting: false, landed: true, frame: 'umbral' });
  await expect(page.locator('.board-prompt')).toBeHidden(); // la llegada no está encima de la nave

  await board(page);

  await expect(page.locator('.ship-panel')).toContainText('Posada');
  await expect(page.locator('.ship-hint')).toContainText('Espacio despegar');
  await expect(page.locator('.ship-target')).toBeVisible();
  await expect(page.locator('.board-prompt')).toBeHidden();
});

test('takes off with Space and the stabilizer keeps it in the air', async ({ page }) => {
  await startPlaying(page);
  await board(page);

  await page.keyboard.down('Space');
  await expect.poll(() => ship(page).then((s) => s?.altitude ?? 0)).toBeGreaterThan(3);
  await page.keyboard.up('Space');

  await expect.poll(() => ship(page).then((s) => s?.landed)).toBe(false);
  const height = (await ship(page))?.altitude ?? 0;
  await page.waitForTimeout(1500);
  expect((await ship(page))?.altitude ?? 0).toBeGreaterThanOrEqual(height - 0.5); // no se cae
  await expect(page.locator('.ship-panel')).toContainText('Altura');
});

test('T changes the target and Z switches to free mode and back', async ({ page }) => {
  await startPlaying(page);
  await board(page);
  const first = (await ship(page))?.target;

  await page.keyboard.press('KeyT');
  await expect.poll(() => ship(page).then((s) => s?.target)).not.toBe(first);
  await page.keyboard.press('KeyZ');
  await expect(page.locator('.ship-panel')).toContainText('Modo libre');
  await page.keyboard.press('KeyZ');

  await expect(page.locator('.ship-panel')).toContainText('Estabilizador');
});

test('lands on Archivo by holding C and walks there on foot, with its clock', async ({ page }) => {
  await startPlaying(page);
  await board(page);
  await shipTo(page, 'archivo', 20);
  await expect.poll(() => ship(page).then((s) => s?.frame)).toBe('archivo');

  await page.keyboard.down('KeyC');
  await expect.poll(() => ship(page).then((s) => s?.landed), { timeout: 30_000 }).toBe(true);
  await page.keyboard.up('KeyC');
  expect((await snapshot(page))?.loop.phase).toBe('playing'); // posarse no es estrellarse
  await page.keyboard.press('KeyF');

  await expect.poll(() => ship(page).then((s) => s?.piloting)).toBe(false);
  const s = await snapshot(page);
  expect(s?.world).toBe('archivo');
  expect(s?.loop.rate).toBeCloseTo(0.8);
  await expect(page.locator('.board-prompt')).toBeVisible();
});

test('cannot step out while flying', async ({ page }) => {
  await startPlaying(page);
  await board(page);
  await shipTo(page, 'umbral', 30);

  await page.keyboard.press('KeyF');

  expect((await ship(page))?.piloting).toBe(true);
});

test('diving in free mode crashes the ship and the cycle starts again by La Boca', async ({
  page,
}) => {
  await startPlaying(page);
  await board(page);
  await shipTo(page, 'umbral', 80);
  await page.keyboard.press('KeyZ'); // sin ayudas: la gravedad tira y no hay frenado junto al suelo

  await page.keyboard.down('KeyC');
  await expect
    .poll(() => snapshot(page).then((s) => s?.loop.phase), { timeout: 20_000 })
    .not.toBe('playing');
  await page.keyboard.up('KeyC');

  await expect.poll(() => snapshot(page).then((s) => s?.loop.loops), { timeout: 20_000 }).toBe(1);
  expect(await ship(page)).toMatchObject({ piloting: false, landed: true, frame: 'umbral' });
});
