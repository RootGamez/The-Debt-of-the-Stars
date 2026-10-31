# CONTEXTO DE HISTORIA — Juego de bucle de tiempo

**Título provisional:** por definir (ver preguntas abiertas)
**Versión:** v1.11 (el HUD del Cuaderno vivo y la bitácora de mundos)
**Última actualización:** 2026-10-30 · HUD
**Documentos relacionados:** `CONTEXTO_PLANETAS.md` (diseño detallado de cada mundo) · `CONTEXTO_PISTAS.md` (grafo de pistas: qué se aprende, dónde y en qué orden)

> Documento vivo. Es la fuente de verdad de la historia del juego: léelo entero antes de continuar el trabajo en cualquier sesión (con Claude o sin él) y actualízalo al final.
>
> **Leyenda:** ✅ decidido por Anthony · 🟡 propuesta de Claude, por confirmar · ❓ abierto, sin resolver

---

## 1. Pitch (🟡 redactado sobre lo decidido)

Un joven explorador sale en su primer vuelo oficial: un viaje corto hasta la luna de su sistema, tranquilo y conocido. En su mundo llevan años apareciendo ruinas y objetos de una civilización desconocida, y un instituto ha aprendido a leer su lengua. A mitad de camino se abre un agujero de gusano y lo escupe en el lugar de donde vienen todos esos objetos: un sistema sin vida, quince minutos antes de que un agujero negro se lo trague todo. Muere, y despierta otra vez al comienzo de esos quince minutos.

Su único camino a casa pasa por las ruinas de esa civilización extinta, que ya investigaba cómo detener este mismo fenómeno. Lo que descubre es que el agujero negro no pertenece a este sistema: es algo que se repite en otros, y su propio pueblo acaba de empezar a construir lo mismo que condenó a quienes vivieron aquí.

**Idea central: aprender de los muertos para no ser el siguiente.**

---

## 2. Pilares del juego

1. ✅ **Tono melancólico y contemplativo.** Ruinas, silencio, ausencia, despedidas. Ritmo lento.
2. ✅ **La relatividad real, simplificada, es el lenguaje de los puzzles.** El jugador nunca calcula: observa, compara y deduce. Cada efecto se *ve* antes de explicarse.
3. ✅ **Historia original.** Inspirado en el espíritu de Outer Wilds e Interstellar, no en su contenido.
4. 🟡 **Se avanza por conocimiento, no por objetos ni habilidades.** Lo único que persiste entre ciclos es lo que el jugador ha aprendido (el Registro).
5. 🟡 **Leer es el verbo principal.** El prólogo enseña a leer la lengua de los Ausentes, y el resto del juego consiste en seguir leyendo.
6. 🟡 **Alcance:** unas pocas horas (3 a 5), un prólogo en casa, 4 planetas pequeños en el sistema ajeno y el interior del agujero negro como epílogo.

---

## 3. Decisiones confirmadas (✅)

| Tema | Decisión |
|---|---|
| Tono | Melancólico y contemplativo |
| Protagonista | Un **explorador joven** de un sistema tranquilo. Es **él en específico**, no toda su civilización, quien llega al sistema ajeno |
| Inicio | Su **primer vuelo**: ir a su luna. En el trayecto **se abre un agujero de gusano** que lo lleva a otro sistema, donde empieza el bucle |
| Motivación | Quiere **volver a casa** |
| El sistema ajeno | Hay **ruinas de una civilización extinta** (desapareció). Él debe **dominar sus descubrimientos**. Quedan **15 minutos** para que todo acabe |
| Fin de cada ciclo | Se forma un **agujero negro** que absorbe todo el sistema. No lo provoca el Sol |
| Control del fenómeno | Al final debe **dominar el agujero negro con artilugios de esa civilización** |
| Naturaleza del fenómeno | El agujero negro es un **fenómeno que afecta a varios sistemas**, no solo a este |
| Causa | La civilización extinta hizo **algo específico** que lo ocasionó, pero **ya investigaba cómo solucionarlo** |
| Giro hacia casa | En el planeta del protagonista **ya están empezando a hacer o usar algo similar**. Al volver, él lo sabe y puede **evitarlo** |
| Objetos de los Ausentes en casa | En el planeta del protagonista **han aparecido ruinas y objetos en los últimos años**, provenientes de la civilización extinta. Posible origen: **micro agujeros de gusano** que empezaron a aparecer cuando los extintos descubrieron lo que causa los agujeros negros |
| Qué son las ruinas | Son **fragmentos**: pedazos de pared o roca tallada, **incompletos**. Al ser **aleatorios**, los primeros que aparecieron pudieron llevarse trozos de estructuras y cosas cualesquiera, no piezas enteras |
| Qué sabe el Instituto | **No saben si la civilización está viva o muerta, pero esperan que esté viva** |
| Prólogo | Ocurre en un **sitio donde se estudian esos objetos** y donde **saben leer el lenguaje**, para que el jugador pueda **leer las investigaciones** de la civilización extinta |
| Mecanismo del fenómeno | **Desfase temporal acumulado + resonancia entre Puertas.** Cada Puerta une dos relojes que se separan con cada uso; al pasar un límite la Puerta se vuelve una máquina del tiempo y colapsa en un agujero negro. Además, las Puertas se acoplan entre sí como péndulos conectados: cuantas más hay, más cerca están de colapsar todas a la vez |
| El Contrapeso | Es un **artilugio que se debe reemplazar** (instalar) **en lugar del motor de la maquinaria que hace los agujeros**. **No es fácil de encontrar**: estaba en el laboratorio donde los Ausentes investigaban esto |
| El laboratorio | Era **ultra secreto**. Las **pistas dejadas en cada planeta** deben ayudar al jugador a llegar a él y a **entender todo el contexto de manera sutil** |
| Cómo murieron los Ausentes | **La Gran Partida:** murieron huyendo por las Puertas durante la evacuación. El destino de los tres que se quedaron se decide más adelante |
| Laboratorio Oculto | Está en **un sitio aparte** (quinto lugar, fuera de los cuatro mundos), **escondido por lente gravitacional**: lo que se ve en el cielo es una imagen desplazada y hay que deducir su posición real. Lo ocultó **el Consejo** |
| El Nudo | La **garganta de la primera Puerta**, que se cerró mal: deuda comprimida en un punto oscuro, diminuto y pesadísimo. Es la **semilla del agujero negro** de las 13:30. El Laboratorio orbita a su lado: por eso su tiempo va 5 veces más lento y su imagen llega desplazada (ver `CONTEXTO_PISTAS.md` §3) |
| La Cámara | Está **en el Laboratorio Oculto**, con las notas y la culpa de quien la construyó |
| Instalar el Contrapeso | Solo durante el **pulso de las 9:00**, cuando el núcleo de la máquina de Cicatriz se abre |
| Finales | Mínimo **dos**: uno en que logra evitarlo y otro en que **no puede evitarlo** |
| Epílogo | Entrar al agujero negro: mucha tensión y un descubrimiento impactante y desconcertante (tono: Interstellar, el Ojo del Universo de Outer Wilds) |
| Relatividad | Parte de las soluciones requiere entender la relatividad de Einstein y otras teorías reales, simplificadas |
| Formato técnico | 3D low poly en el navegador (Three.js + TypeScript), modelado en Blender |

