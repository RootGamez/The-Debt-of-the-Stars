// La Sala del Motor en uso (Fase 10C): con la palanca, el motor viejo sale del núcleo y queda tumbado en el suelo
// (de su sitio a la marca `cicatriz_MotorFuera`, del .glb de Cicatriz). Con un ciclo nuevo vuelve a estar dentro.
import { Vector3, type Object3D } from 'three';
import { WorldDataError } from '../worlds/markers';
import { blendPose, ease, poseOf, type LocalPose } from './poseTween';

/** Lo que tarda en salir (s). */
export const MOTOR_OUT_SECONDS = 3;
const MOTOR = 'cicatriz_MotorViejo';
const MOTOR_OUT = 'cicatriz_MotorFuera';

export interface EngineRoomView {
  /** Dónde estaba el motor: el centro del núcleo, donde encaja el Contrapeso. */
  readonly core: { parent: Object3D; pose: LocalPose };
  /** El centro del núcleo en el marco del mundo (ahí nace el agujero negro). */
  readonly coreCenter: Vector3;
  update(motorOut: boolean, dt: number): void;
}

export function createEngineRoomView(world: Object3D): EngineRoomView {
  const motor = world.getObjectByName(MOTOR);
  const out = world.getObjectByName(MOTOR_OUT);
  if (!motor?.parent || !out) {
    throw new WorldDataError(`Cicatriz: faltan ${MOTOR} y ${MOTOR_OUT} en la Sala del Motor`);
  }
  if (out.parent !== motor.parent) {
    throw new WorldDataError(`Cicatriz: ${MOTOR} y ${MOTOR_OUT} deben colgar del mismo sitio`);
  }
  world.updateMatrixWorld(true);
  const coreCenter = world.worldToLocal(motor.getWorldPosition(new Vector3()));
  const inside = poseOf(motor, 1);
  const outside = poseOf(out, 1);
  let progress = 0;
  return {
    core: { parent: motor.parent, pose: inside },
    coreCenter,
    update(motorOut, dt) {
      const next = motorOut ? Math.min(1, progress + dt / MOTOR_OUT_SECONDS) : 0;
      if (next === progress) return;
      progress = next;
      blendPose(motor, inside, outside, ease(progress));
    },
  };
}
