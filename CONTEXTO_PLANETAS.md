# CONTEXTO DE PLANETAS — La deuda de las estrellas

**Versión:** v0.17
**Última actualización:** 2026-11-04 · Fase 11H (Cicatriz hueca, con anillo y micro agujero)
**Documentos hermanos:** `CONTEXTO_HISTORIA.md` (la historia; léelo primero) · `CONTEXTO_PISTAS.md` (qué se aprende en cada lugar)

> Cada mundo está pensado a la vez como **lugar jugable**, **pieza narrativa** y **lección de relatividad**. Todo lo de este documento es propuesta (🟡) para reaccionar, salvo lo marcado ✅, que viene de las decisiones ya tomadas en `CONTEXTO_HISTORIA.md`.
>
> **Leyenda:** ✅ decidido por Anthony · 🟡 propuesta de Claude, por confirmar · ❓ abierto

---

## 1. El sistema ajeno de un vistazo

**La estrella (🟡):** *la Brasa* (nombre ❓), una enana naranja vieja de luz cálida y débil. Da al sistema un crepúsculo permanente, ideal para el tono melancólico.

**Órbitas, de dentro hacia fuera (🟡):**

```
   Brasa (estrella)
     │
     ├─ Taller ──── muy rápido, mundo interior
     ├─ Cicatriz ── la maquinaria; aquí nace el agujero negro
     ├─ Archivo ─── denso, tiempo lento
     ├─ Umbral ──── llegada, reloj de referencia
     └─ Observatorio (opcional) ── lejano, aire limpio
   Laboratorio Oculto ── su posición real no coincide con la imagen que se ve (lente)
```

**Tabla resumen (🟡, números aproximados para empezar a probar):**

| Mundo | Radio | Gravedad (1.0 = cómoda) | Reloj (Umbral = 1.00) | Por qué ese reloj | Lección de relatividad | Lo absorbe el agujero negro |
|---|---|---|---|---|---|---|
| **Umbral** | 90 m | 1.0 | 1.00 | Referencia | Los dos relojes | 14:20 a 14:45 |
| **Archivo** | 70 m | 1.5 | 0.80 | Masa densa | Dilatación gravitacional | 14:00 a 14:20 |
| **Taller** | 45 m | 0.6 | 0.85 | Órbita rapidísima | Dilatación por velocidad y gemelos | 13:45 a 14:00 |
| **Cicatriz** | 80 m | 1.2 | 0.60 y bajando | Cerca de la maquinaria | Todo junto: marea, desfase, lente | 13:30 a 13:45 |
| **Observatorio** | 30 m | 0.2 | 1.15 | Lejos de la masa | Luz finita y lente gravitacional | 14:45 a 15:00 (el último) |
| **Laboratorio Oculto** | 25 m | 0.3 | 0.20 | Muy cerca de la masa | Dilatación extrema | No llega a absorberse (❓) |

> Los relojes sirven para diseñar el HUD de doble reloj y los puzzles de fechas que no cuadran. Los valores reales no tienen por qué ser físicamente exactos: tienen que *verse* y *entenderse*.

---

## 2. Convenciones de diseño (🟡)

- **Escala:** 1 unidad de Blender = 1 metro. Con radios de 30 a 90 m se da la vuelta caminando en 1 a 2 minutos.
- **Presupuesto de triángulos:** planeta 3 a 8 mil; props 50 a 500; nave 1 a 3 mil. ✅ **Es orientativo** (Anthony, 2026-10-29): se supera cuando haga falta para que los modelos sean **profesionales, bonitos y completos**; lo que manda es que el juego vaya fluido (se mide).
- **Color:** de 8 a 12 colores por mundo, con una sola textura de paleta o vertex colors.
- **Marcas en Blender:** prefijos `COL_` (colisión), `INT_` (interacción), `SPAWN_` (aparición) para colocar diálogos, triggers y puntos de inicio sin escribir coordenadas a mano.
- **Plantilla de un mundo:** 1 entrada memorable, de 3 a 5 puntos de interés, 1 evento cronometrado, 1 puzzle principal, de 2 a 3 textos clave.
- **Tiempo de exploración:** un mundo se explora en 5 a 10 minutos, menos de un ciclo, y se vuelve a visitar con preguntas nuevas.
- **Sonido:** cada mundo tiene su propio silencio. El silencio es parte del tono, no una carencia.
- **Lenguaje visual de los Ausentes (🟡):** *anillos y estratos*. Arcos y anillos concéntricos (las Puertas lo impregnan todo), muros en capas horizontales como estratos de tiempo y **marcas de reloj** (rayas en círculo) como ornamento. Arenisca clara y metal pizarra; luz ámbar. Sin espirales, hexágonos ni cristal turquesa.

---

## 3. Umbral — la llegada

**Idea.** Un mundo en calma permanente, bañado en luz de atardecer, donde aparece el viajero. Es el único lugar amable del sistema y por eso duele más cuando se entiende lo que significó.

**Forma.** Radio 90 m, gravedad 1.0. Una gran planicie con un solo macizo de roca y casquetes de hielo azulado en los polos. Sin luna.

**Tiempo.** Reloj de referencia. Aquí se aprende a leer el **reloj doble** del HUD.

**Lugares clave:**
1. **La Boca.** Un anillo de piedra y metal en una meseta baja. El protagonista aparece frente a él en cada ciclo. No es un portal brillante: es un anillo apagado con una grieta de luz que se cierra a su espalda.
2. **El Muelle de Envíos.** Plataforma donde preparaban cargas. Aquí está el registro de envíos con un destino que no figura en ningún mapa (pista de *dónde*).
3. **El Mirador del Ocaso.** Un banco de piedra frente a la estrella, con dos tazas talladas. Alguien esperaba a alguien. Pura melancolía. (🟡 Está en el terminador: como Umbral siempre muestra la misma cara a la Brasa, desde el Mirador la estrella toca el horizonte en un ocaso que no termina.)
4. **El Aula.** Una sala con inscripciones infantiles que refuerzan lo aprendido de la lengua.
5. **Las Casas.** Seis casas con las mesas servidas, abandonadas sin señal de violencia.

**Evento del ciclo.** Hacia el minuto 5, anillos de luz se curvan en el cielo (primeras señales). Hacia el 10, La Boca vuelve a abrirse un instante: su destello se ve desde otros mundos.

