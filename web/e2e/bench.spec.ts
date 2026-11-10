// Plan de historia y puzzles físicos, T8: la Balanza del Contrapeso del Taller (P6) y la placa que canta de Cicatriz
// (P7). Una pesa de tres a cuatro muescas equilibra la maqueta del motor viejo (seis medidas a dos del eje) y deja
// leer la nota de la Cuna; tres pinzas en los agujeros 1, 3 y 5 hacen que la arena dibuje el símbolo y dan sus hechos.
import { expect, test, type Page } from '@playwright/test';
import { closeReader, startPlaying } from './helpers';

async function bench(page: Page) {
  return page.evaluate(() => window.__juego?.bench?.() ?? null);
}

async function weighIn(page: Page, weight: number, notch: number): Promise<void> {
  await page.evaluate((id) => window.__juego?.teleportTo?.(id), `taller.pesa_${String(weight)}`);
  await expect(page.locator('.prompt')).toHaveText('E · coger');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await bench(page))?.held).toBe(weight);
  await page.evaluate((n) => {
    window.__juego?.teleportTo?.('taller.balanza');
    window.__juego?.benchNotch?.(n);
  }, notch);
  await expect(page.locator('.prompt')).toHaveText('E · poner');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await bench(page))?.held).toBeNull();
}

test('a weight of three at the fourth notch balances the old motor and opens the note of the cradle', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await startPlaying(page, '&mundo=taller');

  await page.evaluate(() => window.__juego?.teleportTo?.('taller.nota_cuna'));
  await expect(page.locator('.prompt')).toBeHidden();

  await weighIn(page, 3, 4);
  expect(await bench(page)).toMatchObject({ balanced: true, placement: { 4: 3 } });

  await page.evaluate(() => window.__juego?.teleportTo?.('taller.nota_cuna'));
  await expect(page.locator('.prompt')).toHaveText('E · leer');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader-title')).toBeVisible();
  await closeReader(page);
  const facts = await page.evaluate(() => window.__juego?.snapshot()?.registry.facts ?? []);
  expect(facts).toContain('contrapeso.equilibrio');
});

test('a weight on the wrong notch does not balance it', async ({ page }) => {
  test.setTimeout(120_000);
  await startPlaying(page, '&mundo=taller');

  await weighIn(page, 3, 6);

  expect(await bench(page)).toMatchObject({ balanced: false });
});

test('clamps at holes 1, 3 and 5 make the sand draw the whole symbol', async ({ page }) => {
  test.setTimeout(150_000);
  await startPlaying(page, '&mundo=cicatriz');

  for (const hole of [1, 3, 5]) {
    await page.evaluate((h) => {
      window.__juego?.teleportTo?.('cicatriz.placa');
      window.__juego?.benchHole?.(h);
    }, hole);
    await expect(page.locator('.prompt')).toHaveText('E · pinzar');
    await page.keyboard.press('KeyE');
    await expect.poll(async () => (await bench(page))?.clamps).toContain(hole);
  }
  expect(await bench(page)).toMatchObject({ symbol: true, clamps: [1, 3, 5] });

  await page.evaluate(() => {
    window.__juego?.benchHole?.(undefined);
    window.__juego?.teleportTo?.('cicatriz.placa');
  });
  await expect(page.locator('.prompt')).toHaveText('E · examinar');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.puzzle-title')).toHaveText('La placa que canta');
  await closeReader(page);
  const facts = await page.evaluate(() => window.__juego?.snapshot()?.registry.facts ?? []);
  expect(facts).toContain('cicatriz.firma');
  expect(facts).toContain('deuda.resonancia');
});
