# CLAUDE.md — Juego de bucle de tiempo

Juego 3D low poly que corre gratis en el navegador (Three.js + TypeScript + Vite), modelado en Blender.

## Antes de trabajar
1. Carga la skill `juego-bucle-tiempo` (y `tiny-planets-blender` si se modela).
2. Lee enteros `CONTEXTO_HISTORIA.md`, `CONTEXTO_PLANETAS.md` y `CONTEXTO_PISTAS.md`: son la fuente de verdad del juego.
3. Lee el plan maestro `docs/PLAN_DESARROLLO.md` y el plan de la fase en curso.

## Reglas
- Leyenda de los documentos: ✅ decidido por Anthony · 🟡 propuesta · ❓ abierto. Nunca conviertas 🟡/❓ en ✅ sin que Anthony lo decida.
- Historia original: inspirada en el espíritu de Outer Wilds e Interstellar, nunca en su contenido.
- `docs/` está ignorada por git: guarda el plan maestro y todos los planes (`docs/plan-fase-N-<nombre>.md`, `docs/plan-<tema>.md`).
- Se avanza por fases; cada una se cierra completa (tipos, lint, tests, build, prueba en navegador, revisión) antes de la siguiente.
- Commits: `tipo: descripción en español` (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`). **Sin `Co-Authored-By` de Claude.**
- Idioma: código (identificadores) en inglés; comentarios, textos del juego, documentos y commits en español.
- Tests primero para la lógica pura (relojes, bucle, gravedad, Registro, lectura de marcas).

## Estructura
```
CONTEXTO_*.md         historia, planetas y grafo de pistas: fuente de verdad (versionada)
docs/                 planes (local, ignorada)
blender/              <mundo>.blend, marcas/<mundo>.json, scripts/
web/                  proyecto Vite + TypeScript + Three.js
  public/models/      .glb exportados
  src/                core, physics, worlds, registry, reading, ui, data
```

## Comandos (desde `web/`)
| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprueba tipos y genera `dist/` |
| `npm test` | Tests (Vitest) |
| `npm run coverage` | Tests con cobertura |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run format` | Prettier |
| `npm run check` | Todo lo anterior (tipos, lint, formato, cobertura, build) |
| `npm run e2e` | Pruebas de extremo a extremo con Playwright (Chromium) |
| `npm run modelos` | Exporta cada `blender/*.blend` a `public/models/*.glb` y lo comprime (`-- <mundo>` para uno) |

En el navegador: `?mundo=<id>` carga otro mundo base y `?debug` muestra el panel F3 y expone
`window.__juego.snapshot()` (lo usan las pruebas de Playwright). Solo con `?debug`: `&ciclo=<s>`
acorta el ciclo (10–3600 s, la cronología se escala) y las teclas `[` `]` saltan ∓1/15 del ciclo.

## Leer y el Registro (Fase 4)
- Las pistas están en `web/src/data/pistas/` (un archivo por mundo + `hilos.json`, `hechos.json`, `conclusiones.json`); se validan al cargar y las 7 reglas de `CONTEXTO_PISTAS.md` se comprueban en `npm test`.
- Los textos de Umbral son **borradores provisionales** (`"borrador": true`); el resto son esqueleto ("[texto pendiente]").
- Una fuente = marca `INT_` en Blender con `clue_id` y `kind` (texto, grabacion, objeto, observacion) que coincide con el `id` de la fuente; los eventos son marcas `TRIG_` con `event`.
- Controles: **E** lee (o botón Leer), **R** o **Tab** abren el Registro, **Esc** cierra. Mientras se lee, el tiempo del ciclo se detiene.
- Con `?debug`: `window.__juego.teleportTo('umbral.placa')` coloca al jugador frente a una fuente.
- Al añadir un mundo con fuentes: añade su `.glb` a `BUILT_WORLDS` en `web/tests/registry/umbralMarkers.test.ts` (regla 5).

## El ciclo (Fase 3)
- Modo B (✅ Anthony): el tiempo real es el del jugador; en mundos lentos el reloj de Umbral corre más rápido (`src/data/loop.ts`, `TIME_MODE`).
- La cronología (eventos, absorción, curvas de reloj) está en `web/src/data/cronologia.json`: se ajusta ahí, sin tocar código.
- El guardado (`bucle-tiempo:partida` en localStorage) solo guarda ciclos y hechos; se valida al leerlo.

## Blender
- Blender 5.2: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe` (o variable `BLENDER_PATH`).
- Base nueva de un mundo (sobrescribe el `.blend`):
  `blender -b --factory-startup --python blender/scripts/generar_mundo.py -- <mundo>`
- 1 unidad = 1 metro. Marcas: `COL_`, `INT_<id>`, `SPAWN_<nombre>`, `TRIG_<nombre>`; las propiedades viajan como `userData`.