**Puzzle principal.** *El cuaderno del turno.* Un Ausente anotaba la hora de Umbral y, al lado, la del Archivo. Las columnas se separan poco a poco. Enseña el desfase sin explicarlo.

**Textos clave:**
- La placa de inauguración de La Boca (orgullo y celebración; un detalle fuera de tono).
- El registro de envíos con el destino sin mapa.
- Una carta sin enviar, de quien esperaba en el mirador.

**Atmósfera.** Ámbar, ocre, violeta oscuro, azul hielo, arena. Sol grande y bajo, sombras largas, viento leve. Piano sparse.

**Aire (✅ Anthony, 2026-11-03; aspecto 🟡).** Umbral tiene un aire fino: cielo de ocaso violeta arriba y ámbar en el horizonte que deja ver las estrellas, y que se apaga a violeta oscuro en la cara de noche; bruma lejana cálida de día y violeta de noche, que se va al subir con la nave; polvo de arena que el viento leve arrastra rozando el suelo.

**Edificios cerrados y lore (plan de la llegada, hitos D y E; ✅ el estilo, D3 y D2; 🟡 lugares y contenido).** Tres edificios cerrados con el cuerpo del Observatorio (paneles tallados, ángulos rectos) y cobre oxidado, con anillo y friso de reloj sobre cada puerta, la hoja a medio abrir y una consola con su piloto en espera: la **Casa de Estudio** junto al despertar (mesas con tablillas, un taburete volcado, el archivo y un **mural** de un Ausente bajo el anillo de una Puerta), la **Sala de Mando** junto a La Boca (consolas en arco, diales de cobre y, sobre la mesa, la **proyección de anillos de luz** de un Ausente que nadie apagó; su consola dice que este fue el origen de la red) y el **Taller del Tallista** junto a la plaza (cinceles, un té seco y un Ausente **tallado hasta la cintura**). Todo cuenta que se fueron hace poco y con prisa.

**Cielo y hielo (Fase 12, ✅ Anthony 2026-11-06: más denso, con nubes, día y noche según el lado y la cara de noche helada; 🟡 colores, alturas y dónde empieza el hielo).** El aire es más denso (tapa casi todas las estrellas de día) y lleva dos capas de nubes: cúmulos bajos color crema a 30 m y velos altos a 48 m, que de noche se vuelven gris violeta. Como Umbral siempre da la misma cara a la Brasa, el cielo depende del sitio: con la Brasa alta, azul pálido polvoriento con el horizonte ámbar; junto al terminador, el ocaso violeta de siempre (el Mirador); en la cara de noche, casi negro y más fino, con estrellas. La cara de noche está helada: la escarcha empieza poco después del terminador y más allá todo es nieve azulada con ventisqueros, rocas escarchadas y agujas de hielo, sin matas, con bruma fría. Se despierta justo en el borde de la escarcha, mirando a la nave caída sobre la nieve.

**Más lugares (🟡, Fase 11, sin pistas).** Para dar vida y referencias a la planicie:
- **La Vía de los Anillos:** tres anillos de pie, cada vez más pequeños, en el camino de La Boca al Muelle; se cruzan caminando.
- **La Atalaya:** torre de estratos con un faro ámbar, en la cara de noche al oeste del Mirador; se ve desde lejos.
- **El Anfiteatro:** gradas en anillos alrededor de un anillo tumbado, al sur de las Casas; se entra a ras de suelo.
- **El Anillo Caído:** un primer anillo, roto y medio enterrado, con sus dovelas por la arena, al sur de la caseta.
- **La Estación del Hielo:** un tambor con antena de anillo al borde del casquete norte.
- **Los silos del Muelle:** tres silos de cúpula unidos por una pasarela, al sur del Muelle de Envíos.

**Modelo.** ✅ Por código desde la Fase 11 (`web/src/worlds/procedural/umbral.ts`, sin Blender): terreno de unos 48 mil triángulos y los lugares, con el mismo contrato de marcas que tenía el `.glb`.

---

## 4. Archivo — la biblioteca

> **Rediseño (✅ Anthony, 2026-11-03):** el Archivo pasa a ser un **planeta de agua**. Los archivos que rodean el planeta quedan dentro de una **cúpula de vidrio** que los Ausentes construyeron alrededor del planeta para guardarlos, con **una sola entrada** (bajo el agua o igual de difícil) que solo se encuentra **leyendo una pista en otro planeta**. Se modela por código. Cómo se concreta (🟡, con preguntas ❓) en `docs/plan-fase-11-modelado-por-codigo.md`, hito 11E: un océano con la Galería, un anillo de vidrio en el ecuador medio hundido; una esclusa en el fondo como única entrada; bucear con aire limitado. Lo de abajo es el diseño anterior; los lugares, el evento y las pistas se conservan dentro de la cúpula.

**Cómo quedó en el código (Fase 11E; 🟡 salvo lo marcado).**
- **El mar.** El radio del mundo (70 m) es la superficie del agua; el fondo de roca queda unos 14 m abajo, con islotes. Se despierta seco en el islote del **Borde**, con un muelle y un anillo dorado. La nave flota en el agua.
- **La Galería (✅ la forma).** Un tubo de vidrio que da la vuelta al ecuador justo al nivel del agua: la mitad asoma y la otra mitad queda sumergida. Dentro está el cañón seco de siempre, con su suelo, costillas, estanterías y los mismos lugares en sus posiciones. El Fondo del Cañón es un tramo del suelo hundido unos 2 m.
- **Seis torres** sostienen el tubo y se numeran hacia el este desde la del Borde. La **tercera** lleva **tres bandas de luz**, la marca de la entrada.
- **La esclusa, única entrada.** Bajo la tercera torre, en el fondo del mar, se abre un pozo de piedra con la puerta al pie, hacia el oeste. Se bucea hasta la puerta y se sube por el pozo hasta donde acaba el agua. Desde ahí, una rampa lleva a una cámara seca y otra rampa sube por un hueco del suelo hasta la Galería. El vidrio no se puede atravesar en ningún otro sitio.
- **Bucear (✅ aire limitado).** Se nada con Espacio (subir) y Mayús (bajar). El aire dura **40 s**, se ve una barra y, si se acaba, la muerte es *ahogado*. Fuera del agua el aire se recupera en 3 s. El recorrido desde la superficie hasta la Galería se hace en unos 20 s.
- **La pista (✅ el sitio).** Una hoja suelta en el Muelle de Envíos de Umbral (`umbral.hoja_entrada`) dice dónde está la puerta.
- **El mar (✅ que tenga oleaje y no se vea oscuro, Anthony 2026-11-03; 🟡 cómo).** El oleaje sube y baja hasta 0,45 m y es el mismo que se ve y el que empuja: quien nada se mece y la nave sube y baja con las olas. El agua es azul clara y transparente: refleja el cielo, deja ver el fondo, brilla con la Brasa y hace espuma en las crestas. Al caer al agua salpica, al nadar quedan ondas, al bucear salen burbujas y el fondo se tiñe de azul con reflejos de luz. Desde abajo se ve la superficie moverse.
- **El cielo (✅ azul con nubes, Anthony 2026-11-03; 🟡 los colores).** Aire de mar casi opaco: un cielo azul con un resplandor cálido alrededor de la Brasa, que de noche se vuelve azul hondo con estrellas. Lo lejano se ve azulado. Hay dos capas de nubes que el viento mueve: cúmulos a 26 m sobre el agua y velos altos a 40 m.

