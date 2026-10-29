// Fase 9 (hito 9A): una partida nueva empieza en casa, en el Instituto de Hogar, donde no corre el ciclo; el
// Albatros II espera en el hangar. Junto al fragmento de la Luna se abre el gusano (provisional: basta con estar
// de pie en la Luna) y se despierta en Umbral; desde entonces la partida empieza allí.
import { expect, test, type Page } from '@playwright/test';
import { loopValue, snapshot, value } from './helpers';

/** Partida nueva, sin elegir mundo: como la abriría un jugador. */
async function newGame(page: Page): Promise<void> {
  await page.goto('/?debug');
  await expect(page.locator('.overlay')).toBeVisible();
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
}

async function play(page: Page): Promise<void> {
  await page.locator('.overlay').click({ position: { x: 20, y: 20 } });
  await expect(page.locator('.overlay')).toBeHidden();
  await expect.poll(() => value(page, 'playing')).toBe(true);
}

test('a new game starts at home, where the loop does not run', async ({ page }) => {
  await newGame(page);
  expect(await value(page, 'world')).toBe('hogar');
  await expect(page.locator('.overlay')).toContainText('Hogar');
  await play(page);

  await page.waitForTimeout(1500);

  expect(await loopValue(page, 'umbral')).toBe(0);
  expect(await loopValue(page, 'events')).toEqual([]);
  await expect(page.locator('.clock-hud')).toBeHidden();
  expect((await snapshot(page))?.ship?.landed).toBe(true); // el Albatros II, en el hangar
});

test('on the Moon the wormhole opens and the game goes on in Umbral from then on', async ({
  page,
}) => {
  await newGame(page);
  await play(page);

  expect(await page.evaluate(() => window.__juego?.warpTo?.('luna') ?? false)).toBe(true);

  // Tras el fundido a blanco la página se carga de nuevo, ya en el sistema ajeno (sin `?mundo=`).
  await page.waitForURL(/debug=/, { timeout: 30_000 });
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
  expect(await value(page, 'world')).toBe('umbral');
  expect(await loopValue(page, 'loops')).toBe(0);
  expect(new URL(page.url()).searchParams.has('mundo')).toBe(false);

  await page.reload();
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
  expect(await value(page, 'world')).toBe('umbral');

  // Sin partida guardada ("Empezar de cero"), se vuelve a empezar en casa.
  await page.evaluate(() => {
    window.localStorage.removeItem('bucle-tiempo:partida');
  });
  await page.reload();
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
  expect(await value(page, 'world')).toBe('hogar');
});