---

## 4. La verdad oculta (🟡 propuesta v1.1)

Esto es lo que *realmente* pasó. El jugador lo descubre poco a poco, en desorden, leyendo y hablando. Si algo del juego contradice esto, hay que cambiar el juego o este documento.

### Los nombres provisionales

- **Los Ausentes:** la civilización extinta (nombre ❓).
- **Las Puertas:** su tecnología. Generan agujeros de gusano para viajar entre sistemas.
- **La deuda:** el desfase temporal acumulado de una Puerta. Cada uso separa un poco más los relojes de sus dos bocas, y eso es lo que produce el agujero negro cuando pasa un límite.
- **El Límite:** el desfase máximo que una Puerta soporta antes de colapsar. Baja a medida que la red de Puertas crece.
- **El Contrapeso:** el dispositivo con el que investigaban cómo corregir el problema. Compensa el desfase entre los relojes ("paga" la deuda) y es la clave para dominar el agujero negro. Es un **motor de reemplazo**: hay que instalarlo en lugar del motor de la maquinaria que abre las Puertas y genera los agujeros negros.
- **El Laboratorio Oculto:** el centro secreto donde los Ausentes investigaban y guardaron el Contrapeso. Es lo más difícil de encontrar del juego (ver sección 6).
- **La Cámara:** un aparato de los Ausentes que repite los últimos 15 minutos. Es la causa del bucle.
- **El Instituto:** el centro de estudio del protagonista donde se analizan los objetos de los Ausentes (nombre ❓).
- **Las filtraciones:** los micro agujeros de gusano que traen objetos y ruinas de los Ausentes a otros sistemas.

### La prueba y el mecanismo del fenómeno (✅ B + C)

**✅ Decidido por Anthony:** el mecanismo combina las opciones B y C (ver candidatos más abajo). B explica qué le pasa a *cada* Puerta; C explica cómo se contagia la *red* y por qué el fenómeno afecta a varios sistemas.

**Reglas del juego (🟡 derivadas de esa decisión):**

1. Una Puerta son dos bocas unidas por una garganta. Cada boca tiene su propio reloj.
2. Cada uso deja un desfase pequeño y permanente entre los dos relojes: **la deuda**. Crece más rápido si una boca está cerca de una masa grande o se mueve muy deprisa (relatividad).
3. Si la deuda supera **el Límite**, la Puerta permitiría viajar al pasado. El universo lo impide: la energía se acumula sin control en la garganta y esta colapsa en un agujero negro.
4. Las Puertas **se acoplan** entre sí (por eso "se buscan"): sus relojes tienden a sincronizarse. Con pocas Puertas eso estabiliza; con muchas, la deuda de una contagia a las demás y **baja el Límite de toda la red**. Cuando una cae, arrastra a las demás: un solo fenómeno en muchos sistemas.
5. **El Contrapeso** es un motor de reemplazo: compensa el desfase y "paga" la deuda. Se instala **en lugar del motor** de la maquinaria que abre las Puertas (la que genera el agujero negro). Bien instalado, mantiene una Puerta bajo el Límite y, a gran escala, estabiliza el agujero negro el tiempo suficiente para cruzarlo (epílogo). *(🟡 Su reloj interno debe coincidir con el de la máquina en el instante del cambio; transportarlo entre mundos con tiempos distintos lo desincroniza, así que la ruta y el momento importan.)*
6. Cuando la deuda de la red crece, las gargantas "sangran" **micro gusanos** hacia sistemas acoplados. Los objetos llegan de épocas distintas porque cada boca tiene su propio reloj. Esas son las filtraciones.
7. El bucle (la Cámara) es una máquina del tiempo controlada que aprovecha el instante del colapso para sostener los últimos 15 minutos. Falta afinarlo (❓).

**Consecuencias de lo ya decidido (🟡):**

- **Conocimiento a trozos.** Como los fragmentos llegan al azar, el Instituto tiene piezas sueltas: sabe *abrir* una Puerta, pero le faltan los fragmentos que explican cómo *mantenerla estable*. Falta justo lo más importante, y encaja con que la parte de "la deuda" y el Contrapeso sea ilegible o incompleta en el prólogo.
- **Bordes curvos.** Los micro gusanos "muerden" trozos del espacio que rodea la boca de los Ausentes. Los fragmentos pueden tener **bordes cortados en curva perfecta**, como esferas: la pista visual de que no son ruinas rotas sino cortes de espacio. El Instituto lo ha notado sin entenderlo.
- **La prueba es un intento de contacto.** Como esperan que la civilización esté viva, abren una Puerta pequeña **para saludar**. Nadie quiere hacer daño. Eso humaniza el error: el protagonista no lucha contra villanos, sino contra una buena intención.

**Candidatos para el mecanismo:**

- **A. Préstamo de energía (descartado).** Abrir una Puerta pide "prestada" energía al espacio, que debe devolverse al cerrarla bien. Si no se devuelve, la deuda crece y, al superar un límite, el pasaje se estrangula y colapsa en un agujero negro (los gusanos perturbados se "pellizcan" en los modelos teóricos reales). Simple de explicar, pero la relatividad entra menos en los puzzles.
- **B. Desfase temporal acumulado (✅ elegido).** Una Puerta une dos relojes y cada uso los separa un poco más. Cuando el desfase supera un límite, la Puerta se vuelve una máquina del tiempo y el universo "responde": la energía se acumula sin control en la garganta y colapsa en un agujero negro (idea real: la *conjetura de protección cronológica* de Hawking). Los Ausentes lo llamaron *deuda* porque era una deuda *de tiempo*. Encaja con el reloj doble del HUD, con los objetos de épocas distintas, con el Contrapeso como estabilizador de relojes y con el puzzle final de elegir boca de salida.
- **C. Resonancia entre Puertas (✅ elegido, para la red).** Las Puertas "se buscan" y se acoplan como péndulos conectados: cuantas más hay, más se sincronizan, hasta que entran en resonancia y colapsan a la vez. Explica de forma natural por qué el fenómeno afecta a varios sistemas. Se puede combinar con B (B para cada Puerta, C para la red).

