# CLAUDE.md — La deuda de las estrellas (The Debt of the Stars)

Juego 3D low poly que corre gratis en el navegador (Three.js + TypeScript + Vite). Los mundos se modelaron en Blender
y desde la Fase 11 están todos hechos por código (Blender en pausa; ya no hay `.glb` ni `.blend`).

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
blender/              marcas/<mundo>.json y scripts/ de antes (solo como referencia del diseño)
web/                  proyecto Vite + TypeScript + Three.js
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

En el navegador: `?mundo=<id>` carga otro mundo base y `?debug` muestra el panel F3 y expone
`window.__juego.snapshot()` (lo usan las pruebas de Playwright). Solo con `?debug`: `&ciclo=<s>`
acorta el ciclo (10–3600 s, la cronología se escala) y las teclas `[` `]` saltan ∓1/15 del ciclo.

## Leer y el Registro (Fase 4)
- Las pistas están en `web/src/data/pistas/` (un archivo por mundo + `hilos.json`, `hechos.json`, `conclusiones.json`); se validan al cargar y las 7 reglas de `CONTEXTO_PISTAS.md` se comprueban en `npm test`.
- Todos los textos son **borradores provisionales** (`"borrador": true`, de Claude, a la espera de Anthony); ya no queda ningún «[texto pendiente]» (lo comprueba `tests/registry/realClues.test.ts`). Las tarjetas de final están en `web/src/data/finales.json` y su inglés en `i18n/en.ts`.
- Una fuente = marca `INT_` del mundo (en su constructor de `worlds/procedural/`) con `clue_id` y `kind` (texto, grabacion, objeto, observacion) que coincide con el `id` de la fuente; los eventos son marcas `TRIG_` con `event`.
- Controles: **E** lee (o botón Leer), **R** o **Tab** abren el Registro, **Esc** cierra. Mientras se lee, el tiempo del ciclo se detiene.
- Con `?debug`: `window.__juego.teleportTo('umbral.placa')` coloca al jugador frente a una fuente.
- Al añadir un mundo con fuentes: añade su id a `BUILT_WORLDS` en `web/tests/registry/umbralMarkers.test.ts` (regla 5).

## El sistema y la nave (Fase 5)
- Los mundos orbitan en rieles (`web/src/data/sistema.json`); todo se dibuja relativo al mundo donde estás (`render/systemScene.ts`).
- La nave (el Albatros II) es por código desde la Fase 11 (plan: `docs/plan-fase-11-nave.md`); ya no usa `nave.glb`. Modelo en `web/src/ship/model/` (`albatros.ts`, medidas en `albatrosShape.ts`): un disco de 9 m con una sala por dentro, la escotilla en el suelo y la escalerilla a popa. Espera posada en `PARK_Nave` (Umbral) al empezar cada ciclo.
- Física de 6 ejes con toberas reales (`ship/thrusters.ts`, 24 toberas, cada una con su llama; `ship/shipPhysics.ts`). Choca como esferas (`ALBATROS_HULL`, `ship/shipContact.ts`). Se anda por dentro con `physics/movingCollider.ts`. La escotilla se abre posada y se cierra al volar (`ship/hatch.ts`). Lo que se mueve en la sala (llamas, reloj de pared, planetario) está en `game/shipCabin.ts`.
- Dentro: **F** junto al asiento lo pilota y **F** pilotando te levanta (solo posada). **E** en el atril abre el Registro y **E** en la mesa, el mapa de órbitas (`ui/shipMap.ts`). Los sitios están en `ship/stations.ts`.
- Pilotando: ratón apuntar · **W/S** avanzar · **A/D** lateral · **Espacio/C** subir/bajar (mantener C para posarse) · **Q/E** alabeo · **X** frenar respecto al objetivo · **T** objetivo · **Z** estabilizador (sin él no hay ayudas) · **V** cámara de cabina o de fuera.
- Con `?debug`: `__juego.warpTo('archivo')` (a pie), `__juego.toShip()` (dentro, frente al asiento; `toShip('registro'|'mapa')` frente a ese sitio), `__juego.toLadder()` (al pie de la escalerilla), `__juego.shipTo('archivo', 20)` (pilotando, sobre un mundo); `F4` mapa de órbitas.
- E2E: no dejar el juego abierto en el panel de vista previa mientras corre `npm run e2e`.

