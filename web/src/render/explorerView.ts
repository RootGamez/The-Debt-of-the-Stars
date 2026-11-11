// El explorador en la escena: sigue al jugador (pies y orientación), anda según lo que hace su cuerpo y, en
// primera persona, esconde la cabeza y el casco y se retrasa un poco para que al mirar abajo se vean el pecho, el
// cinturón y las botas. Pilotando la nave no se dibuja. Sus filamentos brillan más mientras lee. Con la luz del
// cuerpo encendida, las puntas de las antenas se encienden de azul celeste con un halo y alumbran a su alrededor
// desde ahí (una PointLight colgada de la escena, no del muñeco: así nunca se esconde y el número de luces no
// cambia, que obligaría a recompilar todos los materiales); los puntos del cuerpo y el cristal del casco se tiñen.
import {
  AdditiveBlending,
  Color,
  DataTexture,
  PointLight,
  Quaternion,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Object3D,
} from 'three';
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
  };
  dispose(): void;
}

const up = new Vector3();
const forward = new Vector3();
const planar = new Vector3();
const lastForward = new Vector3();
const antennaAt = new Vector3();

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

  return {
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
