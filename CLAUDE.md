# CLAUDE.md — Juego de bucle de tiempo

Juego 3D low poly que corre gratis en el navegador (Three.js + TypeScript + Vite). Los mundos se modelaron en Blender
y desde la Fase 11 se migran a código (Blender en pausa).

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

## El sistema y la nave (Fase 5)
- Los mundos orbitan en rieles (`web/src/data/sistema.json`); todo se dibuja relativo al mundo donde estás (`render/systemScene.ts`).
- La nave: `blender/scripts/generar_nave.py` → `blender/nave.blend` → `npm run modelos -- nave`. Espera en `PARK_Nave` (Umbral) al empezar cada ciclo.
- Controles: **F** subir/bajar (solo posada) · ratón apuntar · **W/S** avanzar · **A/D** lateral · **Espacio/C** subir/bajar (mantener C para posarse) · **Q/E** alabeo · **X** frenar respecto al objetivo · **T** objetivo · **Z** estabilizador (sin él no hay ayudas).
- Con `?debug`: `__juego.warpTo('archivo')` (a pie), `__juego.toShip()` (a la escotilla), `__juego.shipTo('archivo', 20)` (pilotando, sobre un mundo); `F4` mapa de órbitas.
- E2E: no dejar el juego abierto en el panel de vista previa mientras corre `npm run e2e`.

## El ciclo (Fase 3)
- Modo B (✅ Anthony): el tiempo real es el del jugador; en mundos lentos el reloj de Umbral corre más rápido (`src/data/loop.ts`, `TIME_MODE`).
- La cronología (eventos, absorción, curvas de reloj) está en `web/src/data/cronologia.json`: se ajusta ahí, sin tocar código.
- El guardado (`bucle-tiempo:partida` en localStorage) solo guarda ciclos y hechos; se valida al leerlo.

## Blender
- Blender 5.2: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe` (o variable `BLENDER_PATH`).
- Base nueva de un mundo (sobrescribe el `.blend`):
  `blender -b --factory-startup --python blender/scripts/generar_mundo.py -- <mundo>`
- 1 unidad = 1 metro. Marcas: `COL_`, `INT_<id>`, `SPAWN_<nombre>`, `TRIG_<nombre>`, `PARK_`, `PASO_` (anillo de una Puerta plegada, con `destino`); objetos `EVT_` (solo durante un evento) y `ANIM_` (giran); las propiedades viajan como `userData`.
- Cada mundo se viste con `blender/scripts/arte_<mundo>.py` sobre su base (reproducible, sin tocar el `.blend` a mano).
- Mundos huecos (el Nudo, mundo `laboratorio`): `inner_radius` en la raíz; dentro la gravedad empuja hacia fuera. En `blender/marcas/laboratorio.json`, `"dentro": true` pone la marca en la cara interior; `"rumbo"` la orienta.

## Relatividad jugable (Fase 7)
- Grabaciones: las fuentes `grabacion` llevan `reloj` (ritmo con que se grabaron) y se entienden con la rueda de velocidad (velocidad × reloj ≈ 1). La M silencia el juego.
- El Laboratorio está dentro del Nudo (cuerpo oculto en `sistema.json`); se entra por la Puerta plegada. Con `?debug`: `__juego.warpTo('laboratorio')` y `__juego.place()`.
- La lente (`system/lens.ts`): la imagen del Nudo se ve girada 18° hacia la Brasa; nítida solo desde el Observatorio en la alineación. **G** muestra la mira graduada. Con `?debug`: `__juego.lens()`.
- Mareas (`physics/tides.ts`): el Borde de Cicatriz, la semilla del Nudo y su cáscara; la tensión acumulada mata (`marea`). Con `?debug`: `__juego.tide()`.

## Mundos por código (Fase 11)
- Blender está en pausa: los mundos se migran a TypeScript en `web/src/worlds/procedural/` (plan: `docs/plan-fase-11-modelado-por-codigo.md`).
- `kit.ts` (primitivas, marcos lat/lon, piezas con colisión, terreno, dispersión, luz de cielo y bruma), `noise.ts`, `wind.ts` (polvo).
- Un mundo por código cumple el mismo contrato que su `.glb` (raíz con datos, `COL_`, `INT_`, `SPAWN_`, `PARK_`, `TRIG_`, `EVT_`); `loadWorld` lo usa si existe en `procedural/index.ts` y si no descarga el `.glb`.
- Umbral ya es por código (`umbral.ts`, lugares nuevos en `umbralLandmarks.ts`, colores en `umbralPalette.ts`) y tiene aire (`data/atmospheres.ts`).
- El Archivo es por código y es de agua (`archivo.ts`, `archivoGallery.ts`, medidas en `archivoShape.ts`). La raíz lleva `sea_level`, `dry_ring_major` y `dry_ring_minor`: el mar es una esfera y el tubo de la Galería, un toro seco. La única entrada es la esclusa bajo la tercera torre.
- Nubes: `procedural/clouds.ts` (capa esférica con ruido en el shader); el Archivo tiene dos y aire azul en `data/atmospheres.ts`.
- Agua (`physics/water.ts`): se nada por encima de 0,45 sumergido (Espacio sube, Mayús baja), 40 s de aire (muerte `ahogado`), y `runtime.hull` añade la superficie del mar para que la nave flote. Con `?debug`: `__juego.dive()`.
- `rampMatrix` da una matriz local al marco del sitio: multiplícala por `f.base`. `snapToGround` levanta en vertical (no por la normal) para no atascarse en la cima de una rampa.
- Para mirar un mundo de cerca sin jugar, una página temporal en `web/` que llame a `buildUmbral()` sirve (no la dejes en el repo).
