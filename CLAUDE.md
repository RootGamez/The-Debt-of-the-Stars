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

| Comando             | Qué hace                                                  |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo                                    |
| `npm run build`     | Comprueba tipos y genera `dist/`                          |
| `npm test`          | Tests (Vitest)                                            |
| `npm run coverage`  | Tests con cobertura                                       |
| `npm run lint`      | ESLint                                                    |
| `npm run typecheck` | TypeScript sin emitir                                     |
| `npm run format`    | Prettier                                                  |
| `npm run check`     | Todo lo anterior (tipos, lint, formato, cobertura, build) |
| `npm run e2e`       | Pruebas de extremo a extremo con Playwright (Chromium)    |

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

- Está en https://the-debt-of-the-stars.anthonygamez2858.workers.dev (cuenta de Anthony, Workers con assets estáticos, sin script: `web/wrangler.jsonc`).
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
- **Dejar objetos en cualquier sitio**: con las manos ocupadas, **E** mirando un suelo o una mesa a menos de 3 m (superficie casi llana) ofrece «dejar»; mirando algo suelto con las manos libres, «coger». Un objeto suelto es un estado más de `game/carry.ts` (`dropHeld`, `takeLoose`, `looseObjects`; el sitio va dentro del texto de `where`: `loose:x,y,z,nx,ny,nz`, así se reinicia solo con el ciclo). Cada puzle con objetos que se llevan (campanas, Planetario/prisma, pesas) expone `play.loosely` y su rig un `carrier`; `game/looseCarry.ts` (puro) decide qué ofrecer según adónde se mira y `main.ts` lo pasa como `ambient` de `SourceActions` (`reading/composeActions.ts` y `readingUi.ts`: sin fuente delante). La mirada usa `BvhWorld.raycastHit` (punto y normal) desde los ojos; las vistas lo dibujan con `render/looseObjects.ts` (`placeLoose`, de pie sobre la normal, colgado del marco del mundo). Al añadir un puzle con objetos: `looseAccess` en su play, `loose` en su vista y su carrier en `main.ts`. El Contrapeso y las pinzas de la placa no entran.
- P1, las campanas del Anfiteatro de Umbral: `puzzles/bells.ts` (el compás), `game/bellsPlay.ts` y `bellsRig.ts`, `render/bellsView.ts`, estructura en `worlds/procedural/umbralBells*.ts`. Las marcas `INT_canal_N` comparten `clue_id` (se alcanza desde cualquier punto del canal). Con `?debug`: `__juego.bells()` y `__juego.bellsMark(n)` (fija la marca más cercana para probar sin andar al milímetro).
- P2 y P5 en el Archivo: `puzzles/orrery.ts`, `game/archivoPlay.ts` + `archivoRig.ts`, `render/archivoPuzzlesView.ts` y estructura en `worlds/procedural/archivoPuzzles*.ts` (las marcas `INT_planetario_N` comparten `clue_id`, una por riel, con `riel` en `userData`). Con `?debug`: `__juego.archivo()` y `__juego.archivoRail(n)`.
- P3 y P4 en el Archivo: `puzzles/cistern.ts`, `puzzles/pendulums.ts`, `game/depthsPlay.ts` + `depthsRig.ts`, `render/archivoDepthsView.ts` y estructura en `worlds/procedural/archivoDepths*.ts`. La Sala Cerrada es una cámara sellada del pasillo de los cajones con un anillo plegado (`PASO_Trampilla`↔`PASO_Camara`, cerradura `sala_cerrada` que abre `main.ts` con `depths.play.hatchOpen`). Con `?debug`: `__juego.depths()` y `__juego.depthsPendulum(n)`.
- P6 y P7: `puzzles/balance.ts`, `puzzles/chladni.ts`, `game/benchPlay.ts` + `benchRig.ts`, `render/benchView.ts` y estructura en `worlds/procedural/bench*.ts` (la Balanza en la isla de la Cuna del Taller, la placa en la Fundición y su placa del motor junto a la palanca de Cicatriz; marcas con `muesca` y `agujero` en `userData`). Con `?debug`: `__juego.bench()`, `__juego.benchNotch(n)` y `__juego.benchHole(n)`. El brillo de la Puerta del Nudo está en `render/lensView.ts` (`doorGlow` en `system/lens.ts`).
- **Todo portal del juego es una esfera de agujero de gusano** (`render/wormholeSphere.ts`, pedido de Anthony: como el de _Interstellar_, no un anillo con velo): una bola de lente que dobla el entorno en el borde (anillo de Einstein incluido) y deja ver otro lugar por el centro. Para doblar el entorno el render pasa por `renderWithWormholes` (pinta antes la escena sin las esferas en una textura; un solo pase si no hay ninguna a la vista). La usan las Puertas plegadas, la boca del cielo y el gusano de la Luna: cualquier portal nuevo debe usar `createWormholeSphere`.
- Las Puertas plegadas (`PASO_`) llevan un gusano estable (`render/gateWormholeView.ts`; cerca de ellas la vista se deforma: `game/gateWormhole.ts`). En el Archivo de las Puertas, elegir una boca de casa en el atril abre una boca en el cielo (`game/skyMouth.ts`, `render/skyMouthView.ts`) a la que solo se llega con la nave (el Archivo de las Puertas tiene nave); cruzarla lleva a `?mundo=hogar&final=…`, donde se aparece en el espacio, sentado en la nave (`ShipFlight.startPiloting`). Con `?debug`: `__juego.toGate(nombre)`, `gates()`, `skyMouth()`, `flyIntoMouth()` y `landHome()`.
- **Bitácora de mundos**: los mundos ya no se nombran. La primera vez que se llega a uno sale su carta (`ui/worldDiscovery.ts`: dibujo, nombre oficial y la descripción `about` de `WORLD_LOG` en `worlds/worldLog.ts`; E, Intro, Espacio o Esc la pegan en el cuaderno). Los dibujos están en `ui/worldDrawings.ts` (herramientas en `worldDrawingsPaint.ts`; Taller, Cicatriz, Observatorio y la Brasa con el Cerco en `worldDrawingsFar.ts`). Los dos anclajes comparten el dibujo de la Brasa.
- Los croquis del cuaderno (`dibujo` en los hechos) están en `ui/notebookSketches.ts` (trazos puros, con texto alternativo en los dos idiomas).

