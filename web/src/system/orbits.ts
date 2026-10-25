// Dónde está cada mundo en cada instante: una fórmula del reloj de Umbral, no una simulación. Órbitas
// circulares alrededor de la Brasa (en el origen) en el plano XZ, y giro alrededor del eje Y.
//
// Convención: el ángulo crece en el sentido positivo de giro alrededor de +Y (el de las rotaciones de
// Three.js), así que un mundo con rotación bloqueada gira a la misma velocidad que su órbita y no
// cambia de cara respecto a la Brasa.
import { Quaternion, Vector3 } from 'three';
import type { BodySpec } from './systemData';

const TWO_PI = Math.PI * 2;
const AXIS_Y = new Vector3(0, 1, 0);

/** Posición, velocidad y orientación de un cuerpo en el marco del sistema (origen = la Brasa). */
export interface BodyPose {
  position: Vector3;
  velocity: Vector3;
  /** Del marco del mundo al del sistema. */
  orientation: Quaternion;
  /** Velocidad de giro alrededor de +Y (rad/s). */
  spinRate: number;
}

export function createPose(): BodyPose {
  return {
    position: new Vector3(),
    velocity: new Vector3(),
    orientation: new Quaternion(),
    spinRate: 0,
  };
}

function orbitRate(spec: BodySpec): number {
  return spec.period > 0 ? TWO_PI / spec.period : 0;
}

/** Pose del cuerpo en el instante `t` del reloj de Umbral. Escribe en `target` y lo devuelve. */
export function bodyPose(spec: BodySpec, t: number, target: BodyPose = createPose()): BodyPose {
  const rate = orbitRate(spec);
  const angle = spec.phase + rate * t;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  target.position.set(spec.orbitRadius * cos, 0, -spec.orbitRadius * sin);
  target.velocity.set(-rate * spec.orbitRadius * sin, 0, -rate * spec.orbitRadius * cos);

  if (spec.spin === 'locked') {
    target.spinRate = rate;
    target.orientation.setFromAxisAngle(AXIS_Y, angle + spec.spinPhase);
  } else {
    target.spinRate = spec.spin > 0 ? TWO_PI / spec.spin : 0;
    target.orientation.setFromAxisAngle(AXIS_Y, spec.spinPhase + target.spinRate * t);
  }
  return target;
}
