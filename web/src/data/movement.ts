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

// Cuerpo del jugador (cápsula) y cámara.
export const PLAYER_RADIUS = 0.35;
export const PLAYER_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.6;
export const FIELD_OF_VIEW = 75;
export const MAX_PITCH_DEGREES = 85;

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