**Qué sería "la prueba" bajo la opción B (🟡):** una Puerta mínima, abierta unos segundos, de diseño reconstruido a partir de fragmentos y **sin el estabilizador que nunca llegó**. Cada prueba deja un desfase pequeño: las ya hechas explican las filtraciones y el gusano que se llevó al protagonista. La **prueba mayor**, prevista poco después del inicio del juego, cruzaría el límite. Volver antes de esa prueba mayor es el objetivo del final A.

### Cronología real

1. **Las Puertas.** Los Ausentes inventaron las Puertas y viajaron entre sistemas durante generaciones. Cada Puerta une dos relojes, uno en cada boca.
2. **La deuda.** Cada uso separa un poco más los dos relojes de una Puerta. Ese desfase acumulado es la *deuda*. Además, las Puertas se acoplan entre sí: la deuda de una contagia a las demás y rebaja el Límite de toda la red. Cuando una supera su Límite, se vuelve una máquina del tiempo, el universo responde y su garganta colapsa en un agujero negro que arrastra a las demás. Es el mismo fenómeno en todos lados, no varios agujeros negros distintos. Por eso afecta a muchos sistemas.
3. **El descubrimiento tardío.** Los Ausentes lo entendieron cuando ya era demasiado tarde. Construyeron el **Contrapeso** para devolver la deuda o controlar el colapso. No lo terminaron a tiempo, o no lo probaron.
4. **El bucle.** Como último recurso, activaron **la Cámara**: usa la dilatación temporal extrema del instante del colapso para repetir los últimos 15 minutos y darle tiempo a sus investigadores. Funcionó... pero ellos desaparecieron (ver abajo) y la Cámara siguió sola, repitiendo el mismo tramo para siempre.
5. **Las filtraciones.** Cuando los Ausentes descubrieron la deuda, la propia deuda empezó a "gotear" hacia otros sistemas: pequeñas bocas de gusano, inestables, que traen objetos y ruinas de allá. Son los primeros síntomas del mismo fenómeno. Como las bocas están desfasadas en el tiempo, los objetos llegan de **épocas distintas** de los Ausentes, y por eso sus fechas no cuadran entre sí.
6. **El Instituto y la prueba.** En el mundo del protagonista, el Instituto estudió esos objetos durante años, aprendió a leer su lengua y, a partir de ellos, reconstruyó una versión rudimentaria de una Puerta. Hizo una **prueba pequeña** con ella. *Es "algo similar" a lo que condenó a los Ausentes, y nadie lo sabe todavía.*
7. **La llamada.** Las Puertas "se buscan": una boca abierta atrae a otra. La prueba del Instituto abrió un hilo hacia la boca de los Ausentes, y justo cuando el protagonista volaba hacia la luna (donde apareció la ruina más reciente) el gusano se abrió a su paso y se lo llevó. *No es una víctima del azar: es consecuencia de las filtraciones (natural) y de la prueba de su propio mundo (humana).*
8. **El desfase temporal.** Las bocas de un agujero de gusano pueden quedar desfasadas en el tiempo si una está cerca de una masa enorme (ver relatividad). Eso permite que, al volver, el protagonista llegue a casa *antes* de lo que parece, cuando su pueblo apenas está empezando.

### Cómo murieron los Ausentes (✅ La Gran Partida; los tres que se quedaron, para más adelante)

**Problema de coherencia (detectado por Anthony):** el sistema está atrapado en sus últimos 15 minutos y el mundo está intacto, sin cuerpos ni señales de violencia (las mesas siguen servidas). Cualquier Ausente que se hubiera quedado aquí estaría dentro del bucle. Por lo tanto, **no murieron en este sistema**.

**✅ Decidido, "La Gran Partida":** los Ausentes murieron *en otra parte*, huyendo por las mismas Puertas que los condenaban.

1. El Consejo ocultó el peligro (ver pregunta 18).
2. Las primeras Puertas lejanas colapsaron y se encubrieron como accidentes.
3. Al bajar el Límite de la red, las caídas se encadenaron y el silencio ya no fue posible.
4. Se ordenó evacuar este sistema por las Puertas restantes, con minutos de aviso. Por eso las mesas siguen servidas.
5. Cada uso sumó deuda: la evacuación aceleró la cascada y las Puertas colapsaron con la gente dentro o en el destino.
6. Nadie sobrevivió: era una sola red y un solo fenómeno.

**Qué aporta:** explica una civilización extinta en un mundo intacto y sin violencia; la salida era la trampa (ironía central); da una respuesta devastadora a la esperanza del Instituto de que estén vivos; y en el epílogo, el Archivo de las Puertas muestra cada boca por la que se fueron.

**Los que se quedaron (✅ opción 4, Anthony 2026-10-29):** solo tres personas: la investigadora, el escéptico y quien construyó la Cámara. Su destino podía ser:

- **Opción 1, congelados en el horizonte.** Desde fuera se los ve detenidos en el borde del agujero negro. Dentro, para ellos, el tiempo sigue.
- **Opción 3, ecos en la Cámara.** Cada uno vive un instante distinto de los 15 minutos y dejó mensajes en distintos puntos del ciclo.
- **Opción 4, murieron en el laboratorio.** Trabajaron en tiempo lento hasta el final. Es el desenlace más íntimo y más barato de producir.

*(La opción 2 original, "se dispersaron por las Puertas", pasa a ser la propuesta principal para el pueblo.)*

✅ **Decidido (Anthony, 2026-10-29): la opción 4.** La investigadora y el escéptico trabajaron en el tiempo lento del Laboratorio hasta el final (la cama usada, el reloj de mesa casi quieto) y quien construyó la Cámara se quedó con ellos. 🟡 En el Archivo de las Puertas sus nombres no están: no llegaron a cruzar.

### Finales (🟡)

