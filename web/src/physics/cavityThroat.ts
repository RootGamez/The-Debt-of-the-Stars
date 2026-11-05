// El paso entre la cáscara y la cavidad de un mundo hueco con agujeros (los ojos de Cicatriz, Fase 11H).
// La gravedad cambia de sentido en `cavityLimit`: decidirlo solo por la distancia al centro hacía que, de pie en
// el fondo de un cuenco (a 60–61 m) o cayendo por un ojo, el personaje subiera y bajara sin parar. Aquí el lado se
// recuerda: de pie manda el suelo que se pisa; en el aire solo se cambia de lado tras cruzar del todo. Y dentro
// del ojo la gravedad tira hacia la cara interior junto al borde: quien cae por él aterriza de pie al otro lado.
import { MathUtils, Vector3 } from 'three';
import type { GravityWell } from './gravity';

export type CavitySide = 'inside' | 'outside';

/** Cuánto hay que bajar de la cara interior (m), en el aire, para pasar a la cavidad. */
export const THROAT_DEPTH = 2;
/** Cuánto hay que subir por encima del límite (m), en el aire, para volver a la cáscara de fuera. */
export const THROAT_RISE = 3;
/** Con un suelo así de inclinado respecto a la vertical del mundo, aún se sabe de qué lado es. */
const SIDE_FROM_GROUND = 0.3;

const radial = new Vector3();

function limitOf(well: GravityWell): number | undefined {
  if (well.innerRadius === undefined) return undefined;
  return well.cavityLimit ?? (well.innerRadius + well.radius) / 2;
}

/** El primer pozo hueco (con cavidad), si lo hay. */
export function hollowWell(wells: readonly GravityWell[]): GravityWell | undefined {
  return wells.find((w) => w.innerRadius !== undefined);
}

/**
 * De qué lado está el personaje tras este paso. `groundNormal` solo si está de pie: un suelo que mira hacia fuera
 * es de la cáscara (aunque esté bajo el límite, como el fondo de un cuenco junto al ojo) y uno que mira al centro,
 * de la cavidad.
 */
export function nextCavitySide(
  position: Vector3,
  well: GravityWell,
  previous: CavitySide | undefined,
  groundNormal?: Vector3,
): CavitySide | undefined {
  const limit = limitOf(well);
  if (limit === undefined || well.innerRadius === undefined) return undefined;
  radial.subVectors(position, well.center);
  const distance = radial.length();
  if (groundNormal && distance > 1e-6) {
    const facing = groundNormal.dot(radial) / distance;
    if (facing > SIDE_FROM_GROUND) return 'outside';
    if (facing < -SIDE_FROM_GROUND) return 'inside';
  }
  if (previous === 'outside')
    return distance < well.innerRadius - THROAT_DEPTH ? 'inside' : 'outside';
  if (previous === 'inside') return distance > limit + THROAT_RISE ? 'outside' : 'inside';
  return distance < limit ? 'inside' : 'outside';
}

/** Un agujero de la cáscara (un ojo): su eje desde el centro y su radio angular (rad). */
export interface CavityHole {
  axis: Vector3;
  angle: number;
}

/** Más allá del borde del ojo (rad) la gravedad se va enderezando, para no cambiar de golpe. */
const HOLE_MARGIN = (2 * Math.PI) / 180;
/** Hacia dónde tira dentro del ojo: a la cara interior, este ángulo más allá del borde (rad). */
const HOLE_LANDING = (5 * Math.PI) / 180;
/** Solo en la garganta del ojo: más hacia el centro la gravedad vuelve a ser la de la cavidad. */
const HOLE_DEPTH = 0.35;
/** Cuánto por debajo de la cara interior (m) empieza a torcerse. */
const HOLE_BELOW_FACE = 1;

const offset = new Vector3();
const across = new Vector3();
const aim = new Vector3();

/**
 * Dentro de la cavidad y en la garganta de un ojo, hacia dónde tira la gravedad (unitario, en `target`): no
 * hacia fuera (por ahí no hay suelo y se volvería a salir), sino a la cara interior junto al borde, así que quien
 * cae por el ojo describe un arco y aterriza de pie al otro lado. `undefined` si no está en ningún ojo.
 */
export function holePull(
  position: Vector3,
  well: GravityWell,
  target: Vector3,
): Vector3 | undefined {
  const inner = well.innerRadius;
  if (!well.holes || inner === undefined) return undefined;
  offset.subVectors(position, well.center);
  const distance = offset.length();
  // Solo bajo la cara interior (quien está de pie en ella, junto al borde, no nota nada) y no junto al centro.
  if (distance > inner - HOLE_BELOW_FACE || distance < inner * HOLE_DEPTH) return undefined;
  for (const hole of well.holes) {
    const along = offset.dot(hole.axis);
    if (along <= 0) continue;
    across.copy(offset).addScaledVector(hole.axis, -along);
    const sideways = across.length();
    const angle = Math.atan2(sideways, along);
    if (angle > hole.angle + HOLE_MARGIN) continue;
    // Por el lado del ojo en que ya está; en su mismo eje, hacia cualquier lado.
    if (sideways < 1e-6) {
      across.set(1, 0, 0).addScaledVector(hole.axis, -hole.axis.x);
      if (across.lengthSq() < 1e-6) across.set(0, 1, 0).addScaledVector(hole.axis, -hole.axis.y);
    }
    across.normalize();
    const landing = hole.angle + HOLE_LANDING;
    aim
      .copy(well.center)
      .addScaledVector(hole.axis, inner * Math.cos(landing))
      .addScaledVector(across, inner * Math.sin(landing));
    target.subVectors(aim, position).normalize();
    // Del borde hacia fuera se vuelve poco a poco a la gravedad de siempre (hacia fuera, radial).
    const blend = 1 - MathUtils.smoothstep(angle, hole.angle, hole.angle + HOLE_MARGIN);
    return target.lerp(offset.normalize(), 1 - blend).normalize();
  }
  return undefined;
}
