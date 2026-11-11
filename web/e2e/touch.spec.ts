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
  for (const id of ['jump', 'pause', 'hud']) {
    await expect(page.locator(`[data-touch-id="${id}"]`)).toBeVisible();
  }
  // Sin emoji ni letras sueltas: los iconos son SVG.
  await expect(page.locator('[data-touch-id="hud"] svg')).toHaveCount(1);
  // El aspecto de antes no cambia: la pausa sigue arriba a la derecha, a 16 px del borde.
  const pause = await page.locator('[data-touch-id="pause"]').boundingBox();
  expect(pause).not.toBeNull();
  expect(Math.round(844 - ((pause?.x ?? 0) + (pause?.width ?? 0)))).toBe(16);
  expect(Math.round(pause?.y ?? 0)).toBe(16);
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
