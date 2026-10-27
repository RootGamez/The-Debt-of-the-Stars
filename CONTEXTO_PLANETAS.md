# CONTEXTO DE PLANETAS — Juego de bucle de tiempo

**Versión:** v0.4
**Última actualización:** 2026-10-25 · Sesión 3
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
- **Presupuesto de triángulos:** planeta 3 a 8 mil; props 50 a 500; nave 1 a 3 mil.
- **Color:** de 8 a 12 colores por mundo, con una sola textura de paleta o vertex colors.
- **Marcas en Blender:** prefijos `COL_` (colisión), `INT_` (interacción), `SPAWN_` (aparición) para colocar diálogos, triggers y puntos de inicio sin escribir coordenadas a mano.
- **Plantilla de un mundo:** 1 entrada memorable, de 3 a 5 puntos de interés, 1 evento cronometrado, 1 puzzle principal, de 2 a 3 textos clave.
- **Tiempo de exploración:** un mundo se explora en 5 a 10 minutos, menos de un ciclo, y se vuelve a visitar con preguntas nuevas.
- **Sonido:** cada mundo tiene su propio silencio. El silencio es parte del tono, no una carencia.

---

## 3. Umbral — la llegada

**Idea.** Un mundo en calma permanente, bañado en luz de atardecer, donde aparece el viajero. Es el único lugar amable del sistema y por eso duele más cuando se entiende lo que significó.

**Forma.** Radio 90 m, gravedad 1.0. Una gran planicie con un solo macizo de roca y casquetes de hielo azulado en los polos. Sin luna.

**Tiempo.** Reloj de referencia. Aquí se aprende a leer el **reloj doble** del HUD.

**Lugares clave:**
1. **La Boca.** Un anillo de piedra y metal en una meseta baja. El protagonista aparece frente a él en cada ciclo. No es un portal brillante: es un anillo apagado con una grieta de luz que se cierra a su espalda.
2. **El Muelle de Envíos.** Plataforma donde preparaban cargas. Aquí está el registro de envíos con un destino que no figura en ningún mapa (pista de *dónde*).
3. **El Mirador del Ocaso.** Un banco de piedra frente a la estrella, con dos tazas talladas. Alguien esperaba a alguien. Pura melancolía.
4. **El Aula.** Una sala con inscripciones infantiles que refuerzan lo aprendido de la lengua.
5. **Las Casas.** Seis casas con las mesas servidas, abandonadas sin señal de violencia.

**Evento del ciclo.** Hacia el minuto 5, anillos de luz se curvan en el cielo (primeras señales). Hacia el 10, La Boca vuelve a abrirse un instante: su destello se ve desde otros mundos.

**Puzzle principal.** *El cuaderno del turno.* Un Ausente anotaba la hora de Umbral y, al lado, la del Archivo. Las columnas se separan poco a poco. Enseña el desfase sin explicarlo.

**Textos clave:**
- La placa de inauguración de La Boca (orgullo y celebración; un detalle fuera de tono).
- El registro de envíos con el destino sin mapa.
- Una carta sin enviar, de quien esperaba en el mirador.

**Atmósfera.** Ámbar, ocre, violeta oscuro, azul hielo, arena. Sol grande y bajo, sombras largas, viento leve. Piano sparse.

**Blender.** Icosfera de unos 5 mil triángulos con ruido suave. El anillo, unos 500. Casas modulares, unos 150 cada una.

---

## 4. Archivo — la biblioteca

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
1. **La Sala del Motor.** Un enorme anillo con el núcleo abierto. El motor viejo está aquí y es donde se instala el Contrapeso.
2. **Las Mordidas.** Decenas de cortes esféricos. En una de ellas, una pared tallada con un símbolo partido por la mitad que encaja con el fragmento visto en el Instituto durante el prólogo (momento de cierre).
3. **El Puesto del Escéptico.** Una caseta con su última grabación, hecha con el reloj de un lugar que no es ningún mundo (pista de *dónde*).
4. **La Primera Puerta.** Ruina del primer anillo.
5. **El Borde.** Un acantilado desde donde se verá nacer el agujero negro.