**Idea.** Un cañón-biblioteca excavado en un mundo denso y silencioso, donde el tiempo pesa de verdad.

**Forma.** Radio 70 m, gravedad 1.5: pasos pesados y saltos cortos. Un cañón ecuatorial cruzado por pasarelas, con torres de estanterías de piedra talladas en las paredes.

**Tiempo.** 0.80. El reloj va más lento por la masa del planeta.

**Lugares clave:**
1. **La Gran Nave.** Sala principal de lectura, con tablillas en estanterías de piedra.
2. **El Índice.** Un gran muro de registros con una sección censurada: tres columnas vacías (pista de *por qué*).
3. **La Sala de Relojes.** Decenas de relojes con ritmos distintos, cada uno con una etiqueta de dónde fue calibrado.
4. **El Escritorio del Archivista.** Notas personales de quien catalogaba y notó cosas que no cuadraban.
5. **El Fondo del Cañón.** Zona oscura de registros "cerrados" que solo se ilumina en un momento del ciclo.

**Evento del ciclo.** Hacia el minuto 4, la luz de la Brasa entra por una ranura y dura unos 90 segundos sobre una tablilla concreta. Solo se lee si estás allí en ese momento.

**Puzzle principal.** *Las respuestas que llegan antes.* Hay cartas que contestan antes de haber sido enviadas. La Sala de Relojes explica que fueron escritas en relojes distintos. Al reordenarlas se descubre que el informe de la investigadora fue archivado tres veces, con tres fechas, y que algo se borró cada vez.

**Textos clave:**
- El informe oficial (versión tranquilizadora).
- El hueco censurado del Índice.
- Una nota del archivista: "faltan cuarenta días que no recuerdo haber archivado" (primera señal de que existe un lugar con un tiempo mucho más lento).

**Atmósfera.** Azul acero, gris perla, marfil, oro apagado. Luz fría por rendijas, eco de pasos, música casi inexistente.

**Blender.** El cañón es la pieza difícil: modelarlo con tramos modulares. Estanterías y pasarelas como props repetidos (instancing).

---

## 5. Taller — la fábrica sin gente

> **Rediseño (✅ Anthony, 2026-11-03):** el Taller pasa a ser un **planeta gaseoso**. Lo que hay en él va en **pedazos de isla o roca que giran** (o en ciertos puntos del planeta), **aterrizar es complicado** y **caer dentro del planeta es la muerte**. Se modela por código. Cómo se concreta (🟡, con preguntas ❓) en `docs/plan-fase-11-modelado-por-codigo.md`, hito 11F: cinco islas flotantes, una por lugar, que orbitan deprisa (de ahí el reloj 0,85) y giran sobre sí mismas; a las 7:00 se alinean. Lo de abajo es el diseño anterior; los lugares, el evento y las pistas se conservan repartidos por las islas.

**Cómo quedó en el código (Fase 11F; 🟡 salvo lo marcado).**
- **El gigante (✅ la idea).** Una esfera de nubes en bandas (crema, naranja, cian) de **80 m** de radio que se mueven a distinto paso, con una capa de bruma por encima. No tiene suelo. No es más grande porque su reloj llegaría a Cicatriz cuando sus órbitas se acercan. Gravedad 0,6 y reloj 0,85, como antes. El gigante gira cada 90 s y su día dura 180 s.
- **Cinco islas (✅ cinco).** Islas de roca planas por arriba, con un cono de roca colgando y escombros que giran despacio a su alrededor, a unos 20–26 m sobre las nubes. Hay una por lugar: Montaje (donde se despierta; arcos, los cuatro brazos y la maqueta del núcleo), la Cuna (anillo vacío, nota y manual), los Dormitorios (tres cabinas y las camas de los gemelos), la Cabina de Control (garita con tres consolas) y la Pista de Pruebas (un anillo de vía partido alrededor, el reloj y el teletransportador).
- **Las islas quedan fijas sobre el gigante, que gira (🟡; distinto de lo propuesto).** No orbitan cada una por su cuenta. Vistas desde fuera barren el cielo a unos 7 m/s, así que aterrizar sigue exigiendo seguir al gigante. Así sus colisiones son estáticas.
- **Caer es morir (✅).** Bajo 74 m de radio, las nubes matan (causa nueva `gas`), tanto a pie como con la nave. Las islas no tienen gravedad propia.
- **Los puentes de luz (🟡).** A las 7:00, con la secuencia de la fábrica, se encienden puentes de luz que unen las cinco islas en cadena, de Montaje a la Pista. Solo se pueden pisar mientras dura la secuencia (2 min); fuera de ella, se pasa de isla en isla con la nave. Se encienden también las luces de cada isla.
- **El teletransportador (✅ la condición).** Un anillo en la Pista. Se abre (un velo de luz cian) **solo durante la secuencia de las 7:00** y **con el reloj de la Pista en hora**. Ese reloj empieza cada ciclo **3 min 17 s adelantado** (🟡). Se ajusta con dos ruedas, minutos y segundos, hasta que marque lo mismo que el reloj del Taller. Al ajustarlo se anota `contrapeso.medir_desfase`.
- **La Sala del Centro (🟡).** Un núcleo de roca de 8 m de radio, en el centro del gigante. Se camina por encima y la gravedad tira hacia el centro. Lo rodea una cáscara oscura de 20 m, con anillos e **indicaciones talladas** que brillan en violeta. En un atril están **las páginas de sincronización** (✅ opción B: lo que falta para instalar el Contrapeso). Otro anillo, siempre abierto, devuelve a la Pista.

