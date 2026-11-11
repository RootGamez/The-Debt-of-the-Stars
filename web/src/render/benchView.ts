// Los bancos de pruebas a la vista (plan de historia y puzzles físicos, T8): la viga de la Balanza del Contrapeso, que
// se inclina de verdad con la maqueta del motor viejo y las pesas, y la arena de la placa que canta con sus pinzas.
// Qué hay y cómo se inclina lo decide game/benchPlay.ts. Todo cuelga de marcas de los mundos (sus ejes son los del
// marco de cada sitio, Z arriba).
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  TorusGeometry,
  Vector3,
  type Camera,
  type Object3D,
  type Scene,
} from 'three';
import type { LoosePose } from '../game/carry';
import { BALANCE } from '../puzzles/balance';
import { placeLoose } from './looseObjects';
import { PLATE, type SandFigure } from '../puzzles/chladni';
import {
  BEAM_HEIGHT,
  BEAM_SPAN,
  HOLE_MARK_LIFT,
  MEASURE,
  NOTCH_MARK_HEIGHT,
  PLATE_TOP,
  WEIGHT_MARK_HEIGHT,
  WEIGHT_SIZE,
  holeOffset,
} from '../worlds/procedural/benchShape';

type Weight = 1 | 2 | 3;
const WEIGHTS: readonly Weight[] = [1, 2, 3];
const HELD_OFFSET = new Vector3(0.18, -0.3, -0.7);
const HELD_TILT = new Quaternion().setFromEuler(new Euler(0.1, 0, 0));
/** Lo máximo que se inclina la viga (rad). */
const MAX_TILT = 0.28;
/** Los radios de los tres aros de arena (m). */
const RINGS: readonly number[] = [0.2, 0.36, 0.52];

function metal(color: string, emissive = '#000000'): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(color),
    emissive: new Color(emissive),
    metalness: 0.6,
    roughness: 0.45,
  });
}

export interface BalanceAnchors {
  /** La marca de cada muesca, de la 1 a la 6. */
  notches: readonly Object3D[];
  /** El sitio de cada pesa (su pedestal). */
  homes: Readonly<Record<Weight, Object3D>>;
  /** El marco del mundo: de él cuelgan las pesas que se dejan sueltas por ahí. */
  world: Object3D;
}

export interface BalanceShown {
  /** Lo que hay en cada muesca (su número) y lo que pesa. */
  placement: Readonly<Record<number, number>>;
  held: Weight | undefined;
  /** Las pesas dejadas sueltas y dónde. */
  loose: Readonly<Partial<Record<Weight, LoosePose>>>;
  /** −1 hacia la maqueta, 1 hacia las pesas. */
  lean: number;
}

export interface BalanceView {
  update(shown: BalanceShown, camera: Camera): void;
  dispose(): void;
}

