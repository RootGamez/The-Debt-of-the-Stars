// Constantes de la nave (decisiones 3 a 5 del plan de la Fase 5). Un solo sitio para ajustarlas al probar.

/** Aceleraciones máximas (m/s²) en cada eje de la nave. */
export const SHIP_THRUST_FORWARD = 20;
export const SHIP_THRUST_LATERAL = 14;
/** Subir o bajar. Sin estabilizador aún despega de Archivo (gravedad 14,7 m/s²). */
export const SHIP_THRUST_VERTICAL = 16;
/** Velocidad máxima respecto al marco donde vuela (m/s). */
export const SHIP_MAX_SPEED = 80;
/** Velocidad de giro máxima (rad/s) y la aceleración de giro de las teclas en modo libre (rad/s²). */
export const SHIP_MAX_TURN_RATE = 1.5;
export const SHIP_TURN_ACCEL = 4;
/** Frenado al igualar la velocidad con el objetivo (m/s²). */
export const SHIP_MATCH_ACCEL = 30;
/** Con estabilizador: lo deprisa que el ordenador persigue la velocidad de giro pedida (1/s)… */
export const SHIP_TURN_RESPONSE = 12;
/** …y la que pide por cada radián que falta para llegar a donde apuntó el ratón (1/s). */
export const SHIP_AIM_RATE = 3;
/** Modo libre: cuánta velocidad de giro (rad/s) añade cada radián de ratón. */
export const SHIP_FREE_AIM_GAIN = 2.5;

// Ayudas del estabilizador cerca de un mundo (con Z se apagan todas).
/** Lo deprisa que se enderezan las alas con el horizonte (1/s). */
export const SHIP_LEVEL_RATE = 1.5;
/** Por debajo de esta altura (m) se suaviza el descenso… */
export const SHIP_ASSIST_ALTITUDE = 40;
/** …frenando como mucho con esta aceleración (m/s²): la curva de frenado llega al suelo a la velocidad mínima… */
export const SHIP_ASSIST_BRAKE = 4;
/** …y nunca por debajo de esta (m/s): siempre se puede bajar hasta posarse. */
export const SHIP_ASSIST_MIN_DESCENT = 2.5;

// Los propulsores del Albatros II (Fase 11, src/ship/thrusters.ts): aceleración a pleno de cada tobera (m/s²).
/** Cada uno de los dos motores principales de la popa (hacia la proa). */
export const SHIP_MAIN_THRUST = 10;
/** Cada uno de los dos retrocohetes de la proa (hacia la popa: frenan). */
export const SHIP_RETRO_THRUST = 6;
/** Cada una de las cuatro toberas de sustentación de la panza (hacia arriba). */
export const SHIP_LIFT_THRUST = 7.5;
/** Las toberas de maniobra del borde: arriba y abajo… */
export const SHIP_RCS_VERTICAL_THRUST = 4;
/** …y a los lados del borde. */
export const SHIP_RCS_TANGENT_THRUST = 10;
/** Inercia de giro del disco por unidad de masa (m²) en cada eje: cabeceo (x), guiñada (y) y alabeo (z). */
export const SHIP_INERTIA = Object.freeze({ x: 6, y: 9, z: 6 });

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

/** El estabilizador empieza puesto (con Z pasa a modo libre). */
export const SHIP_STABILIZER_DEFAULT = true;
