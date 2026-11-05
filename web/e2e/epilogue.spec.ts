// Fase 10D: el epílogo. Con el Contrapeso instalado, el horizonte estable tira de la nave, el tiempo de fuera corre
// más deprisa y cruzarlo (fundido a negro, sin contar ciclo) abre el Archivo de las Puertas. Allí, fuera del tiempo,
// los planos del Contrapeso se cogen o se dejan y una de las bocas de casa lleva de vuelta: la que se elija y los
// planos deciden el final (`?final=`).
import { expect, test, type Page } from '@playwright/test';
import { installCounterweight, standAt } from './counterweightSteps';
import { closeReader, ready, snapshot, startPlaying } from './helpers';

const SAVE_KEY = 'bucle-tiempo:partida';

async function horizon(page: Page) {
  return page.evaluate(() => window.__juego?.horizon?.() ?? null);
}

async function epilogue(page: Page) {
  return page.evaluate(() => window.__juego?.epilogue?.() ?? null);
}

async function board(page: Page): Promise<void> {
  expect(await page.evaluate(() => window.__juego?.warpTo?.('umbral') ?? false)).toBe(true);
  expect(await page.evaluate(() => window.__juego?.toShip?.() ?? false)).toBe(true);
  await expect(page.locator('.board-prompt')).toBeVisible();
  await page.keyboard.press('KeyF');
  await expect.poll(async () => (await snapshot(page))?.ship?.piloting).toBe(true);
}

/** Una partida que ya entendió el desfase de las bocas (K7) y cuándo es la prueba mayor (K8). */
async function withUnderstanding(page: Page): Promise<void> {
  await ready(page, '&mundo=puertas');
  await page.evaluate((key) => {
    const facts = ['bocas.relojes_distintos', 'casa.prueba_llama', 'casa.prueba_plazo'];
    window.localStorage.setItem(
      key,
      JSON.stringify({ version: 2, loopsCompleted: 3, facts, prologueDone: true }),
    );
  }, SAVE_KEY);
  await startPlaying(page, '&mundo=puertas');
}

async function openMouths(page: Page): Promise<void> {
  await standAt(page, 'puertas.bocas');
  await expect(page.locator('.prompt')).toHaveText('E · examinar');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.puzzle-title')).toHaveText('Las bocas de casa');
}

test.afterEach(async ({ page }) => {
  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
  }, SAVE_KEY);
});

test('the stable horizon pulls the ship in, and crossing it opens the Archive of the Gates', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await installCounterweight(page);
  // Primero a la nave: subir a ella lleva su tiempo y a partir de las 13:30 queda poco ciclo.
  await board(page);
  // Nace a las 13:30 en el núcleo de la máquina y se queda pequeño.
  await page.evaluate(() => window.__juego?.skipTo?.(812));
  await expect.poll(async () => (await horizon(page))?.radius ?? 0).toBeGreaterThan(0);
  const far = (await snapshot(page))?.loop.rate ?? 0;
  expect(await page.evaluate(() => window.__juego?.nearHorizon?.(2.5) ?? false)).toBe(true);
  await expect.poll(async () => (await horizon(page))?.closeness ?? 0).toBeGreaterThan(0.3);
  // Cerca del horizonte, el tiempo del sitio va más despacio: el de Umbral corre más deprisa.
  await expect.poll(async () => (await snapshot(page))?.loop.rate ?? 1).toBeLessThan(far * 0.85);

  // Cruzarlo funde a negro y abre el Archivo: la página cambia enseguida, así que se espera la llegada.
  await page.keyboard.down('KeyW');
  await page.waitForURL(/mundo=puertas/, { timeout: 60_000 });
  await page.keyboard.up('KeyW');
  await expect.poll(async () => (await snapshot(page))?.world, { timeout: 20_000 }).toBe('puertas');
  expect((await snapshot(page))?.loop.loops).toBe(0); // no fue una muerte: no cuenta ciclo
  await expect.poll(async () => (await snapshot(page))?.grounded, { timeout: 20_000 }).toBe(true);
  await expect(page.locator('.llegada')).toHaveCount(0);
});

test('the Archive is out of time: no loop, the plans are taken and left, and the right mouth gives ending B', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await withUnderstanding(page);
  const start = (await snapshot(page))?.loop.umbral;
  await expect(page.locator('.clock-hud')).toBeHidden();

  await standAt(page, 'puertas.planos');
  await expect(page.locator('.prompt')).toHaveText('E · examinar');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader-title')).toHaveText('Los planos del Contrapeso');
  await closeReader(page);
  expect((await snapshot(page))?.registry.facts).toContain('contrapeso.planos');
  await expect(page.locator('.prompt')).toHaveText('E · coger');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await epilogue(page))?.carryingPlans).toBe(true);
  await expect(page.locator('.prompt')).toHaveText('E · dejar');
  expect((await snapshot(page))?.loop.umbral).toBe(start);

  await openMouths(page);
  await expect(page.locator('.puzzle-hint').first()).toHaveText(
    'La prueba mayor es el día 40 desde que despegaste.',
  );
  await expect(page.locator('.puzzle-mouths')).toContainText('280 días después de lo que se ve');
  await page.getByRole('button', { name: 'Elegir: El Instituto, más joven' }).click();
  await expect(page.locator('.puzzle-choices')).toContainText('Llevas los planos del Contrapeso.');
  await page.getByRole('button', { name: 'Cruzar' }).click();

  await expect.poll(async () => (await snapshot(page))?.loop.cause).toBe('boca');
  expect((await snapshot(page))?.registry.facts).toContain('bocas.vuelta_antes');
  await page.waitForURL(/mundo=hogar&final=B/, { timeout: 30_000 });
});

test('without K7 the mouths only show what is seen, and the one that looks closest arrives late', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await startPlaying(page, '&mundo=puertas');
  await openMouths(page);

  await expect(page.locator('.puzzle-hint').first()).toHaveText(
    'Cuatro bocas de casa. Al otro lado de cada una, Hogar.',
  );
  await expect(page.locator('.puzzle-mouths')).not.toContainText('por delante');
  await expect(page.locator('.puzzle-mouths')).toContainText('Cerrada.');
  await page.getByRole('button', { name: 'Elegir: Hogar al anochecer' }).click();
  await expect(
    page.getByRole('group', { name: /Cruzar hacia «Hogar al anochecer»/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Todavía no' }).click();
  await expect(page.getByRole('button', { name: 'Cruzar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Elegir: Hogar al anochecer' })).toBeFocused();
  await page.getByRole('button', { name: 'Elegir: La Sala de Fragmentos, llena' }).click();
  await page.getByRole('button', { name: 'Cruzar' }).click();

  await page.waitForURL(/mundo=hogar&final=tarde/, { timeout: 30_000 });
});