**Idea.** Un diminuto planeta de talleres que gira tan rápido que amanece cada tres minutos, donde las máquinas siguen trabajando para nadie. Lo más inquietantemente vivo del sistema.

**Forma.** Radio 45 m, gravedad 0.6: saltos largos, sensación de ligereza. Da la vuelta a la estrella en unos 3 minutos, así que el día y la noche cambian la luz constantemente.

**Tiempo.** 0.85. Más lento por la velocidad.

**Lugares clave:**
1. **La Nave de Montaje.** Línea de ensamblaje detenida, con brazos mecánicos que aún se mueven.
2. **La Cuna del Contrapeso.** Un pedestal vacío con cableado. Una placa dice: "trasladado para las pruebas finales" (pista de *dónde*).
3. **La Pista de Pruebas.** Anillo exterior donde probaban la sincronización de relojes.
4. **Los Dormitorios.** Literas con objetos personales y diarios.
5. **La Cabina de Control.** Una consola que muestra el reloj del Taller frente a otros mundos y deja ver la deriva por velocidad.

**Evento del ciclo.** Hacia el minuto 7, toda la fábrica se activa en una secuencia programada. Con ella se puede ver, en una simulación automática, **cómo se instalaba el Contrapeso**.

**Puzzle principal.** *Los gemelos.* Dos diarios cuentan los mismos tres meses: el de un técnico que se quedó en Taller y el de su hermana que vivía en Umbral. Las cifras no coinciden. Entender por qué enseña la dilatación por velocidad y, de paso, cuánto tiempo hay que corregir al instalar el Contrapeso.

**Textos clave:**
- El manual de instalación del Contrapeso, incompleto: faltan las páginas de sincronización.
- El diario del técnico.
- Una nota pegada en la Cuna: "No lo muevan sin ajustar el reloj".

**Atmósfera.** Blanco, naranja, cian, gris acero. Viento, luz que cambia rápido, máquinas con ritmo. Música rítmica y sobria.

**Blender.** Piezas mecánicas simples y repetibles, con animación por rotación (barata). Cuidar el rendimiento en móvil.

---

## 6. Cicatriz — el origen

**Idea.** El lugar donde todo empezó: un mundo cortado a pedazos. Aquí está la maquinaria que abre las Puertas y el sitio donde se instala el Contrapeso.

**Forma.** Radio 80 m, gravedad 1.2. La superficie está marcada por **cortes esféricos perfectos**, como mordidas lisas: de aquí salieron los fragmentos que llegan a otros mundos.

**Tiempo.** 0.60 y bajando. A medida que avanza el ciclo, el colapso lo ralentiza.

**Lugares clave:**
1. **La Sala del Motor.** Un enorme anillo con el núcleo abierto. El motor viejo está aquí y es donde se instala el Contrapeso. 🟡 (Fase 10C) Delante del núcleo, una consola con la **palanca** que saca el motor viejo (queda tumbado en el suelo) y la **cuna**: una peana para el Contrapeso con dos ruedas (minutos y segundos) para igualar su reloj con el de la máquina; con el pulso sube de la cuna al núcleo.
2. **Las Mordidas.** Decenas de cortes esféricos. En una de ellas, una pared tallada con un símbolo partido por la mitad que encaja con el fragmento visto en el Instituto durante el prólogo (momento de cierre).
3. **El Puesto del Escéptico.** Una caseta con su última grabación, hecha con el reloj de un lugar que no es ningún mundo (pista de *dónde*).
4. **La Primera Puerta.** Ruina del primer anillo.
5. **El Borde.** Un acantilado desde donde se verá nacer el agujero negro.

**Evento del ciclo.** Hacia el minuto 9, un pulso: el cielo cambia de color, el suelo vibra y las mordidas parecen "respirar". Al 13:30 nace el agujero negro.

**Puzzle principal.** La **instalación del Contrapeso** (✅ pasos en `CONTEXTO_HISTORIA.md` §9, Anthony 2026-10-29) llegando con el reloj sincronizado y en el momento justo. Antes de eso, aprender a medir cuánto tiempo se puede estar cerca del Borde antes de que la marea impida moverse.

**Textos clave:**
- La grabación del escéptico, con su advertencia.
- La bitácora de la máquina, con picos de deuda cada vez que se usaba.
- La lista de mundos conectados: la red, con huecos para nombres de otros sistemas.

**Atmósfera.** Rojo óxido, negro, naranja incandescente, gris humo. Luz que se curva, sonidos graves, música tensa y triste.

**Blender.** Esfera con huecos esféricos hechos con booleanas. Es la pieza más lucida del juego y conviene hacerla con cuidado.

