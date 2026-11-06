// Plan de historia y puzzles físicos, P1: las campanas del Anfiteatro de Umbral. Se coge una campana del estante, se
// pone en una marca del canal y, cuando las cuatro suenan a compás (marcas 1, 4, 9 y 16), se abre el atril y da la
// canción de los mundos. Con las campanas a distancias iguales no se abre.
import { expect, test, type Page } from '@playwright/test';
import { closeReader, loopValue, startPlaying } from './helpers';

async function bells(page: Page) {
  return page.evaluate(() => window.__juego?.bells?.() ?? null);
}

async function setBell(page: Page, mark: number): Promise<void> {
  await page.evaluate(() => window.__juego?.teleportTo?.('umbral.campanas'));
  await expect(page.locator('.prompt')).toHaveText('E · coger');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await bells(page))?.held).toBe(true);
  await page.evaluate((m) => {
    window.__juego?.teleportTo?.('umbral.canal');
    window.__juego?.bellsMark?.(m);
  }, mark);
  await expect(page.locator('.prompt')).toHaveText('E · poner');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await bells(page))?.held).toBe(false);
}

/** Salta lo bastante para que ruede una bola entera (cada 20 s; llega a la última marca a los 4). */
async function ringOnce(page: Page): Promise<void> {
  const now = await loopValue(page, 'umbral');
  await page.evaluate((to) => window.__juego?.skipTo?.(to), now + 25);
}

test('four bells at marks 1, 4, 9 and 16 ring in time and open the lectern', async ({ page }) => {
  test.setTimeout(90_000);
  await startPlaying(page);

  for (const mark of [1, 4, 9, 16]) await setBell(page, mark);
  expect((await bells(page))?.placed).toEqual([1, 4, 9, 16]);
  // Con tiempo de sobra, la bola ya pudo pasar por ellas; si no, se le da una vuelta entera.
  await ringOnce(page);
  await expect.poll(async () => (await bells(page))?.solved).toBe(true);

  await page.evaluate(() => window.__juego?.teleportTo?.('umbral.atril'));
  await expect(page.locator('.prompt')).toHaveText('E · leer');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.puzzle-title')).toHaveText('El atril de las campanas');
  await expect(page.locator('.puzzle-status')).toContainText('abierta');
  await closeReader(page);
  const facts = await page.evaluate(() => window.__juego?.snapshot()?.registry?.facts ?? []);
  expect(facts).toContain('mundos.cancion');
  expect(facts).toContain('mundos.compas');
});

test('bells at equal distances ring faster and faster and do not open the lectern', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await startPlaying(page);

  for (const mark of [4, 8, 12, 16]) await setBell(page, mark);
  await ringOnce(page);
  await ringOnce(page);

  expect((await bells(page))?.solved).toBe(false);
  await page.evaluate(() => window.__juego?.teleportTo?.('umbral.atril'));
  await page.keyboard.press('KeyE');
  await expect(page.locator('.puzzle-hint')).toContainText('no a compás');
});
