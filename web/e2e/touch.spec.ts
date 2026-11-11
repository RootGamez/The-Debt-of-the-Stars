// Controles táctiles (plan-mobile, M1): en un teléfono, mantener pulsado un botón no selecciona texto ni abre menús,
// y la acción de un botón de mantener no se suelta si el dedo resbala fuera. Contexto móvil con pantalla táctil.
import { expect, test, type Page } from '@playwright/test';
import { ready, value } from './helpers';

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
// WebGL por software en un móvil emulado tarda en arrancar: se carga el juego una vez y las pruebas lo comparten.
test.describe.configure({ mode: 'serial', timeout: 180_000 });

let page: Page;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
    locale: 'es-ES',
  });
  page = await context.newPage();
  await startByTouch(page);
});

test.afterAll(async () => {
  await page.context().close();
});

async function startByTouch(page: Page): Promise<void> {
  await ready(page);
  const box = await page.locator('.overlay').boundingBox();
  if (!box) throw new Error('No hay pantalla de inicio');
  await page.touchscreen.tap(box.x + 20, box.y + 20);
  await expect(page.locator('.overlay')).toBeHidden();
  await expect.poll(() => value(page, 'playing')).toBe(true);
}

async function centerOf(page: Page, id: string): Promise<{ x: number; y: number }> {
  const box = await page.locator(`[data-touch-id="${id}"]`).boundingBox();
  if (!box) throw new Error(`El botón ${id} no está a la vista`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('marks the page as touch and shows the shared buttons', async () => {
  await expect(page.locator('html')).toHaveClass(/is-touch/);
  for (const id of ['jump', 'pause', 'more']) {
    await expect(page.locator(`[data-touch-id="${id}"]`)).toBeVisible();
  }
  // Sin emoji ni letras sueltas: los iconos son SVG. Las opciones raras viven en «Más», cerrada al empezar.
  await expect(page.locator('[data-touch-id="more"] svg')).toHaveCount(1);
  await expect(page.locator('[data-touch-id="hud"]')).toBeHidden();
  // En un teléfono de lado la interfaz arranca al 125 %: la pausa sigue arriba a la derecha, a 16 px (escalados).
  const scale = Number(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'),
    ),
  );
  expect(scale).toBe(1.25);
  const pause = await page.locator('[data-touch-id="pause"]').boundingBox();
  expect(pause).not.toBeNull();
  expect(Math.round(844 - ((pause?.x ?? 0) + (pause?.width ?? 0)))).toBe(16 * scale);
  expect(Math.round(pause?.y ?? 0)).toBe(16 * scale);
});

test('long press does not select text or open the browser menu', async () => {
  const prevented = await page.evaluate(() => {
    const target = document.querySelector('[data-touch-id="pause"]');
    return ['contextmenu', 'selectstart', 'dragstart'].map((type) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      target?.dispatchEvent(event);
      return event.defaultPrevented;
    });
  });
  expect(prevented).toEqual([true, true, true]);

  const userSelect = await page.evaluate(
    () => getComputedStyle(document.querySelector('.touch-pause') as Element).userSelect,
  );
  expect(userSelect).toBe('none');

  // Pulsación larga real sobre el botón de saltar: la acción se mantiene y no queda nada seleccionado.
  const cdp = await page.context().newCDPSession(page);
  const { x, y } = await centerOf(page, 'jump');
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  await page.waitForTimeout(700);
  await expect(page.locator('[data-touch-id="jump"]')).toHaveClass(/is-pressed/);
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('[data-touch-id="jump"]')).not.toHaveClass(/is-pressed/);
});

test('a held button keeps its action when the finger slides out of it', async () => {
  const cdp = await page.context().newCDPSession(page);
  const { x, y } = await centerOf(page, 'jump');
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x - 160, y: y - 120, id: 1 }],
  });
  await page.waitForTimeout(200);
  await expect(page.locator('[data-touch-id="jump"]')).toHaveClass(/is-pressed/);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('[data-touch-id="jump"]')).not.toHaveClass(/is-pressed/);
});

const visible = (id: string) => page.locator(`[data-touch-id="${id}"]`);

