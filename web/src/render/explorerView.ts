// El explorador en la escena: sigue al jugador (pies y orientación), anda según lo que hace su cuerpo y, en
// primera persona, esconde la cabeza y el casco y se retrasa un poco para que al mirar abajo se vean el pecho, el
// cinturón y las botas. Pilotando la nave no se dibuja. Sus filamentos brillan más mientras lee. Con la luz del
// cuerpo encendida, las puntas de las antenas se encienden de azul celeste con un halo y alumbran a su alrededor
// desde ahí (una PointLight colgada de la escena, no del muñeco: así nunca se esconde y el número de luces no
// cambia, que obligaría a recompilar todos los materiales); los puntos del cuerpo y el cristal del casco se tiñen.
import {
  AdditiveBlending,
  Box3,
  Color,
  DataTexture,
  Group,
  PointLight,
  Quaternion,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Object3D,
} from 'three';
import { carryGrip, PICKUP_DROP, type CarryGrip } from '../character/carryPose';
import {
  BODY_LIGHT,
  bodyLightGlow,
  bodyLightIntensity,
  createBodyLight,
  stepBodyLight,
  toggleBodyLight,
  type BodyLightState,
} from '../character/bodyLight';
import { buildExplorer } from '../character/explorerModel';
import { createGait, gaitPose, mixArm, stepGait, type BodyPose } from '../character/gait';
import { forwardOf, upOf } from '../physics/surfaceFrame';

/**
 * En primera persona el cuerpo va así de detrás y de abajo de los ojos (m): si no, el pecho redondo de un Ool tapa
 * toda la vista al mirar abajo; así se ven la tripa, el cinturón y las botas.
 */
export const FIRST_PERSON_BACK = 0.3;
export const FIRST_PERSON_DOWN = 0;
/** Cuánto más brillan los filamentos al leer y lo deprisa que cambian (1/s). */
const READING_GLOW = 2.4;
const GLOW_RATE = 4;
const PLANT_RATE = 10;
/** Cuánto más brillan los puntos del cuerpo y las puntas de las antenas con la luz encendida. */
const BODY_LIGHT_GLOW = 2.2;
const ANTENNA_GLOW = 4.5;
/** Las puntas y el halo van de un azul más hondo que la luz: así, al saturarse, no se quedan en blanco. */
const ANTENNA_COLOR = 0x3fa9ff;
/** El halo de las antenas: su tamaño (m) y su opacidad a pleno. Solo se ve desde fuera (no en primera persona). */
const HALO_SIZE = 1.3;
const HALO_OPACITY = 0.9;
/** Cuánto se tiñe el cristal del casco por dentro con la luz encendida. */
const GLASS_TINT = 0.35;
/**
 * Llevando algo en brazos, en primera persona el cuerpo va así respecto a los ojos (m; negativo: algo por delante,
 * la cabeza no se dibuja) y con los brazos tendidos: con el retraso de siempre el objeto quedaría bajo los ojos.
 */
export const CARRY_FIRST_PERSON_BACK = -0.12;
/** Lo deprisa que suben los brazos con el objeto al cogerlo y bajan al soltarlo (1/s): un tercio de segundo. */
const CARRY_RATE = 3;

/** Qué eje del modelo es «arriba»: Z en los puzles (marco de diseño), Y en el Contrapeso. */
export type ModelUp = 'y' | 'z';

/** Las manos del explorador: lo que se lleva se cuelga de su torso, a su tamaño real, entre las palmas. */
export interface Hands {
  /**
   * Lleva `object` en brazos (llámalo cada fotograma mientras se lleve). Lo cuelga del torso; para soltarlo, basta con
   * colgarlo de otro sitio (o esconderlo) y los brazos bajan solos.
   */
  hold(object: Object3D, up?: ModelUp): void;
}

