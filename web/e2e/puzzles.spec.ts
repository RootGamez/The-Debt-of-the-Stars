// Fase 7 (hito 7E): los lectores de puzle. El cuaderno de Umbral se resuelve completando la última hora del
// Archivo; las cartas del Archivo, ordenándolas por cuándo se escribieron de verdad (en días de Umbral).
// Fase 10 (hito 10A): los diarios de los gemelos, la consola de la Cabina y la pizarra del Laboratorio.
import { expect, test, type Page } from '@playwright/test';
import { snapshot, startPlaying } from './helpers';

async function open(page: Page, source: string): Promise<void> {
  expect(await page.evaluate((id) => window.__juego?.teleportTo?.(id) ?? false, source)).toBe(true);
  await expect(page.locator('.prompt')).toBeVisible();
  await page.keyboard.press('KeyE');
  await expect(page.locator('.puzzle')).toBeVisible();
}

async function facts(page: Page): Promise<string[]> {
  return (await snapshot(page))?.registry.facts ?? [];
}

test('the notebook only notes its fact once the last hour of the Archivo is right', async ({
  page,
}) => {
  await startPlaying(page);
  await open(page, 'umbral.cuaderno');

  await expect(page.locator('.puzzle-notebook')).toContainText('¿?');
  await page.locator('.puzzle-choice', { hasText: '12:30' }).click(); // "son iguales": la trampa
  await expect(page.locator('.puzzle-status')).toContainText('No cuadra');
  expect(await facts(page)).not.toContain('deuda.relojes_se_separan');

  await page.locator('.puzzle-choice', { hasText: '10:00' }).click();

  await expect(page.locator('.puzzle-noted-title')).toHaveText('Anotado en el Registro');
  expect(await facts(page)).toContain('deuda.relojes_se_separan');
});

test('the letters of the Archivo fall into place in days of Umbral', async ({ page }) => {
  await startPlaying(page);
  await open(page, 'archivo.cartas');
  const check = page.getByRole('button', { name: 'Comprobar el orden' });

  await check.click();
  await expect(page.locator('.puzzle-status')).toContainText('Aún no');

  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Subir: Informe archivado' }).click();
  await page.getByRole('button', { name: 'Bajar: Carta desde el destino sin nombre' }).click();
  await check.click();

  await expect(page.locator('.puzzle-noted-title')).toHaveText('Anotado en el Registro');
  expect(await facts(page)).toEqual(
    expect.arrayContaining(['bocas.relojes_distintos', 'silencio.borrado']),
  );
});

function choice(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

test('the twins diaries teach that the lag grows with the days', async ({ page }) => {
  await startPlaying(page);
  await open(page, 'taller.gemelos');
  const status = page.locator('.puzzle-status');

  await choice(page, '20 días').click();
  await expect(status).toContainText('Mira la tormenta');
  await choice(page, '3 días').click();
  await choice(page, 'Día 97').click(); // el atraso fijo: la trampa
  await expect(status).toContainText('crece con los días');
  expect(await facts(page)).not.toContain('contrapeso.metodo_sincronia');

  await choice(page, 'Día 85').click();

  await expect(page.locator('.puzzle-noted-title')).toHaveText('Anotado en el Registro');
  expect(await facts(page)).toContain('contrapeso.metodo_sincronia');
});

/** "1:30" → 1,5 minutos. */
function minutesOf(text: string | null): number {
  const [m, s] = (text ?? '0:00').split(':').map(Number);
  return (m ?? 0) + (s ?? 0) / 60;
}

test('the console of the cabin runs the clocks live, and one barely moves', async ({ page }) => {
  await startPlaying(page);
  await open(page, 'taller.cabina');
  const time = (name: string) =>
    page.locator('.puzzle-console-line', { hasText: name }).locator('.puzzle-console-time');

  await page.waitForTimeout(1500);
  const umbral = minutesOf(await time('Umbral').textContent());
  const slow = minutesOf(await time('Ruta 7').textContent());
  expect(umbral).toBeGreaterThan(1);
  expect(slow).toBeLessThan(umbral / 3);

  await choice(page, 'Umbral').click();
  await expect(page.locator('.puzzle-status')).toContainText('Ese corre más');
  await choice(page, 'Ruta 7 (sin nombre)').click();

  await expect(page.locator('.puzzle-noted-title')).toHaveText('Anotado en el Registro');
  expect(await facts(page)).toEqual(
    expect.arrayContaining(['lab.existe_lugar_lento', 'lab.correccion']),
  );
});

test('the blackboard of the Laboratorio adds up the route of the Counterweight', async ({
  page,
}) => {
  await startPlaying(page);
  await open(page, 'lab.pizarra');

  await choice(page, '4:00 atrasado').click(); // solo el Laboratorio
  await expect(page.locator('.puzzle-status')).toContainText('Cuenta todos los tramos');
  await choice(page, '1:00 atrasado').click();

  await expect(page.locator('.puzzle-noted-title')).toHaveText('Anotado en el Registro');
  expect(await facts(page)).toContain('contrapeso.cuenta_sincronia');
});
