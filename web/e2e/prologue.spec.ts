// Fase 9 (hito 9A): una partida nueva empieza en casa, en el Instituto de Hogar, donde no corre el ciclo; el
// Albatros II espera en el hangar. Al examinar el fragmento de la Luna se abre allí el gusano (hito 9E) y tras el
// fundido a blanco se despierta en Umbral; desde entonces la partida empieza allí.
import { expect, test, type Page } from '@playwright/test';
import { loopValue, snapshot, value } from './helpers';

/** Partida nueva, sin elegir mundo: como la abriría un jugador. */
async function newGame(page: Page): Promise<void> {
  await page.goto('/?debug');
  await expect(page.locator('.overlay')).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
}

async function play(page: Page): Promise<void> {
  await page.locator('.overlay').click({ position: { x: 20, y: 20 } });
  await expect(page.locator('.overlay')).toBeHidden();
  await expect.poll(() => value(page, 'playing')).toBe(true);
}

test('a new game starts at home, where the loop does not run', async ({ page }) => {
  await newGame(page);
  expect(await value(page, 'world')).toBe('hogar');
  await expect(page.locator('.overlay')).toContainText('Hogar');
  await play(page);

  await page.waitForTimeout(1500);

  expect(await loopValue(page, 'umbral')).toBe(0);
  expect(await loopValue(page, 'events')).toEqual([]);
  await expect(page.locator('.clock-hud')).toBeHidden();
  expect((await snapshot(page))?.ship?.landed).toBe(true); // el Albatros II, en el hangar
  // Hogar tiene aire: desde el suelo se ve el cielo y no el espacio.
  expect((await page.evaluate(() => window.__juego?.sky?.()))?.density).toBe(1);
});

test('on the Moon the wormhole opens and the game goes on in Umbral from then on', async ({
  page,
}) => {
  await newGame(page);
  await play(page);

  expect(await page.evaluate(() => window.__juego?.warpTo?.('luna') ?? false)).toBe(true);
  // Andar por la Luna no basta: se abre al examinar el fragmento.
  await page.waitForTimeout(2500);
  expect(await value(page, 'world')).toBe('luna');
  expect(
    await page.evaluate(() => window.__juego?.teleportTo?.('instituto.fragmento_luna') ?? false),
  ).toBe(true);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader')).toBeVisible();
  await page.keyboard.press('KeyE');
  // Un momento después se abre el gusano delante del fragmento (hito 9E).
  await expect
    .poll(async () => (await page.evaluate(() => window.__juego?.wormhole?.()))?.active, {
      timeout: 10_000,
    })
    .toBe(true);

  // Tras el fundido a blanco la página se carga de nuevo, ya en el sistema ajeno (sin `?mundo=`): el blanco
  // sigue mientras llega el mundo y luego se aclara.
  await page.waitForURL(/debug=/, { timeout: 30_000 });
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
  await expect(page.locator('.llegada')).toHaveCount(0, { timeout: 10_000 });
  expect(await value(page, 'world')).toBe('umbral');
  expect(await loopValue(page, 'loops')).toBe(0);
  // El primer despertar frente a La Boca: aparece el reloj de Umbral.
  await play(page);
  await expect(page.locator('.clock-hud')).toBeVisible();
  expect((await page.evaluate(() => window.__juego?.sky?.()))?.density).toBe(0); // Umbral no tiene aire
  expect(new URL(page.url()).searchParams.has('mundo')).toBe(false);

  await page.reload();
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
  expect(await value(page, 'world')).toBe('umbral');
  await expect(page.locator('.llegada')).toHaveCount(0); // recargar ya no viene del gusano
  // Lo que se aprendió en casa sigue en el Registro.
  expect((await snapshot(page))?.registry.facts).toContain('casa.fragmento_antiguo');

  // Sin partida guardada ("Empezar de cero"), se vuelve a empezar en casa.
  await page.evaluate(() => {
    window.localStorage.removeItem('bucle-tiempo:partida');
  });
  await page.reload();
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
  expect(await value(page, 'world')).toBe('hogar');
});

// Hito 9C: los Ool. Con la Directora se habla (y da la misión); los vecinos solo charlan. Al leer o hablar,
// tus filamentos brillan en el borde de arriba de la pantalla.
async function talkTo(page: Page, clueId: string): Promise<void> {
  expect(await page.evaluate((id) => window.__juego?.teleportTo?.(id) ?? false, clueId)).toBe(true);
  await expect(page.locator('.prompt')).toContainText('hablar');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader')).toBeVisible();
}

function ool(page: Page) {
  return page.evaluate(() => window.__juego?.ool?.() ?? null);
}

test('the Directora gives you the mission and your filaments glow while she talks', async ({
  page,
}) => {
  await newGame(page);
  await play(page);

  await talkTo(page, 'instituto.directora');
  await expect(page.locator('.reader')).toContainText('La Directora');
  await expect.poll(async () => (await ool(page))?.filaments.glowing).toBe(true);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader')).toBeHidden();

  expect((await snapshot(page))?.registry.facts).toContain('casa.mision_luna');
  expect((await ool(page))?.filaments.beats).toBeGreaterThan(0);
  expect((await ool(page))?.filaments.glowing).toBe(false);
  expect(Object.keys((await ool(page))?.turns ?? {})).toContain('directora');
});

test('the people of the village just talk: nothing goes into the Registro', async ({ page }) => {
  await newGame(page);
  await play(page);

  await talkTo(page, 'aldea.cria');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader')).toBeHidden();

  expect((await snapshot(page))?.registry.facts).toEqual([]);
});

// Revisión del 9B: los suelos altos tienen falda; desde donde despiertas se entra andando, sin saltar.
test('from where you wake up you walk into the Instituto without jumping', async ({ page }) => {
  await newGame(page);
  await play(page);

  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1500);
  const speed = await value(page, 'speed');
  const takeoffs = await value(page, 'takeoffs');
  await page.keyboard.up('KeyW');

  expect(speed).toBeGreaterThan(2); // pasado el umbral, sigue andando
  expect(takeoffs).toBe(0);
});

test('climbing in the Albatros II the sky gives way to space', async ({ page }) => {
  await newGame(page);
  await play(page);
  expect(await page.evaluate(() => window.__juego?.toShip?.() ?? false)).toBe(true);
  await page.keyboard.press('KeyF');
  await expect.poll(async () => (await snapshot(page))?.ship?.piloting).toBe(true);

  expect(await page.evaluate(() => window.__juego?.shipTo?.('hogar', 250) ?? false)).toBe(true);

  await expect
    .poll(async () => (await page.evaluate(() => window.__juego?.sky?.()))?.density)
    .toBe(0);
});

// Hito 9D: la guía del prólogo enseña una cosa cada vez y no repite lo aprendido.
function guide(page: Page) {
  return page.evaluate(() => window.__juego?.guide?.() ?? null);
}

test('the guide teaches one thing at a time and moves on once it is done', async ({ page }) => {
  await newGame(page);
  await play(page);

  await expect.poll(async () => (await guide(page))?.shown).toBe('andar');
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await guide(page))?.shown, { timeout: 10_000 }).toBe('directora');
  await page.keyboard.up('KeyW');

  await talkTo(page, 'instituto.directora');
  expect((await guide(page))?.shown).toBeNull(); // mientras hablas, no
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await guide(page))?.shown).toBe('registro');
  expect((await guide(page))?.done).toEqual(['andar', 'directora']);
});
