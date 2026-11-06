// Fase 9 (hito 9A): una partida nueva empieza en casa, en el Instituto de Hogar, donde no corre el ciclo; el
// Albatros II espera en el hangar. Al examinar el fragmento de la Luna se abre allí el gusano (hito 9E) y tras el
// fundido a blanco se despierta en Umbral; desde entonces la partida empieza allí.
import { expect, test, type Page } from '@playwright/test';
import { closeReader, loopValue, snapshot, value } from './helpers';

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
  test.setTimeout(120_000); // dos cargas del sistema ajeno y una de casa
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
  await closeReader(page);
  // Un momento después se abre el gusano delante del fragmento (hito 9E).
  await expect
    .poll(async () => (await page.evaluate(() => window.__juego?.wormhole?.()))?.active, {
      timeout: 10_000,
    })
    .toBe(true);
  // Con el Registro abierto el tiempo se para, y el gusano también.
  const wormhole = () => page.evaluate(() => window.__juego?.wormhole?.().progress ?? -1);
  await page.keyboard.press('Tab');
  await expect(page.locator('.registry')).toBeVisible();
  const opened = await wormhole();
  await page.waitForTimeout(800);
  expect(await wormhole()).toBe(opened);
  expect(opened).toBeLessThan(1);
  await page.keyboard.press('KeyR');
  await expect(page.locator('.registry')).toBeHidden();
  await play(page); // cerrar el Registro deja la pausa: un clic y sigue

  // Tras el fundido a blanco la página se carga de nuevo, ya en el sistema ajeno (sin `?mundo=`): el blanco
  // sigue mientras llega el mundo y luego se aclara.
  await page.waitForURL(/debug=/, { timeout: 30_000 });
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
  await expect(page.locator('.llegada')).toHaveCount(0, { timeout: 10_000 });
  expect(await page.evaluate(() => document.documentElement.classList.contains('llegando'))).toBe(
    false,
  );
  expect(await value(page, 'world')).toBe('umbral');
  expect(await loopValue(page, 'loops')).toBe(0);
  // El primer despertar frente a La Boca: al empezar a jugar se le pone nombre (Intro lo deja en «Umbral») y
  // aparece su reloj.
  await play(page);
  const naming = page.getByRole('dialog', { name: 'Un mundo nuevo' });
  await expect(naming).toBeVisible({ timeout: 15_000 });
  await naming.getByRole('textbox').press('Enter');
  await expect(naming).toBeHidden();
  if (await page.locator('.overlay').isVisible()) await play(page);
  await expect(page.locator('.clock-hud')).toBeVisible();
  expect((await page.evaluate(() => window.__juego?.sky?.()))?.density).toBe(1); // aire fino (Fase 11)
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

test('the Directora only gives the mission once you bring the piece from the island', async ({
  page,
}) => {
  test.setTimeout(120_000); // dos saltos de punta a punta de Hogar
  await newGame(page);
  await play(page);

  await talkTo(page, 'instituto.directora');
  await expect(page.locator('.reader')).toContainText('La Directora');
  await expect.poll(async () => (await ool(page))?.filaments.glowing).toBe(true);
  await closeReader(page);

  // La primera vez pide la pieza de la isla: aún no hay misión.
  let facts = (await snapshot(page))?.registry.facts ?? [];
  expect(facts).toContain('casa.directora_dirige');
  expect(facts).not.toContain('casa.mision_luna');
  expect((await ool(page))?.filaments.beats).toBeGreaterThan(0);
  expect((await ool(page))?.filaments.glowing).toBe(false);
  expect(Object.keys((await ool(page))?.turns ?? {})).toContain('directora');

  // Con la pieza en la mano, la misma charla da la misión.
  expect(
    await page.evaluate(() => window.__juego?.teleportTo?.('hogar.fragmento_isla') ?? false),
  ).toBe(true);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader')).toBeVisible();
  await closeReader(page);
  expect((await snapshot(page))?.registry.facts).toContain('casa.fragmento_isla');

  await talkTo(page, 'instituto.directora');
  await closeReader(page);
  facts = (await snapshot(page))?.registry.facts ?? [];
  expect(facts).toContain('casa.mision_luna');
});

test('the people of the village just talk: nothing goes into the Registro', async ({ page }) => {
  await newGame(page);
  await play(page);

  await talkTo(page, 'aldea.cria');
  await closeReader(page);

  expect((await snapshot(page))?.registry.facts).toEqual([]);
});

