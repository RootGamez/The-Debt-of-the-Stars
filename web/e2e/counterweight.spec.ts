// Fase 10B: el Contrapeso. Espera en su Banco del Laboratorio: primero se examina y luego se coge; en brazos su
// reloj se suma al tablero, viaja en el relicario de la nave y vuelve a su Banco con cada ciclo. E2: su burbuja
// acelera el Laboratorio mientras espera (×5) y tu reloj mientras lo llevas (×2,5), así que el ciclo va más despacio.
import { expect, test, type Page } from '@playwright/test';
import { closeReader, loopValue, startPlaying } from './helpers';

// Con WebGL por software la carga sola se come casi un minuto, y cada salto de mundo otro tanto.
test.describe.configure({ timeout: 420_000 });

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

test('its bubble makes the Laboratorio run fast, and carrying it slows the loop anywhere', async ({
  page,
}) => {
  await startPlaying(page);
  expect(await page.evaluate(() => window.__juego?.teleportTo?.('lab.contrapeso') ?? false)).toBe(
    true,
  );
  // En su Banco: el Laboratorio corre ×5 (un minuto real son 12 s del ciclo).
  await expect.poll(async () => (await loopValue(page, 'rate')) ?? 0).toBeCloseTo(5, 1);

  await pickUp(page);
  // Fuera del Banco el Laboratorio vuelve al Nudo (1), pero la burbuja va contigo: ×2,5.
  await expect.poll(async () => (await loopValue(page, 'rate')) ?? 0).toBeCloseTo(2.5, 1);

  expect(await page.evaluate(() => window.__juego?.warpTo?.('umbral') ?? false)).toBe(true);
  await expect.poll(async () => (await loopValue(page, 'rate')) ?? 0).toBeCloseTo(2.5, 1);
  // Su tercer reloj va por delante del de Umbral.
  const state = await counterweight(page);
  expect(state?.clock ?? 0).toBeGreaterThan((await loopValue(page, 'umbral')) ?? Infinity);
});

test('it travels in the ship and goes back to its bench when the loop starts again', async ({
  page,
}) => {
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
