// Fase 5B y Fase 11: la nave (el Albatros II, por código). Espera posada junto a La Boca con la escotilla
// abierta; dentro, F en el asiento la pilota y E en el atril o la mesa abre el Registro o el mapa. Se despega
// (la escotilla se cierra y las toberas arden), se fija un objetivo, se aterriza en otro mundo bajando con C y
// uno se levanta del asiento. Con ?debug, `toShip(sitio)` deja al jugador dentro frente a un sitio, `toLadder`
// al pie de la escalerilla y `shipTo` planta la nave pilotada sobre un mundo (sin el viaje entero).
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
  expect((await ship(page))?.hatch).toBe(1); // posada: escotilla abierta y escalerilla bajada

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
  // Las cuatro toberas de sustentación empujan y se ve su fuego.
  await expect
    .poll(() => ship(page).then((s) => s?.firing.filter((id) => id.startsWith('lift')).length))
    .toBe(4);
  await expect.poll(() => ship(page).then((s) => s?.altitude ?? 0)).toBeGreaterThan(3);
  await page.keyboard.up('Space');

  await expect.poll(() => ship(page).then((s) => s?.landed)).toBe(false);
  await expect.poll(() => ship(page).then((s) => s?.hatch)).toBe(0); // volando, la escotilla se cierra
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

test('V switches between the cabin and the view from outside', async ({ page }) => {
  await startPlaying(page);
  await board(page);
  expect((await ship(page))?.view).toBe('cabina');

  await page.keyboard.press('KeyV');
  await expect.poll(() => ship(page).then((s) => s?.view)).toBe('fuera');
  await page.keyboard.press('KeyV');

  await expect.poll(() => ship(page).then((s) => s?.view)).toBe('cabina');
});

test('inside, E at the lectern opens the Registro and at the table the orbit map', async ({
  page,
}) => {
  await startPlaying(page);

  expect(await page.evaluate(() => window.__juego?.toShip?.('registro') ?? false)).toBe(true);
  await expect.poll(() => ship(page).then((s) => s?.station)).toBe('registro');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.registry')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.registry')).toBeHidden();
  await page.getByRole('button', { name: 'Seguir', exact: true }).click(); // Esc deja la pausa detrás
  await expect.poll(() => snapshot(page).then((s) => s?.playing)).toBe(true);

  expect(await page.evaluate(() => window.__juego?.toShip?.('mapa') ?? false)).toBe(true);
  await expect.poll(() => ship(page).then((s) => s?.station)).toBe('mapa');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.ship-map')).toBeVisible();
  await page.waitForTimeout(200); // la misma E que lo abre no lo cierra
  await page.keyboard.press('KeyE');
  await expect(page.locator('.ship-map')).toBeHidden();
});

test('walks up the ladder into the landed ship', async ({ page }) => {
  await startPlaying(page);
  expect(await page.evaluate(() => window.__juego?.toLadder?.() ?? false)).toBe(true);
  const start = (await snapshot(page))?.altitude ?? 0;

  await page.keyboard.down('KeyW');
  await expect
    .poll(() => snapshot(page).then((s) => (s?.altitude ?? 0) - start), { timeout: 10_000 })
    .toBeGreaterThan(1.5); // sube por la escalerilla hasta el suelo de la sala
  await page.keyboard.up('KeyW');
});

test('lands on Archivo by holding C and stands up inside, with its clock', async ({ page }) => {
  await startPlaying(page);
  await board(page);
  await shipTo(page, 'archivo', 20);
  await expect.poll(() => ship(page).then((s) => s?.frame)).toBe('archivo');

  await page.keyboard.down('KeyC');
  await expect.poll(() => ship(page).then((s) => s?.landed), { timeout: 30_000 }).toBe(true);
  await page.keyboard.up('KeyC');
  expect((await snapshot(page))?.loop.phase).toBe('playing'); // posarse no es estrellarse
  await expect.poll(() => ship(page).then((s) => s?.hatch)).toBe(1); // posada, la escotilla se abre
  await page.keyboard.press('KeyF');

  await expect.poll(() => ship(page).then((s) => s?.piloting)).toBe(false);
  const s = await snapshot(page);
  expect(s?.world).toBe('archivo');
  expect(s?.loop.rate).toBeCloseTo(0.8);
  // De pie detrás del asiento: el aviso invita a volver a sentarse.
  await expect(page.locator('.board-prompt')).toBeVisible();
  expect(s?.ship?.station).toBe('asiento');
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
