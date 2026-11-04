// Bucear en el juego (Fase 11E, el mar del Archivo): con la cabeza bajo el agua se gasta el aire (su indicador
// aparece al empezar a gastarlo) y la vista se vuelve azul y oscura al bajar. Quedarse sin aire es la muerte
// `ahogado`. Las cuentas están en physics/water.ts (con tests); esto lo cubre e2e/archivo.spec.ts.
import type { Vector3 } from 'three';
import { Breath, headUnder, type WaterBody } from '../physics/water';
import { t } from '../i18n';

/** Profundidad (m) a la que el azul llega a su máximo. */
const DARK_DEPTH = 14;

export interface DiveFrame {
  /** El mar del mundo donde estás (`undefined` = sin mar, o pilotando). */
  water: WaterBody | undefined;
  feet: Vector3;
  up: Vector3;
  /** El ciclo corre (sin pausa ni lectura): solo entonces se gasta el aire. */
  running: boolean;
}

export interface Diving {
  /** Una vez por fotograma; devuelve `true` en el instante en que se acaba el aire. */
  update(frame: DiveFrame, dt: number): boolean;
  reset(): void;
  snapshot(): { underwater: boolean; breath: number };
  dispose(): void;
}

export function createDiving(): Diving {
  const breath = new Breath();
  let underwater = false;

  const veil = document.createElement('div');
  veil.className = 'water-veil';
  veil.setAttribute('aria-hidden', 'true');
  const meter = document.createElement('div');
  meter.className = 'breath';
  meter.hidden = true;
  const label = document.createElement('span');
  label.className = 'breath-label';
  label.textContent = 'aire';
  const bar = document.createElement('div');
  bar.className = 'breath-bar';
  bar.setAttribute('role', 'meter');
  bar.setAttribute('aria-label', t('Aire que queda'));
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  const fill = document.createElement('div');
  fill.className = 'breath-fill';
  bar.append(fill);
  meter.append(label, bar);
  document.body.append(veil, meter);
  let shown = -1;

  return {
    update(frame, dt) {
      const { water } = frame;
      underwater = water !== undefined && headUnder(frame.feet, frame.up, water);
      const drowned = frame.running && breath.update(underwater, dt);
      const depth = water ? water.level - frame.feet.distanceTo(water.center) : 0;
      veil.style.opacity = underwater
        ? String(0.3 + 0.45 * Math.min(1, Math.max(0, depth) / DARK_DEPTH))
        : '0';
      meter.hidden = breath.fraction >= 1;
      const percent = Math.round(breath.fraction * 100);
      if (percent !== shown) {
        shown = percent;
        fill.style.width = `${String(percent)}%`;
        bar.setAttribute('aria-valuenow', String(percent));
        meter.classList.toggle('breath-low', percent < 25);
      }
      return drowned;
    },
    reset() {
      breath.reset();
      underwater = false;
      veil.style.opacity = '0';
    },
    snapshot() {
      return { underwater, breath: breath.seconds };
    },
    dispose() {
      veil.remove();
      meter.remove();
    },
  };
}