## El ciclo (Fase 3)
- Modo B (✅ Anthony): el tiempo real es el del jugador; en mundos lentos el reloj de Umbral corre más rápido (`src/data/loop.ts`, `TIME_MODE`).
- La cronología (eventos, absorción, curvas de reloj) está en `web/src/data/cronologia.json`: se ajusta ahí, sin tocar código.
- El guardado (`bucle-tiempo:partida` en localStorage) solo guarda ciclos y hechos; se valida al leerlo.

## Marcas de los mundos
- 1 unidad = 1 metro, y se diseña en el marco de Blender (Z arriba; la raíz se gira −90° en X). Marcas: `COL_`, `INT_<id>`, `SPAWN_<nombre>`, `TRIG_<nombre>`, `PARK_`, `PASO_` (anillo de una Puerta plegada, con `destino`); objetos `EVT_` (solo durante un evento) y `ANIM_` (giran sobre su Y local); las propiedades van en `userData`.
- Mundos huecos (el Nudo, mundo `laboratorio`): `inner_radius` en la raíz; dentro la gravedad empuja hacia fuera.
- Blender está en pausa y ya no hay `.blend` (se pueden recuperar de git). `blender/scripts/` y `blender/marcas/` se quedan como referencia del diseño original, que los constructores citan.

## Relatividad jugable (Fase 7)
- Grabaciones: las fuentes `grabacion` llevan `reloj` (ritmo con que se grabaron) y se entienden con la rueda de velocidad (velocidad × reloj ≈ 1). La M silencia el juego.
- El Laboratorio está dentro del Nudo (cuerpo oculto en `sistema.json`); se entra por la Puerta plegada. Con `?debug`: `__juego.warpTo('laboratorio')` y `__juego.place()`.
- La lente (`system/lens.ts`): la imagen del Nudo se ve girada 18° hacia la Brasa; nítida solo desde el Observatorio en la alineación. **G** muestra la mira graduada. Con `?debug`: `__juego.lens()`.
- Mareas (`physics/tides.ts`): el Borde de Cicatriz, la semilla del Nudo y su cáscara; la tensión acumulada mata (`marea`). Con `?debug`: `__juego.tide()`.

## Publicación (Cloudflare)
- Está en https://bucle-de-tiempo.anthonygamez2858.workers.dev (cuenta de Anthony, Workers con assets estáticos, sin script: `web/wrangler.jsonc`).
- `npm run deploy` (en `web/`) construye y sube `dist/`; `npm run deploy:dry` solo comprueba. Hace falta haber entrado con `npx wrangler login`.
- Los mundos se construyen en el navegador: `dist/` solo lleva el código y las fuentes de letra (no hay modelos que subir).
- `web/public/_headers` pone la caché (`/assets/*` inmutable) y `web/public/.assetsignore` deja fuera los `.map`.

