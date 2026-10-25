// Fase 4: leer una fuente, el Registro, la lectura profunda, el tiempo detenido al leer y que lo
// aprendido sobrevive a morir y a recargar. `teleportTo` (solo con ?debug) coloca al jugador frente a
// una fuente; el resto es juego normal con teclado.
import { expect, test, type Page } from '@playwright/test';
import { loopValue, snapshot, startPlaying } from './helpers';

async function facts(page: Page): Promise<string[]> {
  return (await snapshot(page))?.registry.facts ?? [];
}

async function goTo(page: Page, clueId: string): Promise<void> {
  const ok = await page.evaluate((id) => window.__juego?.teleportTo?.(id) ?? false, clueId);
  expect(ok).toBe(true);
  await expect(page.locator('.prompt')).toBeVisible();
}

async function readSource(page: Page, clueId: string): Promise<void> {
  await goTo(page, clueId);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader')).toBeVisible();
}

async function closeReader(page: Page): Promise<void> {
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader')).toBeHidden();
}

test('reading a source shows its text, notes the facts and the Registro keeps them', async ({
  page,
}) => {
  await startPlaying(page);

  await goTo(page, 'umbral.placa');
  await expect(page.locator('.prompt')).toHaveText('E · leer');
  await page.keyboard.press('KeyE');

  await expect(page.locator('.reader-title')).toHaveText('Placa de inauguración');
  await expect(page.locator('.reader')).toContainText('Consejo de Tránsito');
  await expect(page.locator('.reader-noted')).toContainText('Un Consejo de Tránsito autorizaba');
  expect(await facts(page)).toContain('silencio.consejo_existe');
});

test('time stops while reading and the double clock keeps still', async ({ page }) => {
  await startPlaying(page);
  await readSource(page, 'umbral.cuaderno');
  const stopped = await loopValue(page, 'umbral');

  await page.waitForTimeout(1200);

  expect(await loopValue(page, 'umbral')).toBe(stopped);
  await closeReader(page);
  await expect.poll(() => loopValue(page, 'umbral')).toBeGreaterThan((stopped ?? 0) + 0.3);
});

test('a deep reading appears once the player knows enough', async ({ page }) => {
  await startPlaying(page);

  await readSource(page, 'umbral.placa');
  await expect(page.locator('.reader')).not.toContainText('Lectura más profunda');
  await expect(page.locator('.reader-hint')).toBeVisible(); // hay algo más que aún no sabe leer
  await closeReader(page);
  await readSource(page, 'umbral.cuaderno'); // enseña que los relojes se separan
  await closeReader(page);
  await readSource(page, 'umbral.placa');

  await expect(page.locator('.reader')).toContainText('Lectura más profunda');
  await expect(page.locator('.reader')).toContainText('La cuenta empieza hoy');
  expect(await facts(page)).toContain('deuda.palabra');
});

test('the Registro lists facts by thread, rumors as questions and unlocked conclusions', async ({
  page,
}) => {
  await startPlaying(page);
  await readSource(page, 'umbral.cuaderno');
  await closeReader(page);
  await readSource(page, 'umbral.envios'); // ahora sí se puede leer en profundidad
  await closeReader(page);

  await page.keyboard.press('KeyR');

  const registry = page.locator('.registry');
  await expect(registry).toBeVisible();
  await expect(registry).toContainText('Los relojes de dos mundos se separan');
  await expect(registry).toContainText('Hubo un destino secreto donde el tiempo casi no avanzaba');
  await expect(registry).toContainText('? ¿Dónde está ese sitio'); // rumor
  await expect(registry).toContainText('Lo que sé');
  await expect(registry).toContainText('Existe un sitio lento'); // K1
  await page.keyboard.press('Escape');
  await expect(registry).toBeHidden();
});

test('witnessing the flash of La Boca at 10:00 notes its fact', async ({ page }) => {
  await startPlaying(page);

  for (let i = 0; i < 10; i++) await page.keyboard.press(']');

  await expect.poll(() => facts(page)).toContain('deuda.puertas_se_buscan');
  await expect(page.locator('.notice')).toContainText('Anotado en el Registro');
});

test('what was learned survives dying and reloading', async ({ page }) => {
  await startPlaying(page, '&ciclo=12');
  await readSource(page, 'umbral.cuaderno');
  await closeReader(page);

  await expect.poll(() => loopValue(page, 'loops'), { timeout: 60_000 }).toBe(1);
  expect(await facts(page)).toContain('deuda.relojes_se_separan');

  await page.reload();
  await expect
    .poll(async () => (await snapshot(page))?.registry.facts ?? [])
    .toContain('deuda.relojes_se_separan');
});

test('"Empezar de cero" also erases the Registro', async ({ page }) => {
  await startPlaying(page, '&ciclo=10');
  await readSource(page, 'umbral.cuaderno');
  await closeReader(page);
  await expect.poll(() => loopValue(page, 'loops'), { timeout: 60_000 }).toBe(1);

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Empezar de cero', exact: true }).click();
  await page.getByRole('button', { name: 'Borrar', exact: true }).click();

  await expect.poll(async () => (await snapshot(page))?.registry.facts ?? ['x']).toEqual([]);
});

test('the pause screen opens the Registro and pausing closes a reading', async ({ page }) => {
  await startPlaying(page);
  await readSource(page, 'umbral.placa');

  await page.keyboard.press('Escape');

  await expect(page.locator('.reader')).toBeHidden();
  await page.getByRole('button', { name: 'Registro', exact: true }).click();
  await expect(page.locator('.registry')).toBeVisible();
  await expect(page.locator('.registry')).toContainText('Un Consejo de Tránsito autorizaba');
});

test('there is no prompt when nothing is near or the source is behind', async ({ page }) => {
  await startPlaying(page);

  await expect(page.locator('.prompt')).toBeHidden();
});