**Por código (Fase 11H, 2026-11-04).** ✅ Anthony: Cicatriz es **hueca**; en su centro duerme un **micro agujero negro** (es el que crecerá a las 13:30), la máquina **rodea el centro**, hay **gravedad doble** (hacia dentro por fuera, hacia fuera en la cara interior, con la cabeza hacia el centro), un **anillo** con los fragmentos que perdió (miles de rocas y unos pocos fragmentos pisables) y los cráteres miran hacia el interior. Lo demás es 🟡:
- **Forma.** Cáscara de 80 m por fuera y 60 m por dentro. Dieciocho mordidas (la **Gran Mordida** y diecisiete más) atraviesan la cáscara: cada cuenco acaba en un **ojo** que da a la cavidad, enmarcado por un anillo de contención. La gravedad cambia de lado a 61 m y, dentro del ojo, se tuerce hacia la cara interior: quien cae por un ojo a pie describe un arco y aterriza de pie al otro lado. De la cara interior se vuelve fuera por el Pozo.
- **Fuera.** El Puesto del Escéptico, la Primera Puerta con la **Cripta de la Garganta** bajo su explanada (escalera, bóveda, el sello de la primera garganta y una inscripción), el Borde sobre la Gran Mordida, las **Galerías Cortadas** (salas partidas por la mordida, con la pared del símbolo), bocas de túneles cortados, el **Pozo** (una Puerta plegada lleva a la cara interior), torres con cables y un campamento con raíles que acaban en el vacío.
- **Dentro.** El **Eje** (columna desde la cara interior hasta la máquina, con una Puerta plegada a la Sala del Motor), seis radios de cable, la **Fundición** (anillos a medio forjar), la **Sala de Partidas**, el **Friso de la Excavación**, los **Dormideros**, estratos colgantes y caminos de losas.
- **La Sala del Motor** es una banda de 12 m de radio alrededor del centro: cuna, palanca, bitácora, lista de mundos y el visor del núcleo. Dentro, las esferas armilares, el motor viejo y el micro agujero. La marea del núcleo se aguanta en la banda hasta las 15:00. La nave llega al centro por el ojo de la Gran Mordida.
- **El anillo.** De 108 a 152 m, inclinado, con un surco. Fragmentos pisables: el **Faro** (con la placa), el **Muro Arrancado** (media casa del revés con la mesa puesta), el **Andamio de Pesca** y la **Losa del Símbolo**.
- Cinco fuentes nuevas (ver `CONTEXTO_PISTAS.md` §5.5).

---

## 7. Observatorio — el cielo limpio (opcional)

**Idea.** Un asteroide con una cúpula y un gran telescopio, lejos de todo. Es donde se entiende que lo que se ve no es lo que está.

**Forma.** Radio 30 m, gravedad 0.2. Una cúpula, un telescopio y poco más.

**Tiempo.** 1.15. Lejos de la masa, el tiempo corre más rápido.

**Lugares clave:** la cúpula; el telescopio; el libro de turnos; una plataforma exterior para mirar.

**Evento del ciclo.** Hacia el minuto 6:30, una alineación deja ver con claridad un punto en el cielo que no se mueve como una estrella: la **imagen desplazada** del Laboratorio Oculto (si se esconde por lente).

**Puzzle principal.** Restar el desplazamiento para saber dónde está realmente lo que se ve. Enseña luz finita y lente gravitacional.

**Textos clave:** el libro de turnos, donde alguien anotó "señal sin confirmar" cada día durante años; un informe que dice que desde fuera todo parecía en calma.

**Atmósfera.** Índigo, negro, puntos blancos. Casi silencio.

🟡 **Propuesta (2026-11-05, Fase 11, por código):** los Ausentes adaptaron el asteroide para buscar y estudiar las
fluctuaciones de la luz. Tallaron una terraza donde la Brasa se ve a 52° (la rotación está bloqueada, así que no se
mueve de su cielo) y levantaron un edificio cerrado al vacío: la cúpula con el telescopio apuntando a la Brasa, un
hangar con techo de cristal donde se posa la nave, una esclusa, el cuarto del turno y la Sala de las Fluctuaciones.
Sustituye a la "plataforma exterior para mirar" (fuera no hay aire).

**Papel en el final del ciclo.** Es el último mundo en caer y sirve de **palco** para ver el sistema ser devorado y entender el fenómeno desde fuera.

---

## 8. Laboratorio Oculto — el secreto

> ✅ Decidido: el laboratorio está en un sitio aparte, escondido por lente gravitacional, y el Consejo ocultó el problema.

**Idea.** Un laboratorio pequeño, íntimo, abandonado con prisa, donde se hacía la investigación que nadie debía ver.

> ✅ Decidido (Anthony, 2026-10-28): **el Laboratorio está dentro del Nudo**, en un sitio con la **gravedad invertida**: se camina por la cara interior de una esfera hueca.

**Forma.** El Nudo y el Laboratorio son un solo sitio (🟡 cómo):
- **El Nudo** es la garganta de la primera Puerta, que se cerró mal y quedó plegada sobre sí misma. Por fuera, una **cáscara negra** de 25 m de radio (negro sobre negro: casi no se ve), con una Puerta de anillos de los Ausentes y un pequeño muelle donde posarse.
- **Por dentro**, una cavidad de 21 m de radio donde **la gravedad empuja hacia fuera**: el suelo se curva hacia arriba a tu alrededor y, en el centro, cuelga la **semilla** del Nudo (lo que despierta a las 13:30), negra, con un halo frío y tres anillos que giran muy despacio. Franjas oscuras cada 30° de latitud (los estratos) ayudan a orientarse.
- **Se entra por una Puerta plegada**: el anillo de la cáscara y su gemelo de la cara interior comparten el paso; al cruzar uno se aparece delante del otro. Dentro no llega la Brasa: luce la semilla.
- Gravedad 0.3. Tan cerca de la masa que su tiempo corre unas **cinco veces más lento** que fuera.
- Inspiración general: un lugar escondido dentro de otro cuerpo. La forma, la historia y el lenguaje visual son propios.

**Lo que el jugador siente.** Al entrar, todo se mueve más despacio: la llama de una vela, un reloj de pared, el polvo. El HUD lo confirma. Quienes trabajaron aquí vivieron *meses* mientras fuera pasaban *años*.

**Lugares clave** (repartidos por la cara interior y unidos por senderos con farolas):
1. **La Sala de Trabajo.** Una pizarra con una ecuación a medias y el armario con la orden de silencio (sobre sellado).
2. **El Dormitorio compartido.** Un cuarto sin techo con dos camas, una sola con huellas de uso.
3. **El Banco del Contrapeso.** Donde estaba el artilugio, o lo que queda de él.
4. **El Escritorio de la Investigadora.** Sus últimas notas y el reloj de mesa de aguja casi quieta.
5. **El Escritorio del Escéptico.** La silla tumbada, la funda vacía de su grabadora y una carta del cielo con una flecha a lápiz.
6. **La Cámara.** Dos anillos cruzados, un asiento y un dial de 24 marcas con el último cuarto encendido.
7. **El Recibidor.** La Puerta gemela por donde se entra.