**Final A, evitarlo.**
Condición: el jugador ha dominado el agujero negro con el Contrapeso y ha entendido la verdad completa (Registro completo). Elige correctamente *cuándo* volver (ver epílogo) y llega a casa antes de la prueba. Muestra pruebas y detiene el experimento. Coste (agridulce): quienes le creen no recuerdan lo que él vivió, porque ese viaje nunca ocurrió para ellos. Los Ausentes siguen extintos; solo salva a los suyos.

**Final B, no poder evitarlo** (✅ la profecía autocumplida, Anthony 2026-10-29; los otros dos motivos quedan como referencia):
1. *Llega tarde.* El desfase lo deja después de la prueba y la deuda ya está en marcha.
2. *Nadie le cree.* Sin pruebas ni tiempo, lo toman por loco o por mentiroso. Su propio Instituto lleva años confiando en estos objetos.
3. *Profecía autocumplida (la más original).* Vuelve con algo de los Ausentes "para ayudar", por ejemplo los planos del Contrapeso o un componente, y eso resulta ser **la pieza que le faltaba al Instituto** para hacer funcionar su Puerta de verdad. La cura era la enfermedad. Ahora tiene un sustento fuerte: el Instituto ya está reconstruyendo la tecnología a partir de objetos de los Ausentes.

Qué decide el final (✅ **ambos**, Anthony 2026-10-29): la boca que se elige en el Archivo de las Puertas (entender K7 y K8) **y** una decisión última, llevar o no los planos del Contrapeso. Llevarlos es el final B. 🟡 Una boca equivocada no es un final: deja al explorador después de la prueba mayor ("llega tarde", una escena corta) o lo devuelve al Archivo.

🟡 **Cómo quedó (Fase 10, hito 10E).** Se vuelve a casa por la boca elegida. Con A y B es el Hogar de antes: la Sala de Fragmentos más vacía, el fragmento de la Luna aún no ha llegado y los Ool se ven algo más jóvenes. Hablar con la Directora cierra el viaje con una **tarjeta de final** (título, texto y un botón; los textos son de Anthony, hoy `[texto pendiente]`). En el final A, antes de la tarjeta, un corte a negro lleva a la plaza del Instituto y la vista sube hacia la Luna, limpia. En el B, la tarjeta llega al momento (le das los planos). Llegando tarde se ve el Hogar de siempre; su tarjeta lleva de vuelta al Archivo para elegir otra boca. A y B quedan guardados como vistos; "Volver a jugar" sigue la partida en Umbral con el Registro completo.

### Licencias narrativas que hay que vigilar

- Los agujeros de gusano atravesables son teóricos: necesitarían materia exótica. Se asumen como parte del universo del juego.
- Un agujero negro no "succiona" más que cualquier masa igual. Para que se trague un sistema debe tener masa grande o crecer devorando planetas. Hay que fijar la explicación (❓).
- La idea de que una boca de gusano desfasada en el tiempo permite viajar al pasado viene de modelos teóricos reales (Morris, Thorne y Yurtsever, 1988). Se usa como regla del juego, no como hecho comprobado.
- La *conjetura de protección cronológica* (Hawking, 1992) sugiere que el universo impide las máquinas del tiempo. Aquí se dramatiza como un colapso en agujero negro. Es una conjetura, no un hecho comprobado.

---

## 5. Relatividad: del concepto al puzzle

**Regla de diseño:** el juego nunca pide una fórmula. Pide comparar dos relojes o dos observaciones y sacar la conclusión.

| Concepto real | Cómo se ve en el juego | Ejemplo de puzzle o descubrimiento |
|---|---|---|
| Agujero de gusano / puente de Einstein-Rosen | Las Puertas de los Ausentes y las filtraciones en casa | Entender que las Puertas se buscan y cómo se alinean |
| Desfase temporal entre las bocas | Cada boca marca un tiempo distinto; los objetos que llegan a casa son de épocas distintas | **Puzzle final:** elegir por cuál boca salir para llegar a casa en el momento correcto |
| Dilatación gravitacional del tiempo | El HUD muestra dos relojes (el tuyo y el del punto de llegada). Se separan cerca de masas densas | Registros en el Archivo que "no cuadran" en fechas hasta que se entiende la diferencia de tiempo |
| Dilatación por velocidad / paradoja de los gemelos | Un laboratorio en órbita rapidísima | Comparar cuánto "vivieron" dos grabaciones del mismo suceso |
| Velocidad finita de la luz / simultaneidad | Desde el observatorio lo que ves ya ocurrió | Deducir el orden real de dos eventos sabiendo cuánto tarda en llegar la luz |
| Lente gravitacional | Cerca de la masa, las estrellas se deforman y aparecen cosas ocultas | Localizar un objeto que no se ve directamente |
| Fuerzas de marea ("espaguetización") | Acercarte a la masa estira la nave | Límites de vuelo; tensión en el epílogo |
| Horizonte visto desde fuera | Lo que cae se frena, enrojece y se congela | Ver a los Ausentes (opción 1) detenidos en el borde |
| Protección cronológica (conjetura) | Cuando los relojes de una Puerta se separan demasiado, la Puerta colapsa | Entender la deuda y el Límite, y cómo pagarla con el Contrapeso |
| Acoplamiento entre osciladores | Las Puertas sincronizan sus relojes entre sí, para bien y para mal | Deducir por qué la deuda de una Puerta lejana afecta a las demás |
| Masa crítica | Toda masa tiene un tamaño por debajo del cual colapsa | Entender por qué el agujero negro, una vez formado, sigue creciendo (ver pregunta 8) |

---

## 6. Mundos (🟡 nombres provisionales)

### Prólogo: el Instituto (10 a 15 minutos)

**✅ Decidido:** el prólogo transcurre en un lugar donde se estudian los objetos y ruinas de los Ausentes que llevan años apareciendo, y donde ya saben leer su lengua. Así el protagonista y el jugador pueden leer sus investigaciones desde el principio.

**🟡 Propuesta de diseño:**