**Evento del ciclo.** Hacia el minuto 9, un pulso: el cielo cambia de color, el suelo vibra y las mordidas parecen "respirar". Al 13:30 nace el agujero negro.

**Puzzle principal.** La **instalación del Contrapeso** (pasos ❓ en la historia) llegando con el reloj sincronizado y en el momento justo. Antes de eso, aprender a medir cuánto tiempo se puede estar cerca del Borde antes de que la marea impida moverse.

**Textos clave:**
- La grabación del escéptico, con su advertencia.
- La bitácora de la máquina, con picos de deuda cada vez que se usaba.
- La lista de mundos conectados: la red, con huecos para nombres de otros sistemas.

**Atmósfera.** Rojo óxido, negro, naranja incandescente, gris humo. Luz que se curva, sonidos graves, música tensa y triste.

**Blender.** Esfera con huecos esféricos hechos con booleanas. Es la pieza más lucida del juego y conviene hacerla con cuidado.

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

**Papel en el final del ciclo.** Es el último mundo en caer y sirve de **palco** para ver el sistema ser devorado y entender el fenómeno desde fuera.

---

## 8. Laboratorio Oculto — el secreto

> ✅ Decidido: el laboratorio está en un sitio aparte, escondido por lente gravitacional, y el Consejo ocultó el problema.

**Idea.** Un laboratorio pequeño, íntimo, abandonado con prisa, donde se hacía la investigación que nadie debía ver.

**Forma.** Radio 25 m, gravedad 0.3. Muy cerca de la masa, así que su tiempo corre unas **cinco veces más lento** que fuera.

**Lo que el jugador siente.** Al entrar, todo se mueve más despacio: la llama de una vela, un reloj de pared, el polvo. El HUD lo confirma. Quienes trabajaron aquí vivieron *meses* mientras fuera pasaban *años*.

**Lugares clave:**
1. **La Sala de Trabajo.** Una pizarra con una ecuación a medias.
2. **El Dormitorio compartido.** Dos camas, una sola con huellas de uso.
3. **El Banco del Contrapeso.** Donde estaba el artilugio, o lo que queda de él.
4. **El Escritorio de la Investigadora.** Sus últimas notas y la orden de silencio que recibió.

**Textos clave:** las últimas notas de la investigadora; las del escéptico; el documento que ordena callar (y quién lo firma ❓).

**Atmósfera.** Verde grisáceo clínico, blanco roto, luz de lámpara cálida. Un tictac lentísimo. Es el lugar más triste y humano del juego.

**Cómo se llega.** Solo con las pistas de todos los mundos: ver la imagen en el Observatorio, corregir su posición con lo aprendido en Archivo y Taller, y usar la grabación del escéptico de Cicatriz como confirmación.

---

## 9. Sistema de origen — el prólogo (✅ ubicación; 🟡 diseño)

> ✅ Decidido: el prólogo ocurre en un sitio donde se estudian los objetos de los Ausentes y donde ya saben leer su lengua.

**Hogar (🟡, nombre ❓).** Un planeta templado, verde y ocre, cálido, vivo. Contraste fuerte con Umbral. En una colina está el **Instituto**.

**La Luna (🟡, nombre ❓).** Gris azulada, con cráteres. En ella apareció el fragmento más grande hasta ahora, clavado en el suelo y con un borde cortado en curva perfecta.

**La nave (🟡, nombre ❓).** La lanzadera del Instituto con la que el explorador hace su primer vuelo: pequeña, redondeada y amable, en los colores de Hogar (crema, ocre y verde), con una burbuja delantera para mirar, un relicario bajo la panza donde iba a traer el fragmento de la luna y un farol en el mástil. En el tablero lleva el **reloj doble**. Llega con él al sistema ajeno y en cada ciclo espera posada cerca de La Boca.