🟡 **Propuesta de la Fase 11 (por código):** la cara interior es un **tablero de ajedrez en espiral** que se enrosca de
polo a polo (casillas que se estrechan en remolino hacia los polos, juntas con el frío de la Puerta y una onda lenta
que las recorre): mires arriba o abajo, el suelo parece girar. Alrededor de la semilla **orbitan en anillos lentos**
las cosas que el Laboratorio perdió por la gravedad invertida (papeles, libros, tazas, sillas, tizas). Y cuatro salas
más, unidas por senderos: el **Archivo de Mediciones**, el **Cuarto de la Radio**, el **Comedor** (con el calendario de
rayas) y el **Invernadero**.

**Textos clave:** las últimas notas de la investigadora; las del escéptico; el documento que ordena callar (y quién lo firma ❓).

**Atmósfera.** Verde grisáceo clínico, blanco roto, luz de lámpara cálida. Un tictac lentísimo. Es el lugar más triste y humano del juego.

**Cómo se llega.** Solo con las pistas de todos los mundos: ver la imagen en el Observatorio, corregir su posición con lo aprendido en Archivo y Taller, y usar la grabación del escéptico de Cicatriz como confirmación.

---

## 9. Sistema de origen — el prólogo (✅ ubicación; 🟡 diseño)

> ✅ Decidido: el prólogo ocurre en un sitio donde se estudian los objetos de los Ausentes y donde ya saben leer su lengua.

**Hogar (🟡, nombre ❓).** Un planeta templado, verde y ocre, cálido, vivo. Contraste fuerte con Umbral. En una colina está el **Instituto**; abajo, **la aldea** de los Ool, que también se recorre (✅ Anthony, 2026-10-29).

**Cómo es Hogar (🟡, Fase 9).** El Instituto en la cima llana de una colina: la Sala de Fragmentos (una rotonda) y tres alas redondas —el aula de la Maestra, el taller de la Puerta pequeña y el despacho de la Directora— unidas por pasillos de aros y lona, con su plaza de entrada. Al este de la cima, el hangar del Albatros II. Abajo, en los prados del norte, la aldea con su árbol de musgo, y en la costa del este un embarcadero. Es el único mundo con aire espeso (Umbral tiene uno fino, Fase 11): cielo de amanecer, la estrella baja al este.

**Lenguaje de los Ool (🟡).** Redondeado, blando y hecho a mano: telas cosidas en gajos de colores sobre costillas de madera, puertas y ventanas redondeadas, musgo por todas partes y luz viva verde azulada (bulbos en tallos, frutos en los árboles). Nada de troncos ni chapa remachada. Junto a esto, los fragmentos de los Ausentes (arenisca y pizarra, cortados en curva perfecta) se ven ajenos.

**La Luna (🟡, nombre ❓).** Gris azulada, con cráteres. En ella apareció el fragmento más grande hasta ahora, clavado en el suelo y con un borde cortado en curva perfecta.

**La nave: el Albatros II (✅ nombre, Anthony 2026-10-29; 🟡 el resto).** La lanzadera del Instituto con la que el explorador hace su primer vuelo: pequeña, redondeada y amable, en los colores de Hogar (crema, ocre y verde), con una burbuja delantera para mirar, un relicario bajo la panza donde iba a traer el fragmento de la luna y un farol en el mástil. En el tablero lleva el **reloj doble**. Llega con él al sistema ajeno y en cada ciclo espera posada cerca de La Boca.

**Beats del prólogo (🟡, 10 a 15 minutos):**
1. **El Instituto al amanecer.** Se enseña a caminar, interactuar y leer una ficha cotidiana en la lengua de los Ausentes.
2. **La Sala de Fragmentos.** Vitrinas con fragmentos de pared y roca tallada. El jugador nota los bordes curvos y un símbolo recurrente. Se abre el Registro.
3. **El Taller de la Puerta Pequeña.** Una mesa con un anillo del tamaño de la mano y gente que habla de "pruebas menores". No se entiende aún, se siembra.
4. **La misión.** Quien dirige el Instituto le encarga su primer vuelo: ir a la Luna a estudiar el fragmento más grande.
5. **El vuelo.** Tutorial de la nave en un trayecto corto y seguro.
6. **La Luna.** El fragmento grande; el jugador se acerca; el espacio se pliega y se abre el gusano.

**Al volver (final):** el mismo Instituto en otro estado: antes de la prueba mayor, con la Sala de Fragmentos más vacía y la gente más joven.

🟡 **Cómo quedó (Fase 10, hito 10E).** Es el mismo Hogar con piezas sueltas que se quitan al cargar: las piedras de las vitrinas (`hogar_FragmentosVitrinas`; la vitrina de los bordes, que es una pista, se queda) y el fragmento de la Luna con sus esquirlas, su hilo de luz y su colisión (`luna_Fragmento`, `luna_Fragmento_Luz`, `COL_luna_Fragmento`). Los Ool, al 85 %. A esa hora la Luna está a unos 42° sobre el horizonte, hacia el suroeste del Instituto: desde dentro queda detrás del techo, y desde la plaza de entrada se ve bien.

🟡 **Cómo quedó (Fase 11G; ✅ la idea, Anthony 2026-11-03: rehacer Hogar con el cielo y el agua del Archivo, recompensar la curiosidad, el Motor con la Directora, una estructura única para la Maestra y el taller con el hangar; los Ool del color de la lámina, claros de jóvenes y más oscuros y apagados de mayores).** Hogar se hace por código (`procedural/hogar*.ts`): mar con olas como el del Archivo y cielo azul con nubes. En la cara de día, un continente con el Instituto en su colina (la Sala de Fragmentos, la Torre de Lectura de la Maestra —tambores apilados como libros, aula al aire libre y rampa en espiral hasta el balcón— y el taller de la Puerta pequeña con el nido abierto del Albatros II), la aldea, la ciudad con su mercado, los huertos con su noria, las terrazas, el embarcadero y, junto al mar, el **Motor**: la Puerta Mayor a medio hacer, con su andamio y su generador, donde espera la Directora. En la cara de noche, islas para quien se aleja: el pecio del primer Albatros, el hoyo de la primera piedra, la casa de la astrónoma y un prado de plantas de luz; y una campana hundida frente al embarcadero. Los Ool (`procedural/ool.ts`): musgo verde agua claro y muy luminoso en las crías, que se oscurece y se apaga con la edad; la Maestra y la astrónoma, las más oscuras.

