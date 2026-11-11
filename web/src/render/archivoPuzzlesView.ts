// Las piezas de los puzzles del Archivo a la vista (plan de historia y puzzles físicos, T6): las cinco esferas del
// Planetario (rueda dentada, mordida, gota, anillo y cúpula, cada una con su aspecto), el prisma de la Ranura y el
// abanico de luz que abre sobre la tablilla. Dónde está cada pieza lo decide game/archivoPlay.ts. Todo cuelga de las
// marcas del Archivo (sus ejes son los del suelo de la Galería, Z arriba).
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Group,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Camera,
  type Object3D,
  type Scene,
} from 'three';
import type { PieceWhere } from '../game/archivoPlay';
import { placeLoose } from './looseObjects';
import { alignedAngles, ORRERY, type SphereId } from '../puzzles/orrery';
import {
  RAIL_MARK_LIFT,
  RAIL_RADII,
  SPHERE_LIFT,
  railAngle,
} from '../worlds/procedural/archivoPuzzlesShape';

const HELD_OFFSET = new Vector3(0.18, -0.3, -0.7);
const HELD_TILT = new Quaternion().setFromEuler(new Euler(0.1, 0, 0));
/** Del centro de una esfera (unos 0,28 m de ancho) y del prisma a su base, para apoyarlos (m). */
const SPHERE_REST = 0.14;
const PRISM_LIFT = 0.2;
/** Cuánto se hunde una pieza en reposo bajo su marca (m). */
const HOME_DROP = 0.35;

function material(color: string, emissive = '#000000', opacity = 1): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(color),
    emissive: new Color(emissive),
    metalness: 0.5,
    roughness: 0.45,
    side: DoubleSide,
    transparent: opacity < 1,
    opacity,
  });
}

/** El modelo de cada esfera (Z arriba, unos 0,28 m de ancho). */
export function sphereModel(id: SphereId): Group {
  const group = new Group();
  const add = (mesh: Mesh): void => {
    group.add(mesh);
  };
  switch (id) {
    case 'taller': {
      const brass = material('#B58A3C', '#3A2A0C');
      add(new Mesh(new TorusGeometry(0.12, 0.028, 8, 20), brass));
      for (let k = 0; k < 6; k++) {
        const spoke = new Mesh(new BoxGeometry(0.22, 0.02, 0.02), brass);
        spoke.rotation.z = (k * Math.PI) / 6;
        add(spoke);
      }
      add(new Mesh(new SphereGeometry(0.035, 8, 6), brass));
      break;
    }
    case 'cicatriz': {
      add(new Mesh(new SphereGeometry(0.13, 14, 10), material('#C8643C', '#4A1E0C')));
      const bite = new Mesh(new SphereGeometry(0.075, 10, 8), material('#2A2430'));
      bite.position.set(0.1, 0, 0.07);
      add(bite);
      break;
    }
    case 'archivo': {
      const teal = material('#4F9AA8', '#12383E');
      add(new Mesh(new SphereGeometry(0.1, 12, 10), teal));
      const tip = new Mesh(new ConeGeometry(0.075, 0.16, 10), teal);
      tip.rotation.x = Math.PI / 2;
      tip.position.z = 0.15;
      add(tip);
      break;
    }
    case 'umbral': {
      const sand = material('#D8B070', '#3A2A10');
      add(new Mesh(new TorusGeometry(0.12, 0.03, 8, 20), sand));
      add(new Mesh(new SphereGeometry(0.045, 8, 6), sand));
      break;
    }
    case 'observatorio': {
      const pearl = material('#DCDFE2', '#202428');
      const dome = new Mesh(new SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), pearl);
      dome.rotation.x = Math.PI / 2;
      add(dome);
      const base = new Mesh(new CylinderGeometry(0.13, 0.13, 0.03, 14), pearl);
      base.rotation.x = Math.PI / 2;
      base.position.z = -0.015;
      add(base);
      break;
    }
  }
  return group;
}

function prismModel(): Group {
  const group = new Group();
  const crystal = new Mesh(new OctahedronGeometry(0.13), material('#BFE4FF', '#4A7090', 0.78));
  crystal.scale.set(0.8, 0.8, 1.5);
  group.add(crystal);
  return group;
}

export interface ArchivoAnchors {
  /** La marca de cada esfera y la del prisma (donde esperan). */
  homes: Readonly<Record<string, Object3D>>;
  /** Las seis marcas de los rieles, de dentro afuera. */
  rails: readonly Object3D[];
  stand: Object3D;
  /** La tablilla de la ranura: adonde apunta el abanico. */
  tablet: Object3D | undefined;
  /** El marco del mundo: de él cuelgan las piezas que se dejan sueltas por ahí. */
  world: Object3D;
}