// Revisión del 9B: los suelos altos tienen falda; desde donde despiertas se entra andando, sin saltar.
test('from the square where you wake up you walk without jumping', async ({ page }) => {
  await newGame(page);
  await play(page);

  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1000);
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

// Las tareas del prólogo: una lista a la izquierda, el aviso de arriba, un indicador hacia lo que toca y el cuaderno
// con una página de tareas (T) y sin las preguntas sobre los Ausentes.
function tasks(page: Page) {
  return page.evaluate(() => window.__juego?.tasks?.() ?? null);
}

test('you wake up on the square and the tasks teach one thing at a time', async ({ page }) => {
  test.setTimeout(120_000); // andar y hablar a pocos fotogramas por segundo
  await newGame(page);
  await play(page);

  // El primer aviso, la lista desplegada a la izquierda y la tarea de ahora.
  await expect.poll(async () => (await tasks(page))?.current).toBe('andar');
  await expect.poll(async () => (await tasks(page))?.hint).toBe('andar');
  await expect(page.locator('.tareas')).toBeVisible();
  await expect(page.locator('.tarea-actual')).toContainText('Aprende a moverte');
  // Se despierta en la plaza de la aldea: la vecina del árbol está a pocos pasos.
  expect(await value(page, 'world')).toBe('hogar');

  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await tasks(page))?.current, { timeout: 10_000 }).toBe('vecina');
  await page.keyboard.up('KeyW');

  await talkTo(page, 'aldea.arbol');
  expect((await tasks(page))?.hint).toBeNull(); // mientras hablas, no
  await closeReader(page);
  await expect.poll(async () => (await tasks(page))?.current).toBe('maestra');
  expect((await tasks(page))?.done).toEqual(['andar', 'vecina']);
  // El indicador señala a la Maestra, lejos en la colina (a la vista o como flecha en el borde).
  await expect.poll(async () => (await tasks(page))?.waypoint?.label).toBe('Maestra');
  await expect(page.locator('.tarea-hecha')).toHaveCount(2);
});

test('O folds the list and brings it back, and T opens the tasks in the notebook', async ({
  page,
}) => {
  await newGame(page);
  await play(page);
  await expect(page.locator('.tareas.tareas-desplegada')).toBeVisible();

  await page.keyboard.press('KeyO');
  await expect(page.locator('.tareas.tareas-desplegada')).toHaveCount(0);
  await expect(page.locator('.tareas')).toContainText('Aprende a moverte'); // plegada, sigue la tarea de ahora
  await page.keyboard.press('KeyO');
  await expect(page.locator('.tareas.tareas-desplegada')).toBeVisible();

  await page.keyboard.press('KeyT');
  await expect(page.locator('.registry')).toBeVisible();
  await expect(page.locator('.registry-tasks')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.registry-task-current')).toContainText('Aprende a moverte');
  // En casa el cuaderno no tiene las preguntas sobre los Ausentes.
  await expect(page.locator('.registry-question')).toHaveCount(0);
  await expect(page.locator('.registry-tab')).toHaveText(['Tareas', 'Aprendido']);
  // T otra vez lo cierra.
  await page.keyboard.press('KeyT');
  await expect(page.locator('.registry')).toBeHidden();
});

test('in the ship the target follows the task and T does not cycle the targets', async ({
  page,
}) => {
  await newGame(page);
  await play(page);
  expect(await page.evaluate(() => window.__juego?.toShip?.() ?? false)).toBe(true);
  await page.keyboard.press('KeyF');
  await expect.poll(async () => (await snapshot(page))?.ship?.piloting).toBe(true);

  // Aún no es la tarea de la Luna: la nave no apunta a nada.
  expect((await snapshot(page))?.ship?.target).toBeNull();
  await page.keyboard.press('KeyT');
  await expect(page.locator('.registry')).toBeVisible();
  expect((await snapshot(page))?.ship?.target).toBeNull();
});

test('H hides all the help and the small button brings it back (it is remembered)', async ({
  page,
}) => {
  test.setTimeout(120_000); // recarga la página
  await newGame(page);
  await play(page);
  await expect.poll(async () => (await tasks(page))?.hint).toBe('andar');
  await expect(page.locator('.tareas')).toBeVisible();

  await page.keyboard.press('KeyH');
  await expect(page.locator('.tareas')).toBeHidden();
  await expect.poll(async () => (await tasks(page))?.hint).toBeNull();
  await expect(page.locator('.tareas-mostrar')).toBeVisible();

  // Recargar no la vuelve a mostrar.
  await page.reload();
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
  await play(page);
  expect((await tasks(page))?.hidden).toBe(true);
  await expect(page.locator('.tareas')).toBeHidden();

  // Con el ratón capturado se usa H; los botones son para el dedo (un toque).
  await page.locator('.tareas-mostrar').dispatchEvent('click');
  await expect(page.locator('.tareas')).toBeVisible();
  await page.locator('.tareas-ocultar').dispatchEvent('click');
  await expect(page.locator('.tareas')).toBeHidden();
  await page.keyboard.press('KeyO'); // O también la trae de vuelta
  await expect(page.locator('.tareas.tareas-desplegada')).toBeVisible();
});
