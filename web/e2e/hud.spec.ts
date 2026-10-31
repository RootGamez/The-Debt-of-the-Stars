// El HUD del Cuaderno vivo (docs/plan-hud-cuaderno-vivo.md): el texto que se escribe y se pasa frase a frase, la
// Configuración de la pausa (velocidad del texto y sonido de letras), el Registro como libro que se hojea y la
// bitácora de mundos (nombrar un mundo al llegar y encontrarlo pegado en el cuaderno).
import { expect, test, type Page } from '@playwright/test';
import { closeReader, snapshot, startPlaying, value } from './helpers';

const SAVE_KEY = 'bucle-tiempo:partida';
const TEXT_KEY = 'bucle-tiempo:texto';

test.afterEach(async ({ page }) => {
  await page.evaluate(
    (keys) => {
      for (const key of keys) window.localStorage.removeItem(key);
    },
    [SAVE_KEY, TEXT_KEY],
  );
});

async function readPlaque(page: Page): Promise<void> {
  expect(await page.evaluate(() => window.__juego?.teleportTo?.('umbral.placa') ?? false)).toBe(
    true,
  );
  await expect(page.locator('.prompt')).toBeVisible();
  await page.keyboard.press('KeyE');
  await expect(page.locator('.reader')).toBeVisible();
}

test('a reading goes sentence by sentence: E completes, then moves on, and the last one closes', async ({
  page,
}) => {
  await startPlaying(page);
  await readPlaque(page);

  const close = page.locator('.reader-close');
  await expect(close).toHaveText('Seguir (E)');
  await expect(page.locator('.reader-text.is-current')).toHaveCount(1);
  // Todo el texto está desde el principio (aunque aún no se vea), para los lectores de pantalla y las pruebas.
  await expect(page.locator('.reader')).toContainText('Consejo de Tránsito');

  for (let presses = 0; presses < 10 && (await close.textContent()) !== 'Cerrar (E)'; presses++) {
    await page.keyboard.press('KeyE');
  }
  await expect(close).toHaveText('Cerrar (E)');
  await expect(page.locator('.reader-notes')).toHaveClass(/is-written/, { timeout: 10_000 });
  await closeReader(page);
});

test('the pause has a Configuración with text speed and letter sound, and it is remembered', async ({
  page,
}) => {
  await startPlaying(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();

  const speed = page.getByRole('group', { name: 'Velocidad del texto' });
  await expect(speed.getByRole('button', { name: 'Normal' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await speed.getByRole('button', { name: 'Al instante' }).click();
  await expect(speed.getByRole('button', { name: 'Al instante' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const sound = page.getByRole('group', { name: 'Sonido de letras' });
  await sound.getByRole('button', { name: 'Sí' }).click();
  // Redibujar no le quita el foco al teclado: sigue en la opción elegida.
  await expect(sound.getByRole('button', { name: 'Sí' })).toBeFocused();

  const saved = await page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key) ?? 'null') as unknown,
    TEXT_KEY,
  );
  expect(saved).toEqual({ speed: 'instante', letterSound: true });

  // Esc vuelve de la Configuración a la pausa.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Configuración', exact: true })).toBeVisible();

  // Al instante, la primera frase ya está entera al abrir.
  await page.reload();
  await startPlaying(page);
  await readPlaque(page);
  await expect(page.locator('.reader')).toHaveClass(/is-ready/);
});

test('the Registro is a book: its pages turn with the arrows and the tabs jump to a section', async ({
  page,
}) => {
  await startPlaying(page);
  await page.keyboard.press('KeyR');

  const registry = page.locator('.registry');
  await expect(registry).toBeVisible();
  const where = page.locator('.registry-where');
  const first = await where.textContent();
  await page.getByRole('button', { name: 'Página siguiente' }).click();
  await expect(where).not.toHaveText(first ?? '');

  await page.getByRole('button', { name: 'Ir a Mundos' }).click();
  await expect(registry).toContainText('Bitácora de mundos');
  await expect(registry.locator('.registry-world-item')).toContainText(['Hogar', 'Luna']);
  await page.keyboard.press('Escape');
  await expect(registry).toBeHidden();
});

test('a new world is named on arrival and its drawing is taped into the bitácora', async ({
  page,
}) => {
  // Partida que ya pasó el prólogo y aún no ha nombrado nada: se despierta en Umbral, sin `?mundo=`.
  // Se escribe antes de que arranque el juego (una partida sin guardar empezaría el prólogo y la pisaría).
  await page.addInitScript((key) => {
    if (window.sessionStorage.getItem('sembrada')) return;
    window.sessionStorage.setItem('sembrada', '1');
    window.localStorage.setItem(
      key,
      JSON.stringify({
        version: 4,
        loopsCompleted: 0,
        facts: [],
        prologueDone: true,
        endings: [],
        worlds: {},
      }),
    );
  }, SAVE_KEY);
  await page.goto('/?debug');
  await expect(page.locator('.overlay')).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
  await page.locator('.overlay').click({ position: { x: 20, y: 20 } });

  const dialog = page.getByRole('dialog', { name: 'Un mundo nuevo' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('img')).toHaveAttribute('src', /^data:image\//);
  const umbral = (await snapshot(page))?.loop.umbral;
  await page.waitForTimeout(600);
  expect((await snapshot(page))?.loop.umbral).toBe(umbral); // el tiempo espera al nombre

  // Aunque el foco salga del nombre (clic en la foto), ninguna tecla llega al juego: ni E, ni R, ni Esc.
  await dialog.getByRole('img').click();
  await expect(page.getByLabel('Ponle nombre')).toBeFocused();
  await page.keyboard.press('KeyE');
  await page.keyboard.press('KeyR');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(page.locator('.registry')).toBeHidden();
  await expect(page.locator('.overlay')).toBeHidden();
  await expect(page.locator('.reader')).toBeHidden();

  await page.getByLabel('Ponle nombre').fill('Faro');
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.locator('.place')).toContainText('Faro');

  const worlds = await page.evaluate(
    (key) => (JSON.parse(window.localStorage.getItem(key) ?? '{}') as { worlds?: unknown }).worlds,
    SAVE_KEY,
  );
  expect(worlds).toEqual({ umbral: { name: 'Faro', loop: 0 } });

  await page.keyboard.press('KeyR');
  await page.getByRole('button', { name: 'Ir a Mundos' }).click();
  await expect(page.locator('.registry-world-item')).toContainText(['Hogar', 'Luna', 'Faro']);
});
