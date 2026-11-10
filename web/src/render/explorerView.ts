// El explorador en la escena: sigue al jugador (pies y orientación), anda según lo que hace su cuerpo y, en
// primera persona, esconde la cabeza y el casco y se retrasa un poco para que al mirar abajo se vean el pecho, el
// cinturón y las botas. Pilotando la nave no se dibuja. Sus filamentos brillan más mientras lee, y con la luz del
// cuerpo encendida todo él luce azul celeste y alumbra a su alrededor (una PointLight colgada de la escena, no del
// muñeco: así nunca se esconde y el número de luces no cambia, que obligaría a recompilar todos los materiales).
import { Color, PointLight, Quaternion, Vector3, type Object3D } from 'three';
import {
  BODY_LIGHT,
  bodyLightIntensity,
  createBodyLight,
  stepBodyLight,
  toggleBodyLight,
  type BodyLightState,
} from '../character/bodyLight';
import { buildExplorer } from '../character/explorerModel';
import { createGait, gaitPose, stepGait } from '../character/gait';
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
/** Cuánto más brillan los puntos del cuerpo con la luz encendida. */
const BODY_LIGHT_GLOW = 3;

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
  };
  dispose(): void;
}

const up = new Vector3();
const forward = new Vector3();
const planar = new Vector3();
const lastForward = new Vector3();

export function createExplorerView(parent: Object3D): ExplorerView {
  const rig = buildExplorer();
  parent.add(rig.root);
  const gait = createGait();
  const baseGlow = rig.materials.glow.emissiveIntensity;
  const baseGlowColor = rig.materials.glow.emissive.clone();
  const lightColor = new Color(BODY_LIGHT.color);
  const light = new PointLight(BODY_LIGHT.color, 0, BODY_LIGHT.range, BODY_LIGHT.decay);
  light.name = 'EXPLORADOR_luz';
  parent.add(light);
  let bodyLight: BodyLightState = createBodyLight();
  let glow = 1;
  let plant = 1;
  let speed = 0;
  let hasForward = false;
  let firstPerson = false;

  return {
    update(frame) {
      rig.root.visible = frame.visible;
      bodyLight = stepBodyLight(
        bodyLight.on === frame.lightOn ? bodyLight : toggleBodyLight(bodyLight),
        frame.dt,
      );
      if (!frame.visible) {
        hasForward = false;
        light.intensity = 0;
        return;
      }
      upOf(frame.body, up);
      forwardOf(frame.body, forward);
      planar.copy(frame.velocity).addScaledVector(up, -frame.velocity.dot(up));
      speed = planar.length();
      const turnRate = hasForward && frame.dt > 0 ? lastForward.angleTo(forward) / frame.dt : 0;
      lastForward.copy(forward);
      hasForward = true;
      stepGait(gait, {
        dt: frame.dt,
        speed,
        forward: speed > 0.05 ? planar.dot(forward) / speed : 1,
        grounded: frame.grounded,
        swimming: frame.swimming,
        verticalSpeed: frame.velocity.dot(up),
        turnRate,
        landings: frame.landings,
        landingSpeed: frame.landingSpeed,
      });
      plant +=
        ((frame.grounded && !frame.swimming ? 1 : 0) - plant) * Math.min(1, PLANT_RATE * frame.dt);
      rig.setPose(gaitPose(gait, frame.pitch), plant);
      if (frame.firstPerson !== firstPerson) {
        firstPerson = frame.firstPerson;
        rig.setFirstPerson(firstPerson);
      }
      rig.root.position.copy(frame.feet);
      if (firstPerson) {
        rig.root.position
          .addScaledVector(forward, -FIRST_PERSON_BACK)
          .addScaledVector(up, -FIRST_PERSON_DOWN);
      }
      rig.root.quaternion.copy(frame.body);
      glow += ((frame.reading ? READING_GLOW : 1) - glow) * Math.min(1, GLOW_RATE * frame.dt);
      const lit = bodyLight.level;
      rig.materials.glow.emissiveIntensity = baseGlow * glow * (1 + (BODY_LIGHT_GLOW - 1) * lit);
      rig.materials.glow.emissive.copy(baseGlowColor).lerp(lightColor, lit);
      // La luz sale del pecho (también en primera persona, donde el cuerpo va un poco detrás de los ojos).
      light.position.copy(rig.root.position).addScaledVector(up, BODY_LIGHT.height);
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
      };
    },
    dispose() {
      rig.root.removeFromParent();
      light.removeFromParent();
      rig.dispose();
    },
  };
}
