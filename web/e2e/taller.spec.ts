// Fase 11F: el Taller como gigante de gas. Se despierta en la isla de Montaje; el reloj de la Pista se ajusta con
// sus ruedas y el anillo solo se abre a las 7:00 con el reloj en hora; en la Sala del Centro se puede estar de pie.
import { expect, test, type Page } from '@playwright/test';
import { snapshot, startPlaying, value } from './helpers';

async function open(page: Page, source: string): Promise<void> {
  expect(await page.evaluate((id) => window.__juego?.teleportTo?.(id) ?? false, source)).toBe(true);
  await expect(page.locator('.prompt')).toBeVisible();
  await page.keyboard.press('KeyE');
}

async function teleporter(page: Page): Promise<{ matched: boolean; open: boolean } | null> {
  return page.evaluate(() => window.__juego?.teleporter?.() ?? null);
}

test('wakes up on the Assembly island, above the clouds of the giant', async ({ page }) => {
  await startPlaying(page, '&mundo=taller');

  expect(await value(page, 'world')).toBe('taller');
  expect(await value(page, 'gravity')).toBeCloseTo(5.15, 1);
  expect(await value(page, 'altitude')).toBeGreaterThan(10);
});

test('the ring of the track opens at 7:00, and only with its clock set', async ({ page }) => {
  await startPlaying(page, '&mundo=taller');
  await open(page, 'taller.pista');
  await expect(page.locator('.puzzle')).toBeVisible();
  const [taller, track] = await page.locator('.puzzle-console-time').allTextContents();
  expect(track).not.toBe(taller);

  await page.getByRole('button', { name: 'Minutos: atrasar' }).click();
  // El resto de vueltas de golpe (con WebGL por software, cada clic de Playwright espera un fotograma lento).
  await page.evaluate(() => {
    const turn = (label: string, times: number) => {
      const wheel = document.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);
      for (let i = 0; i < times; i++) wheel?.click();
    };
    turn('Minutos: atrasar', 2);
    turn('Segundos: atrasar', 17);
  });

  await expect(page.locator('.puzzle-status')).toHaveText('Los dos relojes marcan lo mismo.');
  expect((await snapshot(page))?.registry.facts).toContain('contrapeso.medir_desfase');
  expect(await teleporter(page)).toEqual({ matched: true, open: false });

  await page.keyboard.press('KeyE');
  await page.evaluate(() => window.__juego?.skipTo?.(430));
  await expect.poll(() => teleporter(page)).toEqual({ matched: true, open: true });
});

test('lets you stand in the Centre Room, safe from the clouds', async ({ page }) => {
  await startPlaying(page, '&mundo=taller');
  await open(page, 'taller.paginas');
  await expect(page.locator('.reader')).toBeVisible();

  const here = await snapshot(page);
  expect(here?.grounded).toBe(true);
  expect(here?.respawns).toBe(0);
  expect(here?.loop.cause).toBeNull();
});