export interface ArchivoShown {
  pieces: readonly { id: string; where: PieceWhere }[];
  crank: number;
  slotEvent: boolean;
  prismFitted: boolean;
}

export interface ArchivoPuzzlesView {
  update(shown: ArchivoShown, camera: Camera): void;
  dispose(): void;
}

export function createArchivoPuzzlesView(
  scene: Scene,
  anchors: ArchivoAnchors,
): ArchivoPuzzlesView {
  const objects = new Map<string, Group>();
  for (const id of ORRERY.spheres) objects.set(id, sphereModel(id));
  objects.set('prisma', prismModel());
  for (const object of objects.values()) scene.add(object);

  // El abanico de luz del prisma sobre la tablilla: cinco rayos de color.
  const fan = new Group();
  const colors = ['#FF8A70', '#FFD070', '#A8E890', '#80C8FF', '#B8A0FF'];
  const rays = colors.map((color) => {
    const ray = new Mesh(
      new BoxGeometry(0.03, 1, 0.03),
      new MeshStandardMaterial({
        color: new Color(color),
        emissive: new Color(color),
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.8,
      }),
    );
    fan.add(ray);
    return ray;
  });
  fan.visible = false;
  anchors.stand.add(fan);

  const startAngles = [1, 2, 3, 4, 5, 6].map(railAngle);
  const from = new Vector3();
  const to = new Vector3();

  function place(object: Group, parent: Object3D, offset: Vector3): void {
    if (object.parent !== parent) parent.add(object);
    object.position.copy(offset);
    object.quaternion.identity();
    object.scale.setScalar(1);
  }

  return {
    update(shown, camera) {
      const angles = alignedAngles(shown.crank, startAngles);
      for (const { id, where } of shown.pieces) {
        const object = objects.get(id);
        if (!object) continue;
        if (where === 'hands') {
          if (object.parent !== scene) scene.add(object);
          object.position.copy(HELD_OFFSET).applyQuaternion(camera.quaternion).add(camera.position);
          object.quaternion.copy(camera.quaternion).multiply(HELD_TILT);
          object.rotateX(-Math.PI / 2);
          object.scale.setScalar(0.9);
        } else if (where === 'home') {
          const home = anchors.homes[id];
          if (home) place(object, home, new Vector3(0, 0, -HOME_DROP));
          object.visible = home !== undefined;
        } else if (where === 'stand') {
          place(object, anchors.stand, new Vector3(0, 0, -0.26));
          object.visible = true;
        } else if ('loose' in where) {
          placeLoose(
            object,
            anchors.world,
            where.loose,
            id === 'prisma' ? PRISM_LIFT : SPHERE_REST,
          );
          object.visible = true;
        } else {
          const rail = anchors.rails[where.rail - 1];
          const radius = RAIL_RADII[where.rail - 1] ?? 1;
          if (!rail) continue;
          // Sobre su riel: la esfera gira a su paso; el marcador del riel se queda donde estaba.
          const a = ((angles[where.rail - 1] ?? 0) * Math.PI) / 180;
          const start = (railAngle(where.rail) * Math.PI) / 180;
          place(
            object,
            rail,
            new Vector3(
              radius * (Math.cos(a) - Math.cos(start)),
              radius * (Math.sin(a) - Math.sin(start)),
              -(RAIL_MARK_LIFT - SPHERE_LIFT),
            ),
          );
          object.visible = true;
          object.rotateZ(a);
        }
      }
      const showFan = shown.prismFitted && shown.slotEvent && anchors.tablet !== undefined;
      fan.visible = showFan;
      if (showFan && anchors.tablet) {
        from.set(0, 0, -0.26);
        anchors.tablet.getWorldPosition(to);
        anchors.stand.worldToLocal(to);
        const along = to.clone().sub(from);
        const length = along.length();
        rays.forEach((ray, index) => {
          const spread = (index - 2) * 0.12;
          const target = along
            .clone()
            .add(new Vector3(spread * length * 0.25, spread * length * 0.25, 0));
          ray.scale.set(1, target.length(), 1);
          ray.position.copy(from).addScaledVector(target, 0.5);
          ray.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), target.clone().normalize());
        });
      }
    },
    dispose() {
      for (const object of objects.values()) object.removeFromParent();
      fan.removeFromParent();
    },
  };
}
