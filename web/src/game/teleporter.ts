// El portal de la Pista del Taller (Fase 11F; ✅ Anthony 2026-11-03): el anillo de la Pista de Pruebas lleva a la
// Sala del Centro, dentro del gigante, pero solo se enciende durante la secuencia de las 7:00 (cuando los puentes
// de luz unen las islas) y si el reloj de la Pista marca la hora del Taller. Desde E4 es un portal caído más: el
// reloj, las ruedas y la cerradura los lleva game/fallenGate.ts (`TALLER_GATE`, con tests) y los monta
// game/trackGateRig.ts; aquí quedan solo los datos del anillo. El reloj empieza cada ciclo desajustado (🟡 el error)
// y se ajusta con dos ruedas, como la cuna del Contrapeso: solo hay que comparar dos relojes, nada de cuentas.

export const TELEPORTER = {
  world: 'taller',
  /** La `cerradura` de los dos anillos PASO_ (el de la Pista y el de la Sala del Centro). */
  lock: 'pista',
  /** El evento de la cronología durante el que se puede encender. */
  event: 'secuencia_fabrica',
  /** La fuente con el reloj y sus ruedas. */
  source: 'taller.pista',
  /** Nombre de la malla del velo de luz del anillo (se ve solo cuando está encendido). */
  portal: 'Taller_Portal',
} as const;

/** Cuánto va adelantado el reloj de la Pista al empezar cada ciclo (s): 3 min 17 s (🟡). */
export const TRACK_ERROR = 197;
/** Lo que mueve cada rueda por paso (s). */
export const TRACK_WHEELS = { minutes: 60, seconds: 1 } as const;
/** Margen para dar el reloj por ajustado (s). */
export const TRACK_TOLERANCE = 2;
