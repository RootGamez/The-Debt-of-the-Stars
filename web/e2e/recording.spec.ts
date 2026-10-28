// Fase 7 (hito 7A): una grabación se oye al ritmo del reloj con que se grabó. La del escéptico se grabó donde
// el tiempo iba cinco veces más lento: a ×1 no se entiende; girando la rueda hasta ×5 se entiende y, oída
// entera, se anota en el Registro.
import { expect, test, type Page } from '@playwright/test';
import { snapshot, startPlaying } from './helpers';

const SOURCE = 'cicatriz.grabacion_esceptico';
/** Pulsaciones de flecha de la rueda de ×1,0 a ×4,9 (cada una multiplica la velocidad por ~1,07). */
const STEPS_TO_FIVE = 23;

async function openRecording(page: Page): Promise<void> {
  expect(await page.evaluate(() => window.__juego?.warpTo?.('cicatriz') ?? false)).toBe(true);
  expect(await page.evaluate((id) => window.__juego?.teleportTo?.(id) ?? false, SOURCE)).toBe(true);
  await expect(page.locator('.prompt')).toHaveText('E · escuchar');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.recorder')).toBeVisible();
}

async function recording(page: Page) {
  return (await snapshot(page))?.registry.recording ?? null;
}

test('a recording made with a slow clock is gibberish as is and clear at the right speed', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await startPlaying(page);
  await openRecording(page);

  await expect(page.locator('.recorder-title')).toHaveText('La grabación del escéptico');
  await expect(page.locator('.recorder-speed')).toHaveText('×1,0');
  await expect(page.locator('.recorder-status')).toHaveText('No se entiende nada.');
  // A ×1 la primera palabra sale arrastrada.
  await expect(page.locator('.recorder-line').first()).toHaveText(/ii|ee|aa|oo|uu/, {
    timeout: 15_000,
  });
  // El sonido de la voz suena mientras la grabación está abierta.
  await expect
    .poll(async () => (await page.evaluate(() => window.__juego?.audio?.()))?.voices)
    .toContain('grabacion');

  // La rueda tiene el foco: las flechas la giran.
  for (let i = 0; i < STEPS_TO_FIVE; i++) await page.keyboard.press('ArrowRight');

  await expect(page.locator('.recorder-speed')).toHaveText('×4,9');
  await expect(page.locator('.recorder-status')).toHaveText('Se entiende. Escúchala entera.');
  await expect.poll(() => recording(page)).toMatchObject({ understood: false });

  // Oída entera a la velocidad buena, se entiende y se anota (vuelve a empezar sola).
  await expect(page.locator('.recorder-noted-title')).toHaveText('Anotado en el Registro', {
    timeout: 150_000,
  });
  await expect(page.locator('.recorder-status')).toHaveText('Entendida entera.');
  const facts = (await snapshot(page))?.registry.facts ?? [];
  expect(facts).toEqual(expect.arrayContaining(['lab.correccion', 'lab.existe_lugar_lento']));
  await expect(page.locator('.recorder-line').first()).toHaveText(/^Si me entiendes/);
});

test('the cycle stops while listening and E closes the recorder', async ({ page }) => {
  await startPlaying(page);
  await openRecording(page);
  const stopped = (await snapshot(page))?.loop.umbral ?? 0;

  await page.waitForTimeout(1200);

  expect((await snapshot(page))?.loop.umbral).toBe(stopped);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.recorder')).toBeHidden();
  expect(await recording(page)).toBeNull();
});

test('a recording understood before starts at the speed that worked', async ({ page }) => {
  await startPlaying(page);
  // Simula un ciclo anterior en el que ya se entendió: los hechos están guardados.
  await page.evaluate(() => {
    const key = 'bucle-tiempo:partida';
    const facts = ['silencio.advertencia', 'lab.existe_lugar_lento', 'lab.correccion'];
    window.localStorage.setItem(key, JSON.stringify({ version: 1, loopsCompleted: 1, facts }));
  });
  await page.reload();
  await startPlaying(page);
  await openRecording(page);

  await expect(page.locator('.recorder-speed')).toHaveText('×5,0');
  await expect(page.locator('.recorder-status')).toHaveText('Se entiende. Escúchala entera.');

  await page.evaluate(() => {
    window.localStorage.removeItem('bucle-tiempo:partida');
  });
});