export function createBalanceView(scene: Scene, anchors: BalanceAnchors): BalanceView {
  const first = anchors.notches[0];
  if (!first) throw new Error('La balanza necesita sus muescas');
  // La viga gira sobre el eje: el origen del grupo está en el eje, a la altura de la viga (relativo a la muesca 1).
  const beam = new Group();
  beam.position.set(-MEASURE, 0, BEAM_HEIGHT - NOTCH_MARK_HEIGHT);
  first.add(beam);
  const length = BEAM_SPAN.right - BEAM_SPAN.left;
  const bar = new Mesh(new BoxGeometry(length, 0.08, 0.08), metal('#B58A3C', '#3A2A0C'));
  bar.position.x = (BEAM_SPAN.left + BEAM_SPAN.right) / 2;
  beam.add(bar);
  // La maqueta del motor viejo, colgada a la izquierda a su distancia, con las seis medidas de peso.
  const modelX = -BALANCE.model.distance * MEASURE;
  const model = new Mesh(new BoxGeometry(0.5, 0.3, 0.34), metal('#3D4A5A'));
  model.position.set(modelX, 0, -0.42);
  const chain = new Mesh(
    new CylinderGeometry(0.012, 0.012, 0.3).rotateX(Math.PI / 2),
    metal('#8A8F96'),
  );
  chain.position.set(modelX, 0, -0.15);
  beam.add(model, chain);
  // Las notas de las muescas: una raya por cada una.
  for (let notch = 1; notch <= BALANCE.notches; notch++) {
    const tick = new Mesh(new BoxGeometry(0.02, 0.1, 0.12), metal('#D4B565', '#4A3A10'));
    tick.position.set(notch * MEASURE, 0, 0.06);
    beam.add(tick);
  }

  const weights = new Map<Weight, Mesh>();
  for (const w of WEIGHTS) {
    const size = WEIGHT_SIZE[w];
    const mesh = new Mesh(new BoxGeometry(size, size, size), metal('#8C8F84'));
    scene.add(mesh);
    weights.set(w, mesh);
  }
  const onNotch = new Map<Weight, number>();

  return {
    update(shown, camera) {
      beam.rotation.y = shown.lean * MAX_TILT;
      onNotch.clear();
      for (const [notch, weight] of Object.entries(shown.placement)) {
        onNotch.set(weight as Weight, Number(notch));
      }
      for (const w of WEIGHTS) {
        const mesh = weights.get(w);
        if (!mesh) continue;
        const size = WEIGHT_SIZE[w];
        const notch = onNotch.get(w);
        const loosePose = shown.loose[w];
        if (shown.held === w) {
          // La cámara no cuelga de la escena: se copia su pose (coordenadas de la escena).
          if (mesh.parent !== scene) scene.add(mesh);
          mesh.position.copy(HELD_OFFSET).applyQuaternion(camera.quaternion).add(camera.position);
          mesh.quaternion.copy(camera.quaternion).multiply(HELD_TILT);
        } else if (loosePose) {
          placeLoose(mesh, anchors.world, loosePose, size / 2);
        } else if (notch !== undefined) {
          if (mesh.parent !== beam) beam.add(mesh);
          mesh.position.set(notch * MEASURE, 0, -0.12 - size / 2);
          mesh.quaternion.identity();
        } else {
          const home = anchors.homes[w];
          if (mesh.parent !== home) home.add(mesh);
          mesh.position.set(0, 0, -(WEIGHT_MARK_HEIGHT - 0.7) - size / 2);
          mesh.quaternion.identity();
        }
      }
    },
    dispose() {
      beam.removeFromParent();
      for (const mesh of weights.values()) mesh.removeFromParent();
    },
  };
}

export interface PlateShown {
  clamps: readonly number[];
  figure: SandFigure;
}

export interface PlateView {
  update(shown: PlateShown): void;
  dispose(): void;
}

/** La arena y las pinzas de la placa; cuelga de la marca del agujero 1. */
export function createPlateView(holes: readonly Object3D[]): PlateView {
  const first = holes[0];
  if (!first) throw new Error('La placa necesita sus agujeros');
  const [ox, oy] = holeOffset(1);
  const root = new Group();
  // El centro de la placa, relativo a la marca del agujero 1.
  root.position.set(-ox, -oy, PLATE_TOP - (PLATE_TOP + HOLE_MARK_LIFT) + 0.01);
  first.add(root);
  const sand = new MeshStandardMaterial({
    color: new Color('#E8D9AE'),
    emissive: new Color('#4A3C18'),
  });
  const glow = new MeshStandardMaterial({
    color: new Color('#FFE2A0'),
    emissive: new Color('#FFB040'),
    emissiveIntensity: 1.2,
  });
  const rings = RINGS.map((radius) => {
    const ring = new Mesh(new TorusGeometry(radius, 0.012, 6, 36), sand);
    ring.visible = false;
    root.add(ring);
    return ring;
  });
  const spokes = Array.from({ length: PLATE.holes }, (_, index) => {
    const [dx, dy] = holeOffset(index + 1);
    const spoke = new Mesh(new BoxGeometry(0.62, 0.02, 0.01), sand);
    spoke.position.set(dx / 2, dy / 2, 0);
    spoke.rotation.z = Math.atan2(dy, dx);
    spoke.visible = false;
    root.add(spoke);
    return spoke;
  });
  const clampMeshes = Array.from({ length: PLATE.holes }, (_, index) => {
    const [dx, dy] = holeOffset(index + 1);
    const clamp = new Mesh(
      new CylinderGeometry(0.07, 0.07, 0.1).rotateX(Math.PI / 2),
      metal('#56677A'),
    );
    clamp.position.set(dx, dy, 0.05);
    clamp.visible = false;
    root.add(clamp);
    return clamp;
  });

  return {
    update(shown) {
      for (const [index, ring] of rings.entries()) {
        ring.visible = index < shown.figure.rings;
        ring.material = shown.figure.symbol ? glow : sand;
      }
      for (const [index, spoke] of spokes.entries()) {
        spoke.visible = shown.figure.spokes.includes(index + 1);
        spoke.material = shown.figure.symbol ? glow : sand;
      }
      for (const [index, clamp] of clampMeshes.entries())
        clamp.visible = shown.clamps.includes(index + 1);
    },
    dispose() {
      root.removeFromParent();
    },
  };
}
