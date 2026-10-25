// Prueba de la Fase 3: el ciclo termina, se despierta en La Boca, el progreso se guarda y se puede
// borrar; el reloj de Umbral corre más rápido en un mundo lento (modo B). Ciclos cortos con ?ciclo=.
import { expect, test } from '@playwright/test';
import { loopValue, ready, snapshot, startPlaying, value } from './helpers';

test('a short loop ends, fades to white and wakes up at the start with one more loop', async ({
  page,
}) => {
  await startPlaying(page, '&ciclo=12');
  await expect(page.locator('.clock-hud')).toContainText('tú 00:0');
  // Registra en la página la opacidad máxima de cada color de fundido (no depende del sondeo).
  await page.evaluate(() => {
    const fade = document.querySelector<HTMLElement>('.fade');
    const max: Record<string, number> = {};
    (window as unknown as { __fades: Record<string, number> }).__fades = max;
    if (!fade) return;
    new MutationObserver(() => {
      const color = fade.style.backgroundColor;
      max[color] = Math.max(max[color] ?? 0, Number(fade.style.opacity));
    }).observe(fade, { attributes: true, attributeFilter: ['style'] });
  });

  // La muerte dura 2 s: en vez de sondear esa fase, se espera al ciclo siguiente y se comprueban
  // los fundidos registrados en la página.
  await expect.poll(() => loopValue(page, 'loops'), { timeout: 60_000 }).toBe(1);

  expect(await loopValue(page, 'umbral')).toBeLessThan(5);
  await expect.poll(() => loopValue(page, 'phase'), { timeout: 10_000 }).toBe('playing');
  const fades = await page.evaluate(
    () => (window as unknown as { __fades: Record<string, number> }).__fades,
  );
  expect(fades['rgb(255, 243, 226)']).toBeGreaterThan(0.5); // a blanco cálido al morir
  expect(fades['rgb(0, 0, 0)']).toBeGreaterThan(0.5); // desde negro al despertar
  expect(await value(page, 'respawns')).toBe(0); // reinicio del ciclo, no reaparición de seguridad
});

test('the number of loops survives a reload and can be erased after confirming', async ({
  page,
}) => {
  await startPlaying(page, '&ciclo=10');
  await expect.poll(() => loopValue(page, 'loops'), { timeout: 40_000 }).toBe(1);

  await ready(page);
  await expect(page.locator('.overlay')).toContainText('Ciclos vividos: 1');

  await page.getByRole('button', { name: 'Empezar de cero', exact: true }).click();
  await expect(page.locator('.overlay')).toContainText('¿Borrar todo lo aprendido?');
  await expect(page.locator('.overlay')).toBeVisible(); // el clic en el botón no empieza a jugar
  await page.getByRole('button', { name: 'Borrar', exact: true }).click();

  await page.waitForLoadState('load');
  await ready(page);
  await expect(page.locator('.overlay')).not.toContainText('Ciclos vividos');
});

test('on a slow world the Umbral clock runs ahead of yours (mode B)', async ({ page }) => {
  await startPlaying(page, '&mundo=archivo');

  await expect.poll(() => loopValue(page, 'player'), { timeout: 20_000 }).toBeGreaterThan(2);
  // Los dos relojes en la misma lectura: entre dos lecturas seguidas pasa tiempo.
  const loop = (await snapshot(page))?.loop;

  expect(loop?.rate).toBeLessThan(1); // Archivo es un mundo lento
  expect((loop?.umbral ?? 0) / (loop?.player ?? 1)).toBeCloseTo(1 / (loop?.rate ?? 1), 2);
});

test('pausing stops the clocks and hides the double clock', async ({ page }) => {
  await startPlaying(page);
  await expect.poll(() => loopValue(page, 'umbral')).toBeGreaterThan(0.5);

  await page.keyboard.press('Escape');
  await expect(page.locator('.clock-hud')).toBeHidden();
  const paused = await loopValue(page, 'umbral');
  await page.waitForTimeout(1000);

  expect(await loopValue(page, 'umbral')).toBe(paused);
});

test('with ?debug the ] key skips a minute of the loop', async ({ page }) => {
  await startPlaying(page);
  const before = (await loopValue(page, 'umbral')) ?? 0;

  await page.keyboard.press(']');

  await expect.poll(() => loopValue(page, 'umbral')).toBeGreaterThan(before + 59);
});

test('Cancelar keeps the saved game', async ({ page }) => {
  await startPlaying(page, '&ciclo=10');
  await expect.poll(() => loopValue(page, 'loops'), { timeout: 40_000 }).toBe(1);
  await ready(page);

  await page.getByRole('button', { name: 'Empezar de cero', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();

  await expect(page.locator('.overlay')).toContainText('Ciclos vividos: 1');
  await ready(page);
  await expect(page.locator('.overlay')).toContainText('Ciclos vividos: 1');
});

test('instant events of the world fire at their time (TRIG_LaBoca_Destello at 10:00)', async ({
  page,
}) => {
  await startPlaying(page);

  for (let i = 0; i < 10; i++) await page.keyboard.press(']');

  await expect.poll(async () => (await loopValue(page, 'fired')) ?? []).toContain('boca_destello');
});

test('the pause dialog takes the keyboard focus', async ({ page }) => {
  await startPlaying(page);

  await page.keyboard.press('Escape');

  await expect(page.getByRole('button', { name: 'Seguir', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => value(page, 'playing')).toBe(true);
});