## Soles, el Cerco y la luz (plan: `docs/plan-soles-y-luz-dinamica.md`)

- Las estrellas son esferas modeladas (`render/starModel.ts`, superficie pura en `starSurface.ts`). Cada sistema declara su `estrella` en `data/sistema*.json`: `tipo` (`solar` en casa, `enana_roja` en el sistema ajeno, `lejana` en las Puertas), colores, `intensidad`, `caida` (cómo cae la luz con la distancia; 0,5 en el sistema ajeno), `manchas`, `giro`. Se validan en `system/systemData.ts`. `system/starLight.ts` da la intensidad de la luz para que a la distancia de referencia (el mundo de la nave) valga lo que dice el archivo.
- **El Cerco** (`estructura` en `sistema.json`): dos anillos meridianos que giran en sentidos opuestos y pasan siempre por los dos polos (`system/cercoShape.ts`, `render/cercoRings.ts`). Los polos son los **anclajes** `anclaje_norte` y `anclaje_sur`, mundos por código fijos fuera del plano de las órbitas (`posicion` en lugar de `orbita` en `BodySpec`; `worlds/procedural/anclaje*.ts`). Un cuerpo con `posicion` se salta los mapas de órbitas. Las cinco lecturas son de ambiente (`data/pistas/anclajes.json`).
- **Sombras de la estrella** (`render/sunShadow.ts`): la luz sigue siendo la `PointLight` de three (fases correctas); se le suma oclusión con dos mapas de distancias dibujados desde la estrella hacia el jugador (cascada cercana de 90 m y lejana de 160 m, con penumbra que crece con la distancia al cuerpo que tapa) y un parche en `lights_fragment_begin` que multiplica la luz 0 (la estrella, que debe ser la primera luz de la escena). Proyecta lo que lleva `castShadow` (el cristal no); `castShadowsFrom` añade el explorador y la nave. Los materiales de los mundos reciben la sombra con `receive()` (idempotente, se encadena con `applySkyLight`); donde el sol llegaría y algo lo tapa, el relleno de cielo baja a un 40 %. Dentro del Nudo la sombra se apaga con la luz de la estrella.
- Tres cascadas nítidas de cerca a lejos: la de al lado (24 m), la cercana (90 m) y la lejana (eclipses). El sesgo y el desplazamiento por la normal crecen con el texel y con lo rasante de la luz (normal de cara por derivadas), el filtro es PCF bilineal y las cámaras se encajan a texeles enteros (`stableShadowAim` en `sunShadowFocus.ts`) para que los bordes no tiemblen al andar.
- **El cielo estrellado** (`render/sky.ts`): banda de la galaxia (sombreador con ruido 3D en textura: nubes, bulbo, franjas de polvo y nebulosas) y estrellas de colores, todo proyectado al infinito (solo cuenta la dirección: no se alcanza volando). Dónde está cada estrella, su color (temperatura) y su brillo los da `render/starCatalog.ts` (puro, con tests); cada tipo de estrella del sistema (`solar`, `enana_roja`, `lejana`) ve la galaxia desde otro sitio (`SKY_PRESETS`). Las lentes del Nudo y del agujero negro doblan las estrellas con `bendStars`.
- `?sombra=<512|1024|2048|4096>` elige el mapa y `?sombra=no` la apaga; `?calidad=baja` también la apaga. Con `?debug`: `__juego.aimAt('estrella')` apunta la cámara a la estrella.