/** Cómo va un objeto en brazos: el agarre de su tamaño, su giro para ir de pie y el centro de su caja en su marco. */
interface Carried {
  /** Abrazado al pecho (tercera persona) y con los brazos tendidos (primera persona). */
  hug: CarryGrip;
  out: CarryGrip;
  turn: Quaternion;
  center: Vector3;
}

const Z_UP_TO_Y_UP = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const NO_TURN = new Quaternion();

/** Mide el objeto en su propio marco (sin su posición, giro ni escala). */
function measure(object: Object3D, up: ModelUp): Carried {
  const parent = object.parent;
  const position = object.position.clone();
  const quaternion = object.quaternion.clone();
  const scale = object.scale.clone();
  object.removeFromParent();
  object.position.set(0, 0, 0);
  object.quaternion.identity();
  object.scale.setScalar(1);
  object.updateMatrixWorld(true);
  const box = new Box3().setFromObject(object, true);
  object.position.copy(position);
  object.quaternion.copy(quaternion);
  object.scale.copy(scale);
  parent?.add(object);
  const size = box.isEmpty() ? new Vector3(0.2, 0.2, 0.2) : box.getSize(new Vector3());
  const center = box.isEmpty() ? new Vector3() : box.getCenter(new Vector3());
  const zUp = up === 'z';
  const measures = {
    width: size.x,
    height: zUp ? size.z : size.y,
    depth: zUp ? size.y : size.z,
  };
  return {
    hug: carryGrip(measures),
    out: carryGrip(measures, true),
    turn: (zUp ? Z_UP_TO_Y_UP : NO_TURN).clone(),
    center,
  };
}

/** Arranca y frena despacio (0 → 0, 1 → 1). */
const smooth = (k: number): number => k * k * (3 - 2 * k);

export interface ExplorerFrame {
  feet: Vector3;
  body: Quaternion;
  /** Cabeceo de la vista (rad, > 0 arriba). */
  pitch: number;
  velocity: Vector3;
  grounded: boolean;
  swimming: boolean;
  landings: number;
  landingSpeed: number;
  dt: number;
  /** Si se dibuja (no se dibuja pilotando la nave). */
  visible: boolean;
  firstPerson: boolean;
  reading: boolean;
  /** Si la luz del cuerpo está encendida. */
  lightOn: boolean;
}

export interface ExplorerView {
  update(frame: ExplorerFrame): void;
  /** Sus manos: los puzles le dan aquí lo que se lleva. */
  readonly hands: Hands;
  /** Velocidad sobre el suelo (m/s) y hacia arriba (m/s) del último fotograma: de aquí salen los pasos. */
  readonly speed: number;
  readonly verticalSpeed: number;
  /** Para depurar: velocidad sobre el suelo, fase del paso y mezclas. */
  snapshot(): {
    visible: boolean;
    firstPerson: boolean;
    speed: number;
    phase: number;
    move: number;
    air: number;
    swim: number;
    triangles: number;
    /** Intensidad de la luz del cuerpo ahora (0 apagada). */
    light: number;
    /** Si se ve el halo de las antenas (solo desde fuera, con la luz encendida). */
    halo: boolean;
    /** Lo que tiene subido los brazos con algo (0 nada, 1 en brazos) y el nombre de lo que lleva. */
    carry: number;
    holding: string | undefined;
  };
  dispose(): void;
}

const up = new Vector3();
const forward = new Vector3();
const planar = new Vector3();
const lastForward = new Vector3();
const antennaAt = new Vector3();
const heldAt = new Vector3();

/** Un brillo redondo que se apaga hacia el borde (sin lienzo: vale también en las pruebas). */
function haloTexture(size = 64): DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
      const fall = Math.max(0, 1 - r);
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(255 * fall * fall);
    }
  }
  const texture = new DataTexture(data, size, size);
  texture.needsUpdate = true;
  return texture;
}

