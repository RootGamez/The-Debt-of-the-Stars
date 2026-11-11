// Los sonidos del Albatros II como lógica pura: de lo que hace la nave (empuje de cada una de sus toberas, escotilla,
// si está posada, golpes) a qué suena y cuándo. Cada grupo de toberas tiene un rugido continuo que sigue al empuje;
// cada tobera, un golpe cuando se enciende, colocado en el estéreo donde está en el casco; y la escotilla, el
// arranque, el aterrizaje y los choques, uno por cada vez. `audio/shipSound.ts` solo traduce esto a samples.
import { THRUSTERS, type ThrusterGroup } from '../ship/thrusters';
import type { PlayOptions } from './samplePlayer';

export interface ShipAudioFrame {
  dt: number;
  /** El jugador está sentado a los mandos. */
  piloting: boolean;
  /** La nave reposa en el suelo. */
  landed: boolean;
  /** Velocidad de la nave (m/s). */
  speed: number;
  /** Empuje de cada tobera, 0–1, en el orden de `THRUSTERS`. */
  levels: ArrayLike<number>;
  /** Lo abierta que está la escotilla (0–1). */
  hatch: number;
  /** Velocidad del golpe contra el suelo en este fotograma (0 = sin golpe). */
  impact: number;
  /** Ese golpe fue un choque que destruye la nave. */
  crashed: boolean;
  /** El tiempo no corre (pausa, lectura, Registro): los rugidos callan en vez de quedarse con el último empuje. */
  paused?: boolean;
}

export interface ShipSound {
  id: string;
  options: PlayOptions;
}

export interface LoopTarget {
  /** Volumen al que debe sonar el rugido de ese grupo (0 = callado). */
  level: number;
  /** Velocidad de reproducción: más aguda cuanto más empuja. */
  rate: number;
}

export interface ShipAudioOutput {
  sounds: readonly ShipSound[];
  loops: Record<ThrusterGroup, LoopTarget>;
}

export interface ShipAudio {
  update(frame: ShipAudioFrame): ShipAudioOutput;
  /**
   * La nave se recoloca de golpe (ciclo nuevo, muerte): lo siguiente que se vea es el punto de partida, no un
   * cambio, así que no suena el arranque, el aterrizaje ni la escotilla de ese salto.
   */
  reset(): void;
}

/** Una tobera se considera encendida al pasar de ON y apagada al bajar de OFF (así el temblor no la reenciende). */
const IGNITE_ON = 0.15;
const IGNITE_OFF = 0.05;
/** Lo mínimo (s) entre dos encendidos de la misma tobera. */
const MIN_REPEAT = 0.25;
/** Hasta dónde se reparte el estéreo: una tobera a esta distancia (m) del eje suena del todo a un lado. */
const PAN_REACH = 3;
const HATCH_EPSILON = 1e-4;
/** Golpes: lo que no se oye, el corte entre suave y fuerte (m/s) y el tiempo entre dos golpes (s). */
const HIT_MIN = 1;
const HIT_HEAVY = 6;
const HIT_COOLDOWN = 0.4;
/** Llegar al suelo más deprisa que esto es un aterrizaje fuerte (m/s). */
const TOUCHDOWN_HARD = 4;
const LOOP_RATE_BASE = 0.85;
const LOOP_RATE_SPAN = 0.35;

const GROUPS: readonly ThrusterGroup[] = ['main', 'retro', 'lift', 'rcs'];
const NONE: readonly ShipSound[] = Object.freeze([]);

/** El golpe de encendido de cada grupo: qué sample y con qué fuerza y tono. */
const IGNITION: Readonly<Record<ThrusterGroup, ShipSound>> = {
  main: { id: 'thr.ignite', options: { volume: 0.8, rate: 1 } },
  retro: { id: 'thr.ignite', options: { volume: 0.6, rate: 1 } },
  lift: { id: 'thr.ignite', options: { volume: 0.7, rate: 0.9 } },
  rcs: { id: 'thr.puff', options: { volume: 0.7, rate: 1 } },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function quiet(): Record<ThrusterGroup, LoopTarget> {
  return {
    main: { level: 0, rate: 1 },
    retro: { level: 0, rate: 1 },
    lift: { level: 0, rate: 1 },
    rcs: { level: 0, rate: 1 },
  };
}

export function createShipAudio(): ShipAudio {
  const lit = new Array<boolean>(THRUSTERS.length).fill(false);
  const lastIgnition = new Array<number>(THRUSTERS.length).fill(-Infinity);
  const loops = quiet();
  let clock = 0;
  let lastHit = -Infinity;
  let previous: { piloting: boolean; landed: boolean; hatch: number; speed: number } | undefined;
  let hatchDirection = 0;

  return {
    update(frame) {
      clock += frame.dt;
      const sounds: ShipSound[] = [];
      const before = previous;
      previous = {
        piloting: frame.piloting,
        landed: frame.landed,
        hatch: frame.hatch,
        speed: frame.speed,
      };

      let touchedDown = false;
      if (before) {
        if (frame.piloting !== before.piloting) {
          sounds.push({ id: frame.piloting ? 'ship.power.up' : 'ship.power.down', options: {} });
        }
        if (frame.landed && !before.landed) {
          touchedDown = true;
          sounds.push({
            id: before.speed > TOUCHDOWN_HARD ? 'ship.touchdown.hard' : 'ship.touchdown.soft',
            options: {},
          });
        }
        const delta = frame.hatch - before.hatch;
        if (Math.abs(delta) <= HATCH_EPSILON) {
          hatchDirection = 0;
        } else if (Math.sign(delta) !== hatchDirection) {
          hatchDirection = Math.sign(delta);
          sounds.push({
            id: hatchDirection > 0 ? 'ship.hatch.open' : 'ship.hatch.close',
            options: {},
          });
        }
      }

      // El toque que posa la nave ya suena como aterrizaje; solo un choque o un golpe fuerte suenan además.
      const hit = !touchedDown || frame.crashed || frame.impact >= HIT_HEAVY;
      if (hit && frame.impact > HIT_MIN && clock - lastHit >= HIT_COOLDOWN) {
        lastHit = clock;
        const id = frame.crashed
          ? 'ship.crash'
          : frame.impact >= HIT_HEAVY
            ? 'ship.hit.heavy'
            : 'ship.hit.light';
        sounds.push({ id, options: {} });
      }

      const strongest = { main: 0, retro: 0, lift: 0, rcs: 0 };
      THRUSTERS.forEach((thruster, i) => {
        const level = frame.piloting && !frame.paused ? clamp(frame.levels[i] ?? 0, 0, 1) : 0;
        strongest[thruster.group] = Math.max(strongest[thruster.group], level);
        if (level < IGNITE_OFF) lit[i] = false;
        if (!lit[i] && level >= IGNITE_ON && clock - (lastIgnition[i] ?? -Infinity) >= MIN_REPEAT) {
          lit[i] = true;
          lastIgnition[i] = clock;
          const base = IGNITION[thruster.group];
          sounds.push({
            id: base.id,
            options: { ...base.options, pan: clamp(thruster.position.x / PAN_REACH, -1, 1) },
          });
        }
      });
      for (const group of GROUPS) {
        loops[group].level = strongest[group];
        loops[group].rate = LOOP_RATE_BASE + LOOP_RATE_SPAN * strongest[group];
      }

      return { sounds: sounds.length > 0 ? sounds : NONE, loops };
    },
    reset() {
      previous = undefined;
      hatchDirection = 0;
      lit.fill(false);
    },
  };
}
