// Las campanas del Anfiteatro a la vista (plan de historia y puzzles físicos, P1): las cuatro campanas de bronce (en
// su estante, sobre las marcas del canal o en tus manos), la bola que rueda, la marca que se enciende donde irá la
// campana y la tapa del atril, que se abre al sonar a compás. Dónde está cada cosa lo decide game/bellsPlay.ts.
// Todo cuelga de una marca del Anfiteatro (sus ejes son los del marco del Anfiteatro, Z arriba).
import {
  Color,
  DoubleSide,
  Euler,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  BoxGeometry,
  Vector2,
  Vector3,
  type Camera,
  type Object3D,
  type Scene,
} from 'three';
import { BELLS } from '../puzzles/bells';
import {
  CHANNEL_TILT,
  LECTERN_AT,
  RACK_AT,
  RACK_BAR,
  RACK_SLOTS,
  channelPoint,
} from '../worlds/procedural/umbralBellsShape';
import type { Triple } from '../worlds/procedural/kit';

/** Altura de una campana (m) y radio de su boca. */
const BELL_HEIGHT = 0.24;
const BELL_RADIUS = 0.15;
/** En manos: abajo y delante de los ojos, como el Contrapeso pero más pequeña. */
const HELD_OFFSET = new Vector3(0.18, -0.3, -0.7);
const HELD_TILT = new Quaternion().setFromEuler(new Euler(0.1, 0, 0));
/** Lo que se desliza la tapa del atril al abrirse (m, en Y) y lo que tarda (s). */
const LID_TRAVEL = 0.95;
const LID_SECONDS = 1.2;
/** Cuánto dura el vaivén de una campana al sonar (s) y cuánto se inclina (rad). */
const SWING_SECONDS = 0.8;
const SWING_AMPLITUDE = 0.28;

/** El perfil de una campana (radio, altura): de la corona a la boca, con el labio abierto. */
function bellProfile(): Vector2[] {
  const points: [number, number][] = [
    [0.01, 0],
    [0.05, -0.02],
    [0.07, -0.08],
    [0.09, -0.14],
    [0.12, -0.2],
    [BELL_RADIUS, -BELL_HEIGHT],
    [BELL_RADIUS - 0.02, -BELL_HEIGHT],
  ];
  return points.map(([r, y]) => new Vector2(r, y));
}

export interface BellsShown {
  /** Las campanas por su id y dónde están. */
  bells: readonly { id: string; where: 'rack' | 'hands' | { mark: number } }[];
  /** Dónde va la bola (m desde arriba), o undefined. */
  ball: number | undefined;
  /** La marca del canal que se enciende (donde irá la campana que llevas), o undefined. */
  highlight: number | undefined;
  /** Cuántas campanas han sonado en este fotograma (por id). */
  rung: readonly string[];
  /** El atril abierto. */
  lecternOpen: boolean;
}

export interface BellsView {
  update(shown: BellsShown, camera: Camera, dt: number): void;
  dispose(): void;
}