## El explorador (el jugador, por código)

- Ool joven con traje acolchado remendado y casco de burbuja (lámina de Anthony): `web/src/character/`. `gait.ts` es la lógica pura del andar (fase por distancia, quieto/andar/correr/aire/nadar), `explorerBody.ts` y `explorerGear.ts` las piezas, `explorerModel.ts` el muñeco articulado (un `Group` por articulación, marco de diseño Z arriba y frente +Y).
- ✅ Mide como un Ool adulto: `EYE_HEIGHT` 1,08 y `PLAYER_HEIGHT` 1,45 (`data/movement.ts`).
- `render/explorerView.ts` lo cuelga de la escena: en primera persona oculta cabeza y casco y retrasa el cuerpo (`FIRST_PERSON_BACK`/`_DOWN`) para verse al mirar abajo; pilotando no se dibuja. `ui/helmetRim.ts` pone el borde del casco.
- Con `?debug`: **F6** cámara exterior, **F7** la gira; `__juego.outside(true, Math.PI)` (de frente), `__juego.pitch(-1.2)` y `__juego.explorer()`.
- **Tercera persona**: **V** a pie la alterna (pilotando, V sigue siendo la cámara de la nave). `render/thirdPersonCamera.ts` (pura): misma orientación que la primera persona, pero 3 m detrás del hombro derecho; un rayo contra la colisión del mundo la acerca ante una pared (se acerca de golpe y se aleja a 6 m/s). El borde del casco se oculta y el cuerpo se dibuja entero.
- **Luz del cuerpo** (los puntos de bioluminiscencia de los Ool): **L** la enciende y la apaga; alumbra de azul celeste en todas direcciones para ver interiores y sitios oscuros. Lógica pura en `character/bodyLight.ts` (fundido, latido, color y alcance), tecla en `game/bodyLightSwitch.ts`; la `PointLight` la cuelga `explorerView.ts` de la escena (nunca se esconde: cambiar el número de luces recompilaría todos los materiales; pilotando se queda a 0). Debe añadirse después de la estrella (la luz 0).