- **Para qué sirve:** enseñar a leer y usar el Registro con material seguro, crear apego a las personas y lugares que luego se quiere recuperar, enseñar el control de la nave en un trayecto corto, y **sembrar** el experimento (la prueba con una "puerta pequeña").
- **Qué saben leer:** la vida cotidiana de los Ausentes y buena parte de lo técnico. **No** entienden la sección sobre "la deuda" ni el Contrapeso: está incompleta o su significado se pierde. El vocabulario se completa en el sistema ajeno.
- **Lecturas con doble sentido:** algunos fragmentos del prólogo parecen curiosidades científicas. Al llegar al final del juego se releen con otro significado, y el jugador entiende lo que estaba leyendo sin saberlo.
- **Objetos que vuelven:** una pieza que el jugador ve en una vitrina del Instituto aparece más tarde, entera y en su sitio original, en el Archivo. Es un momento de reconocimiento cargado de melancolía.
- **Por qué el primer vuelo va a la luna:** la ruina más reciente apareció allí, y mandan al joven explorador a inspeccionarla. Es su primer vuelo oficial y el lugar donde se abre el gusano.
- **Cómo se siente:** el protagonista es un alumno que sabe leer. Cuando llega al sistema ajeno, ese conocimiento básico es lo único que tiene, y le toca ir más allá que sus maestros.

### El sistema ajeno: 4 planetas pequeños

> Diseño detallado de cada mundo (forma, tiempo, lugares, eventos, puzzles, textos y arte) en `CONTEXTO_PLANETAS.md`.

| Mundo | Papel narrativo | Efecto de relatividad | Ambiente |
|---|---|---|---|
| **Umbral** | Planeta de llegada. Aquí aparece el protagonista en cada ciclo. Ruinas de la primera Puerta | Punto de referencia del tiempo | Calmo, luz ámbar, melancólico |
| **Archivo** | Biblioteca de los Ausentes: sus registros y su historia | Masa densa: tiempo más lento | Frío, ordenado, silencioso |
| **Taller** | Donde construyeron el Contrapeso | Órbita rapidísima: dilatación por velocidad | Luminoso, ventoso, inquietantemente vivo |
| **Cicatriz** | Origen del colapso. Es donde estuvo la primera Puerta y donde está la maquinaria; mundo interior, junto al Taller | Lente, mareas, dilatación extrema | Hostil, rojizo, ruinas industriales |
| *Observatorio* (opcional) | Retraso de la luz y simultaneidad | Luz finita | Vasto, nítido, solitario |
| **Laboratorio Oculto** | Centro secreto de investigación; guarda el Contrapeso | Lente gravitacional / ocultación | Austero, abandonado con prisa, íntimo |

### El Laboratorio Oculto (✅ existe y era secreto; 🟡 el resto)

**✅ Decidido:** era ultra secreto, guardaba el Contrapeso y es difícil de encontrar. Las pistas de cada planeta llevan hasta él.

**🟡 Propuesta:**

- **Por qué era secreto.** Quienes gobernaban a los Ausentes (el Consejo ✅) sabían que las Puertas eran peligrosas, pero eran su economía y su orgullo. Ocultaron el problema para evitar el pánico y seguir usándolas. La investigadora y el escéptico trabajaron en secreto. *El silencio los mató.* La tragedia no fue un accidente: fue una decisión de callar. Encaja con el tono melancólico y con la idea de aprender de los muertos.
- **Dónde está.** ✅ Un pequeño cuerpo aparte (asteroide o estación), no uno de los cuatro mundos. Escondido por la propia física:
  - *Opción 1, por lente gravitacional (✅ elegida).* Lo que se ve en el cielo es solo una imagen desplazada del laboratorio. Su posición real está en otro lugar y hay que deducirla con las pistas, no con los ojos.
  - *Opción 2, por el tiempo.* Solo queda a la vista en un momento concreto del ciclo, cuando una alineación lo revela. Puede reforzar a la opción 1.
  - *Opción 3, bajo tierra.* Entrada sellada en uno de los planetas, con cerradura que depende de relojes.
- **Qué hay dentro.** El Contrapeso (o lo que queda), las últimas notas de la investigadora y del escéptico, y la verdad completa de la decisión de callar. Es el clímax de lectura antes del epílogo.
- **Reglas de diseño.** Es lo último que se encuentra, y encontrarlo debe sentirse como resolver un misterio, no como ver una marca en un mapa. Ninguna pista dice "aquí está": cada una solo estrecha el espacio.

### Cómo descubrir sin copiar a Outer Wilds (🟡 idea)

Evitar el recurso de texto en espiral con traductor. Propuesta: los Ausentes dejaron **grabaciones de voz y notas que se reproducen al ritmo del reloj local**. Si están en un planeta de tiempo lento, suenan lentas; en uno rápido, aceleradas. Para entender un mensaje hay que saber en qué reloj fue grabado. Es relatividad hecha mecánica de lectura y barata de producir (texto + audio sencillo). Y se apoya en lo que se aprendió en el prólogo.

---

## 7. Personajes (🟡 semillas)

- **El protagonista.** Explorador joven en su primer vuelo, alumno del Instituto, sabe leer la lengua de los Ausentes. Nombre ❓, género ❓, edad ❓. Curioso, algo ingenuo. Su arco: de querer volver a casa a entender lo que hay que hacer por ella.
- ✅ **Su pueblo: los Ool** (Anthony, 2026-10-29). Pequeños, redondeados, de aspecto tierno y extraterrestre, sin rasgos de animales de la Tierra: no tienen hocico, ni orejas, ni pelo común. Su cuerpo es de fibras como musgo, con puntos de bioluminiscencia; tienen dos ojos grandes y oscuros, manos y pies de cuatro dedos y **filamentos en la cabeza que se iluminan con las emociones o al leer**. El joven explorador viaja con un traje acolchado de tela pesada, remendado, "hecho con amor", y casco de burbuja. **La Maestra del Instituto** es una Ool mayor, con gafas redondas, bufanda, abrigo con dibujos, un libro y una bolsa. ✅ **La Maestra y la Directora son personas distintas.** La nave del Instituto es **el Albatros II**. (Lámina de referencia: "Propuesta 4: El Albatros II".)
- **En el Instituto (prólogo y final).** 2 o 3 personajes cercanos (maestra o maestro, amistad, familia ❓) y **la persona que dirige el experimento** (a quien debe convencer en el final A, y que quizá sea quien más lo quiere).
- **Las voces de los Ausentes.** Tres figuras a través de sus registros: la **investigadora** que persiguió la cura hasta el final, el **escéptico** que advirtió y no fue escuchado, y quien **construyó la Cámara**, con su culpa. Son los únicos "personajes" que el jugador llega a conocer de verdad, a través de lo que dejaron.

> Nota: en el bucle nadie más recuerda nada. Si hay ecos de los Ausentes (opción 3), son los únicos que "responden".

---

## 8. El bucle (🟡)

