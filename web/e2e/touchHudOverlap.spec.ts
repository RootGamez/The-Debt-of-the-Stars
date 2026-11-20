// La interfaz táctil no se pisa: en un teléfono de lado (dos tamaños), a pie, sentado y volando, con la mano derecha
// y con la zurda, ni los botones ni los textos de la interfaz (reloj, nave) se tapan entre sí. La nave, en el móvil,
// solo dice la velocidad y la distancia al objetivo, escritas a mano y sin caja.
import { expect, test, type Page } from '@playwright/test';
import { ready, value } from './helpers';

const PHONES = [
  { name: '844 × 390', width: 844, height: 390 },
  { name: '740 × 360', width: 740, height: 360 },
  { name: '667 × 375', width: 667, height: 375 },
  { name: '568 × 320', width: 568, height: 320 },
] as const;

/** Lo que se mira: botones, textos de la interfaz y avisos (todo lo que es de la interfaz, no del mundo). */
const SELECTOR = [
  '.touch-btn',
  '.touch-context .prompt',
  '.ship-panel',
  '.clock-hud',
  '.board-prompt',
  '.tareas',
  '.notice',
].join(',');

interface Box {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Cajas de todo lo visible de la interfaz, con un nombre legible. */
async function boxes(page: Page): Promise<Box[]> {
  return page.evaluate((selector) => {
    const found: Box[] = [];
    for (const node of document.querySelectorAll<HTMLElement>(selector)) {
      const style = getComputedStyle(node);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        Number(style.opacity) === 0
      ) {
        continue;
      }
      if (node.closest('[hidden]')) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) continue;
      const id = node.dataset.touchId;
      const name = id ? `botón ${id}` : `.${node.className.split(' ')[0] ?? node.tagName}`;
      found.push({ name, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    }
    return found;
  }, SELECTOR);
}

function apart(a: Box, b: Box): boolean {
  return (
    a.x + a.width <= b.x + 0.5 ||
    b.x + b.width <= a.x + 0.5 ||
    a.y + a.height <= b.y + 0.5 ||
    b.y + b.height <= a.y + 0.5
  );
}

async function expectNothingOverlaps(page: Page, label: string): Promise<void> {
  const all = await boxes(page);
  const screen = page.viewportSize();
  for (const box of all) {
    expect(box.x, `${label}: ${box.name} se sale por la izquierda`).toBeGreaterThanOrEqual(-0.5);
    expect(box.y, `${label}: ${box.name} se sale por arriba`).toBeGreaterThanOrEqual(-0.5);
    expect(box.x + box.width, `${label}: ${box.name} se sale por la derecha`).toBeLessThanOrEqual(
      (screen?.width ?? 0) + 0.5,
    );
    expect(box.y + box.height, `${label}: ${box.name} se sale por abajo`).toBeLessThanOrEqual(
      (screen?.height ?? 0) + 0.5,
    );
  }
  for (const [i, a] of all.entries()) {
    for (const b of all.slice(i + 1)) {
      expect(apart(a, b), `${label}: ${a.name} se pisa con ${b.name}`).toBe(true);
    }
  }
}

async function startByTouch(page: Page): Promise<void> {
  await ready(page);
  const box = await page.locator('.overlay').boundingBox();
  if (!box) throw new Error('No hay pantalla de inicio');
  await page.touchscreen.tap(box.x + 20, box.y + 20);
  await expect(page.locator('.overlay')).toBeHidden();
  await expect.poll(() => value(page, 'playing')).toBe(true);
}

for (const phone of PHONES) {
  test.describe(`teléfono de lado ${phone.name}`, () => {
    // WebGL por software tarda en arrancar: el juego se carga una vez y las pruebas lo comparten.
    test.describe.configure({ mode: 'serial', timeout: 180_000 });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: phone.width, height: phone.height },
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

    const visible = (id: string) => page.locator(`[data-touch-id="${id}"]:visible`);

    async function tapButton(id: string): Promise<void> {
      const box = await visible(id).boundingBox();
      if (!box) throw new Error(`El botón ${id} no está a la vista`);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }

    async function setHand(left: boolean): Promise<void> {
      await page.evaluate(
        (value) => {
          window.localStorage.setItem('bucle-tiempo:mano', value);
        },
        left ? 'izquierda' : 'derecha',
      );
      await page.reload();
      await expect(page.locator('.overlay')).toBeVisible({ timeout: 60_000 });
      const box = await page.locator('.overlay').boundingBox();
      if (!box) throw new Error('No hay pantalla de inicio');
      await page.touchscreen.tap(box.x + 20, box.y + 20);
      await expect(page.locator('.overlay')).toBeHidden();
      await expect.poll(() => value(page, 'playing')).toBe(true);
    }

    async function flyWithTarget(): Promise<void> {
      // Bien arriba y sin estabilizador: es cuando hay más botones (alabeos incluidos).
      const fly = (): Promise<boolean> =>
        page.evaluate(() => window.__juego?.shipTo?.('archivo', 400) ?? false);
      // `shipTo` solo funciona con el jugador sentado: a pie se va al asiento y se toca «Sentarse».
      if (!(await fly())) {
        expect(await page.evaluate(() => window.__juego?.toShip?.() ?? false)).toBe(true);
        await tapButton('station');
        await expect(visible('stand')).toBeVisible();
      }
      expect(await fly()).toBe(true);
      await expect(visible('brake')).toBeVisible();
      if ((await visible('stabilize').getAttribute('aria-pressed')) === 'true') {
        await tapButton('stabilize');
      }
      await expect(visible('rollLeft')).toBeVisible();
      await tapButton('target');
      await expect(page.locator('.ship-panel .ship-target')).toBeVisible();
    }

    test('on foot nothing overlaps', async () => {
      await expectNothingOverlaps(page, 'a pie');
    });

    test('the buttons fit the screen and never drop under the minimum touch size', async () => {
      const read = await page.evaluate(() => {
        const css = getComputedStyle(document.documentElement);
        const pause = document.querySelector('[data-touch-id="pause"]')?.getBoundingClientRect();
        return {
          fit: Number(css.getPropertyValue('--touch-fit')),
          scale: Number(css.getPropertyValue('--ui-scale')),
          width: pause?.width ?? 0,
          height: pause?.height ?? 0,
        };
      });
      expect(read.fit).toBeGreaterThanOrEqual(0.72);
      expect(read.fit).toBeLessThanOrEqual(1.15);
      // El botón de pausa mide 48 × escala × ajuste, con 44 px de suelo.
      const expected = Math.max(44, 48 * read.scale * read.fit);
      expect(Math.abs(read.height - expected)).toBeLessThan(1);
      expect(read.width).toBeGreaterThanOrEqual(43.5);
      expect(read.height).toBeGreaterThanOrEqual(43.5);
    });

    test('sitting at the seat nothing overlaps', async () => {
      expect(await page.evaluate(() => window.__juego?.toShip?.() ?? false)).toBe(true);
      await expect(visible('station')).toContainText('Sentarse');
      await expectNothingOverlaps(page, 'frente al asiento');
    });

    test('flying shows only speed and distance, handwritten and without a box', async () => {
      await flyWithTarget();
      const panel = page.locator('.ship-panel');
      await expect(panel).toContainText('Velocidad');
      await expect(panel.locator('.ship-target-name')).toContainText(/\d/);
      // En el móvil no salen la altura, el estabilizador, la sugerencia ni «te acercas a…».
      for (const hidden of ['.ship-altitude', '.ship-assist', '.ship-target-motion']) {
        await expect(panel.locator(hidden)).toBeHidden();
      }
      await expect(page.locator('.ship-hint')).toBeHidden();
      const style = await panel.evaluate((node) => {
        const css = getComputedStyle(node);
        return {
          background: css.backgroundColor,
          borderWidth: css.borderTopWidth,
          shadow: css.boxShadow,
          font: css.fontFamily,
        };
      });
      expect(style.background).toBe('rgba(0, 0, 0, 0)');
      expect(style.borderWidth).toBe('0px');
      expect(style.shadow).toBe('none');
      expect(style.font).toContain('Caveat');
    });

    test('flying with a target nothing overlaps (right hand)', async () => {
      await flyWithTarget();
      await expectNothingOverlaps(page, 'volando, mano derecha');
    });

    test('flying with a target nothing overlaps (left hand)', async () => {
      await setHand(true);
      await flyWithTarget();
      await expectNothingOverlaps(page, 'volando, mano zurda');
      await setHand(false);
    });
  });
}