## Audio (plan: `docs/plan-audio.md`)

- El sonido sintético (`audio/engine.ts`, `mix.ts`, `data/soundscapes.ts`) sigue siendo la base y el respaldo. Encima van los **samples** (efectos, bucles, y más adelante la música): `audio/sampleBank.ts` (lee `public/audio/index.json` y carga bajo demanda), `audio/samplePlayer.ts` (reproduce con variante al azar, tono/volumen variables, panorámica y límite de voces por categoría; lógica pura en `audio/sfxLogic.ts`). Sin índice o sin archivo no pasa nada: `play()` devuelve `false` y quien llama usa el sintético.
- Desde el juego: `soundtrack.play(id, opciones)`, `soundtrack.loop(id)` (devuelve un manejador con `setLevel`/`setRate`/`stop`) y `soundtrack.preload([ids])` (los sonidos de un mundo al entrar en él). Respetan la tecla M.
- Volúmenes de efectos y ambientes en Configuración (`audio/volumePreferences.ts`, guardados en `bucle-tiempo:volumen`).
- Los archivos de `public/audio/` salen de ElevenLabs (generados) o de stock **CC0**; cada uno queda registrado con su origen y licencia. Presupuesto del primer lote de ElevenLabs: 15.000 créditos (ver el plan). Nunca subas ni imprimas la clave de ElevenLabs (`web/.env.local`, ignorado por git).
- Con `?debug`: `await __juego.sfx('id')` carga y reproduce un sample.
- **Stock importado (Kenney, CC0)**: `audio-src/stock-map.json` dice qué sonido del juego sale de qué archivo de cada paquete; `node scripts/audio/importStock.ts --src <carpeta con impact/ rpg/ interface/ scifi/>` los pasa a mp3 en `public/audio/` y escribe `index.json` y `audio-src/stock-credits.json` (autor y licencia de cada archivo). Después de importar, `npx prettier --write public/audio/index.json`. Los zips descomprimidos no se guardan en el repo.
- **Música**: las piezas (`category: 'music'` en `public/audio/index.json`, de `kind: 'music'` en `audio-src/generate-manifest.json`; ElevenLabs Music, ~12,5 créditos por segundo, instrumental) NO se bajan con los efectos: `soundtrack.playMusic(id, { level, fade })` / `stopMusic(fade)` las piden cuando hacen falta y suenan en bucle por su bus (volumen «música» en Configuración, por defecto 75 %). El tema principal (`music.main`) suena en el menú y se apaga al pulsar Jugar; después manda `audio/musicDirector.ts` (puro): la pieza del mundo (`music.umbral/archivo/taller/cicatriz`) con 70 s de silencio y 150 s sonando, y las capas `music.cielo_rojo` y `music.agujero_negro` mientras dura su evento (sin silencios); callan al morir o despertar. Dirección musical de Anthony (2026-11-11): melancólica y contemplativa, piano y cuerdas con sintetizadores suaves, silencios largos, tensión creciente con el ciclo.
- **Sonidos generados (ElevenLabs)**: `audio-src/generate-manifest.json` (texto, duración, variantes, bucle) → `node scripts/audio/generate.ts [--dry] [--only id] [--limit n] [--max créditos]` lee la clave de `web/.env.local` (`eleven-labs-api-key`, nunca se imprime), guarda lo que devuelve la API en `audio-src/generated/` (no se vuelve a pagar lo que ya está), lo procesa a `public/audio/` y lo mezcla con el stock en `index.json` (después, `npx prettier --write public/audio/index.json`). El libro de cuentas `audio-src/ledger.json` suma lo gastado y corta al llegar al tope (15.000 créditos para el primer lote); el contador de la cuenta tarda en reflejar el gasto, así que se apunta la estimación (40 créditos/segundo pedido, de sobra: el gasto real salió mucho menor). El importador de stock y el generador solo cambian lo suyo, no se pisan.
- Dónde suena: pasos, saltos y aterrizajes (`audio/foley.ts`, lógica pura; el suelo sale del mundo con `surfaceOf`; se llama desde `main.ts` con `explorer.speed`); la nave (`audio/shipAudio.ts` puro + `shipSound.ts`; `ShipFlight.audioFrame(dt)` da el empuje de las 24 toberas, la escotilla y los golpes: cada tobera suena al encenderse, con la panorámica de su sitio, y cada grupo tiene su rugido); luz del cuerpo, leer y Registro (`audio/edges.ts`). Con pocos sonidos el motor carga todo el índice al desbloquear el audio; si crece, cargar por mundos.