- **Causa:** la Cámara de los Ausentes, que sigue activa. Es a la vez natural (el colapso es un fenómeno físico) y deliberado (la Cámara fue una decisión de los Ausentes). Cuadra con la decisión original de combinar ambos.
- **Duración:** 15 minutos en el reloj de Umbral (ajustable entre 10 y 15 al probar).
- ✅ **Qué reloj vive el jugador (modo B, Anthony 2026-10-25):** el tiempo real es el tiempo propio del jugador; su reloj siempre le parece normal. Lo que cambia es el tiempo de fuera: en un mundo lento, el reloj de Umbral (y el colapso) avanza más rápido. Un minuto real en el Laboratorio Oculto (ritmo 0,20) son cinco minutos de ciclo, así que entrar allí cuesta casi todo el ciclo. Por eso el ciclo dura 15 minutos reales solo si se pasa entero en Umbral. 🟡 El "todo va más lento" del Laboratorio se mantiene como estilo visual (llama, polvo), aunque físicamente no sea lo que se vería.
- 🟡 **Cómo se muere (Fase 3):** fin del ciclo, absorción del mundo en el que se está (tabla de `CONTEXTO_PLANETAS.md`) y caídas a más de 20 m/s. Al morir: fundido breve a blanco cálido y despertar frente a La Boca, sin texto.
- **Qué persiste:** solo el conocimiento (el Registro).
- **Qué se reinicia:** el mundo y la posición del jugador, que reaparece en Umbral.
- **Boceto de cronología** (❓ hasta probarlo):
  - 0:00 · Aparece en Umbral.
  - ~5:00 · Primeras señales: la luz se curva, los relojes se desfasan.
  - ~9:00 · Pulso de Cicatriz; el cielo cambia de color.
  - ~13:30 · Nace el agujero negro.
  - 13:30 a 15:00 · Absorción en orden de cercanía.
  - 15:00 · Fin del ciclo.
- **Interfaz:** reloj doble en pantalla (el del jugador y el del punto de referencia). Es HUD, narrativa y puzzle a la vez. 🟡 Discreto, abajo en el centro ("tú 03:12 · Umbral 03:54"), contando desde 0:00; la pausa detiene ambos.
- ✅ **El Cuaderno vivo (Anthony, 2026-10-30; plan `docs/plan-hud-cuaderno-vivo.md`).** El HUD no parece una web: es el cuaderno del explorador. Papel crema mate, rasgado y con cinta; letra a mano (Caveat) para lo que él anota y Alegreya para lo que dicen otros; **solo la tinta brilla**, con la luz verde de los filamentos de los Ool (títulos en ámbar). Los textos se escriben como tinta que se seca y se pasan frase a frase (E, Espacio, Intro, clic; mantener acelera). Las charlas van en una tira abajo, con bandas de cine y el retrato dibujado del Ool que habla; las lecturas, en una hoja pegada en el centro. El reloj doble son anillos de luz trazados a mano (un tercero mientras se lleva el Contrapeso). La pausa tiene el mismo estilo y una **Configuración** con solo la velocidad del texto y el sonido de letras. El **Registro** es un libro cuyas hojas giran, con pestañas de Preguntas y Mundos.
- ✅ **La bitácora de mundos (Anthony, 2026-10-30).** La primera vez que se llega a un mundo, su dibujo se revela y el jugador le pone nombre (vacío = el oficial); el dibujo vuela al cuaderno y queda pegado con cinta en su página, con lo anotado allí. Hogar y la Luna vienen ya nombrados; el Laboratorio Oculto no aparece hasta encontrarlo. El nombre propio solo se ve en el cuaderno, en el cartel de llegada y en la nave: las placas y grabaciones de los Ausentes siguen diciendo "Umbral".

---

## 9. Epílogo (🟡 / ❓)

- **Condición para activarlo:** dominar el agujero negro instalando el Contrapeso en lugar del motor de la maquinaria de Cicatriz (ver reglas del mecanismo, sección 4).
- ✅ **Los pasos** (Anthony, 2026-10-29): (1) se coge en el Banco del Laboratorio y viaja en el relicario de la nave (a pie, en brazos: sin correr); (2) lleva **su propio reloj**, que marca al ritmo del sitio donde está y se ve en el tablero como tercer reloj; (3) en la Sala del Motor, **antes de las 9:00**, se saca el motor viejo; (4) se corrige el desfase con **dos ruedas** hasta que su reloj coincide con el de la máquina; (5) durante el **pulso** (9:00) se encaja. Si el reloj no coincide, el pulso lo rechaza y hay que esperar al siguiente ciclo.
- **Qué cambia al instalarlo** (🟡): el agujero negro nace igual a las 13:30, pero no crece ni se traga los mundos; entrar en él es la única salida.
- **La entrada:** descenso hacia el horizonte con tensión creciente: mareas, cielo deformado, tiempo exterior acelerándose.
- **El descubrimiento (🟡 propuesta):** dentro se encuentra **el Archivo de las Puertas**, un lugar fuera del tiempo normal donde pueden verse a la vez todas las bocas que se han abierto en todos los sistemas y todas las épocas. Hay cientos. Los Ausentes no fueron los primeros ni serán los últimos. Hay rastros de **otros viajeros** que también fueron arrastrados y lo intentaron; el último nombre en las paredes está en blanco, esperando el suyo. Y entre las bocas, la de su propio mundo: abierta, con su pueblo aún vivo, y otra aún cerrada que dice "pronto".
- **Puzzle final:** hay varias bocas con tiempos distintos. Solo una lo deja en casa *antes* de la prueba. Elegirla exige entender los desfases.
  - 🟡 **Cómo quedó (Fase 10, hito 10D):** cuatro bocas de casa. Al otro lado de cada una se ve un día de Hogar, contado desde que despegó; se llega a ese día **corrido por el desfase** de la boca (K7) y la prueba mayor es **el día 40** (K8). La Sala de Fragmentos llena se ve el día 2 pero se llega el 46; Hogar al anochecer, el 38 pero se llega el 50; el Instituto más joven, 400 días antes de despegar, y se llega 120 días antes: es la única que deja antes. La cuarta está tapada ("pronto"). La trampa: las tres abiertas *se ven* antes de la prueba. Sin K7 el atril solo enseña lo que se ve; sin K8, no dice cuándo es la prueba. Cruzar pide confirmación: no hay vuelta.