async function tapButton(id: string): Promise<void> {
  const box = await visible(id).boundingBox();
  if (!box) throw new Error(`${id} no se ve`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

test('only the buttons that are needed are on screen', async () => {
  // A pie, lejos de la nave: solo saltar (y la cinta de arriba).
  await expect(visible('jump')).toBeVisible();
  for (const id of ['station', 'stand', 'raise', 'lower', 'brake', 'target', 'stabilize']) {
    await expect(visible(id)).toBeHidden();
  }

  // Frente al asiento aparece «Sentarse»; saltar sigue ahí.
  expect(await page.evaluate(() => window.__juego?.toShip?.() ?? false)).toBe(true);
  await expect(visible('station')).toBeVisible();
  await expect(visible('station')).toContainText('Sentarse');
  await expect(visible('jump')).toBeVisible();

  // Frente al atril y a la mesa, el mismo botón cambia de nombre.
  expect(await page.evaluate(() => window.__juego?.toShip?.('registro') ?? false)).toBe(true);
  await expect(visible('station')).toContainText('Registro');
  expect(await page.evaluate(() => window.__juego?.toShip?.('mapa') ?? false)).toBe(true);
  await expect(visible('station')).toContainText('Mapa');

  // Sentado con la nave posada: levantarse y despegar; nada de frenar ni bajar.
  expect(await page.evaluate(() => window.__juego?.toShip?.() ?? false)).toBe(true);
  await tapButton('station');
  await expect(visible('stand')).toBeVisible();
  await expect(visible('raise')).toBeVisible();
  for (const id of ['station', 'jump', 'lower', 'brake']) {
    await expect(visible(id)).toBeHidden();
  }

  // En vuelo, cerca del suelo, «Bajar» pasa a ser «Posarse»; sin estabilizador salen los alabeos.
  expect(await page.evaluate(() => window.__juego?.shipTo?.('archivo', 40) ?? false)).toBe(true);
  await expect(visible('brake')).toBeVisible();
  await expect(visible('stand')).toBeHidden();
  await expect(visible('lower')).toContainText('Bajar');
  await expect(visible('rollLeft')).toBeHidden();
  expect(await page.evaluate(() => window.__juego?.shipTo?.('archivo', 6) ?? false)).toBe(true);
  await expect(visible('lower')).toContainText('Posarse');
  // Sin estabilizador y a poca altura la nave cae y se posa (y entonces no hay alabeo): se prueba bien arriba.
  expect(await page.evaluate(() => window.__juego?.shipTo?.('archivo', 400) ?? false)).toBe(true);
  await expect(visible('brake')).toBeVisible();
  await tapButton('stabilize');
  await expect(visible('rollLeft')).toBeVisible();
  await expect(visible('rollRight')).toBeVisible();
});

test('the dock stays inside the screen and apart from the top buttons', async () => {
  // Se prepara su propio vuelo (sin depender del test anterior): bien arriba y sin estabilizador, el caso más ancho.
  expect(await page.evaluate(() => window.__juego?.shipTo?.('archivo', 400) ?? false)).toBe(true);
  await expect(visible('brake')).toBeVisible();
  if ((await visible('stabilize').getAttribute('aria-pressed')) === 'true') {
    await tapButton('stabilize');
  }
  await expect(visible('rollLeft')).toBeVisible();
  const screen = page.viewportSize();
  expect(screen).not.toBeNull();
  const boxes = [];
  for (const id of [
    'lower',
    'brake',
    'raise',
    'target',
    'stabilize',
    'camera',
    'rollLeft',
    'pause',
  ]) {
    const box = await visible(id).boundingBox();
    if (!box) throw new Error(`${id} no se ve`);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(screen?.width ?? 0);
    expect(box.y + box.height).toBeLessThanOrEqual(screen?.height ?? 0);
    // Zona de toque mínima de 48 px.
    expect(box.width).toBeGreaterThanOrEqual(47);
    expect(box.height).toBeGreaterThanOrEqual(47);
    boxes.push({ id, ...box });
  }
  // Ningún botón tapa a otro.
  for (const [i, a] of boxes.entries()) {
    for (const b of boxes.slice(i + 1)) {
      const apart =
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y;
      expect(apart, `${a.id} se pisa con ${b.id}`).toBe(true);
    }
  }
});

test('in portrait the game asks to turn the phone and pauses', async () => {
  expect(await value(page, 'playing')).toBe(true);
  await expect(page.locator('.rotate-guard')).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.rotate-guard')).toBeVisible();
  await expect(page.locator('.rotate-guard')).toContainText('Gira el teléfono');
  await expect.poll(() => value(page, 'playing')).toBe(false);
  // Nada de debajo recibe foco ni teclado (una tableta con teclado no puede reanudar con Intro).
  await expect(page.locator('.overlay')).toHaveJSProperty('inert', true);

  // Al girar de vuelta el aviso se va y el juego queda en la pausa normal (no sigue solo).
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('.rotate-guard')).toBeHidden();
  await expect(page.locator('.overlay')).toHaveJSProperty('inert', false);
  await expect(page.locator('.overlay')).toBeVisible();
  expect(await value(page, 'playing')).toBe(false);

  const box = await page.locator('.overlay').boundingBox();
  if (!box) throw new Error('No hay pantalla de pausa');
  await page.touchscreen.tap(box.x + 20, box.y + 20);
  await expect.poll(() => value(page, 'playing')).toBe(true);
});

test('the app can be installed in landscape', async () => {
  const response = await page.request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as { orientation: string; display: string };
  expect(manifest.orientation).toBe('landscape');
  expect(manifest.display).toBe('fullscreen');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toContain(
    'viewport-fit=cover',
  );
});

test('the pause button acts on release and pauses the game', async () => {
  const { x, y } = await centerOf(page, 'pause');
  await page.touchscreen.tap(x, y);

  await expect(page.locator('.overlay')).toBeVisible();
  await expect.poll(() => value(page, 'playing')).toBe(false);
  // El clic que el navegador manda tras soltar cae sobre la pausa ya abierta: no debe reanudar el juego.
  await page.waitForTimeout(800);
  await expect(page.locator('.overlay')).toBeVisible();
  expect(await value(page, 'playing')).toBe(false);
});