---

## 10. El Archivo de las Puertas — el epílogo (🟡, Fase 10)

Ver `CONTEXTO_HISTORIA.md` §9 (epílogo) y los finales. Es un mundo aparte (`puertas`), **fuera de cualquier sistema
y fuera del tiempo**: sin ciclo, sin reloj doble y sin nave.

| Aspecto | Propuesta |
|---|---|
| **Cómo se llega** | Con el Contrapeso instalado, el agujero negro nace en el núcleo de la máquina de Cicatriz y se queda en 6 m. Solo se llega con la nave: a menos de 4 radios tira de ella hacia el centro (suave: se puede escapar), la marea se nota pero no mata y el tiempo del sitio cae (el reloj de Umbral se acelera en el tablero). Al cruzar el horizonte, fundido a **negro** (no cuenta ciclo) y se despierta en el Archivo |
| **Forma** | Planetoide oscuro y casi liso de 30 m, gravedad 0,5, cielo negro con estrellas |
| **Las bocas** | Anillos de pie por todo el planetoide y otros flotando en el cielo, cada uno con una vista encendida de su lado: cientos, dice la historia; aquí unas cuarenta dan la idea |
| **El muro de los rastros** | Un muro curvo con filas de signos de quienes llegaron antes, cada fila en otra escritura (puntos, rayas, cuñas, aros, ganchos, rombos); la última fila, lisa y más clara: en blanco, esperando |
| **Las bocas de casa** | En una terraza frente a la llegada, cuatro bocas en arco, cada una con su reloj tallado en una estela: la Sala de Fragmentos llena, el Instituto más joven, Hogar al anochecer y una tapada con una losa ("pronto"). Delante, un atril para leerlas |
| **El Banco** | Como el del Laboratorio, con los planos del Contrapeso enrollados encima: se cogen y se dejan |
| **Arte** | Unos 22.500 triángulos; cada vista de las bocas de casa tiene su propio brillo (el resto de luces del mundo, uno solo) |

🟡 **Propuesta de la Fase 11 (por código):** el suelo **enseña el tiempo**: desde las bocas de casa salen anillos de luz
que recorren el planetoide entero, despacio, uno tras otro, cruzados por meridianos tenues. Las bocas del cielo
**giran** alrededor en tres corros, y más allá, el **horizonte**, un aro de luz enorme. Senderos de losas con un hilo
de luz unen los sitios. Dos sitios nuevos: **lo que dejaron** otros viajeros (un casco de tres visores, una
herramienta, piedras apiladas, un cuaderno, velas) y **la primera Puerta** de los Ausentes, partida en dos, con su fecha
tallada. El Contrapeso también es ya por código, con el mismo aspecto.

---

## 11. Orden sugerido de exploración (🟡, no obligatorio)

1. **Umbral:** aprender el reloj doble y ver la primera pista.
2. **Archivo y Taller**, en cualquier orden: dónde y por qué.
3. **Observatorio:** ver la imagen desplazada.
4. **Cicatriz:** ver la maquinaria y escuchar la grabación del escéptico.
5. **Laboratorio Oculto:** con todo lo anterior.
6. **Cicatriz de nuevo:** instalar el Contrapeso con el reloj sincronizado.
7. **Epílogo:** dentro del agujero negro.

Un ciclo de 15 minutos permite visitar 2 o 3 mundos. Con 12 a 25 ciclos, el juego llega a 3 o 5 horas.

---

## 12. Preguntas abiertas de planetas

1. ❓ **Nombres definitivos** de los mundos, la estrella, la luna y el sistema de origen.
2. ✅ **Observatorio:** sí, como extra opcional (Anthony, 2026-10-25). El grafo de pistas no depende de él.
3. ❓ **Clima y fauna:** ¿hay seres vivos o plantas en los mundos, o están completamente vacíos?
4. ❓ **Cantidad de textos por mundo:** ¿unos 10 por mundo, o más?
5. ✅ **Prólogo:** el Instituto **y la aldea**, entera y visitable (Anthony, 2026-10-29).
6. ✅ **Cuerpos que se mueven:** los mundos orbitan **en rieles y en tiempo real** (Anthony, 2026-10-25): su posición es una fórmula del reloj del ciclo, sin simular gravedad entre ellos. Un periodo `0` en los datos deja un mundo quieto. Valores de partida 🟡 en `web/src/data/sistema.json`.
7. ✅ Laboratorio Oculto: sitio aparte, lente gravitacional y ocultado por el Consejo (resuelto).

---

## 13. Bitácora

