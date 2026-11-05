// Pruebas de extremo a extremo: compilan el juego, lo sirven con `vite preview` y lo abren en
// Chromium (WebGL por software en modo headless).
import { defineConfig, devices } from '@playwright/test';

const PORT = 4180;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  // WebGL por software consume mucha CPU: pocos navegadores a la vez para que no se ralentice.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // El juego elige el idioma del navegador: las pruebas leen los textos en español.
    locale: 'es-ES',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Siempre un servidor nuevo: así nunca se prueba un build antiguo.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
