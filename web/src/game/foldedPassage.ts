// Las Puertas plegadas en el juego: si los pies cruzan un anillo PASO_, el jugador aparece delante del
// gemelo (en la otra cara de la cáscara del Nudo), con un destello breve. La lógica del cruce está en
// worlds/gates.ts (con tests); esto lo cubren las pruebas de Playwright (e2e/nudo.spec.ts).
import { Vector3 } from 'three';
import type { Player } from '../core/player';
import { lookAlong } from '../physics/surfaceFrame';
import { findCrossing, gateArrival, REFOLD_SECONDS, type Gate } from '../worlds/gates';
import type { WorldRuntime } from '../worlds/worldRuntime';

/** Desde cuánto por encima del punto de llegada se busca el suelo, y hasta qué profundidad (m). */
const PROBE_ABOVE = 2;
const PROBE_DEPTH = 8;
const FLASH_CLASS = 'fold-flash-on';

export interface FoldedPassage {
  /**
   * Una vez por fotograma, a pie y con el juego en marcha. Devuelve si el jugador cruzó. Por un anillo que
   * `isOpen` da por cerrado se pasa de largo (el teletransportador del Taller, fuera de su momento).
   */
  update(world: WorldRuntime, player: Player, isOpen?: (gate: Gate) => boolean): boolean;
  /** Olvida dónde estaban los pies (cambio de mundo, reinicio o teletransporte de depuración). */
  reset(feet: Vector3): void;
  /** Cruces hechos (depuración y pruebas). */
  readonly crossings: number;
  dispose(): void;
}

export function createFoldedPassage(): FoldedPassage {
  const flash = document.createElement('div');
  flash.className = 'fold-flash';
  flash.setAttribute('aria-hidden', 'true');
  document.body.append(flash);
  flash.addEventListener('animationend', () => {
    flash.classList.remove(FLASH_CLASS);
  });
  const lastFeet = new Vector3();
  let known = false;
  let crossings = 0;
  /** Momento (s, reloj real) a partir del cual se puede volver a cruzar. */
  let refoldAt = 0;

  function flashOnce(): void {
    flash.classList.remove(FLASH_CLASS);
    flash.getBoundingClientRect(); // fuerza el recálculo: la animación vuelve a empezar aunque ya estuviera
    flash.classList.add(FLASH_CLASS);
  }

  return {
    update(world, player, isOpen) {
      const feet = player.state.position;
      const now = performance.now() / 1000;
      const gate =
        known && now >= refoldAt ? findCrossing(lastFeet, feet, world.gates, isOpen) : undefined;
      lastFeet.copy(feet);
      known = true;
      if (!gate) return false;
      const twin = world.gates.find((g) => g.name === gate.target);
      if (!twin) return false;
      const arrival = gateArrival(twin);
      const above = arrival.feet.clone().addScaledVector(arrival.up, PROBE_ABOVE);
      const down = arrival.up.clone().negate();
      const distance = world.collision.raycast(above, down, PROBE_DEPTH);
      const landing = distance === null ? arrival.feet : above.addScaledVector(down, distance);
      player.moveTo(landing, lookAlong(arrival.up, arrival.forward));
      lastFeet.copy(landing);
      refoldAt = now + REFOLD_SECONDS;
      crossings++;
      flashOnce();
      return true;
    },
    reset(feet) {
      lastFeet.copy(feet);
      known = true;
    },
    get crossings() {
      return crossings;
    },
    dispose() {
      flash.remove();
    },
  };
}
