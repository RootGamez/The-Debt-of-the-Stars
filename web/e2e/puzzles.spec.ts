// Fase 7 (hito 7E): los lectores de puzle. El cuaderno de Umbral se resuelve completando la última hora del
// Archivo; las cartas del Archivo, ordenándolas por cuándo se escribieron de verdad (en días de Umbral).
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
