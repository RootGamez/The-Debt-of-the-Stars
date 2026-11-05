// Gravedad esférica: cada mundo es un pozo que atrae hacia su centro.
// Fuerza completa hasta la superficie y caída lineal hasta `range` metros por encima (cómoda para jugar).
// Los mundos huecos (el Nudo) tienen además una cavidad: dentro, la gravedad empuja hacia fuera, contra la
// cara interior, y se camina por dentro de la esfera con la cabeza hacia el centro.
import { Vector3 } from 'three';
import { holePull, type CavityHole } from './cavityThroat';
import { G_BASE, GRAVITY_RANGE_RADII } from '../data/movement';
import type { WorldInfo } from '../worlds/markers';

export interface GravityWell {
  center: Vector3;
  /** Radio del planeta (m). En un mundo hueco, el de su cáscara por fuera. */
  radius: number;
  /** Aceleración en la superficie (m/s²). */
  strength: number;
  /** Distancia sobre la superficie en la que la gravedad cae a cero (m). */
  range: number;
  /** Solo los mundos huecos: radio de la cara interior de la cavidad (m). */
  innerRadius?: number | undefined;
  /** Solo los mundos huecos: bajo este radio la gravedad empuja hacia fuera (por defecto, a mitad de la cáscara). */
  cavityLimit?: number | undefined;
  /** Solo los mundos huecos con agujeros (los ojos de Cicatriz): dentro de ellos la gravedad se tuerce. */
  holes?: readonly CavityHole[] | undefined;
  /** Solo los gigantes de gas: radio de la sala del centro, donde también se puede estar de pie (m). */
  core?: number | undefined;
}

/**
 * Fracción de la cavidad, alrededor del centro, donde la gravedad hacia fuera se apaga poco a poco (en el
 * centro no tiene dirección). Más arriba que eso no se llega saltando.
 */
const CAVITY_CORE = 0.25;

const toCenter = new Vector3();
const pull = new Vector3();

export function wellForWorld(info: WorldInfo, center = new Vector3()): GravityWell {
  return {
    center,
    radius: info.radius,
    strength: G_BASE * info.gravity,
    range: info.radius * GRAVITY_RANGE_RADII,
    innerRadius: info.innerRadius,
    cavityLimit: info.cavityLimit,
    holes: info.cavityHoles,
    core: info.gas?.safe,
  };
}

function falloff(distance: number, well: GravityWell): number {
  if (distance <= well.radius) return 1;
  return Math.max(0, 1 - (distance - well.radius) / well.range);
}

/**
 * Por debajo de esta distancia al centro se está en la cavidad. Por defecto, a mitad del grosor de la cáscara
 * (en el Nudo ahí dentro todo es roca, así que el límite exacto no se pisa nunca); un mundo con cuencos que
 * atraviesan la cáscara (Cicatriz) lo pone justo bajo su cara interior.
 */
function cavityLimit(well: GravityWell): number | undefined {
  if (well.innerRadius === undefined) return undefined;
  return well.cavityLimit ?? (well.innerRadius + well.radius) / 2;
}

export function insideCavity(position: Vector3, well: GravityWell): boolean {
  const limit = cavityLimit(well);
  return limit !== undefined && position.distanceTo(well.center) < limit;
}

/**
 * Aceleración de gravedad en `position` (m/s²). Escribe en `target` y lo devuelve. Con `side`, en los mundos
 * huecos manda ese lado (el que recuerda el personaje: physics/cavityThroat.ts) y no la distancia al centro.
 */
export function gravityAt(
  position: Vector3,
  wells: readonly GravityWell[],
  target = new Vector3(),
  side?: 'inside' | 'outside',
): Vector3 {
  target.set(0, 0, 0);
  for (const well of wells) {
    toCenter.subVectors(well.center, position);
    const distance = toCenter.length();
    if (distance < 1e-6) continue; // en el centro exacto no hay dirección
    const limit = cavityLimit(well);
    const inside = side === undefined ? limit !== undefined && distance < limit : side === 'inside';
    if (limit !== undefined && well.innerRadius !== undefined && inside) {
      // Dentro de la cavidad: hacia fuera, apagándose cerca del centro.
      const core = well.innerRadius * CAVITY_CORE;
      const magnitude = well.strength * Math.min(1, distance / core);
      // Solo los personajes (con lado): la nave cruza los ojos con la gravedad de siempre.
      const bent = side === undefined ? undefined : holePull(position, well, pull);
      if (bent) target.addScaledVector(bent, magnitude);
      else target.addScaledVector(toCenter, -magnitude / distance);
      continue;
    }
    const magnitude = well.strength * falloff(distance, well);
    if (magnitude > 0) target.addScaledVector(toCenter, magnitude / distance);
  }
  return target;
}

/** "Arriba" del suelo de un mundo en `position`: hacia fuera sobre la cáscara, hacia el centro por dentro. */
export function surfaceUp(position: Vector3, well: GravityWell, target = new Vector3()): Vector3 {
  target.subVectors(position, well.center);
  if (insideCavity(position, well)) target.negate();
  return target.lengthSq() > 1e-12 ? target.normalize() : target.set(0, 1, 0);
}
