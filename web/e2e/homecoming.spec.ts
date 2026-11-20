// Fase 10E y F4/F5: la vuelta a casa. Por una boca del Archivo de las Puertas o de La Boca se llega a
// `?mundo=hogar&final=A|tarde[&via=boca|archivo]`. Con A, el Hogar de antes (sin los fragmentos que aún no han
// llegado) y la cinemática del nido (F4: el Albatros II se posa y la Maestra lee tu cuaderno); al acabar guarda el
// final y recarga en el Mirador (`escena=mirador`, F3), que acaba en la tarjeta. Llegar tarde es el final malo (F5):
// la visita al Hogar de diez años después y la escena del colapso; su tarjeta (según `via`) se guarda y ofrece volver
// al Archivo. Las cinemáticas se saltan con los `...Seek` de `?debug` (a ritmo real durarían minutos).
import { expect, test, type Page } from '@playwright/test';
import { debugCall, ready, snapshot, startPlaying } from './helpers';

const SAVE_KEY = 'bucle-tiempo:partida';

async function homecoming(page: Page) {
  return page.evaluate(() => window.__juego?.homecoming?.() ?? null);
}

async function savedEndings(page: Page): Promise<unknown> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as { endings?: unknown }).endings;
  }, SAVE_KEY);
}

/** De vuelta en casa con `final`, en una partida que ya cruzó el gusano y vio `endings`. */
async function arriveHome(
  page: Page,
  ending: string,
  endings: string[] = [],
  via?: string,
): Promise<void> {
  const query = `&mundo=hogar&final=${ending}${via === undefined ? '' : `&via=${via}`}`;
  await ready(page, query);
  await page.evaluate(
    ({ key, seen }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 7,
          loopsCompleted: 4,
          facts: ['bocas.vuelta_antes'],
          prologueDone: true,
          endings: seen,
          worlds: {},
          tasks: [],
          opened: [],
          loop: { source: 'inPlace', left: false },
        }),
      );
    },
    { key: SAVE_KEY, seen: endings },
  );
  // La escena del nido empieza sola y deja la pausa inerte: con A no hay clic que dar.
  if (ending === 'A') await ready(page, query);
  else await startPlaying(page, query);
}

interface Scene {
  stage: string;
}

const earlier = (page: Page) => debugCall<Scene>(page, 'homeEarlier');
const later = (page: Page) => debugCall<Scene>(page, 'homeLater');

test.afterEach(async ({ page }) => {
  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
  }, SAVE_KEY);
});

test('ending A: the nest scene plays, saves the ending and reloads into the Mirador', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await arriveHome(page, 'A');
  const home = await homecoming(page);
  expect(home).toMatchObject({ ending: 'A' });
  // La Luna llega con su mordida nueva (variante), no con piezas que falten.
  expect(home?.without).toEqual([]);
  // No es el prólogo: ni tareas ni gusano.
  expect(await page.evaluate(() => window.__juego?.tasks?.() ?? null)).toBeNull();
  expect(await page.evaluate(() => window.__juego?.wormhole?.().active)).toBe(false);
  // La escena del nido empieza sola y cierra el viaje (la Maestra ya no habla en una tarjeta).
  await expect.poll(async () => (await earlier(page))?.stage, { timeout: 60_000 }).toBe('scene');
  await expect.poll(async () => (await homecoming(page))?.phase).toBe('scene');
  await debugCall(page, 'homeEarlierSeek', 1000);
  await page.waitForURL(/escena=mirador/, { waitUntil: 'commit', timeout: 60_000 });
  expect(await savedEndings(page)).toEqual(['A']);
});

test('the late ending: the visit and the collapse scene end in the card, saved with the endings already seen', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await arriveHome(page, 'tarde', ['A'], 'boca');
  expect(await homecoming(page)).toMatchObject({ ending: 'tarde' });
  await expect.poll(async () => (await later(page))?.stage, { timeout: 60_000 }).toBe('arrival');
  await debugCall(page, 'homeCollapse');
  await expect.poll(async () => (await later(page))?.stage).toBe('collapse');
  await debugCall(page, 'homeCollapseSeek', 1000);

  const card = page.getByRole('dialog', { name: 'Llegas tarde' });
  await expect(card).toBeVisible({ timeout: 60_000 });
  expect(await savedEndings(page)).toEqual(['A', 'tarde']);
  // Ya no hay vuelta al juego: ni pausa ni Registro.
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyR');
  await expect(page.locator('.overlay')).toBeHidden();
  await expect(page.locator('.registry')).toBeHidden();
  await expect(card.getByRole('button', { name: 'Volver a jugar' })).toBeFocused();
  // Cerrado el viaje, no se anda.
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(500);
  expect((await snapshot(page))?.speed).toBeLessThan(0.05);
  await page.keyboard.up('KeyW');
});

test('arriving late through an Archive mouth is saved and the card leads back to the Archive', async ({
  page,
}) => {
  // Recarga el Archivo de las Puertas entero tras la tarjeta: con WebGL por software, junto a otra prueba, pasó de 4 min.
  test.setTimeout(420_000);
  await arriveHome(page, 'tarde', [], 'archivo');
  expect(await homecoming(page)).toMatchObject({ ending: 'tarde', without: [] });
  await expect.poll(async () => (await later(page))?.stage, { timeout: 60_000 }).toBe('arrival');
  await debugCall(page, 'homeCollapse');
  await debugCall(page, 'homeCollapseSeek', 1000);

  const card = page.getByRole('dialog', { name: 'Un sistema que no era el tuyo' });
  await expect(card).toBeVisible({ timeout: 60_000 });
  expect(await savedEndings(page)).toEqual(['tarde']);
  await card.getByRole('button', { name: 'Volver al Archivo' }).click();

  await page.waitForURL(/mundo=puertas/, { waitUntil: 'commit', timeout: 60_000 });
  await expect
    .poll(async () => (await snapshot(page))?.world, { timeout: 120_000 })
    .toBe('puertas');
});
