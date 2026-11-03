// Constantes de movimiento y gravedad (decisiones 5 y 6 del plan de la Fase 2).
// Un solo sitio para ajustarlas al probar la sensación del juego.

/** Gravedad base en m/s²; cada mundo la multiplica por su "gravedad" (Umbral 1,0, Archivo 1,5…). */
export const G_BASE = 9.8;
/** La gravedad cae linealmente hasta este número de radios por encima de la superficie. */
export const GRAVITY_RANGE_RADII = 2;

export const WALK_SPEED = 4; // m/s
export const RUN_SPEED = 6.5; // m/s
/** Altura de salto en gravedad 1,0 (m). La velocidad de salto se fija con esta referencia. */
export const JUMP_HEIGHT = 1.2;
export const JUMP_SPEED = Math.sqrt(2 * G_BASE * JUMP_HEIGHT);

export const GROUND_ACCELERATION = 40; // m/s²: alcanza la velocidad en ~0,1 s
export const AIR_ACCELERATION = 8; // m/s²: control reducido en el aire
/** Pendiente máxima por la que se puede caminar (grados respecto al "arriba"). */
export const MAX_SLOPE_DEGREES = 45;
/** Distancia máxima a la que se "pega" al suelo al bajar cuestas o pasar bordes pequeños. */
export const GROUND_SNAP_DISTANCE = 0.4;
/** Un salto pulsado justo antes de aterrizar se recuerda este tiempo (s). */
export const JUMP_BUFFER_SECONDS = 0.1;
/** Tras dejar el suelo sin saltar (borde), aún se puede saltar durante este tiempo (s). */
export const COYOTE_SECONDS = 0.1;
/** Velocidad máxima absoluta (m/s): protege los subpasos de colisión ante valores absurdos. */
export const MAX_SPEED = 60;

// Cuerpo del jugador (cápsula) y cámara.
export const PLAYER_RADIUS = 0.35;
export const PLAYER_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.6;
export const FIELD_OF_VIEW = 75;
export const MAX_PITCH_DEGREES = 85;

// Nadar y bucear (Fase 11E, el mar del Archivo).
/** Con más de esta fracción del cuerpo bajo el agua se nada en vez de andar. */
export const SWIM_SUBMERSION = 0.45;
/** En reposo se flota con esta fracción del cuerpo dentro: los ojos quedan fuera. */
export const FLOAT_LINE = 0.8;
/** El empuje del agua llega como mucho a este múltiplo de la gravedad (bien hundido, se sube despacio). */
export const MAX_BUOYANCY = 1.25;
export const SWIM_SPEED = 3; // m/s
export const SWIM_ACCELERATION = 6; // m/s²
/** Empuje al bucear (Mayús) o al subir (Espacio), en m/s². */
export const SWIM_VERTICAL_ACCELERATION = 12;
/** Freno del agua: lineal (1/s) y cuadrático (1/m), para que una caída al mar no llegue al fondo como un golpe. */
export const WATER_DRAG = 2.5;
export const WATER_DRAG_QUADRATIC = 0.3;
/** 🟡 El aire que se aguanta bajo el agua (s) y lo que tarda en recuperarse entero al sacar la cabeza. */
export const BREATH_SECONDS = 40;
export const BREATH_REFILL_SECONDS = 3;

/** Velocidad a la que el "arriba" del jugador sigue a la gravedad (1/s). */
export const UP_ALIGN_RATE = 8;

/** Física a 60 Hz con un máximo de pasos por fotograma. */
export const PHYSICS_STEP = 1 / 60;
export const MAX_PHYSICS_STEPS_PER_FRAME = 5;

/** Más allá de este número de radios del centro, el jugador reaparece. */
export const RESPAWN_DISTANCE_RADII = 3;

/** Radianes de giro por píxel de ratón y por píxel de arrastre táctil. */
export const MOUSE_LOOK_SENSITIVITY = 0.0022;
export const TOUCH_LOOK_SENSITIVITY = 0.005;
