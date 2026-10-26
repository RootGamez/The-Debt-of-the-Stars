// Constantes de la nave (decisiones 3 a 5 del plan de la Fase 5). Un solo sitio para ajustarlas al probar.

/** Aceleraciones máximas (m/s²) en cada eje de la nave. */
export const SHIP_THRUST_FORWARD = 20;
export const SHIP_THRUST_LATERAL = 14;
/** Subir o bajar: despega de Archivo (gravedad 14,7 m/s²) con margen. */
export const SHIP_THRUST_VERTICAL = 25;
/** Velocidad máxima respecto al marco donde vuela (m/s). */
export const SHIP_MAX_SPEED = 80;
/** Velocidad de giro máxima (rad/s) y lo deprisa que se alcanza o se frena (rad/s²). */
export const SHIP_MAX_TURN_RATE = 1.5;
export const SHIP_TURN_ACCEL = 4;
/** Frenado al igualar la velocidad con el objetivo (m/s²). */
export const SHIP_MATCH_ACCEL = 30;

/** La nave colisiona como una esfera (el radio sale del modelo; este es el de reserva). */
export const SHIP_DEFAULT_RADIUS = 2;
/** Por debajo de esta velocidad respecto al suelo (m/s) la nave se posa. */
export const SHIP_LAND_SPEED = 4;
/** A partir de esta velocidad respecto al suelo (m/s) un choque destruye la nave: se muere. */
export const SHIP_CRASH_SPEED = 30;
/** Cuánto rebota en un choque suave (0 = nada, 1 = elástico). */
export const SHIP_RESTITUTION = 0.25;
/** Inclinación máxima del suelo para posarse (grados respecto al "arriba" del mundo). */
export const SHIP_LAND_SLOPE_DEGREES = 35;

/** Distancia máxima a la escotilla para subir (m). */
export const BOARD_DISTANCE = 3.5;
/** La nave deja bajar si va por debajo de esta velocidad (m/s). */
export const DISEMBARK_SPEED = 0.5;

/** El estabilizador empieza puesto (con Z pasa a modo libre). */
export const SHIP_STABILIZER_DEFAULT = true;
