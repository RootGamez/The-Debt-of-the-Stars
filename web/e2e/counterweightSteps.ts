// Pasos compartidos del Contrapeso para las pruebas de Playwright (Fases 10C y 10D): cogerlo, sacar el motor viejo,
// ponerlo en la cuna, igualar las ruedas y dejar que el pulso de las 9:00 lo encaje.
import { expect, type Page } from '@playwright/test';
import { closeReader, startPlaying } from './helpers';

export async function counterweight(page: Page) {
  return page.evaluate(() => window.__juego?.counterweight?.() ?? null);
}

export async function standAt(page: Page, source: string): Promise<void> {
  expect(await page.evaluate((id) => window.__juego?.teleportTo?.(id) ?? false, source)).toBe(true);
}

/** A las 5:00, para que el reloj del Contrapeso y el de la máquina no marquen lo mismo por casualidad. */
export async function intoTheCradle(page: Page): Promise<void> {
  await startPlaying(page);
  await page.evaluate(() => window.__juego?.skipTo?.(300));
  await standAt(page, 'lab.notas_investigadora');
  await expect(page.locator('.prompt')).toHaveText('E · leer');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader-title')).toHaveText('Las notas de la investigadora');
  await closeReader(page);
  // Las notas ya dicen que está terminado: el Contrapeso no tiene nada nuevo y se coge sin examinarlo.
  await standAt(page, 'lab.contrapeso');
  await expect(page.locator('.prompt')).toHaveText('E · coger');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await counterweight(page))?.place).toBe('carried');

  // También sabes ya que sustituye al motor viejo: la palanca se usa sin examinarla.
  await standAt(page, 'cicatriz.palanca');
  await expect(page.locator('.prompt')).toHaveText('E · tirar');
  await page.keyboard.press('KeyE');
  // El aviso dura 4,5 s reales: se mira primero (sale en el mismo fotograma que el motor) para no perderlo.
  await expect(page.locator('.notice')).toContainText('El motor viejo sale');
  await expect.poll(async () => (await counterweight(page))?.motorOut).toBe(true);

  await standAt(page, 'cicatriz.cuna');
  await expect(page.locator('.prompt')).toHaveText('E · poner');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await counterweight(page))?.place).toBe('cradle');
  await expect(page.locator('.clock-hud')).not.toContainText('Contrapeso'); // ya no lo llevas
}

export async function openWheels(page: Page): Promise<void> {
  await expect(page.locator('.prompt')).toHaveText('E · examinar');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.puzzle-title')).toHaveText('La cuna del núcleo');
}

/** Gira las ruedas hasta que el Contrapeso marque lo que la máquina (en la cuna los dos van a la par). */
export async function matchClocks(page: Page): Promise<void> {
  const state = await counterweight(page);
  const gap = (state?.machine ?? 0) - (state?.clock ?? 0);
  const sign = gap < 0 ? 'atrasar' : 'adelantar';
  const minutes = Math.floor(Math.abs(gap) / 60);
  const seconds = Math.round(Math.abs(gap) - minutes * 60);
  // Un clic de verdad en cada rueda; el resto, dentro de la página (cada clic de Playwright tarda segundos con
  // WebGL por software, y con la cuna abierta el tiempo está parado).
  for (const [wheel, turns] of [
    ['Minutos', minutes],
    ['Segundos', seconds],
  ] as const) {
    if (turns === 0) continue;
    const name = `${wheel}: ${sign}`;
    await page.getByRole('button', { name }).click();
    await page.evaluate(
      ([label, count]) => {
        const wheelButton = document.querySelector<HTMLButtonElement>(
          `button[aria-label="${label}"]`,
        );
        for (let i = 0; i < count; i++) wheelButton?.click();
      },
      [name, turns - 1] as const,
    );
  }
}

/** De punta a punta, hasta que el pulso lo encaja (el agujero negro queda estable). */
export async function installCounterweight(page: Page): Promise<void> {
  await intoTheCradle(page);
  await openWheels(page);
  await matchClocks(page);
  await expect(page.locator('.puzzle-status')).toHaveText('Los dos relojes marcan lo mismo.');
  await page.keyboard.press('KeyE');
  await page.evaluate(() => window.__juego?.skipTo?.(538));
  await expect
    .poll(async () => (await counterweight(page))?.place, { timeout: 20_000 })
    .toBe('installed');
}
