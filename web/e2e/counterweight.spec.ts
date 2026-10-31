// Fase 10B: el Contrapeso. Espera en su Banco del Laboratorio: primero se examina y luego se coge; en brazos su
// reloj se suma al tablero, viaja en el relicario de la nave y vuelve a su Banco con cada ciclo.
import { expect, test, type Page } from '@playwright/test';
import { closeReader, loopValue, startPlaying } from './helpers';

async function counterweight(page: Page) {
  return page.evaluate(() => window.__juego?.counterweight?.() ?? null);
}

async function pickUp(page: Page): Promise<void> {
  expect(await page.evaluate(() => window.__juego?.teleportTo?.('lab.contrapeso') ?? false)).toBe(
    true,
  );
  await expect(page.locator('.prompt')).toHaveText('E · examinar');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader-title')).toHaveText('El Contrapeso');
  await closeReader(page);
  await expect(page.locator('.prompt')).toHaveText('E · coger');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await counterweight(page))?.place).toBe('carried');
}

test('the Counterweight is examined, then picked up, and its clock joins the board', async ({
  page,
}) => {
  await startPlaying(page);
  expect(await counterweight(page)).toMatchObject({ place: 'bench', inShip: false });
  await expect(page.locator('.clock-hud')).not.toContainText('Contrapeso');

  await pickUp(page);

  await expect(page.locator('.prompt')).toBeHidden(); // ya no está en el Banco
  await expect(page.locator('.clock-hud')).toContainText('Contrapeso');
  const before = (await counterweight(page))?.clock ?? 0;
  await expect.poll(async () => (await counterweight(page))?.clock ?? 0).toBeGreaterThan(before);
});

test('it travels in the ship and goes back to its bench when the loop starts again', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await startPlaying(page);
  await pickUp(page);

  expect(await page.evaluate(() => window.__juego?.warpTo?.('umbral') ?? false)).toBe(true);
  expect(await page.evaluate(() => window.__juego?.toShip?.() ?? false)).toBe(true);
  await expect(page.locator('.board-prompt')).toBeVisible();
  await page.keyboard.press('KeyF');
  await expect.poll(async () => (await counterweight(page))?.inShip).toBe(true);
  await expect(page.locator('.clock-hud')).toContainText('Contrapeso');

  await page.evaluate(() => window.__juego?.skipTo?.(895));
  await expect.poll(() => loopValue(page, 'loops'), { timeout: 60_000 }).toBe(1);
  expect(await counterweight(page)).toMatchObject({ place: 'bench', inShip: false });
  await expect(page.locator('.clock-hud')).not.toContainText('Contrapeso');
});
