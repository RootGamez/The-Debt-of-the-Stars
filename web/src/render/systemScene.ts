// La escena del sistema: cada mundo cuelga de un pivote y, en cada fotograma, TODO se coloca relativo al
// mundo de referencia (en el que estás). Ese mundo queda quieto en el origen, con su giro absorbido (el
// cielo gira, el suelo no), y la Brasa, los demás mundos y las estrellas se mueven a su alrededor.
// Así la física, las colisiones y la lectura siguen trabajando en el marco de un solo mundo.
// Un mundo fuera de todo sistema (Hogar, Luna) se queda en el origen, sin Brasa ni movimiento.
import {
  Group,
  PointLight,
  Quaternion,
  Vector3,
  type Light,
  type Object3D,
  type Scene,
} from 'three';
import { SYSTEM_FRAME, toLocalPosition, toSystemPosition } from '../system/frames';
import { bodyPose, createPose, type BodyPose } from '../system/orbits';
import { sourceIntensity } from '../system/starLight';
import type { BodySpec, SystemSpec } from '../system/systemData';
import { createCercoView, type CercoView } from './cercoRings';
import { createStarView, type StarView } from './starModel';

const ORIGIN = new Vector3();

export interface SystemSceneOptions {
  scene: Scene;
  /** `undefined` = el mundo no forma parte de ningún sistema. */
  system: SystemSpec | undefined;
  /** Los mundos cargados, por id. */
  worlds: ReadonlyMap<string, { scene: Object3D }>;
  /** La luz de la Brasa: se mueve a donde se ve la estrella desde el mundo de referencia. */
  sun: Light;
  /** Estrellas del fondo: giran al revés que el mundo de referencia. */
  sky: Object3D;
  /** Mundo de referencia al empezar. */
  start: string;
}

export interface SystemScene {
  /** Mundo en cuyo marco estás; `undefined` = espacio abierto (marco del sistema). */
  readonly referenceWorld: string | undefined;
  /** El cuerpo de la estrella (la Brasa), para que el agujero negro se la pueda tragar. */
  readonly starObject: Object3D | undefined;
  setReference(world: string | undefined): void;
  /** Una vez por fotograma con el reloj de Umbral: recoloca todo respecto al mundo de referencia. */
  update(t: number): void;
  /** Un punto del marco de referencia → el marco del sistema (origen en la Brasa) en el instante `t`. */
  toSystem(localPoint: Vector3, t: number, target: Vector3): Vector3;
  /** El pivote de un mundo (para colgarle cosas que se muevan con él). */
  groupOf(world: string): Group | undefined;
  /** Cuelga la nave del pivote del mundo correspondiente, o de la escena raíz si está en el espacio abierto. */
  attachShip(shipObject: Object3D, world: string | undefined): void;
  dispose(): void;
}

interface Pivot {
  group: Group;
  spec: BodySpec | undefined;
  pose: BodyPose;
}

export function createSystemScene(options: SystemSceneOptions): SystemScene {
  const { scene, system, worlds, sun, sky } = options;
  const pivots = new Map<string, Pivot>();
  for (const [id, world] of worlds) {
    const group = new Group();
    group.name = `Mundo ${id}`;
    group.add(world.scene);
    scene.add(group);
    pivots.set(id, { group, spec: system?.bodyOf(id), pose: createPose() });
  }

  // La estrella de este sistema: su cuerpo modelado y la luz que da (color e intensidad de su tipo).
  const star: StarView | undefined = system ? createStarView(system.star) : undefined;
  if (star) scene.add(star.object);
  // El Cerco que la rodea (si lo hay): cuelga de la estrella y gira con el marco del sistema.
  const cerco: CercoView | undefined = system?.structure
    ? createCercoView(system.structure)
    : undefined;
  if (cerco) scene.add(cerco.object);
  if (system) {
    sun.color.setHex(system.star.lightColor);
    // La luz cae con la distancia según la estrella; a la distancia de referencia vale lo que dice el archivo.
    if (sun instanceof PointLight) sun.decay = system.star.falloff;
    sun.intensity = sourceIntensity(system.star, system.referenceDistance);
  }

  let reference: string | undefined;
  const referencePose = createPose();
  const tmpPose = createPose();
  const inverse = new Quaternion();
  const starPosition = new Vector3();

  function pivotOf(world: string): Pivot {
    const pivot = pivots.get(world);
    if (!pivot) throw new Error(`El mundo "${world}" no está en la escena del sistema`);
    return pivot;
  }

  /** Pose del marco de referencia en el instante `t`, en `target`. */
  function frameAt(t: number, target: BodyPose): BodyPose {
    const spec = reference === undefined ? undefined : pivotOf(reference).spec;
    if (!spec) {
      target.position.copy(SYSTEM_FRAME.position);
      target.velocity.copy(SYSTEM_FRAME.velocity);
      target.orientation.copy(SYSTEM_FRAME.orientation);
      target.spinRate = SYSTEM_FRAME.spinRate;
      return target;
    }
    return bodyPose(spec, t, target);
  }

  const scenery: SystemScene = {
    get referenceWorld() {
      return reference;
    },
    starObject: star?.object,
    setReference(world) {
      if (world !== undefined) pivotOf(world);
      reference = world;
    },
    update(t) {
      if (!system) return; // fuera de un sistema todo se queda donde está
      frameAt(t, referencePose);
      inverse.copy(referencePose.orientation).invert();
      for (const pivot of pivots.values()) {
        if (!pivot.spec) continue;
        bodyPose(pivot.spec, t, pivot.pose);
        toLocalPosition(referencePose, pivot.pose.position, pivot.group.position);
        pivot.group.quaternion.multiplyQuaternions(inverse, pivot.pose.orientation);
      }
      toLocalPosition(referencePose, ORIGIN, starPosition);
      star?.object.position.copy(starPosition);
      star?.object.quaternion.copy(inverse);
      star?.update(t);
      if (cerco) {
        cerco.object.position.copy(starPosition);
        cerco.object.quaternion.copy(inverse);
        cerco.update(t);
      }
      sun.position.copy(starPosition);
      sky.quaternion.copy(inverse);
    },
    toSystem(localPoint, t, target) {
      if (!system) return target.copy(localPoint);
      return toSystemPosition(frameAt(t, tmpPose), localPoint, target);
    },
    groupOf: (world) => pivots.get(world)?.group,
    attachShip(shipObject, world) {
      if (world === undefined) {
        scene.add(shipObject);
        return;
      }
      pivotOf(world).group.add(shipObject);
    },
    dispose() {
      for (const { group } of pivots.values()) scene.remove(group);
      if (star) {
        scene.remove(star.object);
        star.dispose();
      }
      if (cerco) {
        scene.remove(cerco.object);
        cerco.dispose();
      }
    },
  };
  scenery.setReference(options.start);
  return scenery;
}
