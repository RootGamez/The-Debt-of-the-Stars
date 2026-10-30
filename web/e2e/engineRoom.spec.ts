// Fase 10C: la Sala del Motor de Cicatriz. Con la palanca sale el motor viejo; el Contrapeso se pone en la cuna y
// sus dos ruedas igualan su reloj con el de la máquina. El pulso de las 9:00 lo encaja (y el agujero negro ya no
// traga nada) o lo rechaza si los relojes no coinciden.
import { expect, test } from '@playwright/test';
import { counterweight, intoTheCradle, matchClocks, openWheels } from './counterweightSteps';
import { snapshot } from './helpers';

test('the pulse installs the Counterweight when both clocks match, and the hole stops growing', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await intoTheCradle(page);
  await openWheels(page);
  await expect(page.locator('.puzzle-status')).toHaveText('');

  await matchClocks(page);

  await expect(page.locator('.puzzle-status')).toHaveText('Los dos relojes marcan lo mismo.');
  await expect(page.locator('.puzzle-noted-title')).toHaveText('Anotado en el Registro');
  expect((await snapshot(page))?.registry.facts).toContain('contrapeso.reloj');
  await page.keyboard.press('KeyE');

  await page.evaluate(() => window.__juego?.skipTo?.(538));
  await expect
    .poll(async () => (await counterweight(page))?.place, { timeout: 20_000 })
    .toBe('installed');
  await expect(page.locator('.notice')).toContainText('El pulso lo encaja');

  // Pasada la absorción de Cicatriz (13:45) sigues de pie en ella y el agujero se queda pequeño.
  await page.evaluate(() => window.__juego?.skipTo?.(840));
  await expect.poll(async () => (await snapshot(page))?.loop.umbral ?? 0).toBeGreaterThan(841);
  const hole = await page.evaluate(() => window.__juego?.blackHole?.() ?? null);
  expect(hole?.radius).toBeGreaterThan(0);
  expect(hole?.radius).toBeLessThanOrEqual(6);
  expect((await snapshot(page))?.loop).toMatchObject({ phase: 'playing', cause: null });
});

test('the pulse pushes it out when the clocks do not match', async ({ page }) => {
  test.setTimeout(120_000);
  await intoTheCradle(page);

  await page.evaluate(() => window.__juego?.skipTo?.(538));
  await expect
    .poll(async () => (await counterweight(page))?.place, { timeout: 20_000 })
    .toBe('rejected');
  await expect(page.locator('.notice')).toContainText('El pulso lo rechaza');
  await openWheels(page);
  await expect(page.locator('.puzzle-hint').first()).toContainText('rechazado');
  await expect(page.getByRole('button', { name: 'Minutos: adelantar' })).toBeHidden();
});
