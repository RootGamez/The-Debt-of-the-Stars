// Cuándo salpica el agua (Fase 11E; vale para cualquier mundo con mar): al caer en ella, al salir de un salto,
// al sacar la cabeza, al nadar o vadear (ondas) y al bucear (burbujas). También la nave al posarse en el mar o al
// moverse sobre él. Decide a partir de cómo cambia cada cuerpo de un fotograma a otro; lo que se ve lo pinta
// render/waterEffects.ts.
import { Vector3 } from 'three';
import { headUnder, submersion, surfacePoint, type WaterBody } from '../physics/water';
import type { WaterEffects } from '../render/waterEffects';

/** Velocidad hacia abajo (m/s) desde la que caer al agua salpica, y la que da una salpicadura de fuerza 1. */
const SPLASH_FROM = 1.2;
const SPLASH_FULL = 7;
/** Cada cuánto deja una onda quien nada o vadea moviéndose y quien flota quieto (s). */
const WAKE_EVERY = 0.3;
const FLOAT_EVERY = 1.5;
/** Cada cuánto suelta burbujas quien bucea (s). */
const BUBBLE_EVERY = 0.7;
/** Por encima de esta velocidad sobre el agua (m/s) se deja estela. */
const MOVING = 0.4;

export interface WaterBodyFrame {
  /** Pies (o la nave) y su arriba, en el marco del mundo. */
  position: Vector3;
  up: Vector3;
  /** Es la nave: toca el agua con la panza y salpica más; el jugador se mide por lo que tiene dentro. */
  ship: boolean;
}

export interface WaterPlay {
  /** Una vez por fotograma; sin mar (o al cambiar de mundo) se olvida lo de antes. */
  update(water: WaterBody | undefined, body: WaterBodyFrame, dt: number): void;
  reset(): void;
}

export function createWaterPlay(
  effects: WaterEffects,
  random: () => number = Math.random,
): WaterPlay {
  const previous = new Vector3();
  const velocity = new Vector3();
  const surface = new Vector3();
  const head = new Vector3();
  let known = false;
  let lastWet = 0;
  let wasUnder = false;
  let lastShip = false;
  let wake = 0;
  let bubble = 0;

  const forget = () => {
    known = false;
    lastWet = 0;
    wasUnder = false;
    wake = 0;
    bubble = 0;
  };

  return {
    update(water, body, dt) {
      if (!water || dt <= 0 || body.ship !== lastShip) {
        lastShip = body.ship;
        forget();
        if (!water) return;
      }
      const { position, up } = body;
      if (known) velocity.subVectors(position, previous).divideScalar(dt);
      else velocity.set(0, 0, 0);
      previous.copy(position);
      const first = !known;
      known = true;

      // La nave cuenta como mojada en cuanto su panza toca el agua; el jugador, por lo que tiene dentro.
      const wet = body.ship
        ? submersion(position, up, water) > 0
          ? 1
          : 0
        : submersion(position, up, water);
      const under = !body.ship && headUnder(position, up, water);
      const down = -velocity.dot(up);
      const planar = Math.sqrt(Math.max(0, velocity.lengthSq() - down * down));
      surfacePoint(position, water, surface);

      if (!first) {
        if (lastWet < 0.05 && wet >= 0.05 && down > SPLASH_FROM) {
          effects.splash(surface, up, (body.ship ? 1.4 : 1) * (down / SPLASH_FULL));
        } else if (lastWet > 0.3 && wet < 0.05 && -down > 1) {
          effects.splash(surface, up, 0.25); // sale de un salto
        }
        if (wasUnder && !under) {
          effects.splash(surface, up, 0.2); // saca la cabeza
        } else if (!wasUnder && under) {
          effects.bubbles(head.copy(position).addScaledVector(up, 1.4), up, 10);
        }
      }

      // Ondas al nadar, vadear o pasar con la nave rozando el agua; una de vez en cuando al flotar quieto.
      wake -= dt;
      if (wet > 0.02 && !under && wake <= 0) {
        const moving = planar > MOVING;
        effects.ripple(surface, up, body.ship ? 3 : moving ? 1.3 : 0.9);
        if (moving && planar > 2.5) effects.splash(surface, up, 0.08);
        wake = moving ? WAKE_EVERY : FLOAT_EVERY;
      }
      bubble -= dt;
      if (under && bubble <= 0) {
        effects.bubbles(
          head.copy(position).addScaledVector(up, 1.55),
          up,
          2 + Math.floor(random() * 3),
        );
        bubble = BUBBLE_EVERY * (0.6 + random() * 0.8);
      }
      lastWet = wet;
      wasUnder = under;
    },
    reset() {
      forget();
      effects.clear();
    },
  };
}