- **Decisión final:** qué lleva (o no) de vuelta. Ver Final B.3. 🟡 Los planos del Contrapeso esperan en un Banco del Archivo: se cogen y se pueden dejar hasta cruzar.

---

## 10. Cómo se descubre la historia

- Todo se descubre **leyendo, escuchando y hablando**: grabaciones, notas, diarios, inscripciones y diálogos.
- Cada hallazgo se anota en un **Registro** con enlaces entre pistas.
- Cada pista tendrá: `id`, `dónde se encuentra`, `qué requiere saber antes`, `qué revela`.
- El **grafo de pistas** está en `CONTEXTO_PISTAS.md` (🟡 v0.1). Cumple: varias rutas, ninguna pista esencial detrás de una sola ruta, y cada planeta aportando una pieza del misterio.

---

### Pistas hacia el laboratorio (🟡 primer boceto)

Cada mundo aporta dos cosas: una pieza de **dónde** (la ruta al laboratorio) y una de **por qué** (el contexto, contado de forma indirecta). Ninguna pista dice "ve aquí".

| Mundo | Pieza de "dónde" | Pieza de "por qué" (contexto sutil) |
|---|---|---|
| Umbral | Un registro de envíos con un destino que no está en ningún mapa | La versión oficial: celebración y orgullo, la primera Puerta como triunfo. Un detalle fuera de tono |
| Archivo | Un índice con una sección censurada; fechas que no cuadran hasta entender el desfase | Los registros oficiales ocultan las advertencias: el hueco es el mensaje |
| Taller | La cuna vacía donde iba el Contrapeso, con una nota "trasladado para las pruebas finales" | La ingeniería real del Contrapeso: qué es, qué le falta, por qué su reloj importa |
| Cicatriz | La máquina y su motor. La última grabación del escéptico, hecha con el reloj de un lugar que no es ningún mundo | El primer colapso y quién calló |
| Observatorio (opcional) | Un punto en el cielo que no se mueve como una estrella: la imagen desplazada del laboratorio | Desde fuera, todo parecía en calma |

**Principios:** ninguna pista imprescindible detrás de una sola ruta; cada pista tiene al menos dos lecturas (una superficial y una profunda); lo que se lee en el prólogo prepara el reconocimiento al final.

## 11. Preguntas abiertas

1. ❓ **Título** del juego y nombre del sistema ajeno.
2. ❓ **Protagonista:** nombre, género, edad; ¿se le ve el rostro?
3. ❓ **Cadena de causas del gusano:** filtraciones naturales (síntoma del fenómeno) más la prueba del Instituto. ¿Te convence que sean las dos cosas a la vez, tal como está en la cronología?
4. ✅ **Cómo murieron los Ausentes:** resuelto, La Gran Partida. ✅ **Los tres que se quedaron** murieron en el laboratorio (opción 4, Anthony 2026-10-29).
5. ✅ **Final B:** la profecía autocumplida (Anthony, 2026-10-29).
6. ✅ **Qué decide el final:** ambos, la boca que se elige y llevar o no los planos (Anthony, 2026-10-29).
7. ✅ **Cuándo se instala el Contrapeso:** durante el pulso de las 9:00. ✅ **Los pasos** (Anthony, 2026-10-29): en §9. ❓ Falta: de qué piezas está hecho.
8. ✅ **Justificación física** de que el agujero negro se trague el sistema (Anthony, 2026-10-28): **la deuda de la red se descarga en él**. Las Puertas están acopladas: al colapsar la garganta de la máquina de Cicatriz, el tiempo que debían todas las demás fluye por ella y la hace crecer. Crece deprisa al principio y se calma al final. ✅ **Nace en Cicatriz**, en la Sala del Motor; el Nudo es la semilla que llama.
9. ❓ **Sabor cultural:** nombres, música e identidad de ambos pueblos (el del protagonista y los Ausentes).
10. ❓ **Aspecto de los Ausentes:** humanos, parecidos a humanos o algo muy distinto.
11. ✅ **Qué entiende el Instituto:** resuelto. No saben si está viva o muerta, pero esperan que esté viva.
12. ❓ **Qué tan avanzada está la prueba** del Instituto cuando empieza el juego (¿ya hicieron una, o están a punto?).
13. ✅ **Cómo son las ruinas:** resuelto. Fragmentos de pared o roca tallada, incompletos y aleatorios. Falta decidir cuál es la de la luna (🟡 un fragmento más grande que los anteriores).
14. ✅ **Mecanismo del fenómeno:** resuelto. Desfase temporal acumulado (B) más resonancia entre Puertas (C).
15. ❓ **El Límite y los hitos:** cuánta deuda soporta una Puerta, cuánta llevan las pruebas pequeñas del Instituto y cuánta tendría la prueba mayor (sirve para diseñar el reloj y la tensión del final A).
16. ❓ **Cuántas Puertas** había en la red de los Ausentes y cuántas tiene el Instituto (define cuánto se contagian).
17. ✅ **Cómo se esconde el laboratorio:** resuelto, por lente gravitacional (la imagen visible es un desplazamiento de su posición real).
18. ✅ **Quién ocultó el problema:** resuelto, el Consejo. ❓ Falta definir sus motivos exactos y sus miembros (¿quién firma la orden de silencio?).
19. ✅ **El laboratorio es un sitio aparte:** resuelto, quinto lugar fuera de los cuatro mundos.

---

## 12. Ideas archivadas (v0, descartadas pero recuperables)

- **Premisa v0:** el planeta entero era arrastrado a otro sistema; los colonos alimentaban un reactor (el Corazón) hasta que colapsaba; una Mentora creaba el bucle. Descartada porque el protagonista como único afectado es más íntimo.
- **Oficio de Sincronizador:** el protagonista como encargado de sincronizar los relojes. Se descartó el oficio, pero se conserva la idea del **reloj doble** en el HUD.
- **"Nadie murió":** quienes cayeron al agujero siguen vivos dentro. Sobrevive como opción 1 de los Ausentes.
- **"Eres tú":** la Mentora era una versión futura del protagonista. Podría reaparecer en el epílogo si lo deseas.

---

## 13. Bitácora de sesiones