## Mundos por código (Fase 11)
- Blender está en pausa: todos los mundos son TypeScript en `web/src/worlds/procedural/` (plan: `docs/plan-fase-11-modelado-por-codigo.md`).
- `kit.ts` (primitivas, marcos lat/lon, piezas con colisión, terreno, dispersión, luz de cielo y bruma), `noise.ts`, `wind.ts` (polvo).
- Un mundo por código cumple el contrato que tenían los `.glb` (raíz con datos, `COL_`, `INT_`, `SPAWN_`, `PARK_`, `TRIG_`, `EVT_`); se registra en `procedural/index.ts` y `loadWorld` lo construye (sin descargar nada; un id sin constructor es un error).
- Umbral ya es por código (`umbral.ts`, lugares nuevos en `umbralLandmarks.ts`, colores en `umbralPalette.ts`) y tiene aire (`data/atmospheres.ts`).
- El Archivo es por código y es de agua (`archivo.ts`, `archivoGallery.ts`, medidas en `archivoShape.ts`). La raíz lleva `sea_level`, `dry_ring_major` y `dry_ring_minor`: el mar es una esfera y el tubo de la Galería, un toro seco. La única entrada es la esclusa bajo la tercera torre.
- El Taller es por código y es un gigante de gas (`taller.ts`, medidas en `tallerShape.ts`): nubes sin suelo (`render/gasGiant.ts`, reutilizable) y cinco islas fijas encima. La raíz lleva `gas_lethal_radius` y `gas_safe_radius`: bajo el primero se muere (`gas`, `physics/gas.ts`) salvo dentro del segundo (la Sala del Centro). Las colisiones COL_ con `event` solo existen durante ese evento (`physics/eventColliders.ts`, los puentes de las 7:00). Un PASO_ con `cerradura` solo deja pasar si el juego lo abre (`game/teleporter.ts`). En un mundo que gira, la luz de cielo sigue a la Brasa con `followSun` (`procedural/sun.ts`).
- La Galería del Archivo se divide en ocho salas con mamparo y puerta (`archivoRoomsShape.ts`: salas, mamparos y paredes puras; `archivoRooms.ts`: lo que se dibuja). Una fuente nueva del Archivo debe caer dentro de su sala y a más de 4° de un mamparo (lo comprueba `archivoRoomsShape.test.ts`).
- Nubes: `procedural/clouds.ts` (capa esférica con ruido en el shader); el Archivo tiene dos y aire azul en `data/atmospheres.ts`.
- El agua es reutilizable para cualquier mundo con mar. Las olas están en `physics/waves.ts` (`createWaves`) y las usan a la vez la física (`WaterBody.waves`) y el shader. El océano es `render/ocean.ts` (`oceanMesh`), y el fondo bajo el mar se tiñe con `applyUnderwater`. Salpicaduras, ondas y burbujas: `render/waterEffects.ts` y `game/waterPlay.ts`. En la raíz del mundo van `sea_wave_height` y `sea_wave_seed`.
- Agua (`physics/water.ts`): se nada por encima de 0,45 sumergido (Espacio sube, Mayús baja), 40 s de aire (muerte `ahogado`), y `runtime.hull` añade la superficie del mar para que la nave flote. Con `?debug`: `__juego.dive()`.
- `rampMatrix` da una matriz local al marco del sitio: multiplícala por `f.base`. `snapToGround` levanta en vertical (no por la normal) para no atascarse en la cima de una rampa.
- Cicatriz es por código y es hueca (`cicatriz.ts`; medidas y mordidas en `cicatrizShape.ts`; cáscaras en `cicatrizCrust.ts`; la Sala del Motor alrededor del centro en `cicatrizCore.ts`; fuera `cicatrizSurface.ts`, dentro `cicatrizInterior.ts`, anillo `cicatrizRing.ts`). La raíz lleva `inner_radius` 60, `cavity_limit` 61 (la gravedad cambia de lado justo bajo la cara interior) y `cavity_tide: nucleo` (marea del micro agujero, `coreTide`). Los cuencos atraviesan la cáscara: la raíz lleva `cavity_holes` (eje y radio angular de cada ojo); el personaje recuerda de qué lado está y, dentro de un ojo, la gravedad se tuerce hacia la cara interior junto al borde, así que quien cae por él aterriza de pie al otro lado (`physics/cavityThroat.ts`). Los anillos de los ojos no chocan y no hay pretiles: nada atrapa en un cuenco. Las Puertas plegadas `PASO_Pozo`↔`PASO_Fondo` y `PASO_Eje`↔`PASO_Sala` unen fuera, dentro y la máquina.
- El Laboratorio (dentro del Nudo) es por código (`laboratorio.ts`; zonas y senderos en `laboratorioShape.ts`, piezas en `laboratorioKit.ts`, salas en `laboratorioRooms.ts` y `laboratorioLife.ts`). La cara interior es un tablero de ajedrez en espiral hecho en el shader (`laboratorioFloor.ts`, `boardCell` es el mismo cálculo en TS). El suelo es llano bajo cada zona y a lo largo de cada sendero: al añadir una sala, añádela a `INNER_SITES` y únela con `PATHS`.
- El Archivo de las Puertas es por código (`puertas.ts`; sitios y senderos en `puertasShape.ts`, piezas y la boca de pie en `puertasKit.ts`, las bocas de casa en `puertasHome.ts`, muro, ofrendas y primera Puerta en `puertasLore.ts`). Los anillos de luz del suelo son del shader (`puertasFloor.ts`; `ripplePhase` es el mismo cálculo). `puertas_Planos` va suelto (el epílogo lo esconde) y cada `puertas_VistaCasa_k` lleva su propio color. El Contrapeso también es por código (`procedural/contrapeso.ts`, `buildCounterweight`). Desde entonces se borraron los `.glb`, los `.blend` y `npm run modelos`.
- Detalle de cerca (`render/nearDetail.ts`): `userData.near_only` solo se dibuja estando en el marco de su mundo (lo de dentro de Cicatriz); `userData.far_hidden`, en su marco o a menos de 8 radios (estructuras de fuera, rocas del anillo).
- Las primitivas de `kit.ts` (`box()`, `cylinder()`…) están en caché y se comparten: clónalas antes de `applyMatrix4`.
- Para mirar un mundo de cerca sin jugar, una página temporal en `web/` que llame a `buildUmbral()` sirve (no la dejes en el repo).

