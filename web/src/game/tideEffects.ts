// Las mareas en el juego: de dónde salen (el Borde de Cicatriz, la semilla y la cáscara del Nudo, el agujero
// negro sobre el mundo que se está tragando y, con el Contrapeso, la cercanía de su horizonte estable), cómo se
// notan (la vista se ensancha, los bordes de la pantalla se oscurecen y andar cuesta) y la tensión que se
// acumula, con su indicador. Las cuentas están en physics/tides.ts (con tests); esto lo cubre e2e/tides.spec.ts.
import type { PerspectiveCamera, Vector3 } from 'three';
import type { MoveIntent } from '../core/input';
import { FIELD_OF_VIEW } from '../data/movement';
import { insideCavity } from '../physics/gravity';
import { coreTide, edgeTide, seedTide, shellTide, speedFactor, TideStrain } from '../physics/tides';
import { holeTide, horizonTide } from '../system/absorption';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { t } from '../i18n';

/** Cuánto se ensancha la vista con la marea (fracción del campo de visión por unidad de marea). */
const FOV_STRETCH = 0.18;
/** Rapidez con que la vista sigue a la marea (1/s). */
const FOV_RATE = 3;
/** Por debajo de esto no se muestra el indicador. */
const SHOW_TIDE = 0.12;

export interface TideSources {
  /** El Borde de Cicatriz: mundo y posición en el marco de ese mundo (si existe). */
  edge: { world: string; position: Vector3 } | undefined;
  /** El palco (Fase 8D): ahí la marea del agujero se nota, pero no mata. */
  palco: string | undefined;
}

export interface TideFrame {
  /** Mundo en cuyo marco está `position` (`undefined` = espacio abierto: sin marea). */
  world: WorldRuntime | undefined;
  /** Pies del jugador (o la nave, pilotando) en el marco de `world`. */
  position: Vector3;
  loopTime: number;
  /** Avance de la absorción del mundo donde estás (0–1): la marea del agujero negro (Fase 8C). */
  absorption: number;
  /** Lo cerca que se está del horizonte estable (0–1, `horizonCloseness`; Fase 10D): se nota, no mata. */
  horizon?: number;
  /**
   * El Contrapeso sujeta el agujero (hay horizonte estable): el micro agujero del núcleo de Cicatriz ya no crece y
   * su marea es solo la del horizonte, que se nota y no mata (así se puede bajar a él con la nave).
   */
  stableHole?: boolean;
  /** El ciclo corre (sin pausa ni lectura): solo entonces se acumula la tensión. */
  running: boolean;
  piloting: boolean;
}

export interface TideEffects {
  /** Una vez por fotograma; devuelve `true` si la tensión llegó al máximo (muerte `marea`). */
  update(frame: TideFrame, dt: number): boolean;
  /** La intención de movimiento, frenada por la marea. */
  slow(intent: MoveIntent): MoveIntent;
  reset(): void;
  snapshot(): { tide: number; strain: number };
  dispose(): void;
}

/** La marea en un fotograma (sin acumular): exportada para los tests. */
export function tideOf(frame: TideFrame, sources: TideSources): number {
  const { world, position, loopTime, piloting, absorption } = frame;
  const near = horizonTide(frame.horizon ?? 0);
  if (!world) return near;
  let tide = Math.max(near, holeTide(absorption, world.id === sources.palco));
  const { edge } = sources;
  if (edge && world.id === edge.world && !piloting) {
    tide = Math.max(tide, edgeTide(position.distanceTo(edge.position), loopTime));
  }
  const { innerRadius } = world.well;
  if (innerRadius !== undefined) {
    const distance = position.distanceTo(world.well.center);
    if (world.world.info.cavityTide === 'nucleo') {
      // Cicatriz: el micro agujero del centro; por fuera, su cáscara no tira de nada.
      // Con el agujero sujeto por el Contrapeso, su marea es la del horizonte estable (`near`).
      return insideCavity(position, world.well) && frame.stableHole !== true
        ? Math.max(tide, coreTide(distance, loopTime))
        : tide;
    }
    tide = Math.max(
      tide,
      insideCavity(position, world.well)
        ? seedTide(innerRadius - distance)
        : shellTide(distance, world.well.radius),
    );
  }
  return tide;
}

export function createTideEffects(camera: PerspectiveCamera, sources: TideSources): TideEffects {
  const strain = new TideStrain();
  let tide = 0;
  let stretch = 0;

  const vignette = document.createElement('div');
  vignette.className = 'tide-vignette';
  vignette.setAttribute('aria-hidden', 'true');
  const meter = document.createElement('div');
  meter.className = 'tide';
  meter.hidden = true;
  const label = document.createElement('span');
  label.className = 'tide-label';
  label.textContent = t('tensión');
  const bar = document.createElement('div');
  bar.className = 'tide-bar';
  bar.setAttribute('role', 'meter');
  bar.setAttribute('aria-label', t('Tensión de la marea'));
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  const fill = document.createElement('div');
  fill.className = 'tide-fill';
  bar.append(fill);
  meter.append(label, bar);
  document.body.append(vignette, meter);
  let shownStrain = -1;

  return {
    update(frame, dt) {
      tide = tideOf(frame, sources);
      const lethal = frame.running ? strain.update(tide, dt) : strain.value >= 1;
      // La vista se estira con la marea (suave, para no marear).
      stretch += (Math.min(tide, 1.4) - stretch) * Math.min(1, FOV_RATE * dt);
      const fov = FIELD_OF_VIEW * (1 + FOV_STRETCH * stretch);
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      vignette.style.opacity = String(Math.min(1, stretch) * 0.7);
      meter.hidden = tide < SHOW_TIDE && strain.value <= 0;
      const percent = Math.round(strain.value * 100);
      if (percent !== shownStrain) {
        shownStrain = percent;
        fill.style.width = `${String(percent)}%`;
        bar.setAttribute('aria-valuenow', String(percent));
      }
      return lethal;
    },
    slow(intent) {
      const factor = speedFactor(tide);
      return factor === 1 ? intent : { ...intent, x: intent.x * factor, z: intent.z * factor };
    },
    reset() {
      strain.reset();
      tide = 0;
    },
    snapshot() {
      return { tide, strain: strain.value };
    },
    dispose() {
      vignette.remove();
      meter.remove();
    },
  };
}
