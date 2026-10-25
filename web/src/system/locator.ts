// Dónde está el jugador para el reloj del ciclo: en qué mundo, con qué ritmo de tiempo y si la absorción
// lo ha alcanzado en el espacio abierto. Junta las órbitas, la influencia y la cronología; el director del
// ciclo solo ve el resultado (`Locale`).
import { Vector3 } from 'three';
import { rateAt } from '../core/clockRates';
import type { Locale } from '../core/loopDirector';
import type { Chronology } from '../core/timeline';
import {
  absorptionFrontRadius,
  clockRateAt,
  isEngulfed,
  overallAbsorptionWindow,
  type ClockBody,
} from './influence';
import { bodyPose, createPose } from './orbits';
import type { SystemSpec } from './systemData';

/** El agujero negro nace en el mundo de la maquinaria (CONTEXTO_PLANETAS.md §6). */
const BLACK_HOLE_WORLD = 'cicatriz';
/** El frente llega siempre un poco más allá del último mundo. */
const FRONT_MARGIN = 100;

/** Datos de un mundo que salen de su modelo de Blender. */
export interface WorldBody {
  world: string;
  radius: number;
  clockRate: number;
}

export interface Locator {
  /**
   * @param t Reloj de Umbral.
   * @param referenceWorld Mundo en cuya esfera estás (`undefined` = espacio abierto).
   * @param systemPosition Tu posición en el marco del sistema.
   * El resultado se reutiliza en la llamada siguiente: no lo guardes.
   */
  locate(t: number, referenceWorld: string | undefined, systemPosition: Vector3): Locale;
}

export function createLocator(
  system: SystemSpec,
  worlds: readonly WorldBody[],
  chronology: Chronology,
): Locator {
  const entries = system.bodies.flatMap((spec) => {
    const info = worlds.find((w) => w.world === spec.world);
    return info ? [{ spec, info, pose: createPose() }] : [];
  });
  const clockBodies: ClockBody[] = entries.map(({ info }) => ({
    center: new Vector3(),
    radius: info.radius,
    rate: info.clockRate,
  }));

  const window = overallAbsorptionWindow(chronology.absorption);
  const birthplace = system.bodyOf(BLACK_HOLE_WORLD);
  const frontOrigin = new Vector3();
  if (window && birthplace) frontOrigin.copy(bodyPose(birthplace, window[0]).position);
  const maxRadius =
    Math.max(0, ...system.bodies.map((b) => b.orbitRadius)) +
    (birthplace?.orbitRadius ?? 0) +
    FRONT_MARGIN;

  const locale: Locale = { worldId: undefined, rate: 1, engulfed: false };

  return {
    locate(t, referenceWorld, systemPosition) {
      entries.forEach(({ spec, info, pose }, i) => {
        const body = clockBodies[i];
        if (!body) return;
        bodyPose(spec, t, pose);
        body.center.copy(pose.position);
        body.rate = rateAt(info.clockRate, chronology.clocks[spec.world], t);
      });
      locale.worldId = referenceWorld;
      locale.rate = clockRateAt(systemPosition, clockBodies);
      locale.engulfed =
        referenceWorld === undefined &&
        window !== undefined &&
        isEngulfed(systemPosition, frontOrigin, absorptionFrontRadius(window, t, maxRadius));
      return locale;
    },
  };
}

/** Para un mundo suelto (Hogar, Luna): siempre estás en él y el ritmo es el suyo, con su curva. */
export function createStandaloneLocator(
  world: WorldBody,
  chronology: Chronology,
): (t: number) => Locale {
  const locale: Locale = { worldId: world.world, rate: world.clockRate, engulfed: false };
  return (t) => {
    locale.rate = rateAt(world.clockRate, chronology.clocks[world.world], t);
    return locale;
  };
}
