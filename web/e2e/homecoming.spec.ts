// Fase 10E: la vuelta a casa. Por una boca del Archivo de las Puertas se llega a `?mundo=hogar&final=A|B|tarde`. Con
// A y B, el Hogar de antes (sin los fragmentos que aún no han llegado); hablar con la Directora cierra el viaje con la
// tarjeta del final, que se guarda como visto. Llegar tarde no es un final: la tarjeta lleva de vuelta al Archivo.
import { expect, test, type Page } from '@playwright/test';
import { standAt } from './counterweightSteps';
import { ready, snapshot, startPlaying } from './helpers';

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
async function arriveHome(page: Page, ending: string, endings: string[] = []): Promise<void> {
  const query = `&mundo=hogar&final=${ending}`;
  await ready(page, query);
  await page.evaluate(
    ({ key, seen }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 3,
          loopsCompleted: 4,
          facts: ['bocas.vuelta_antes'],
          prologueDone: true,
          endings: seen,
        }),
      );
    },
    { key: SAVE_KEY, seen: endings },
  );
  await startPlaying(page, query);
}

async function talkToTheDirector(page: Page): Promise<void> {
  await standAt(page, 'instituto.directora');
  await expect(page.locator('.prompt')).toHaveText('E · hablar');
  await page.keyboard.press('KeyE');
}

test.afterEach(async ({ page }) => {
  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
  }, SAVE_KEY);
});

test('ending A: the earlier home, the view turns to the Moon and the card offers to play again', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await arriveHome(page, 'A');
  const home = await homecoming(page);
  expect(home).toMatchObject({ ending: 'A', phase: 'playing' });
  expect(home?.without).toContain('luna_Fragmento');
  // No es el prólogo: ni guía ni gusano.
  expect(await page.evaluate(() => window.__juego?.guide?.().shown ?? null)).toBeNull();
  expect(await page.evaluate(() => window.__juego?.wormhole?.().active)).toBe(false);
  // El fragmento de la Luna aún no ha llegado: no hay nada que examinar allí.
  await standAt(page, 'instituto.fragmento_luna');
  await expect(page.locator('.prompt')).toBeHidden();

  await talkToTheDirector(page);
  await expect.poll(async () => (await homecoming(page))?.phase).toBe('turning');
  await expect.poll(async () => (await homecoming(page))?.phase, { timeout: 10_000 }).toBe('card');
  const card = page.getByRole('dialog', { name: 'Final A' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Texto provisional');
  await expect(card.getByRole('button', { name: 'Volver a jugar' })).toBeFocused();
  expect(await savedEndings(page)).toEqual(['A']);

  await card.getByRole('button', { name: 'Volver a jugar' }).click();
  await page.waitForURL((url) => !url.search.includes('mundo') && !url.search.includes('final'));
  await expect.poll(async () => (await snapshot(page))?.world, { timeout: 20_000 }).toBe('umbral');
  expect(await savedEndings(page)).toEqual(['A']);
});

test('ending B is saved together with the endings already seen', async ({ page }) => {
  test.setTimeout(90_000);
  await arriveHome(page, 'B', ['A']);

  await talkToTheDirector(page);

  await expect(page.getByRole('dialog', { name: 'Final B' })).toBeVisible();
  expect(await savedEndings(page)).toEqual(['A', 'B']);
  // Cerrado el viaje, no se anda.
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(500);
  expect((await snapshot(page))?.speed).toBeLessThan(0.05);
  await page.keyboard.up('KeyW');
});

test('arriving late is the home as always, and the card leads back to the Archive', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await arriveHome(page, 'tarde');
  expect(await homecoming(page)).toMatchObject({ ending: 'tarde', without: [] });

  await talkToTheDirector(page);
  const card = page.getByRole('dialog', { name: 'Llegas tarde' });
  await expect(card).toBeVisible();
  expect(await savedEndings(page)).toEqual([]);
  await card.getByRole('button', { name: 'Volver al Archivo' }).click();

  await page.waitForURL(/mundo=puertas/);
  await expect.poll(async () => (await snapshot(page))?.world, { timeout: 20_000 }).toBe('puertas');
});