export function createExplorerView(parent: Object3D): ExplorerView {
  const rig = buildExplorer();
  parent.add(rig.root);
  const gait = createGait();
  const baseGlow = rig.materials.glow.emissiveIntensity;
  const baseGlowColor = rig.materials.glow.emissive.clone();
  const lightColor = new Color(BODY_LIGHT.color);
  const antennaColor = new Color(ANTENNA_COLOR);
  const baseAntenna = rig.materials.antenna.emissiveIntensity;
  const baseAntennaColor = rig.materials.antenna.emissive.clone();
  const glass = rig.materials.glass;
  const light = new PointLight(BODY_LIGHT.color, 0, BODY_LIGHT.range, BODY_LIGHT.decay);
  light.name = 'EXPLORADOR_luz';
  parent.add(light);
  const halo = new Sprite(
    new SpriteMaterial({
      map: haloTexture(),
      color: ANTENNA_COLOR,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  halo.name = 'EXPLORADOR_halo';
  halo.renderOrder = 3;
  halo.visible = false;
  rig.antennas.add(halo);
  let bodyLight: BodyLightState = createBodyLight();
  let glow = 1;
  let plant = 1;
  let speed = 0;
  let verticalSpeed = 0;
  let hasForward = false;
  let firstPerson = false;
  // Lo que se lleva cuelga de este punto del torso (sigue su vaivén al andar).
  const handsAnchor = new Group();
  handsAnchor.name = 'EXPLORADOR_manos';
  rig.bones.torso.add(handsAnchor);
  const carriedInfo = new WeakMap<Object3D, Carried>();
  let held: Object3D | undefined;
  let heldInfo: Carried | undefined;
  let carry = 0;
  /** De abrazado al pecho (0) a brazos tendidos (1): sigue a la primera persona, sin saltos al cambiar de cámara. */
  let reachOut = 0;

  const carrying = (): boolean => held !== undefined && held.parent === handsAnchor && held.visible;

  /** El objeto entre las palmas: sube desde abajo mientras los brazos se cierran (`k` de 0 a 1). */
  function placeHeld(k: number): void {
    if (!held || !heldInfo || !carrying()) return;
    const { hug, out } = heldInfo;
    const at = (i: 0 | 1 | 2): number => hug.center[i] + (out.center[i] - hug.center[i]) * reachOut;
    const [x, y, z] = [at(0), at(1), at(2)];
    held.quaternion.copy(heldInfo.turn);
    held.scale.setScalar(1);
    // El centro de su caja (no su origen) va al centro del agarre.
    held.position
      .copy(heldInfo.center)
      .applyQuaternion(heldInfo.turn)
      .negate()
      .add(heldAt.set(x, y - PICKUP_DROP * (1 - k), z));
  }

  /** Los brazos, de la pose de andar a la de llevar el objeto. */
  function withCarry(pose: BodyPose): BodyPose {
    if (carry <= 0 || !heldInfo) return pose;
    const k = smooth(carry);
    const { hug, out } = heldInfo;
    const left = mixArm(hug.arms[0], out.arms[0], reachOut);
    const right = mixArm(hug.arms[1], out.arms[1], reachOut);
    return { ...pose, arms: [mixArm(pose.arms[0], left, k), mixArm(pose.arms[1], right, k)] };
  }

  const hands: Hands = {
    hold(object, up = 'z') {
      if (object !== held) {
        // Otro objeto: los brazos vuelven a subir desde abajo con él.
        carry = held !== undefined && carrying() ? carry : 0;
        held = object;
      }
      let info = carriedInfo.get(object);
      if (!info) {
        info = measure(object, up);
        carriedInfo.set(object, info);
      }
      heldInfo = info;
      if (object.parent !== handsAnchor) handsAnchor.add(object);
      placeHeld(smooth(carry));
    },
  };

  return {
    hands,
    get speed() {
      return speed;
    },
    get verticalSpeed() {
      return verticalSpeed;
    },
    update(frame) {
      rig.root.visible = frame.visible;
      bodyLight = stepBodyLight(
        bodyLight.on === frame.lightOn ? bodyLight : toggleBodyLight(bodyLight),
        frame.dt,
      );
      if (!frame.visible) {
        hasForward = false;
        light.intensity = 0;
        halo.visible = false;
        return;
      }
      upOf(frame.body, up);
      forwardOf(frame.body, forward);
      planar.copy(frame.velocity).addScaledVector(up, -frame.velocity.dot(up));
      speed = planar.length();
      verticalSpeed = frame.velocity.dot(up);
      const turnRate = hasForward && frame.dt > 0 ? lastForward.angleTo(forward) / frame.dt : 0;
      lastForward.copy(forward);
      hasForward = true;
      stepGait(gait, {
        dt: frame.dt,
        speed,
        forward: speed > 0.05 ? planar.dot(forward) / speed : 1,
        grounded: frame.grounded,
        swimming: frame.swimming,
        verticalSpeed,
        turnRate,
        landings: frame.landings,
        landingSpeed: frame.landingSpeed,
      });
      plant +=
        ((frame.grounded && !frame.swimming ? 1 : 0) - plant) * Math.min(1, PLANT_RATE * frame.dt);
      const step = CARRY_RATE * frame.dt;
      carry = Math.min(1, Math.max(0, carry + (carrying() ? step : -step)));
      reachOut = Math.min(1, Math.max(0, reachOut + (frame.firstPerson ? step : -step)));
      const carried = smooth(carry);
      rig.setPose(withCarry(gaitPose(gait, frame.pitch)), plant);
      placeHeld(carried);
      if (frame.firstPerson !== firstPerson) {
        firstPerson = frame.firstPerson;
        rig.setFirstPerson(firstPerson);
      }
      rig.root.position.copy(frame.feet);
      if (firstPerson) {
        const back = FIRST_PERSON_BACK + (CARRY_FIRST_PERSON_BACK - FIRST_PERSON_BACK) * carried;
        rig.root.position.addScaledVector(forward, -back).addScaledVector(up, -FIRST_PERSON_DOWN);
      }
      rig.root.quaternion.copy(frame.body);
      glow += ((frame.reading ? READING_GLOW : 1) - glow) * Math.min(1, GLOW_RATE * frame.dt);
      const lit = bodyLight.level;
      const shine = bodyLightGlow(bodyLight);
      rig.materials.glow.emissiveIntensity = baseGlow * glow * (1 + (BODY_LIGHT_GLOW - 1) * lit);
      rig.materials.glow.emissive.copy(baseGlowColor).lerp(lightColor, lit);
      rig.materials.antenna.emissiveIntensity =
        baseAntenna * glow * (1 + (ANTENNA_GLOW - 1) * shine);
      rig.materials.antenna.emissive.copy(baseAntennaColor).lerp(antennaColor, lit);
      glass.emissive.copy(lightColor).multiplyScalar(GLASS_TINT * shine);
      halo.visible = shine > 0.01 && !firstPerson;
      halo.material.opacity = HALO_OPACITY * Math.min(1, shine);
      halo.scale.setScalar(HALO_SIZE * (0.7 + 0.3 * shine));
      // La luz sale de las antenas, un poco por encima de sus puntas (también en primera persona, donde la cabeza
      // no se dibuja pero sigue en su sitio).
      rig.root.updateMatrixWorld(true);
      parent.worldToLocal(rig.antennas.getWorldPosition(antennaAt));
      light.position.copy(antennaAt).addScaledVector(up, BODY_LIGHT.lift);
      light.intensity = bodyLightIntensity(bodyLight);
    },
    snapshot() {
      return {
        visible: rig.root.visible,
        firstPerson,
        speed,
        phase: gait.phase,
        move: gait.move,
        air: gait.air,
        swim: gait.swim,
        triangles: rig.triangles,
        light: light.intensity,
        halo: halo.visible,
        carry,
        holding: carrying() ? held?.name || 'objeto' : undefined,
      };
    },
    dispose() {
      rig.root.removeFromParent();
      light.removeFromParent();
      halo.material.map?.dispose();
      halo.material.dispose();
      rig.dispose();
    },
  };
}
