// Traducciones al inglés: la clave es el texto en español tal como está en el código (`t('...')`).
// `tests/i18n/dictionary.test.ts` comprueba que cada `t('...')` del código tenga su entrada aquí.
export const EN: Readonly<Record<string, string>> = {
  // Configuración
  Configuración: 'Settings',
  Volver: 'Back',
  Idioma: 'Language',
  Accesibilidad: 'Accessibility',
  'Tamaño de la interfaz': 'Interface size',
  'Tamaño de las letras': 'Text size',
  'Ratón para mirar · W A S D para andar': 'Mouse to look · W A S D to walk',
  'La Directora te espera en el Motor, junto al mar, al este del Instituto. Acércate a quien quieras y pulsa E para hablar':
    'The Director is waiting for you at the Engine, by the sea, east of the Institute. Walk up to anyone and press E to talk',
  'Lo que aprendes queda en el Registro: ábrelo con Tab':
    'What you learn is kept in the Registry: open it with Tab',
  'El Albatros II te espera en el hangar, al este del Instituto. Junto a la escotilla, F para subir':
    'The Albatross II is waiting in the hangar, east of the Institute. Next to the hatch, press F to climb aboard',
  'T apunta a la Luna · W para ir hacia ella': 'T targets the Moon · W to fly toward it',
  'Frena con X y baja despacio hasta posarte. Con la nave quieta en el suelo, F para bajar':
    'Brake with X and descend slowly until you land. With the ship at rest on the ground, press F to get out',
  'El fragmento está cerca: acércate y examínalo con E':
    'The fragment is close: walk up and examine it with E',
  'Arrastra para mirar · el mando de la izquierda para andar': 'Drag to look · left stick to walk',
  'La Directora te espera en el Motor, junto al mar, al este del Instituto. Acércate a quien quieras y toca Hablar':
    'The Director is waiting for you at the Engine, by the sea, east of the Institute. Walk up to anyone and tap Talk',
  'Lo que aprendes queda en el Registro: ábrelo con su botón':
    'What you learn is kept in the Registry: open it with its button',
  'El Albatros II te espera en el hangar, al este del Instituto. Junto a la escotilla, toca Subir':
    'The Albatross II is waiting in the hangar, east of the Institute. Next to the hatch, tap Board',
  'Apunta a la Luna con su botón y avanza hacia ella':
    'Aim at the Moon with its button and fly toward it',
  'Frena y baja despacio hasta posarte. Con la nave quieta en el suelo, toca Levantarse':
    'Brake and descend slowly until you land. With the ship at rest on the ground, tap Stand up',
  'El fragmento está cerca: acércate y toca Examinar':
    'The fragment is close: walk up and tap Examine',
  'Carta desde el destino sin nombre': 'Letter from the nameless destination',
  'el destino sin nombre': 'the nameless destination',
  'Respuesta del Consejo': 'Reply from the Council',
  'Nota del archivista': "Archivist's note",
  'el Archivo': 'the Archive',
  'Informe archivado': 'Archived report',
  'Ruta 7 (sin nombre)': 'Route 7 (nameless)',
  'El vuelo': 'The flight',
  'La Sala de Fragmentos, llena': 'The Fragment Hall, full',
  'El Instituto, más joven': 'The Institute, younger',
  'Hogar al anochecer': 'Home at dusk',
  'Tapada con una losa. Una marca: «pronto».': 'Sealed with a slab. One mark: "soon".',
  'el día que despegaste': 'the day you took off',
  '{days} antes de despegar': '{days} before takeoff',
  'el día {day} desde que despegaste': 'day {day} since you took off',
  día: 'day',
  días: 'days',
  'Se ve {day}.': 'You see {day}.',
  'Su reloj va {offset} {days} por delante: se llega {offset} {days} después de lo que se ve.':
    'Its clock runs {offset} {days} ahead: you arrive {offset} {days} after what you see.',
  'La prueba mayor es {day}.': 'The great test is {day}.',
  'Espacio despegar · F levantarse · V cámara · T objetivo':
    'Space take off · F stand up · V camera · T target',
  'Modo libre: sin ayudas (Z las devuelve)': 'Free mode: no assists (Z brings them back)',
  'W avanzar · ratón girar · Espacio subir · C bajar · X frenar':
    'W forward · mouse turn · Space up · C down · X brake',
  'Mantén C para posarte': 'Hold C to land',
  'Subir para despegar · Levantarse · Objetivo': 'Up to take off · Stand up · Target',
  'Modo libre: sin ayudas (Estab. las devuelve)':
    'Free mode: no assists (Stabilizer brings them back)',
  'Palanca avanzar · arrastra para girar · Subir · Bajar':
    'Stick forward · drag to turn · Up · Down',
  'Mantén Posarse para bajar despacio': 'Hold Land to come down slowly',
  'Volver a jugar': 'Play again',
  'Volver al Archivo': 'Back to the Archive',
  'No se ha podido guardar el final.': 'The ending could not be saved.',
  'Aire que queda': 'Air left',
  tensión: 'strain',
  'Tensión de la marea': 'Tidal strain',
  'El pulso lo encaja: el Contrapeso ocupa el lugar del motor.':
    "The pulse locks it in: the Counterweight takes the engine's place.",
  'El pulso lo rechaza: los dos relojes no coincidían.':
    'The pulse rejects it: the two clocks did not match.',
  'El motor viejo sale del núcleo. El núcleo queda abierto hasta el pulso.':
    'The old engine comes out of the core. The core stays open until the pulse.',
  'Cuatro bocas de casa. Al otro lado de cada una, Hogar.':
    'Four mouths back home. On the other side of each one, Home.',
  Pausa: 'Paused',
  Seguir: 'Continue',
  Jugar: 'Play',
  Registro: 'Registry',
  Toca: 'Tap',
  'Haz clic': 'Click',
  '{action} para seguir': '{action} to continue',
  '{action} para empezar': '{action} to start',
  'Ciclos vividos: {loops}': 'Loops lived: {loops}',
  'Este navegador no está guardando la partida.': 'This browser is not saving your game.',
  'No se pudo borrar la partida.': 'The saved game could not be deleted.',
  Borrar: 'Delete',
  Cancelar: 'Cancel',
  'Empezar de cero': 'Start over',
  '¿Borrar todo lo aprendido? No se puede deshacer.':
    'Delete everything you have learned? This cannot be undone.',
  'Volumen de los efectos': 'Effects volume',
  'Volumen de los ambientes': 'Ambience volume',
  'Volumen de la música': 'Music volume',
  'Velocidad del texto': 'Text speed',
  'Sonido de letras': 'Letter sounds',
  Sí: 'Yes',
  No: 'No',
  Lenta: 'Slow',
  Normal: 'Normal',
  Rápida: 'Fast',
  'Al instante': 'Instant',
  'WASD moverse · ratón mirar · Espacio saltar · Shift correr · F nave · G mira · L luz · M sonido · Esc pausa · F3 datos':
    'WASD move · mouse look · Space jump · Shift run · F ship · G sight · L light · M sound · Esc pause · F3 stats',
  'Reloj doble: tu tiempo y el de Umbral': "Double clock: your time and Umbral's",
  'tú {time}': 'you {time}',
  'Abrir el Registro': 'Open the Registry',
  Saltar: 'Jump',
  Nave: 'Ship',
  Objetivo: 'Target',
  'Estab.': 'Stab.',
  Frenar: 'Brake',
  'Gira el teléfono': 'Turn your phone',
  'Este juego se juega en horizontal.': 'This game is played in landscape.',
  Sentarse: 'Sit down',
  Mapa: 'Map',
  Subir: 'Up',
  Bajar: 'Down',
  Posarse: 'Land',
  Cámara: 'Camera',
  'Alabear a la izquierda': 'Roll left',
  'Alabear a la derecha': 'Roll right',
  Más: 'More',
  'Luz del cuerpo': 'Body light',
  'Mira graduada': 'Sight scale',
  'Tercera persona': 'Third person',
  Sonido: 'Sound',
  'Mano zurda': 'Left-handed',
  'Más opciones': 'More options',
  'Ocultar interfaz': 'Hide interface',
  'Pausar el juego': 'Pause the game',
  'Controles de la nave': 'Ship controls',
  Levantarse: 'Stand up',
  'F · sentarse a pilotar': 'F · sit down to fly',
  'E · abrir el Registro': 'E · open the Registry',
  'E · mirar el mapa de órbitas': 'E · look at the orbit map',
  'Mapa de órbitas': 'Orbit map',
  'La Brasa en el centro y cada mundo en su órbita':
    'The Ember in the centre and each world on its orbit',
  'E o Esc para cerrar': 'E or Esc to close',
  'la nave': 'the ship',
  'Anotado en el Registro': 'Noted in the Registry',
  'Anotado en el Registro: {facts}': 'Noted in the Registry: {facts}',
  'Hay algo más aquí que aún no sabes leer.': "There is more here that you can't read yet.",
  'Lectura más profunda': 'Deeper reading',
  'Texto provisional': 'Draft text',
  Cerrar: 'Close',
  'Es el reloj de Umbral.': "It is Umbral's clock.",
  '{there} {days} allí son {here} en Umbral.': '{there} {days} there are {here} in Umbral.',
  'Un día allí son {here} en Umbral.': 'One day there is {here} in Umbral.',
  '¿Qué hora anotó el turno en el {other}?': 'What time did the shift write down at the {other}?',
  'No cuadra con cómo se separan las columnas.': 'That does not fit how the columns drift apart.',
  'Las columnas se separan siempre igual: el Archivo se queda atrás.':
    'The columns always drift apart the same way: the Archive falls behind.',
  'Comprobar el orden': 'Check the order',
  'Fechada el día {day} según el reloj de {clock}.': 'Dated day {day} by the clock of {clock}.',
  'Aún no: alguna contesta antes de que la otra se escribiera.':
    'Not yet: one of them answers before the other was written.',
  'En días de Umbral, cada carta llega después de la anterior.':
    'In Umbral days, each letter arrives after the previous one.',
  'Ordénalas de la primera que se escribió a la última, en días de Umbral.':
    'Put them in order, from the first written to the last, in Umbral days.',
  'No hay nada que ajustar.': 'There is nothing to adjust.',
  'Todas las bocas están quietas.': 'All the mouths are still.',
  'El reloj de la Pista está parado.': 'The Track clock is stopped.',
  'Ya estaba anotado en el Registro.': 'It was already noted in the Registry.',
  'Entendida entera.': 'Fully understood.',
  'Se entiende. Escúchala entera.': 'It is clear. Listen to all of it.',
  'Casi se entiende.': 'Almost clear.',
  'Se adivina alguna palabra.': 'You can make out a word or two.',
  'No se entiende nada.': 'Nothing is understandable.',
  'Más lento': 'Slower',
  'Más rápido': 'Faster',
  Claridad: 'Clarity',
  'Mueve la rueda hasta que la voz se entienda.': 'Move the wheel until the voice is clear.',
  'Mueve la rueda (← →) hasta que la voz se entienda.':
    'Move the wheel (← →) until the voice is clear.',
  'Dibujo de {name}': 'Drawing of {name}',
  casa: 'home',
  'encontrado en el ciclo {loop}': 'found in loop {loop}',
  '{known} de {total} hechos': '{known} of {total} facts',
  'Ver también': 'See also',
  'cuaderno de campo': 'field notebook',
  'Instituto de Hogar': 'Home Institute',
  'Si lo encuentras: aquí está todo lo que he aprendido.':
    'If you find this: here is everything I have learned.',
  'Lo que sé': 'What I know',
  'Qué puedo hacer ahora': 'What I can do now',
  'Por qué lo sé': 'Why I know it',
  'Lo que tengo y lo que me falta': 'What I have and what I am missing',
  'Todavía no sé nada con certeza.': 'I do not know anything for certain yet.',
  'Todavía no sé nada sobre esto.': 'I do not know anything about this yet.',
  'Bitácora de mundos': 'Log of worlds',
  'A cada mundo que encuentro le pongo nombre y pego su dibujo.':
    'Each world I find, I name and paste its drawing.',
  'Aún no he anotado nada aquí.': 'I have not written anything here yet.',
  'Página anterior': 'Previous page',
  'Página siguiente': 'Next page',
  'Cerrar (Esc)': 'Close (Esc)',
  'Un mundo nuevo': 'A new world',
  'Ponle nombre': 'Give it a name',
  'Pegar en el cuaderno': 'Paste into the notebook',
  Hogar: 'Home',
  Luna: 'Moon',
  Umbral: 'Threshold',
  Archivo: 'Archive',
  Taller: 'Workshop',
  Cicatriz: 'Scar',
  Observatorio: 'Observatory',
  Laboratorio: 'Laboratory',
  'Laboratorio Oculto': 'Hidden Laboratory',
  'Anclaje Norte': 'North Anchorage',
  'Anclaje Sur': 'South Anchorage',
  'un polo del Cerco': 'one pole of the Enclosure',
  'el otro polo del Cerco': 'the other pole of the Enclosure',
  Puertas: 'Gates',
  'mi sistema · sin ciclo': 'my system · no loop',
  'la luna de Hogar': "Home's moon",
  'reloj de referencia': 'reference clock',
  'masa densa · su tiempo va lento': 'dense mass · its time runs slow',
  'órbita rapidísima': 'blistering orbit',
  'junto al Taller · luz roja': 'next to the Workshop · red light',
  'la luz llega tarde': 'the light arrives late',
  'dentro del Nudo': 'inside the Knot',
  'Algo que aún no sé…': 'Something I do not know yet…',
  'Técnico (Taller)': 'Technician (Workshop)',
  Diario: 'Diary',
  'La tormenta': 'The storm',
  'Última página': 'Last page',
  'Hermana (Umbral)': 'Sister (Threshold)',
  'No cuadra: el atraso no se queda fijo, crece con los días.':
    'That does not fit: the lag does not stay fixed, it grows with the days.',
  'Mira la tormenta: el mismo día, contado en los dos diarios.':
    'Look at the storm: the same day, counted in both diaries.',
  'Todos los relojes se igualaron a la vez. Míralos correr.':
    'All the clocks were set equal at the same moment. Watch them run.',
  '¿Qué destino se queda atrás más deprisa?': 'Which destination falls behind fastest?',
  'Ese corre más: espera un poco y compáralos otra vez.':
    'That one runs faster: wait a little and compare them again.',
  'La ruta sin nombre casi no avanza: allí el tiempo apenas corre. Lo que se ve de ella hay que corregirlo.':
    'The nameless route barely advances: time hardly runs there. What you see of it has to be corrected.',
  Tramo: 'Leg',
  Minutos: 'Minutes',
  'El Contrapeso marca': 'The Counterweight reads',
  'La máquina marca': 'The machine reads',
  'Al llegar, ¿cómo va el Contrapeso respecto a la máquina?':
    'On arrival, how does the Counterweight stand against the machine?',
  'Cuenta todos los tramos: en unos se atrasa y en otros se adelanta.':
    'Count every leg: on some it falls behind and on others it gets ahead.',
  'El anillo de la Pista no se enciende con su reloj desajustado. Gira las ruedas hasta que marque la hora del Taller.':
    'The Track ring will not light with its clock out of step. Turn the wheels until it shows the Workshop time.',
  'El Taller': 'The Workshop',
  'La Pista': 'The Track',
  'Los dos relojes marcan lo mismo.': 'Both clocks read the same.',
  'Gira las ruedas hasta que los dos relojes marquen lo mismo. El pulso de las 9:00 hará el resto.':
    'Turn the wheels until both clocks read the same. The 9:00 pulse will do the rest.',
  'El Contrapeso ya está en el núcleo.': 'The Counterweight is already in the core.',
  'El pulso lo ha rechazado: los dos relojes no coincidían. Habrá que volver a intentarlo.':
    'The pulse rejected it: the two clocks did not match. You will have to try again.',
  'El núcleo está abierto. La cuna espera el Contrapeso.':
    'The core is open. The cradle awaits the Counterweight.',
  'El motor viejo sigue en el núcleo: antes hay que sacarlo.':
    'The old engine is still in the core: it has to come out first.',
  'La máquina': 'The machine',
  'El Contrapeso': 'The Counterweight',
  Cruzar: 'Cross',
  'Todavía no': 'Not yet',
  'Llevas los planos del Contrapeso.': 'You are carrying the Counterweight plans.',
  'Tres meses: la hermana va por el día {day}. ¿Por qué día va el técnico?':
    'Three months: the sister is on day {day}. What day is the technician on?',
  'Día {day}': 'Day {day}',
  'El atraso crece con el tiempo: cada {storm} días, {lag} más.':
    'The lag grows with time: every {storm} days, {lag} more.',
  '¿Cuántos días se queda atrás el técnico por cada {storm} de su hermana?':
    'How many days does the technician fall behind for every {storm} of his sister?',
  '{days} días': '{days} days',
  'Un viaje de ejemplo hasta la máquina, que marcha a {rate}.':
    'A sample trip to the machine, which runs at {rate}.',
  'Al llegar: {drift}.': 'On arrival: {drift}.',
  'Cada tramo suma lo que se adelanta o se atrasa: al llegar, {drift}. Las ruedas lo corrigen.':
    'Each leg adds what it gains or loses: on arrival, {drift}. The wheels correct it.',
  'Intro para pegarlo · sin nombre se queda «{name}»':
    'Enter to paste it · unnamed it stays "{name}"',
  '{total} hechos anotados': '{total} facts noted',
  '¿Cruzar hacia «{view}»? No hay vuelta atrás.': 'Cross toward "{view}"? There is no going back.',
  'p.': 'p.',
  leer: 'read',
  escuchar: 'listen',
  examinar: 'examine',
  observar: 'watch',
  hablar: 'talk',
  dejar: 'drop',
  coger: 'take',
  'Cerrada.': 'Closed.',
  Elegir: 'Choose',
  Preguntas: 'Questions',
  Mundos: 'Worlds',
  Velocidad: 'Speed',
  Altura: 'Altitude',
  Posada: 'Landed',
  'Espacio abierto': 'Open space',
  'Estabilizador · Z': 'Stabilizer · Z',
  'Modo libre · Z': 'Free mode · Z',
  'Sin sonido: no se pudo crear el audio.': 'No sound: the audio could not be created.',
  'Se perdió el contexto gráfico; intentando recuperarlo…':
    'The graphics context was lost; trying to recover it…',
  'No se pudo cargar el mundo. Revisa la consola.':
    'The world could not be loaded. Check the console.',
  'Pegado en la bitácora: {name}': 'Pasted into the logbook: {name}',
  'Cargando…': 'Loading…',
  'Vista del juego': 'Game view',
  'La deuda de las estrellas': 'The Debt of the Stars',
  'Final A': 'Ending A',
  'Final B': 'Ending B',
  'Llegas tarde': 'You arrive too late',
  'Antes de la prueba': 'Before the test',
  'Llegas a casa con el aire de las islas todavía en el pelo y el cuaderno lleno. La Directora lo lee de pie, despacio, sin interrumpir.':
    'You arrive home with the air of the islands still in your hair and your notebook full. The Director reads it standing, slowly, without interrupting.',
  'No hace falta que lo entienda todo. Le basta ver dos relojes que no coinciden y una línea que se dispara.':
    'She does not need to understand all of it. It is enough for her to see two clocks that do not agree and a line that shoots up.',
  'La prueba no se hace. En el Instituto nadie sabrá de qué se salvaron, y tú no podrás explicarlo: ese viaje no ocurrió para ellos.':
    'The test is not carried out. At the Institute nobody will know what they were spared, and you will not be able to explain it: that journey never happened for them.',
  'Allá arriba, la Luna sigue limpia. Lejos de aquí, un sistema vacío conserva su última cuenta, y nadie la paga.':
    'Up there, the Moon is still clean. Far from here, an empty system keeps its last count, and nobody pays it.',
  'La cuenta empieza hoy': 'The count starts today',
  'Llegas a tiempo. Dejas los planos sobre la mesa, con las manos todavía temblando, para que vean que es verdad.':
    'You arrive in time. You lay the plans on the table, your hands still trembling, so they can see it is true.',
  'La Directora los abre y sonríe: «Esto es justo lo que nos faltaba.»':
    'The Director opens them and smiles: “This is exactly what we were missing.”',
  'Esa noche, en el Motor, la Puerta Mayor se enciende por fin con la pieza que nunca llegó. Funciona. Todo funciona.':
    'That night, at the Engine, the Great Gate lights up at last with the piece that never arrived. It works. Everything works.',
  'En otro sistema, tiempo atrás, alguien graba una placa en la boca de un anillo: «La cuenta empieza hoy».':
    'In another system, long ago, someone carves a plate on the mouth of a ring: “The count starts today.”',
  'La plaza del Instituto está en silencio. La Puerta Mayor ya se abrió: en el Motor queda un anillo apagado y, junto al mar, un corte liso y curvo en la tierra.':
    'The Institute plaza is silent. The Great Gate has already opened: at the Engine there is a dead ring and, by the sea, a smooth curved cut in the ground.',
  'Quien te encuentra no sabe qué decirte. Tú lo sabes todo, y ya no sirve de nada.':
    'Whoever finds you does not know what to say. You know everything, and it no longer helps.',
  'Esta boca no te dejó a tiempo. Vuelve al Archivo y cuenta de nuevo: los relojes no mienten, solo hay que leerlos con calma.':
    'This mouth did not leave you in time. Go back to the Archive and count again: the clocks do not lie, they only have to be read calmly.',
  '[texto pendiente]': '[text pending]',
  Continuar: 'Continue',
  'Quince minutos antes del final de un mundo.': 'Fifteen minutes before a world ends.',
  'Mueve el campo (arrastra o con las flechas), acerca la vista y gira el índice de latón. Con la alineación, lo que ves del Nudo está torcido: busca dónde está de verdad.':
    'Move the field (drag or use the arrow keys), zoom in and turn the brass index. During the alignment, what you see of the Nudo is bent: find where it really is.',
  'El campo del ocular': 'The eyepiece field',
  'La alineación: la imagen junto a la Brasa se ve limpia.':
    'The alignment: the image beside the Ember shows clearly.',
  'Fuera de la alineación, lo que hay junto a la Brasa tiembla y se pierde. Vuelve hacia las 6:30.':
    'Outside the alignment, what lies beside the Ember trembles and fades. Come back around 6:30.',
  'El cielo no se deja ver.': 'The sky will not show itself.',
  'Cruz: a {n}° de la Brasa · Aumento ×{z} · Índice: {d}°':
    'Crosshair: {n}° from the Brasa · Zoom ×{z} · Index: {d}°',
  'Rumbo fijado: el Nudo de verdad está a {n}° de la Brasa.':
    'Bearing fixed: the real Nudo is {n}° from the Brasa.',
  'Alejar la vista': 'Zoom out',
  'Acercar la vista': 'Zoom in',
  Aumento: 'Zoom',
  Índice: 'Index',
  'Índice: restar un grado': 'Index: subtract a degree',
  'Índice: sumar un grado': 'Index: add a degree',
  'El ocular está a oscuras.': 'The eyepiece is dark.',
  // Las tareas del prólogo
  'Aprende a moverte': 'Learn to move',
  Moverte: 'Moving',
  'Ratón para mirar · W A S D para andar · Mayús para correr · Espacio para saltar':
    'Mouse to look · W A S D to walk · Shift to run · Space to jump',
  'Habla con la vecina del árbol': 'Talk to the neighbor by the tree',
  Vecina: 'Neighbor',
  'Acércate a la vecina del árbol de la plaza y pulsa E para hablar':
    'Walk up to the neighbor by the tree in the square and press E to talk',
  'Acércate a la vecina del árbol de la plaza y toca Hablar':
    'Walk up to the neighbor by the tree in the square and tap Talk',
  'Sube al Instituto y habla con la Maestra': 'Go up to the Institute and talk to the Teacher',
  Maestra: 'Teacher',
  'El Instituto está en la colina, siguiendo el camino de losas. La Maestra está en su aula: pulsa E para hablar':
    'The Institute is on the hill, along the flagstone path. The Teacher is in her classroom: press E to talk',
  'El Instituto está en la colina, siguiendo el camino de losas. La Maestra está en su aula: toca Hablar':
    'The Institute is on the hill, along the flagstone path. The Teacher is in her classroom: tap Talk',
  'Lee la ficha de riego del aula': 'Read the irrigation tablet in the classroom',
  Ficha: 'Tablet',
  'La ficha de barro está sobre la mesa de la Maestra: mírala y pulsa E para leerla':
    "The clay tablet is on the Teacher's desk: look at it and press E to read it",
  'La ficha de barro está sobre la mesa de la Maestra: mírala y toca Leer':
    "The clay tablet is on the Teacher's desk: look at it and tap Read",
  'Abre el cuaderno y repasa lo aprendido': 'Open the notebook and review what you have learned',
  Cuaderno: 'Notebook',
  'Lo que aprendes queda en el cuaderno: ábrelo con Tab (T abre tus tareas)':
    'What you learn is kept in the notebook: open it with Tab (T opens your tasks)',
  'Lo que aprendes queda en el cuaderno: ábrelo con su botón':
    'What you learn is kept in the notebook: open it with its button',
  'Pide la nave a la mecánica del hangar': 'Ask the hangar mechanic for the ship',
  Mecánica: 'Mechanic',
  'El hangar está al este del Instituto. La mecánica te espera en su cobertizo: pulsa E para hablar':
    'The hangar is east of the Institute. The mechanic is waiting in her shed: press E to talk',
  'El hangar está al este del Instituto. La mecánica te espera en su cobertizo: toca Hablar':
    'The hangar is east of the Institute. The mechanic is waiting in her shed: tap Talk',
  'Sube al Albatros II': 'Board the Albatross II',
  'Albatros II': 'Albatross II',
  'El Albatros II espera en la plataforma del hangar. Junto a la escotilla, F para subir; sentado en el asiento, F para pilotar':
    'The Albatross II is waiting on the hangar pad. Next to the hatch, press F to climb aboard; at the seat, press F to pilot',
  'El Albatros II espera en la plataforma del hangar. Junto a la escotilla, toca Subir; sentado en el asiento, toca Pilotar':
    'The Albatross II is waiting on the hangar pad. Next to the hatch, tap Board; at the seat, tap Pilot',
  'Busca la pieza en la isla del primer Albatros': "Find the piece on the first Albatross's island",
  Isla: 'Island',
  'Vuela al oeste, más allá del mar, siguiendo las boyas con farol. Ratón para apuntar · W avanzar · Espacio/C subir y bajar · X frena. Posa la nave con F y examina la pieza con E':
    'Fly west, beyond the sea, following the lantern buoys. Mouse to aim · W forward · Space/C up and down · X brakes. Land the ship, get out with F and examine the piece with E',
  'Vuela al oeste, más allá del mar, siguiendo las boyas con farol. Posa la nave, bájate y toca Examinar junto a la pieza':
    'Fly west, beyond the sea, following the lantern buoys. Land the ship, get out and tap Examine next to the piece',
  'Lleva la pieza a la Directora': 'Take the piece to the Director',
  Directora: 'Director',
  'La Directora espera en el Motor, junto al mar, al este del Instituto. Vuela de vuelta y habla con ella con E':
    'The Director is waiting at the Engine, by the sea, east of the Institute. Fly back and talk to her with E',
  'La Directora espera en el Motor, junto al mar, al este del Instituto. Vuela de vuelta y toca Hablar':
    'The Director is waiting at the Engine, by the sea, east of the Institute. Fly back and tap Talk',
  'Vuela a la Luna y pósate': 'Fly to the Moon and land',
  'Sube con la nave: el tablero ya apunta a la Luna. W para ir hacia ella. Cerca, frena con X y baja despacio; con la nave quieta en el suelo, F para bajar':
    'Take off: the dashboard already points to the Moon. W to fly toward it. When close, brake with X and descend slowly; with the ship at rest on the ground, press F to get out',
  'Sube con la nave: el tablero ya apunta a la Luna. Cerca, frena y baja despacio; con la nave quieta en el suelo, toca Levantarse':
    'Take off: the dashboard already points to the Moon. When close, brake and descend slowly; with the ship at rest on the ground, tap Get up',
  'Examina el fragmento de la Luna': 'Examine the fragment on the Moon',
  'Vuelve al Albatros II': 'Go back to the Albatross II',
  'Vuelve a la nave: junto a la escotilla, F para subir; sentado en el asiento, F':
    'Go back to the ship: by the hatch, F to board; in the seat, F',
  'Vuelve a la nave: junto a la escotilla toca Subir y, en el asiento, Pilotar':
    'Go back to the ship: by the hatch tap Board and, in the seat, Pilot',
  Fragmento: 'Fragment',
  Tareas: 'Tasks',
  'Todo hecho': 'All done',
  '{done} de {total} hechas': '{done} of {total} done',
  'Lo que he aprendido': 'What I have learned',
  'Todavía no he aprendido nada. Habla con la gente y lee.':
    'I have not learned anything yet. Talk to people and read.',
  Aprendido: 'Learned',
  'Espacio despegar · F levantarse · V cámara · T tareas':
    'Space take off · F get up · V camera · T tasks',
  'Subir para despegar · Levantarse · Objetivo: tareas':
    'Up to take off · Stand up · Objective: tasks',
  'Ocultar tareas': 'Hide tasks',
  'Mostrar tareas': 'Show tasks',
  'Ocultar o mostrar la interfaz': 'Hide or show the interface',
  'Pantalla completa': 'Full screen',
  'Las cuatro campanas suenan a compás. La tapa se ha abierto.':
    'The four bells ring in time. The lid has opened.',
  'La tapa no cede. Debajo se oye un mecanismo que espera algo: un compás.':
    'The lid will not give. Beneath it you can hear a mechanism waiting for something: a beat.',
  'La tapa no cede. Hay {placed} de {total} campanas en el canal.':
    'The lid will not give. There are {placed} of {total} bells on the channel.',
  'La tapa no cede: las campanas suenan, pero no a compás.':
    'The lid will not give: the bells ring, but not in time.',
  'La tapa del atril está abierta.': 'The lid of the lectern is open.',
  'La tapa no cede.': 'The lid will not give.',
  'cada vez más lejos': 'farther each time',
  'Dibujo: un canal inclinado con dieciséis marcas y cuatro campanas puestas en las marcas 1, 4, 9 y 16':
    'Drawing: a sloping channel with sixteen marks and four bells set on marks 1, 4, 9 and 16',
  'la Brasa': 'the Ember',
  'un verso que nadie canta': 'a verse nobody sings',
  'Dibujo: una fila de mundos desde la Brasa: Taller, Cicatriz, Archivo, Umbral, un hueco punteado y el Observatorio':
    'Drawing: a row of worlds from the Ember: Workshop, Scar, Archive, Threshold, a dotted gap and the Observatory',
  'un riel sin mundo': 'a rail with no world',
  'Dibujo: el Planetario desde arriba, seis rieles concéntricos con una esfera en cada uno menos el quinto, todas en línea hacia la derecha a las 6:30':
    'Drawing: the Orrery from above, six concentric rails with a sphere on each but the fifth, all in a line to the right at 6:30',
  'La manivela se ha parado: las esferas quedan en una misma línea. Son las 6:30.':
    'The crank has stopped: the spheres fall in one line. It is 6:30.',
  'Las esferas empiezan a girar, cada una a su paso. La manivela aún no se ha parado.':
    'The spheres begin to turn, each at its own pace. The crank has not stopped yet.',
  'Seis rieles y una manivela que no gira. Faltan las esferas.':
    'Six rails and a crank that will not turn. The spheres are missing.',
  'La manivela no gira. Hay {placed} de {total} esferas en sus rieles.':
    'The crank will not turn. There are {placed} of {total} spheres on their rails.',
  'La manivela no gira: algo no está en su sitio.':
    'The crank will not turn: something is out of place.',
  'Las esferas están alineadas.': 'The spheres are lined up.',
  'La manivela no gira.': 'The crank will not turn.',
  'así no canta con las demás': 'it does not sing with the others like this',
  'Dibujo: cinco brazos de largos distintos en escalera, de izquierda a derecha de largo uno, tres, dos, cinco y cuatro':
    'Drawing: five arms of different lengths in a staircase, from left to right of length one, three, two, five and four',
  barcaza: 'barge',
  'madera: flota': 'wood: floats',
  'Dibujo: una cisterna con tres marcas de oro y una barcaza arriba; al lado, bloques de una, dos y tres partes y un tablón de madera tachado':
    'Drawing: a cistern with three gold marks and a barge on top; beside it, blocks of one, two and three parts and a crossed-out wooden plank',
  'juntos: se contagian': 'together: they catch from one another',
  'separados: cada uno a su paso': 'apart: each at its own pace',
  'Dibujo: dos vigas con cinco péndulos; los de arriba cuelgan igual y se mecen juntos, los de abajo tienen largos distintos y cada uno va a su paso':
    'Drawing: two beams with five pendulums; the upper ones hang alike and swing together, the lower ones have different lengths and each goes at its own pace',
  'Los cinco péndulos van cada uno a su paso. La viga se calma y el cerrojo cae.':
    'The five pendulums each go at their own pace. The beam calms and the latch falls.',
  'Los cinco péndulos se mecen a la vez y la viga tiembla. El cerrojo no cede.':
    'The five pendulums swing together and the beam trembles. The latch will not give.',
  'Los péndulos ya no van juntos, pero la viga sigue temblando: aún no es la figura.':
    'The pendulums no longer go together, but the beam keeps trembling: it is not the figure yet.',
  'La trampilla de la Sala Cerrada está abierta.': 'The hatch of the Sealed Room is open.',
  'El cerrojo no cede.': 'The latch will not give.',
  '6 × 2': '6 × 2',
  '3 × 4': '3 × 4',
  'peso por distancia': 'weight times distance',
  'Dibujo: una viga sobre un poste con la maqueta del motor a un lado, seis medidas a dos del eje, y una pesa de tres a cuatro muescas del otro lado: doce y doce':
    'Drawing: a beam on a post with the model of the motor on one side, six measures at two from the axis, and a weight of three at four notches on the other side: twelve and twelve',
  'tres pinzas, un símbolo': 'three clamps, one symbol',
  'Dibujo: una placa cuadrada con tres pinzas en tres de sus seis agujeros y la arena formando dos aros y tres rayas: el símbolo entero':
    'Drawing: a square plate with three clamps in three of its six holes and the sand forming two rings and three lines: the whole symbol',
  'La arena se junta en dos aros y tres marcas: la firma entera. La placa canta.':
    'The sand gathers into two rings and three marks: the whole signature. The plate sings.',
  'La placa vibra con el latido de la máquina, pero la arena no dibuja nada. Faltan las pinzas.':
    'The plate vibrates with the beat of the machine, but the sand draws nothing. The clamps are missing.',
  'La arena corre por la placa y no se queda: ningún agujero es el bueno.':
    'The sand runs over the plate and does not stay: none of the holes is the right one.',
  'La arena se queda en {rings} aro(s). Faltan pinzas por poner.':
    'The sand stays in {rings} ring(s). There are clamps still to put on.',
  'La arena dibuja {rings} aro(s), pero no la firma entera: alguna pinza no está donde toca.':
    'The sand draws {rings} ring(s), but not the whole signature: some clamp is not where it should be.',
  'La arena dibuja el símbolo entero.': 'The sand draws the whole symbol.',
  'La placa no canta.': 'The plate does not sing.',
  'Se abre una boca en el cielo. Solo se llega a ella con la nave.':
    'A mouth opens in the sky. You can only reach it with the ship.',
  Abrir: 'Open',
  '¿Abrir la boca hacia «{view}»? Se abrirá en el cielo y solo se llega a ella con la nave.':
    'Open the mouth toward “{view}”? It will open in the sky and can only be reached with the ship.',
  'donde está': 'where it is',
  'donde parece': 'where it seems',
  'Dibujo: una estrella se ve dieciocho grados más allá de donde está, junto a un punto oscuro que dobla la luz':
    'Drawing: a star seems eighteen degrees away from where it is, beside a dark point that bends the light',
  'Dibujo: dos relojes lado a lado; el de un mundo va por delante y el del otro se queda atrás':
    'Drawing: two clocks side by side; one world runs ahead and the other falls behind',
  'el mismo viaje, dos relojes': 'the same trip, two clocks',
  'Dibujo: dos columnas de días; el gemelo que viajó cuenta veinte y el que esperó cuenta cien':
    'Drawing: two columns of days; the twin who traveled counts twenty and the one who waited counts a hundred',
  'Dibujo: a las cuatro, un rayo de luz de la Brasa atraviesa la ranura de un muro y cae sobre el suelo':
    'Drawing: at four sharp a ray of light from the Ember goes through a slot in a wall and falls on the floor',
  'el núcleo se abre': 'the core opens',
  'Dibujo: una línea de quince minutos; a las nueve en punto hay un pico y el núcleo se abre un instante, antes de las trece y media':
    'Drawing: a fifteen minute line; at nine sharp there is a spike and the core opens for an instant, before thirteen and a half minutes',
  'Dibujo: la mitad izquierda de un símbolo de dos anillos, con el borde roto':
    'Drawing: the left half of a symbol made of two rings, with a broken edge',
  'mi fragmento': 'my fragment',
  'la pared': 'the wall',
  'Dibujo: las dos mitades de un símbolo de dos anillos juntas: la de mi fragmento y la de la pared':
    'Drawing: the two halves of a two-ring symbol together: the one on my fragment and the one on the wall',
  'Dibujo: tres bocas de una Puerta, cada una con un reloj que marca una hora distinta':
    'Drawing: three mouths of a Gate, each with a clock showing a different hour',
  'Detener el colapso': 'Stop the collapse',
  'Aún no lo entiendo: en el cuaderno, las páginas de deducción dicen qué me falta':
    'I do not understand it yet: the deduction pages in the notebook say what I am missing',
  'Coge el Contrapeso del Banco del Laboratorio':
    'Take the Counterweight from the Bench in the Laboratory',
  '¿Dónde está el Contrapeso?': 'Where is the Counterweight?',
  Contrapeso: 'Counterweight',
  'Está en su Banco, en el Laboratorio: E para cogerlo. En brazos no se corre':
    'It is on its Bench in the Laboratory: E to pick it up. You cannot run while carrying it',
  'Está en su Banco, en el Laboratorio: toca Coger. En brazos no se corre':
    'It is on its Bench in the Laboratory: tap Pick up. You cannot run while carrying it',
  'Llévalo a la Sala del Motor de Cicatriz': 'Take it to the Engine Room in Scar',
  '¿Dónde se instala el Contrapeso?': 'Where does the Counterweight go?',
  'Súbelo a la nave y vuela a Cicatriz; la Sala del Motor rodea el centro del planeta':
    'Put it on the ship and fly to Scar; the Engine Room surrounds the center of the planet',
  'Saca el motor viejo con la palanca antes de las 9:00':
    'Pull out the old engine with the lever before 9:00',
  '¿Qué hay que quitar para ponerlo?': 'What has to be removed to fit it?',
  Palanca: 'Lever',
  'La palanca está en la consola, delante del núcleo: E para tirar. Después del pulso ya no sale':
    'The lever is on the console in front of the core: E to pull. After the pulse the engine will not come out',
  'La palanca está en la consola, delante del núcleo: toca Tirar. Después del pulso ya no sale':
    'The lever is on the console in front of the core: tap Pull. After the pulse the engine will not come out',
  'En la cuna, iguala su reloj con el de la máquina':
    'In the cradle, match its clock to the one on the machine',
  '¿Qué pasa con su reloj?': 'What about its clock?',
  Cuna: 'Cradle',
  'Ponlo en la cuna con E y gira las dos ruedas hasta que los dos relojes marquen lo mismo':
    'Set it in the cradle with E and turn the two wheels until both clocks read the same',
  'Ponlo en la cuna y gira las dos ruedas hasta que los dos relojes marquen lo mismo':
    'Set it in the cradle and turn the two wheels until both clocks read the same',
  'Espera al pulso de las 9:00': 'Wait for the 9:00 pulse',
  '¿Cuándo encaja?': 'When does it fit?',
  Pulso: 'Pulse',
  'Con los relojes iguales, el pulso de las 9:00 lo sube de la cuna al núcleo':
    'With the clocks matched, the 9:00 pulse lifts it from the cradle into the core',
  // Las tareas del bucle (plan de la llegada, hito B).
  'Primeros pasos en lo desconocido': 'First steps into the unknown',
  'Explora cada planeta del sistema': 'Explore every planet in the system',
  'Explora el edificio junto al que despertaste': 'Explore the building next to where you woke up',
  'Casa de Estudio': 'Study House',
  'La Casa de Estudio está a unos pasos de donde despertaste. Entra y mira el mural del muro de la izquierda con E':
    'The Study House is a few steps from where you woke up. Go in and look at the mural on the left wall with E',
  'La Casa de Estudio está a unos pasos de donde despertaste. Entra y toca Examinar junto al mural':
    'The Study House is a few steps from where you woke up. Go in and tap Examine by the mural',
  'Averigua dónde estás': 'Find out where you are',
  'Sala de Mando': 'Command Room',
  'La Sala de Mando está junto a La Boca. Lee su consola con E':
    'The Command Room is next to the Mouth. Read its console with E',
  'La Sala de Mando está junto a La Boca. Toca Leer junto a su consola':
    'The Command Room is next to the Mouth. Tap Read by its console',
  'La nave está donde cayó, sobre el hielo. Sube por la escalerilla con F y, en el asiento, F para pilotar':
    'The ship is where it fell, on the ice. Climb the ladder with F and, in the seat, F to fly',
  'La nave está donde cayó, sobre el hielo. Toca Subir junto a la escalerilla y, en el asiento, Pilotar':
    'The ship is where it fell, on the ice. Tap Board by the ladder and, in the seat, Fly',
  'Visita cada mundo del sistema': 'Visit every world in the system',
  'Pilotando, T elige otro mundo como objetivo; el mapa de órbitas está en la mesa de la nave. Al llegar a cada mundo, ponle nombre':
    'While flying, T picks another world as your target; the orbit map is on the ship table. Name each world when you arrive',
  'Pilotando, elige otro mundo como objetivo; el mapa de órbitas está en la mesa de la nave. Al llegar a cada mundo, ponle nombre':
    'While flying, pick another world as your target; the orbit map is on the ship table. Name each world when you arrive',
  // Lo que queda por leer en cada mundo (plan de la llegada, hito C).
  'Aún queda algo por leer aquí': 'There is still something to read here',
  'Aquí ya lo he leído todo': "I've read everything here",
};