**Beats del prólogo (🟡, 10 a 15 minutos):**
1. **El Instituto al amanecer.** Se enseña a caminar, interactuar y leer una ficha cotidiana en la lengua de los Ausentes.
2. **La Sala de Fragmentos.** Vitrinas con fragmentos de pared y roca tallada. El jugador nota los bordes curvos y un símbolo recurrente. Se abre el Registro.
3. **El Taller de la Puerta Pequeña.** Una mesa con un anillo del tamaño de la mano y gente que habla de "pruebas menores". No se entiende aún, se siembra.
4. **La misión.** Quien dirige el Instituto le encarga su primer vuelo: ir a la Luna a estudiar el fragmento más grande.
5. **El vuelo.** Tutorial de la nave en un trayecto corto y seguro.
6. **La Luna.** El fragmento grande; el jugador se acerca; el espacio se pliega y se abre el gusano.

**Al volver (final):** el mismo Instituto en otro estado: antes de la prueba mayor, con la Sala de Fragmentos más vacía y la gente más joven.

---

## 10. Orden sugerido de exploración (🟡, no obligatorio)

1. **Umbral:** aprender el reloj doble y ver la primera pista.
2. **Archivo y Taller**, en cualquier orden: dónde y por qué.
3. **Observatorio:** ver la imagen desplazada.
4. **Cicatriz:** ver la maquinaria y escuchar la grabación del escéptico.
5. **Laboratorio Oculto:** con todo lo anterior.
6. **Cicatriz de nuevo:** instalar el Contrapeso con el reloj sincronizado.
7. **Epílogo:** dentro del agujero negro.

Un ciclo de 15 minutos permite visitar 2 o 3 mundos. Con 12 a 25 ciclos, el juego llega a 3 o 5 horas.

---

## 11. Preguntas abiertas de planetas

1. ❓ **Nombres definitivos** de los mundos, la estrella, la luna y el sistema de origen.
2. ✅ **Observatorio:** sí, como extra opcional (Anthony, 2026-10-25). El grafo de pistas no depende de él.
3. ❓ **Clima y fauna:** ¿hay seres vivos o plantas en los mundos, o están completamente vacíos?
4. ❓ **Cantidad de textos por mundo:** ¿unos 10 por mundo, o más?
5. ❓ **Prólogo:** ¿una sola ubicación (el Instituto) o también la aldea?
6. ✅ **Cuerpos que se mueven:** los mundos orbitan **en rieles y en tiempo real** (Anthony, 2026-10-25): su posición es una fórmula del reloj del ciclo, sin simular gravedad entre ellos. Un periodo `0` en los datos deja un mundo quieto. Valores de partida 🟡 en `web/src/data/sistema.json`.
7. ✅ Laboratorio Oculto: sitio aparte, lente gravitacional y ocultado por el Consejo (resuelto).

---

## 12. Bitácora

- **2026-10-24 · Sesión 1.** Primer diseño de los mundos: Umbral, Archivo, Taller, Cicatriz, Observatorio, Laboratorio Oculto y el sistema de origen con los beats del prólogo.
- **2026-10-24 · Sesión 1 (laboratorio).** Se confirma que el laboratorio es un sitio aparte, escondido por lente gravitacional.
- **2026-10-25 · Sesión 2.** Anthony confirma el Observatorio como extra opcional y el Nudo como masa junto al Laboratorio Oculto (ver `CONTEXTO_PISTAS.md`).
- **2026-10-25 · Sesión 3.** Anthony decide que los mundos orbitan en rieles y en tiempo real (pregunta 6) y aprueba el plan de la Fase 5 (sistema solar y nave): nave en cabina que llega contigo en cada ciclo, choque letal a más de 30 m/s, la Brasa mortal y el reloj que se mezcla según la cercanía a cada masa.
- **2026-10-27 · Sesión 4.** Se propone el aspecto de la nave (🟡): la lanzadera del Instituto, con el reloj doble en el tablero. La primera versión copiaba la nave de Outer Wilds y se descartó.