## Puzzles físicos (plan: `docs/plan-historia-y-puzzles-fisicos.md`)
- `game/carry.ts` es coger, llevar y encajar (puro: manos, estante, encajes; todo vuelve al estante con cada ciclo). Las acciones de varias fuentes se juntan con `reading/composeActions.ts`.
- P1, las campanas del Anfiteatro de Umbral: `puzzles/bells.ts` (el compás), `game/bellsPlay.ts` y `bellsRig.ts`, `render/bellsView.ts`, estructura en `worlds/procedural/umbralBells*.ts`. Las marcas `INT_canal_N` comparten `clue_id` (se alcanza desde cualquier punto del canal). Con `?debug`: `__juego.bells()` y `__juego.bellsMark(n)` (fija la marca más cercana para probar sin andar al milímetro).
- P2 y P5 en el Archivo: `puzzles/orrery.ts`, `game/archivoPlay.ts` + `archivoRig.ts`, `render/archivoPuzzlesView.ts` y estructura en `worlds/procedural/archivoPuzzles*.ts` (las marcas `INT_planetario_N` comparten `clue_id`, una por riel, con `riel` en `userData`). Con `?debug`: `__juego.archivo()` y `__juego.archivoRail(n)`.
- P3 y P4 en el Archivo: `puzzles/cistern.ts`, `puzzles/pendulums.ts`, `game/depthsPlay.ts` + `depthsRig.ts`, `render/archivoDepthsView.ts` y estructura en `worlds/procedural/archivoDepths*.ts`. La Sala Cerrada es una cámara sellada del pasillo de los cajones con un anillo plegado (`PASO_Trampilla`↔`PASO_Camara`, cerradura `sala_cerrada` que abre `main.ts` con `depths.play.hatchOpen`). Con `?debug`: `__juego.depths()` y `__juego.depthsPendulum(n)`.
- P6 y P7: `puzzles/balance.ts`, `puzzles/chladni.ts`, `game/benchPlay.ts` + `benchRig.ts`, `render/benchView.ts` y estructura en `worlds/procedural/bench*.ts` (la Balanza en la isla de la Cuna del Taller, la placa en la Fundición y su placa del motor junto a la palanca de Cicatriz; marcas con `muesca` y `agujero` en `userData`). Con `?debug`: `__juego.bench()`, `__juego.benchNotch(n)` y `__juego.benchHole(n)`. El brillo de la Puerta del Nudo está en `render/lensView.ts` (`doorGlow` en `system/lens.ts`).
- Las Puertas plegadas (`PASO_`) llevan un velo de gusano estable (`render/gateWormholeView.ts`; cerca de ellas la vista se deforma: `game/gateWormhole.ts`). En el Archivo de las Puertas, elegir una boca de casa en el atril abre una boca en el cielo (`game/skyMouth.ts`, `render/skyMouthView.ts`) a la que solo se llega con la nave (el Archivo de las Puertas tiene nave); cruzarla lleva a `?mundo=hogar&final=…`, donde se aparece en el espacio, sentado en la nave (`ShipFlight.startPiloting`). Con `?debug`: `__juego.toGate(nombre)`, `gates()`, `skyMouth()`, `flyIntoMouth()` y `landHome()`.
- Los croquis del cuaderno (`dibujo` en los hechos) están en `ui/notebookSketches.ts` (trazos puros, con texto alternativo en los dos idiomas).

