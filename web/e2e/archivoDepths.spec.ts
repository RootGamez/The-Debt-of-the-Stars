// Plan de historia y puzzles físicos, T7: la Cisterna del Fondo del Cañón (P4) y los péndulos de la Sala Cerrada (P3)
// del Archivo. Siete partes de piedra llenan la cisterna y dejan alcanzar los registros del Fondo; los largos de la
// escalera del Contrapeso (1, 3, 2, 5, 4) desacoplan los péndulos, abren la trampilla y dan sus dos hechos.
import { expect, test, type Page } from '@playwright/test';
import { closeReader, startPlaying } from './helpers';

async function depths(page: Page) {
  return page.evaluate(() => window.__juego?.depths?.() ?? null);
}

async function toss(page: Page, pile: string): Promise<void> {
  await page.evaluate((id) => window.__juego?.teleportTo?.(id), `archivo.${pile}`);
  await expect(page.locator('.prompt')).toHaveText('E · coger');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await depths(page))?.held).not.toBeNull();
  await page.evaluate(() => window.__juego?.teleportTo?.('archivo.cisterna'));
  await expect(page.locator('.prompt')).toHaveText('E · echar');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await depths(page))?.held).toBeNull();
}

test('seven parts of stone fill the cistern and let you reach the records of the Fondo', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await startPlaying(page, '&mundo=archivo');

  await toss(page, 'bloques_3');
  await toss(page, 'tablones');
  expect((await depths(page))?.level).toBe(3);
  await toss(page, 'bloques_3');
  await toss(page, 'bloques_1');
  expect(await depths(page)).toMatchObject({ level: 7, full: true });

  await page.evaluate(() => window.__juego?.teleportTo?.('archivo.fondo_canon'));
  await expect(page.locator('.prompt')).toHaveText('E · leer');
});

test('too much stone spills back to the second mark', async ({ page }) => {
  test.setTimeout(120_000);
  await startPlaying(page, '&mundo=archivo');

  await toss(page, 'bloques_3');
  await toss(page, 'bloques_3');
  await toss(page, 'bloques_3');

  expect(await depths(page)).toMatchObject({ level: 5, full: false });
});

test('the pendulums at 1, 3, 2, 5, 4 open the hatch and give what the beam teaches', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await startPlaying(page, '&mundo=archivo');

  const figure = [1, 3, 2, 5, 4];
  for (const [index, length] of figure.entries()) {
    await page.evaluate((n) => window.__juego?.depthsPendulum?.(n), index + 1);
    await page.evaluate(() => window.__juego?.teleportTo?.('archivo.pendulos'));
    while (((await depths(page))?.lengths[index] ?? length) !== length) {
      await expect(page.locator('.prompt')).toHaveText('E · alargar');
      await page.keyboard.press('KeyE');
    }
  }
  await page.evaluate(() => window.__juego?.depthsPendulum?.(undefined));
  expect(await depths(page)).toMatchObject({ lengths: figure, hatch: true });

  await page.evaluate(() => window.__juego?.teleportTo?.('archivo.viga'));
  await expect(page.locator('.prompt')).toHaveText('E · examinar');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.puzzle-title')).toHaveText('La viga de cobre');
  await closeReader(page);
  const facts = await page.evaluate(() => window.__juego?.snapshot()?.registry.facts ?? []);
  expect(facts).toContain('deuda.resonancia');
  expect(facts).toContain('contrapeso.desafina');
});
