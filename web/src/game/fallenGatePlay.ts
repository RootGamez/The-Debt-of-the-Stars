// Los portales caídos en el juego (hito E4 de docs/plan-finales.md §3.2; ✅ la idea, 🟡 cómo se encienden, D3). Une
// los relojes fuera de hora (fallenGate.ts) con los anillos PASO_ que llevan `cerradura`: apagado, el anillo no deja
// pasar ni enseña gusano (es un anillo muerto con un reloj que parpadea); puesto en hora desde fuera (y con su evento,
// si lo pide), se enciende y deja pasar en los dos sentidos el resto del ciclo. Con cada ciclo vuelve a desfasarse.
//
// Es genérico: cada portal caído trae su `FallenGateSpec` y la hora de fuera con que se compara su reloj. Lo usan el
// del Nudo (game/laboratoryRig.ts) y, después, el de la Pista del Taller. Lógica pura (con tests); lo que se ve está en
// render/fallenGateView.ts y el lector del reloj, en ui/fallenGateClockBody.ts.
import {
  createFallenGate,
  type FallenGate,
  type FallenGateReading,
  type FallenGateSpec,
  type FallenWheel,
} from './fallenGate';

/** El reloj del anillo apagado: un destello corto cada periodo (s). */
export const GATE_BLINK = { period: 1.4, on: 0.35 } as const;
/** Lo que tarda la membrana en abrirse del todo al encenderse (s). */
export const GATE_OPENING_SECONDS = 1.6;

export interface FallenGateEntry {
  readonly spec: FallenGateSpec;
  /** La hora de fuera con que se compara su reloj (s de máquina del sitio de fuera). */
  readonly reference: () => number;
}

/** Cómo se ve un anillo caído: la membrana (0 cerrada, 1 abierta) y la luz de su hora (encendida o no). */
export interface FallenGateLook {
  readonly lit: boolean;
  readonly membrane: number;
  readonly blink: boolean;
}

export interface FallenGateStatus {
  readonly id: string;
  readonly lock: string;
  readonly lit: boolean;
  readonly litSeconds: number;
  readonly matched: boolean;
}

export interface FallenGatePlay {
  readonly gates: readonly FallenGate[];
  gate(id: string): FallenGate | undefined;
  /** El anillo con esta `cerradura` es de un portal caído (y lo decide esta capa). */
  owns(lock: string | undefined): boolean;
  /** Si el anillo deja pasar; `undefined` si su cerradura no es de un portal caído. */
  isOpen(lock: string | undefined): boolean | undefined;
  lit(id: string): boolean;
  /** La hora que debería marcar el reloj del portal y la que marca. */
  reading(id: string): FallenGateReading | undefined;
  turn(id: string, wheel: FallenWheel, steps: number): void;
  /** Una vez por fotograma (s reales). Devuelve los portales que se acaban de encender. */
  step(dt: number, events: readonly string[]): string[];
  /** Cómo se ve el anillo de esta cerradura a los `time` s; `undefined` si no es de un portal caído. */
  look(lock: string, time: number): FallenGateLook | undefined;
  /** Depuración: pone el reloj en hora (se enciende en el siguiente paso si no pide evento). */
  setOnTime(id: string): boolean;
  /** Al empezar otro ciclo: todos se apagan y vuelven a desfasarse. */
  reset(): void;
  snapshot(): FallenGateStatus[];
}

const smooth = (t: number): number => t * t * (3 - 2 * t);
const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

/** El aspecto de un anillo caído: muerto con la hora parpadeando, o abriéndose y con la hora fija. */
export function fallenGateLook(lit: boolean, litSeconds: number, time: number): FallenGateLook {
  if (!lit) {
    const t = Math.max(0, finiteOr(time, 0));
    return { lit, membrane: 0, blink: t % GATE_BLINK.period < GATE_BLINK.on };
  }
  const opened = Math.min(1, Math.max(0, finiteOr(litSeconds, 0)) / GATE_OPENING_SECONDS);
  return { lit, membrane: smooth(opened), blink: true };
}

export function createFallenGatePlay(entries: readonly FallenGateEntry[]): FallenGatePlay {
  const gates = entries.map((entry) => createFallenGate(entry.spec));
  const referenceOf = new Map(entries.map((entry) => [entry.spec.id, entry.reference]));
  const byId = (id: string): FallenGate | undefined => gates.find((g) => g.spec.id === id);
  const byLock = (lock: string | undefined): FallenGate | undefined =>
    lock === undefined ? undefined : gates.find((g) => g.spec.lock === lock);
  const reading = (gate: FallenGate): FallenGateReading =>
    gate.read(referenceOf.get(gate.spec.id)?.() ?? 0);

  return {
    gates,
    gate: byId,
    owns: (lock) => byLock(lock) !== undefined,
    isOpen: (lock) => byLock(lock)?.canCross('in'),
    lit: (id) => byId(id)?.isLit ?? false,
    reading(id) {
      const gate = byId(id);
      return gate ? reading(gate) : undefined;
    },
    turn(id, wheel, steps) {
      byId(id)?.turn(wheel, steps);
    },
    step(dt, events) {
      const lit: string[] = [];
      for (const gate of gates) {
        const before = gate.isLit;
        gate.step(dt, { reference: referenceOf.get(gate.spec.id)?.() ?? 0, events });
        if (gate.isLit && !before) lit.push(gate.spec.id);
      }
      return lit;
    },
    look(lock, time) {
      const gate = byLock(lock);
      return gate ? fallenGateLook(gate.isLit, gate.litSeconds, time) : undefined;
    },
    setOnTime(id) {
      const gate = byId(id);
      if (!gate) return false;
      const { shown, target } = reading(gate);
      gate.turn('seconds', target - shown);
      return true;
    },
    reset() {
      for (const gate of gates) gate.reset();
    },
    snapshot: () =>
      gates.map((gate) => ({
        id: gate.spec.id,
        lock: gate.spec.lock,
        lit: gate.isLit,
        litSeconds: gate.litSeconds,
        matched: reading(gate).matched,
      })),
  };
}