## El explorador (el jugador, por código)
- Ool joven con traje acolchado remendado y casco de burbuja (lámina de Anthony): `web/src/character/`. `gait.ts` es la lógica pura del andar (fase por distancia, quieto/andar/correr/aire/nadar), `explorerBody.ts` y `explorerGear.ts` las piezas, `explorerModel.ts` el muñeco articulado (un `Group` por articulación, marco de diseño Z arriba y frente +Y).
- ✅ Mide como un Ool adulto: `EYE_HEIGHT` 1,08 y `PLAYER_HEIGHT` 1,45 (`data/movement.ts`).
- `render/explorerView.ts` lo cuelga de la escena: en primera persona oculta cabeza y casco y retrasa el cuerpo (`FIRST_PERSON_BACK`/`_DOWN`) para verse al mirar abajo; pilotando no se dibuja. `ui/helmetRim.ts` pone el borde del casco.
- Con `?debug`: **F6** cámara exterior, **F7** la gira; `__juego.outside(true, Math.PI)` (de frente), `__juego.pitch(-1.2)` y `__juego.explorer()`.

## Idiomas y accesibilidad
- Español (por defecto) e inglés. El texto en español del código es la clave: `t('Volver')` (`web/src/i18n/`); la traducción está en `i18n/en.ts` y `tests/i18n/dictionary.test.ts` falla si un `t('...')` no tiene entrada. Huecos: `t('Ciclos: {n}', { n })`; plurales: `plural(n, 'día', 'días')`.
- El idioma se decide al cargar (guardado en `bucle-tiempo:idioma`, si no el del navegador) y cambiarlo recarga la página. No llames a `t()` con textos de datos que no estén en el diccionario.
- Las pistas se traducen superponiendo `web/src/i18n/clues/<mundo>.en.json` (por `id`) sobre `data/pistas/*.json` (`i18n/localizeClues.ts`). Al añadir una pista o cambiar un texto, actualiza su `.en.json`; el test `tests/i18n/clues.test.ts` lo exige.
- Los nombres de los mundos en inglés: Home, Moon, Threshold (Umbral), Archive, Workshop, Scar, Observatory, Hidden Laboratory; la Boca = Mouth, Puerta = Gate, Ausentes = the Absent.
- Accesibilidad (Configuración, en la pausa): escala de la interfaz (100–200 %) y de las letras (100–200 %), guardadas en `bucle-tiempo:accesibilidad`. Todo el CSS sigue en px: `web/scripts/postcss-ui-scale.ts` los envuelve en `calc(Npx * var(--ui-scale))` (y las letras, además, por `--text-scale`). No uses medidas en px fuera del CSS (canvas/inline) sin multiplicarlas.
- Menú principal (`web/src/menu/`): al entrar se ve un desfile de mundos (Hogar, Umbral, Archivo, Taller; planos y fundidos en `shots.ts`, cámara en `showcase.ts`) con Jugar o Continuar / Empezar de cero, idioma y tamaños. El juego carga por debajo y Jugar se activa al estar listo. No sale con `?debug`, `?mundo`, `?final` ni al cruzar el gusano. Para añadir un mundo al desfile, que se construya por código y añade planos a `SHOTS`.