## Idiomas y accesibilidad

- Español (por defecto) e inglés. El texto en español del código es la clave: `t('Volver')` (`web/src/i18n/`); la traducción está en `i18n/en.ts` y `tests/i18n/dictionary.test.ts` falla si un `t('...')` no tiene entrada. Huecos: `t('Ciclos: {n}', { n })`; plurales: `plural(n, 'día', 'días')`.
- El idioma se decide al cargar (guardado en `bucle-tiempo:idioma`, si no el del navegador) y cambiarlo recarga la página. No llames a `t()` con textos de datos que no estén en el diccionario.
- Las pistas se traducen superponiendo `web/src/i18n/clues/<mundo>.en.json` (por `id`) sobre `data/pistas/*.json` (`i18n/localizeClues.ts`). Al añadir una pista o cambiar un texto, actualiza su `.en.json`; el test `tests/i18n/clues.test.ts` lo exige.
- Los nombres de los mundos en inglés: Home, Moon, Threshold (Umbral), Archive, Workshop, Scar, Observatory, Hidden Laboratory; la Boca = Mouth, Puerta = Gate, Ausentes = the Absent.
- Accesibilidad (Configuración, en la pausa): escala de la interfaz (100–200 %) y de las letras (100–200 %), guardadas en `bucle-tiempo:accesibilidad`. Todo el CSS sigue en px: `web/scripts/postcss-ui-scale.ts` los envuelve en `calc(Npx * var(--ui-scale))` (y las letras, además, por `--text-scale`). No uses medidas en px fuera del CSS (canvas/inline) sin multiplicarlas.
- **Pantalla de carga** (sustituye a la página en blanco): el marcado y su CSS van en línea en `web/index.html` (se ve antes de que llegue el código), los tres dibujos son SVG en `web/public/carga/` (los Ool del Instituto, el Albatros II y la Brasa con sus mundos, que se turnan) y `ui/loadingScreen.ts` pone los textos traducidos, la barra y la quita (lógica pura en `ui/loadingSteps.ts`). Cubre la carga entera: los mundos del sistema se construyen uno a uno (`loadSystemStepwise`) y después se compilan los sombreadores de toda la escena por partes (`render/warmUp.ts`), así no hay tirones al llegar a un mundo. Con menú dura al menos 3,5 s y Jugar se activa al quitarla; sin menú (`?debug`, `?mundo`) no tapa los clics. El tema principal suena ya en la carga (tras el primer gesto, que la pantalla invita a hacer; `soundtrack.updateLoading()` da la mezcla de solo música); al cruzar el gusano no hay pantalla ni tema.
- Menú principal (`web/src/menu/`): al entrar se ve un desfile de mundos (Hogar, Umbral, Archivo, Taller; planos y fundidos en `shots.ts`, cámara en `showcase.ts`) con Jugar o Continuar / Empezar de cero, idioma y tamaños. El juego carga por debajo y Jugar se activa al estar listo. No sale con `?debug`, `?mundo`, `?final` ni al cruzar el gusano. Para añadir un mundo al desfile, que se construya por código y añade planos a `SHOTS`.