- **2026-10-24 · Sesión 1.** Se fijan tono, relatividad como mecánica, agujero negro que no viene del Sol, epílogo dentro del agujero y protagonista habitante.
- **2026-10-24 · Sesión 1 (cambio de premisa).** Anthony cambia la premisa: el protagonista es un explorador joven arrastrado por un agujero de gusano a un sistema ajeno con ruinas de una civilización extinta; el agujero negro es un fenómeno que afecta a varios sistemas y su propio mundo está empezando a hacer algo similar; dos finales (evitarlo / no poder). Claude propone las Puertas y la deuda, la Cámara como causa del bucle, el desfase temporal de las bocas, el Archivo de las Puertas como epílogo y los tres motivos del Final B.
- **2026-10-24 · Sesión 1 (añadido de Anthony).** En el mundo del protagonista llevan años apareciendo ruinas y objetos de los Ausentes, posiblemente por micro agujeros de gusano. El prólogo ocurre en el lugar donde los estudian y donde saben leer su lengua. Claude integra las filtraciones, el Instituto, la prueba como origen del gusano, el prólogo con lecturas de doble sentido y refuerza el Final B.3.
- **2026-10-24 · Sesión 1 (respuestas de Anthony).** El Instituto no sabe si la civilización está viva o muerta, pero espera que esté viva. Las ruinas son fragmentos aleatorios e incompletos de pared o roca tallada. Anthony pide definir primero la prueba y el mecanismo exacto del fenómeno. Claude propone tres candidatos (préstamo de energía, desfase temporal acumulado, resonancia entre Puertas) y recomienda el desfase temporal.
- **2026-10-24 · Sesión 1 (mecanismo).** Anthony elige combinar B y C: desfase temporal acumulado en cada Puerta (la deuda) más resonancia entre Puertas (la red). Claude fija siete reglas del juego, añade el Límite al glosario y registra la protección cronológica como licencia narrativa.
- **2026-10-24 · Sesión 1 (Contrapeso y laboratorio).** Anthony define que el Contrapeso es un artilugio que se instala en lugar del motor de la maquinaria que hace los agujeros, que estaba en un laboratorio ultra secreto y que las pistas de cada planeta deben llevar hasta él y dar el contexto de forma sutil. Claude propone por qué era secreto (la decisión de callar), tres formas de esconderlo (lente, tiempo, bajo tierra), un boceto de pistas por mundo y que el reloj del Contrapeso deba sincronizarse al instalarlo.
- **2026-10-24 · Sesión 1 (planetas).** Se crea `CONTEXTO_PLANETAS.md` con el primer diseño de cada mundo. Las preguntas 17 a 19 (cómo se esconde el laboratorio, quién ocultó el problema y si es un quinto sitio) quedan abiertas en la sección 11 de este documento.
- **2026-10-24 · Sesión 1 (cómo murieron los Ausentes).** Anthony detecta que no está definido cómo murieron los Ausentes. Claude señala el problema de coherencia (el mundo está intacto y atrapado en el bucle, así que no pudieron morir aquí) y propone "La Gran Partida": murieron huyendo por las Puertas que causaban el colapso. Pendiente de confirmar.
- **2026-10-24 · Sesión 1 (La Gran Partida).** Anthony aprueba La Gran Partida como explicación de cómo murieron los Ausentes. El destino de los tres que se quedaron (investigadora, escéptico y constructor de la Cámara) queda para más adelante.
- **2026-10-24 · Sesión 1 (laboratorio).** Anthony decide: el laboratorio está en un sitio aparte, escondido por lente gravitacional, y fue el Consejo quien ocultó el problema.
- **2026-10-25 · Sesión 2 (bucle).** Al planificar la Fase 3 aparece una contradicción entre "15 minutos reales" y el tiempo lento del Laboratorio. Anthony elige el modo B: el tiempo real es el del jugador y fuera corre más rápido en los mundos lentos. Se fijan como propuesta las formas de morir y el reloj doble.
- **2026-10-25 · Sesión 2 (grafo de pistas).** Se crea `CONTEXTO_PISTAS.md`: 7 hilos, 8 conclusiones esenciales y 47 fuentes. Claude propone el Nudo (la garganta de la primera Puerta) como masa que dobla la luz y frena el tiempo del Laboratorio, y que el Contrapeso solo pueda instalarse durante el pulso. Pendiente de confirmar.
- **2026-10-25 · Sesión 2 (decisiones del grafo).** Anthony confirma el Nudo (garganta de la primera Puerta, semilla del agujero negro) como masa del Laboratorio, que el Contrapeso solo se instala durante el pulso de las 9:00 y que la Cámara está en el Laboratorio.
- **2026-10-29 · Sesión 6 (Fase 9).** Anthony define el pueblo del protagonista: **los Ool** (aspecto en §7), con la Maestra del Instituto. La Maestra y la Directora son personas distintas; la nave se llama el Albatros II; el prólogo abarca el Instituto y la aldea.
- **2026-10-29 · Sesión 6 (Fase 10).** Anthony acepta las propuestas del plan de la Fase 10: el final B es la **profecía autocumplida**; el final lo deciden **la boca que se elige y llevar o no los planos** del Contrapeso; los **pasos del Contrapeso** (cogerlo en el Laboratorio, su tercer reloj, sacar el motor viejo antes de las 9:00, las dos ruedas y encajarlo en el pulso); y los tres que se quedaron **murieron en el laboratorio** (opción 4).
- **2026-10-30 · Fase 10 (hito 10D, 🟡).** El epílogo se puede jugar: con el Contrapeso instalado se baja con la nave al horizonte estable (tira de la nave, la marea se nota, el reloj de Umbral se acelera) y al cruzarlo, fundido a negro, se despierta en el Archivo de las Puertas. Se proponen los números del puzzle de las bocas de casa (§9) y que los planos se puedan dejar. La boca y los planos ya deciden el final (A, B o "llega tarde"); las escenas de cada final son el hito siguiente.
- **2026-10-30 · Fase 10 (hito 10E, 🟡).** Los finales se pueden jugar: la vuelta a casa por la boca elegida (el Hogar de antes con A y B; el de siempre si se llega tarde), la Directora que cierra el viaje con la tarjeta del final, la Luna sin fragmento en el final A y los finales vistos en el guardado. Los textos de las tarjetas y las escenas son de Anthony.
- **2026-10-30 · HUD (Cuaderno vivo).** Implementado el rediseño del HUD con las decisiones de Anthony (§8 «Interfaz»): textos que se escriben y se pasan frase a frase, charlas con retrato, el Registro como libro y la bitácora de mundos (nombrar cada mundo al llegar y pegar su dibujo). Viendo el juego, Anthony pide el papel crema de la propuesta A con solo la tinta brillando.
