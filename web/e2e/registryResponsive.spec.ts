// El Registro tiene que poder leerse en un teléfono de lado y con la interfaz y la letra grandes: el libro cabe
// entero en la pantalla, sus botones se alcanzan y lo escrito no se sale de la hoja (o se desliza dentro de ella).
import { expect, test, type Page } from '@playwright/test';
import { startPlaying } from './helpers';

async function openWith(
  page: Page,
  viewport: { width: number; height: number },
  scales: { uiScale: number; textScale: number },
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.addInitScript((accessibility) => {
    localStorage.setItem('bucle-tiempo:accesibilidad', JSON.stringify(accessibility));
  }, scales);
  await startPlaying(page);
  await page.keyboard.press('KeyR');
  await expect(page.locator('.registry')).toBeVisible();
}

/** La caja de algo a la vista debe caer dentro de la ventana. */
async function expectInside(page: Page, selector: string): Promise<void> {
  const box = await page.locator(selector).first().boundingBox();
  const size = page.viewportSize();
  expect(box, selector).not.toBeNull();
  if (!box || !size) return;
  expect(box.x, `${selector} x`).toBeGreaterThanOrEqual(-1);
  expect(box.y, `${selector} y`).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width, `${selector} derecha`).toBeLessThanOrEqual(size.width + 1);
  expect(box.y + box.height, `${selector} abajo`).toBeLessThanOrEqual(size.height + 1);
}

/** Nada de lo escrito en la hoja queda fuera de ella, salvo que la hoja se deslice. */
async function expectReadable(page: Page): Promise<void> {
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    for (const content of document.querySelectorAll<HTMLElement>('.registry-page')) {
      if (content.classList.contains('registry-page--scroll')) continue;
      for (const child of content.children) {
        if (!(child instanceof HTMLElement) || child.classList.contains('registry-page-number')) {
          continue;
        }
        if (child.offsetTop + child.offsetHeight > content.clientHeight + 1) {
          out.push(content.innerText.slice(0, 40));
        }
      }
    }
    return out;
  });
  expect(bad).toEqual([]);
}

for (const [name, viewport, scales] of [
  ['un teléfono de lado', { width: 800, height: 360 }, { uiScale: 1.25, textScale: 1 }],
  [
    'un teléfono de lado con la letra al 150 %',
    { width: 800, height: 360 },
    { uiScale: 1.25, textScale: 1.5 },
  ],
  [
    'un portátil con la interfaz y la letra al 150 %',
    { width: 1280, height: 720 },
    { uiScale: 1.5, textScale: 1.5 },
  ],
] as const) {
  test(`the Registro fits and can be read on ${name}`, async ({ page }) => {
    await openWith(page, viewport, scales);
    await page.waitForTimeout(1500); // la tapa pasa sola a la primera página

    await expectInside(page, '.registry-book');
    await expectInside(page, '.registry-close');
    await expectInside(page, 'button[aria-label="Página siguiente"]');
    await expectInside(page, 'button[aria-label="Página anterior"]');
    await expectReadable(page);

    // Pasa varias páginas con la flecha y lo sigue siendo.
    for (let turns = 0; turns < 4; turns++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(700);
    }
    await expectInside(page, '.registry-book');
    await expectReadable(page);

    await page.keyboard.press('Escape');
    await expect(page.locator('.registry')).toBeHidden();
  });
}
