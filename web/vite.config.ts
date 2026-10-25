import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Rutas relativas: el build funciona en itch.io, GitHub Pages o Cloudflare Pages sin cambios.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
    // Three.js ocupa ~600 kB sin comprimir (~165 kB gzip); el aviso por defecto (500 kB) no aporta.
    chunkSizeWarningLimit: 800,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/render/**'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
