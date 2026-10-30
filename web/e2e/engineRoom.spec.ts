// Fase 10C: la Sala del Motor de Cicatriz. Con la palanca sale el motor viejo; el Contrapeso se pone en la cuna y
// sus dos ruedas igualan su reloj con el de la máquina. El pulso de las 9:00 lo encaja (y el agujero negro ya no
// traga nada) o lo rechaza si los relojes no coinciden.
import { expect, test, type Page } from '@playwright/test';
import { snapshot, startPlaying } from './helpers';

async function counterweight(page: Page) {
  return page.evaluate(() => window.__juego?.counterweight?.() ?? null);
}

async function standAt(page: Page, source: string): Promise<void> {
  expect(await page.evaluate((id) => window.__juego?.teleportTo?.(id) ?? false, source)).toBe(true);
}

/** A las 5:00, para que el reloj del Contrapeso y el de la máquina no marquen lo mismo por casualidad. */
async function intoTheCradle(page: Page): Promise<void> {
  await startPlaying(page);
  await page.evaluate(() => window.__juego?.skipTo?.(300));
  await standAt(page, 'lab.notas_investigadora');
  await expect(page.locator('.prompt')).toHaveText('E · leer');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader-title')).toHaveText('Las notas de la investigadora');
  await page.keyboard.press('KeyE');
  // Las notas ya dicen que está terminado: el Contrapeso no tiene nada nuevo y se coge sin examinarlo.
  await standAt(page, 'lab.contrapeso');
  await expect(page.locator('.prompt')).toHaveText('E · coger');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await counterweight(page))?.place).toBe('carried');

  // También sabes ya que sustituye al motor viejo: la palanca se usa sin examinarla.
  await standAt(page, 'cicatriz.palanca');
  await expect(page.locator('.prompt')).toHaveText('E · tirar');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await counterweight(page))?.motorOut).toBe(true);
  await expect(page.locator('.notice')).toContainText('El motor viejo sale');

  await standAt(page, 'cicatriz.cuna');
  await expect(page.locator('.prompt')).toHaveText('E · poner');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await counterweight(page))?.place).toBe('cradle');
  await expect(page.locator('.clock-hud')).not.toContainText('Contrapeso'); // ya no lo llevas
}

async function openWheels(page: Page): Promise<void> {
  await expect(page.locator('.prompt')).toHaveText('E · examinar');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.puzzle-title')).toHaveText('La cuna del núcleo');
}

/** Gira las ruedas hasta que el Contrapeso marque lo que la máquina (en la cuna los dos van a la par). */
async function matchClocks(page: Page): Promise<void> {
  const state = await counterweight(page);
  const gap = (state?.machine ?? 0) - (state?.clock ?? 0);
  const sign = gap < 0 ? 'atrasar' : 'adelantar';
  const minutes = Math.floor(Math.abs(gap) / 60);
  const seconds = Math.round(Math.abs(gap) - minutes * 60);
  for (let i = 0; i < minutes; i++)
    await page.getByRole('button', { name: `Minutos: ${sign}` }).click();
  for (let i = 0; i < seconds; i++)
    await page.getByRole('button', { name: `Segundos: ${sign}` }).click();
}

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