- **2026-10-24 · Sesión 1.** Primer diseño de los mundos: Umbral, Archivo, Taller, Cicatriz, Observatorio, Laboratorio Oculto y el sistema de origen con los beats del prólogo.
- **2026-10-24 · Sesión 1 (laboratorio).** Se confirma que el laboratorio es un sitio aparte, escondido por lente gravitacional.
- **2026-10-25 · Sesión 2.** Anthony confirma el Observatorio como extra opcional y el Nudo como masa junto al Laboratorio Oculto (ver `CONTEXTO_PISTAS.md`).
- **2026-10-25 · Sesión 3.** Anthony decide que los mundos orbitan en rieles y en tiempo real (pregunta 6) y aprueba el plan de la Fase 5 (sistema solar y nave): nave en cabina que llega contigo en cada ciclo, choque letal a más de 30 m/s, la Brasa mortal y el reloj que se mezcla según la cercanía a cada masa.
- **2026-10-27 · Sesión 4.** Se propone el aspecto de la nave (🟡): la lanzadera del Instituto, con el reloj doble en el tablero. La primera versión copiaba la nave de Outer Wilds y se descartó.
- **2026-10-27 · Sesión 4 (Fase 6).** Se propone el lenguaje visual de los Ausentes (🟡 anillos y estratos) y Umbral se viste con sus siete lugares; el Mirador queda en el terminador, con la Brasa en el horizonte.
- **2026-10-28 · Sesión 5 (Fase 7).** Anthony decide que el Laboratorio esté **dentro del Nudo, con la gravedad invertida**. Se propone (🟡) el Nudo como garganta plegada: cáscara negra por fuera, cavidad de 21 m por dentro con la semilla en el centro, Puerta plegada para entrar y siete zonas del Laboratorio en la cara interior. El Nudo entra en `sistema.json` (órbita 2350 m) como cuerpo oculto.
- **2026-10-29 · Sesión 6 (Fase 9).** Anthony decide: la nave se llama **el Albatros II**; el prólogo abarca el Instituto **y la aldea**; el presupuesto de triángulos es orientativo, por encima están la calidad y que los modelos estén completos. Su pueblo, los Ool, está en `CONTEXTO_HISTORIA.md` §7.
- **2026-10-29 · Sesión 6 (Fase 9 cerrada).** Se construye el prólogo según §9, con propuestas (🟡) para reaccionar: la Luna con el fragmento clavado de canto (mordida esférica, fecha tallada y un hilo de luz en el corte); el gusano se abre al examinarlo (un anillo de luz sobre el fragmento, las estrellas que se doblan, la vista que se estira y un zumbido), fundido a blanco y despertar frente a La Boca, con el blanco que sigue hasta que el sistema ajeno está cargado.
- **2026-10-29 · Sesión 6 (Fase 10).** Anthony aprueba los pasos de la instalación del Contrapeso en la Sala del Motor de Cicatriz (ver `CONTEXTO_HISTORIA.md` §9) y el plan del epílogo: el Archivo de las Puertas y la vuelta a Hogar antes de la prueba mayor.
- **2026-10-30 · Fase 10 (hito 10C, 🟡).** La Sala del Motor en uso: el motor viejo es una pieza que sale del núcleo con la palanca, la cuna con sus dos ruedas recibe el Contrapeso y el pulso de las 9:00 lo encaja si los relojes coinciden. Instalado, el agujero negro nace pero se queda pequeño (6 m) y no se traga ningún mundo.
- **2026-10-30 · Fase 10 (hito 10D, 🟡).** Nueva §10: el Archivo de las Puertas como mundo propio fuera del tiempo (las bocas, el muro de los rastros con su última fila en blanco, las cuatro bocas de casa con su atril y el Banco con los planos) y cómo se llega cruzando el horizonte estable con la nave. Las secciones siguientes se renumeran.
- **2026-10-30 · Fase 10 (hito 10E, 🟡).** §9: cómo es el Hogar de antes (sin las piedras de las vitrinas ni el fragmento de la Luna, los Ool algo más pequeños) y desde dónde se ve la Luna en el final A.
- **2026-11-03 · Fase 11.** Anthony decide dejar Blender por ahora y modelar los mundos por código (Umbral, el primero) y que Umbral tenga atmósfera (✅). Se proponen (🟡) el aspecto del aire y seis lugares nuevos sin pistas en §3.
- **2026-11-03 · Fase 11 (rediseños).** Anthony decide que el Archivo sea un planeta de agua con una cúpula de vidrio para los archivos y una única entrada difícil que se aprende en otro planeta, y que el Taller sea un gigante gaseoso con islas de roca que giran, donde aterrizar cuesta y caer dentro mata (✅). Se proponen los detalles (🟡) en el plan de la Fase 11.
- **2026-11-03 · Fase 11 (respuestas).** Anthony decide (✅): la pista de la entrada del Archivo está en el Muelle de Envíos de Umbral; al bucear el aire es limitado; la Galería es un tubo de vidrio al nivel del agua que encierra el cañón; el Taller tiene cinco islas pequeñas y un secreto en el centro, al que se llega por un teletransportador que solo se activa en una situación concreta. Después elige que el Contrapeso siga en el Laboratorio y que en el centro esté lo que falta para instalarlo (✅ opción B; 🟡 las páginas de sincronización).
- **2026-11-03 · Fase 11E (🟡).** El Archivo se hace por código como planeta de agua: el mar al radio 70 con el fondo a 56, el tubo de vidrio de la Galería al nivel del agua, seis torres, la esclusa bajo la tercera torre como única entrada, bucear con 40 s de aire (muerte *ahogado*) y la hoja del Muelle de Umbral que la señala.
- **2026-11-03 · Fase 11E (cielo).** Anthony pide para el Archivo un cielo azul con nubes (✅). Se le da aire de mar (casi opaco, con noche), bruma azul y dos capas de nubes animadas en el shader (🟡 colores y alturas).
- **2026-11-03 · Fase 11E (agua).** Anthony pide un mar con oleaje, más claro y con más detalle, una lógica de agua reutilizable y quitar la raya del horizonte del cielo (✅). Se hace con olas compartidas entre física y shader, un material de océano nuevo, salpicaduras, ondas y burbujas y el fondo teñido con cáusticas; el cielo ya no corta en el horizonte (🟡 el aspecto).
- **2026-11-03 · Fase 11F (🟡).** El Taller se hace por código como gigante de gas: nubes en bandas de 80 m, cinco islas fijas sobre el gigante que gira, muerte `gas` bajo 74 m, puentes de luz pisables solo a las 7:00, el anillo de la Pista que se abre a las 7:00 con su reloj ajustado y la Sala del Centro con las páginas de sincronización. Cambia lo propuesto: las islas no orbitan por separado.
- **2026-11-03 · Fase 11G (🟡).** Hogar por código: continente de día con el Instituto, la aldea, la ciudad, el campo, el embarcadero y el Motor (la Directora pasa a esperar allí); islas de noche con secretos para los curiosos; mar y cielo como el Archivo; los Ool por código, de color y luz según la edad (✅).
- **2026-11-04 · Fase 11H.** Anthony pide rehacer Cicatriz hueca, con el micro agujero negro en el núcleo, anillo y mucho más detalle (✅ la idea, la máquina alrededor del centro, la gravedad doble, el anillo con fragmentos pisables y hechos nuevos en el grafo). Se hace por código (`web/src/worlds/procedural/cicatriz*.ts`); los lugares y textos nuevos son 🟡.
- **2026-11-06 · Fase 12.** Anthony pide para Umbral un aire más denso con nubes, que se note el día y la noche según el lado y la cara de noche helada (✅). Colores, alturas y dónde empieza el hielo, 🟡.
- **2026-11-06 · Hitos D y E de la llegada (🟡).** Tres edificios cerrados en Umbral con estilo del Observatorio y cobre oxidado; murales, proyección y panel a medio tallar con el aspecto de los Ausentes (✅ D2).
