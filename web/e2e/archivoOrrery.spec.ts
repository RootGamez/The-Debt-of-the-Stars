// Plan de historia y puzzles físicos, T6: el Planetario de la Gran Nave (P2) y el prisma de la Ranura (P5) del
// Archivo. Cinco esferas a sus rieles (el quinto, vacío) paran la manivela a las 6:30 y dan sus dos hechos; el prisma
// se coge del suelo y se encaja en su soporte.
import { expect, test, type Page } from '@playwright/test';
import { closeReader, startPlaying } from './helpers';

async function archivo(page: Page) {
  return page.evaluate(() => window.__juego?.archivo?.() ?? null);
}

async function carry(page: Page, source: string, rail?: number): Promise<void> {
  await page.evaluate((id) => window.__juego?.teleportTo?.(id), source);
  await expect(page.locator('.prompt')).toHaveText('E · coger');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await archivo(page))?.held).not.toBeNull();
  if (rail === undefined) return;
  await page.evaluate((r) => {
    window.__juego?.teleportTo?.('archivo.planetario');
    window.__juego?.archivoRail?.(r);
  }, rail);
  await expect(page.locator('.prompt')).toHaveText('E · poner');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await archivo(page))?.held).toBeNull();
}

test('five spheres on their rails stop the crank at 6:30 and give the alignment', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await startPlaying(page, '&mundo=archivo');

  const rails: [string, number][] = [
    ['taller', 1],
    ['cicatriz', 2],
    ['archivo', 3],
    ['umbral', 4],
    ['observatorio', 6],
  ];
  for (const [sphere, rail] of rails) await carry(page, `archivo.esfera_${sphere}`, rail);
  expect((await archivo(page))?.placement).toEqual({
    1: 'taller',
    2: 'cicatriz',
    3: 'archivo',
    4: 'umbral',
    6: 'observatorio',
  });

  await expect.poll(async () => (await archivo(page))?.solved, { timeout: 60_000 }).toBe(true);
  await page.evaluate(() => {
    window.__juego?.archivoRail?.(undefined);
    window.__juego?.teleportTo?.('archivo.planetario');
  });
  await expect(page.locator('.prompt')).toHaveText('E · examinar');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.puzzle-title')).toHaveText('El Planetario');
  await closeReader(page);
  const facts = await page.evaluate(() => window.__juego?.snapshot()?.registry.facts ?? []);
  expect(facts).toContain('observatorio.alineacion');
  expect(facts).toContain('lab.riel_vacio');
});

test('a sphere on the wrong rail does not stop the crank', async ({ page }) => {
  test.setTimeout(120_000);
  await startPlaying(page, '&mundo=archivo');

  await carry(page, 'archivo.esfera_taller', 5);
  expect((await archivo(page))?.solved).toBe(false);
  expect((await archivo(page))?.placement).toEqual({ 5: 'taller' });
});

test('the prism is taken from the floor and fitted on its stand', async ({ page }) => {
  test.setTimeout(120_000);
  await startPlaying(page, '&mundo=archivo');

  await carry(page, 'archivo.prisma');
  await page.evaluate(() => window.__juego?.teleportTo?.('archivo.soporte'));
  await expect(page.locator('.prompt')).toHaveText('E · poner');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await archivo(page))?.prism).toBe(true);
});