export function createBellsView(
  scene: Scene,
  anchor: Object3D,
  /** Dónde está `anchor` en el marco del Anfiteatro: las posiciones del marco se pasan a las suyas restándolo. */
  anchorAt: Triple,
  ids: readonly string[],
): BellsView {
  const toAnchor = (p: Triple): Vector3 =>
    new Vector3(p[0] - anchorAt[0], p[1] - anchorAt[1], p[2] - anchorAt[2]);
  const root = new Group();
  anchor.add(root);

  const bronze = new MeshStandardMaterial({
    color: new Color('#B58A3C'),
    emissive: new Color('#4A3410'),
    metalness: 0.7,
    roughness: 0.4,
    side: DoubleSide,
  });
  const bellGeometry = new LatheGeometry(bellProfile(), 18).rotateX(Math.PI / 2);
  const clapperGeometry = new SphereGeometry(0.03, 8, 6);

  const bells = new Map<string, { object: Group; swing: number }>();
  for (const id of ids) {
    const object = new Group();
    object.add(new Mesh(bellGeometry, bronze));
    const clapper = new Mesh(clapperGeometry, bronze);
    clapper.position.set(0, 0, -BELL_HEIGHT + 0.03);
    object.add(clapper);
    root.add(object);
    bells.set(id, { object, swing: 0 });
  }

  const ball = new Mesh(
    new SphereGeometry(0.07, 12, 10),
    new MeshStandardMaterial({
      color: new Color('#E8C070'),
      emissive: new Color('#8A5A18'),
      metalness: 0.8,
      roughness: 0.3,
    }),
  );
  ball.visible = false;
  root.add(ball);

  const light = new MeshStandardMaterial({
    color: new Color('#FFC070'),
    emissive: new Color('#FFB040'),
    emissiveIntensity: 1.6,
  });
  const highlight = new Mesh(new BoxGeometry(0.06, 0.5, 0.02), light);
  highlight.rotation.y = CHANNEL_TILT;
  highlight.visible = false;
  root.add(highlight);

  // La tapa del atril, de piedra, y debajo la página (lo que se ve al abrirla).
  const lidMaterial = new MeshStandardMaterial({ color: new Color('#B8A27A'), roughness: 0.9 });
  const lid = new Mesh(new BoxGeometry(0.8, 1.0, 0.06), lidMaterial);
  const lidClosed = toAnchor([LECTERN_AT[0], LECTERN_AT[1], 1.05]);
  lid.position.copy(lidClosed);
  root.add(lid);
  const page = new Mesh(
    new PlaneGeometry(0.7, 0.9),
    new MeshStandardMaterial({
      color: new Color('#EDE4CC'),
      emissive: new Color('#FFC070'),
      emissiveIntensity: 0.35,
    }),
  );
  page.position.copy(toAnchor([LECTERN_AT[0], LECTERN_AT[1], 1.021]));
  root.add(page);
  let lidOpen = 0;

  function rackPoint(index: number): Vector3 {
    return toAnchor([RACK_AT[0], RACK_AT[1] + (RACK_SLOTS[index] ?? 0), RACK_BAR + 0.04]);
  }

  return {
    update(shown, camera, dt) {
      let rackIndex = 0;
      for (const { id, where } of shown.bells) {
        const entry = bells.get(id);
        if (!entry) continue;
        const { object } = entry;
        if (where === 'hands') {
          // La cámara no cuelga de la escena: se copia su pose (coordenadas de la escena).
          if (object.parent !== scene) scene.add(object);
          object.position.copy(HELD_OFFSET).applyQuaternion(camera.quaternion).add(camera.position);
          object.quaternion.copy(camera.quaternion).multiply(HELD_TILT);
          object.rotateX(-Math.PI / 2);
          object.scale.setScalar(0.8);
          continue;
        }
        if (object.parent !== root) {
          root.add(object);
          object.scale.setScalar(1);
        }
        if (where === 'rack') {
          object.position.copy(rackPoint(rackIndex));
          rackIndex += 1;
        } else {
          object.position.copy(
            toAnchor(channelPoint(where.mark * BELLS.spacing, BELL_HEIGHT + 0.005)),
          );
        }
        object.quaternion.identity();
        if (shown.rung.includes(id)) entry.swing = SWING_SECONDS;
        else entry.swing = Math.max(0, entry.swing - dt);
        if (entry.swing > 0) {
          const k = entry.swing / SWING_SECONDS;
          object.rotateY(Math.sin(entry.swing * 38) * SWING_AMPLITUDE * k);
        }
      }

      if (shown.ball === undefined) ball.visible = false;
      else {
        ball.visible = true;
        ball.position.copy(toAnchor(channelPoint(shown.ball, 0.1)));
      }

      if (shown.highlight === undefined) highlight.visible = false;
      else {
        highlight.visible = true;
        highlight.position.copy(toAnchor(channelPoint(shown.highlight * BELLS.spacing, 0.012)));
      }

      const target = shown.lecternOpen ? 1 : 0;
      lidOpen +=
        Math.sign(target - lidOpen) * Math.min(Math.abs(target - lidOpen), dt / LID_SECONDS);
      lid.position.set(lidClosed.x, lidClosed.y + lidOpen * LID_TRAVEL, lidClosed.z);
    },
    dispose() {
      root.removeFromParent();
      for (const { object } of bells.values()) object.removeFromParent();
    },
  };
}
