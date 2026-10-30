// Fase 7 (hito 7B): el Laboratorio está dentro del Nudo. Por dentro la gravedad empuja hacia fuera y se camina
// por la cara interior; la Puerta plegada lleva de la cara interior a la cáscara de fuera y de vuelta.
import { expect, test, type Page } from '@playwright/test';
import { snapshot, startPlaying } from './helpers';

function place(page: Page) {
  return page.evaluate(() => window.__juego?.place?.() ?? null);
}

async function enterNudo(page: Page): Promise<void> {
  await startPlaying(page);
  expect(await page.evaluate(() => window.__juego?.warpTo?.('laboratorio') ?? false)).toBe(true);
  await expect.poll(async () => (await snapshot(page))?.grounded, { timeout: 15_000 }).toBe(true);
}

/**
 * Camina hacia atrás a pasos cortos hasta cruzar un anillo más. Con la tecla siempre pulsada, si la prueba
 * tarda en soltarla (máquina cargada), el jugador atraviesa el gemelo durante la pausa y queda detrás de él.
 */
async function backThroughGate(page: Page, crossings: number): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (((await place(page))?.crossings ?? 0) < crossings) {
    if (Date.now() > deadline) throw new Error(`no cruzó el anillo ${String(crossings)}`);
    await page.keyboard.down('KeyS');
    await page.waitForTimeout(120);
    await page.keyboard.up('KeyS');
  }
  expect((await place(page))?.crossings).toBe(crossings);
}

test('inside the Nudo you stand on the inner face, with the head toward the center', async ({
  page,
}) => {
  await enterNudo(page);

  expect(await place(page)).toMatchObject({ world: 'laboratorio', inside: true, crossings: 0 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  // Caminar un rato por la cara interior no hace caer a nadie hacia el centro.
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyW');
  await expect.poll(async () => (await snapshot(page))?.grounded).toBe(true);
  expect(await place(page)).toMatchObject({ inside: true });
  expect(errors).toEqual([]);
});

test('the sources of the laboratory can be read inside the Nudo', async ({ page }) => {
  await enterNudo(page);

  // (La pizarra se lee con su lector de puzle: e2e/puzzles.spec.ts.)
  expect(
    await page.evaluate(() => window.__juego?.teleportTo?.('lab.notas_esceptico') ?? false),
  ).toBe(true);
  await expect(page.locator('.prompt')).toHaveText('E · leer');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader-title')).toHaveText('Las notas del escéptico');
});

test('the folded gate takes you out to the shell and back in', async ({ page }) => {
  await enterNudo(page);

  // El punto de aparición está delante de la Puerta de dentro, de espaldas a ella.
  await backThroughGate(page, 1);
  await expect.poll(async () => (await place(page))?.inside).toBe(false);
  await expect.poll(async () => (await snapshot(page))?.grounded, { timeout: 10_000 }).toBe(true);

  // Fuera, se aparece delante de la Puerta de la cáscara, también de espaldas: pasada la pausa, se vuelve a
  // entrar.
  await page.waitForTimeout(1600);
  await backThroughGate(page, 2);
  await expect.poll(async () => (await place(page))?.inside).toBe(true);
  await expect.poll(async () => (await snapshot(page))?.grounded, { timeout: 10_000 }).toBe(true);
});
