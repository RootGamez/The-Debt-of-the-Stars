// Qué botones táctiles hay a la vista: solo los que sirven AHORA (plan-mobile, §3.2). Lógica pura: el juego rellena
// un `TouchContext` cada fotograma y `touchControls.ts` muestra u oculta los botones según el plan que sale de aquí.

/** Lo que tienes delante dentro de la nave posada. */
export type StationKind = 'asiento' | 'registro' | 'mapa';

export interface TouchContext {
  /** El juego se está jugando: sin pausa, lectura, panel abierto ni escena. */
  playing: boolean;
  piloting: boolean;
  /** La nave está posada. */
  landed: boolean;
  /** Altura sobre el suelo pilotando; `undefined` en el espacio abierto. */
  altitude: number | undefined;
  /** El estabilizador está puesto (sin él hay alabeo). */
  stabilize: boolean;
  /** A pie dentro de la nave: el sitio que tienes delante. */
  station: StationKind | undefined;
  swimming: boolean;
}

export type TouchActionId =
  | 'jump'
  | 'swimUp'
  | 'swimDown'
  | 'station'
  | 'stand'
  | 'raise'
  | 'lower'
  | 'brake'
  | 'target'
  | 'stabilize'
  | 'camera'
  | 'rollLeft'
  | 'rollRight';

/** Por debajo de esta altura (m) el botón de bajar pasa a ser «Posarse». */
export const LANDING_ALTITUDE = 15;

export interface TouchPlan {
  readonly visible: ReadonlySet<TouchActionId>;
  /** Qué hace el botón `station` (sentarse, abrir el Registro, mirar el mapa). */
  readonly stationKind: StationKind | undefined;
  /** El botón `lower` se llama «Posarse»: estás cerca del suelo. */
  readonly landing: boolean;
}

const NOTHING: TouchPlan = { visible: new Set(), stationKind: undefined, landing: false };

export function resolveTouchActions(context: TouchContext): TouchPlan {
  if (!context.playing) return NOTHING;
  const visible = new Set<TouchActionId>();

  if (!context.piloting) {
    if (context.swimming) {
      visible.add('swimUp');
      visible.add('swimDown');
    } else {
      visible.add('jump');
    }
    if (context.station !== undefined) visible.add('station');
    return { visible, stationKind: context.station, landing: false };
  }

  visible.add('raise');
  visible.add('target');
  visible.add('stabilize');
  visible.add('camera');
  if (context.landed) {
    visible.add('stand');
    return { visible, stationKind: undefined, landing: false };
  }
  visible.add('lower');
  visible.add('brake');
  if (!context.stabilize) {
    visible.add('rollLeft');
    visible.add('rollRight');
  }
  const landing = context.altitude !== undefined && context.altitude < LANDING_ALTITUDE;
  return { visible, stationKind: undefined, landing };
}
