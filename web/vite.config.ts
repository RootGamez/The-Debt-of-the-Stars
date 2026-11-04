import { defineConfig } from 'vitest/config';
import uiScale from './scripts/postcss-ui-scale.ts';

export default defineConfig({
  // Rutas relativas: el build funciona en itch.io, GitHub Pages o Cloudflare Pages sin cambios.
  base: './',
  // Accesibilidad: escala de la interfaz y de la letra sobre todo el CSS (scripts/postcss-ui-scale).
  css: { postcss: { plugins: [uiScale()] } },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Three.js ocupa ~600 kB sin comprimir (~165 kB gzip); el aviso por defecto (500 kB) no aporta.
    chunkSizeWarningLimit: 800,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Los mundos modelados por código (Fase 11) se construyen en cada prueba que los usa: medio segundo
    // suelto, pero varios segundos con la cobertura y todas las pruebas en paralelo.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Código que solo existe en el navegador (DOM, WebGL): lo cubre la prueba de Playwright (e2e/).
      // La lógica pura de render (firstPersonCamera) sí cuenta.
      exclude: [
        'src/main.ts',
        'src/render/stage.ts',
        'src/render/sky.ts',
        'src/core/inputController.ts',
        'src/core/loopSession.ts',
        'src/render/loopEffects.ts',
        'src/render/sourceMarkers.ts',
        'src/reading/readingUi.ts',
        'src/reading/worldSources.ts',
        'src/game/**',
        'src/ui/**',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
