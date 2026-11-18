// La Sala del Centro del Taller rehecha como la casa del escéptico (plan de finales, E5; ✅ que vive allí y que la
// Cámara está allí, 🟡 todo lo demás): sobre el núcleo de roca, la Cámara con la fuente de poder; a su alrededor el
// catre, la caja con las dos tazas, la mesa con las páginas de sincronización y las cartas que no mandó, el anillo por
// el que se llega desde la Pista (su obra, apagado) y un corro de muros llenos de rayas. La luz va cocida (ver
// tallerCentroMaterial.ts). Devuelve las mallas, la colisión y las marcas; taller.ts las pega en el mundo.
import {
  BufferGeometry,
  Color,
  Group,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  Object3D,
  SphereGeometry,
  type Material,
  Quaternion,
  Vector3,
} from 'three';
import { TELEPORTER } from '../../game/teleporter';
import { SKEPTIC_TALK, CAMARA_SOURCE } from '../../game/skeptic';
import { frameAt, smoothstep, type Frame, type MarkerProps, type Triple } from './kit';
import { createNoise, fbm, seededRandom } from './noise';
import { buildCamaraBase, buildCamaraRings, buildCamaraSource } from './tallerCentroCamara';
import { createCentroMaterial } from './tallerCentroMaterial';
import { CentroParts, plain, type Lighting } from './tallerCentroParts';
import { buildFurniture, buildGateRing } from './tallerCentroFurniture';
import {
  CAMARA,
  CAMARA_FOOT,
  COT,
  GATE,
  SKEPTIC_SEAT,
  SOURCE_HEIGHT,
  TABLE,
  WALL_COLATITUDE,
  WALLS,
  type Spot,
} from './tallerCentroShape';
import { buildWalls } from './tallerCentroWalls';
import { CORE_RADIUS, SHELL_RADIUS } from './tallerShape';

/** Las piezas del modelo de los Ausentes (Y arriba, frente −Z) se cuelgan con esto del marco (Z arriba, frente +Y). */
const Y_UP = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
const DEG = Math.PI / 180;

/** Dónde se sienta él (y dónde espera en la Pista cuando sale contigo): puntos vacíos con nombre. */
export const SKEPTIC_ANCHORS = {
  home: 'Taller_Esceptico_Catre',
  track: 'Taller_Esceptico_Pista',
} as const;

export interface CentroMarker {
  name: string;
  frame: Frame;
  at: Triple;
  props?: MarkerProps;
}

export interface CentroBuild {
  objects: Object3D[];
  colliders: BufferGeometry[];
  markers: CentroMarker[];
}

const core = { radius: CORE_RADIUS, groundRadius: () => CORE_RADIUS };
const frameOf = (s: Spot): Frame => frameAt(core, s.lat, s.lon, { heading: s.heading });

/** Un punto vacío con nombre, orientado para colgar un modelo de Ausente (frente hacia el +Y del marco). */
export function anchor(name: string, f: Frame, at: Triple): Object3D {
  const node = new Object3D();
  node.name = name;
  node.position.copy(f.point(at));
  node.quaternion.copy(f.rotation().multiply(Y_UP));
  return node;
}

function lighting(): Lighting {
  const source = frameOf(CAMARA).point([0, 0, SOURCE_HEIGHT]);
  const lamp = frameOf(TABLE).point([0.55, 0.12, 1.5]);
  const near = [CAMARA, COT, TABLE].map((s) => ({
    at: frameOf(s).point([0, 0, 0]),
    radius: s === CAMARA ? CAMARA_FOOT + 0.2 : 1.1,
  }));
  return {
    sky: { up: new Color('#4a3d68').multiplyScalar(0.9), down: new Color('#1c1722') },
    steady: [{ position: lamp, color: new Color('#ffab62').multiplyScalar(1.6), range: 2.2 }],
    glowing: [{ position: source, color: new Color('#ffd49a').multiplyScalar(2.8), range: 4.6 }],
    occlusion: (p) => occlusion(p, near),
  };
}

/** Rincones: más oscuro junto al suelo, al pie de los muros y bajo los muebles. */
function occlusion(p: Vector3, near: readonly { at: Vector3; radius: number }[]): number {
  const height = p.length() - CORE_RADIUS;
  let ao = 0.55 + 0.45 * smoothstep(-0.05, 1.2, height);
  if (height < 0.4) {
    for (const { at, radius } of near) {
      const d = p.distanceTo(at);
      ao *= 1 - 0.32 * Math.exp(-((d / radius) ** 2));
    }
    const colat = Math.acos(Math.min(1, p.z / p.length())) / DEG;
    const lon = (Math.atan2(p.y, p.x) / DEG + 360) % 360;
    const toWall = Math.abs(colat - WALL_COLATITUDE) * DEG * CORE_RADIUS;
    if (WALLS.some((w) => lon >= w.from - 1 && lon <= w.to + 1)) {
      ao *= 1 - 0.4 * Math.exp(-((toWall / 0.6) ** 2));
    }
  }
  return ao;
}

/** El suelo: el núcleo entero, piedra oscura con vetas y manchas que cambian de tono por zonas. */
function floor(parts: CentroParts): void {
  const noise = createNoise(52);
  const tint = (p: Vector3): number =>
    0.78 + 0.5 * fbm(noise, p.x * 0.35, p.y * 0.35, p.z * 0.35, 4);
  parts.add(plain(new IcosahedronGeometry(CORE_RADIUS, 34)), new Matrix4(), '#4c4249', {
    vary: 0,
    tint,
  });
}

/** El anillo por el que se llega desde la Pista (su obra; se abre con el reloj de la Pista en hora). */
function gate(parts: CentroParts, markers: CentroMarker[]): void {
  const f = frameOf(GATE);
  buildGateRing(parts, f);
  markers.push({
    name: 'PASO_Centro',
    frame: f,
    at: [0, 0, 0],
    props: { destino: 'PASO_Pista', cerradura: TELEPORTER.lock },
  });
}

function sources(markers: CentroMarker[]): void {
  const camara = frameOf(CAMARA);
  markers.push({
    name: 'INT_camara',
    frame: camara,
    at: [0, -0.4, 1.5],
    props: { clue_id: CAMARA_SOURCE, kind: 'observacion' },
  });
  const cot = frameOf(COT);
  const [sx, sy] = SKEPTIC_SEAT;
  for (const [stage, id] of Object.entries(SKEPTIC_TALK)) {
    markers.push({
      name: `INT_esceptico_${stage}`,
      frame: cot,
      at: [sx, sy + 0.45, 1.5],
      props: { clue_id: id, kind: 'charla' },
    });
  }
  markers.push({
    name: 'INT_catre',
    frame: cot,
    at: [-2.15, 0, 0.9],
    props: { clue_id: 'taller.catre', kind: 'objeto' },
  });
  const table = frameOf(TABLE);
  markers.push({
    name: 'INT_paginas',
    frame: table,
    at: [-0.35, 0, 1.4],
    props: { clue_id: 'taller.paginas', kind: 'texto' },
  });
  markers.push({
    name: 'INT_cartas',
    frame: table,
    at: [0.2, -0.1, 1.4],
    props: { clue_id: 'taller.cartas_sin_enviar', kind: 'texto' },
  });
  const wall = frameAt(core, 90 - (WALL_COLATITUDE - 2.5), 95, { heading: 0 });
  markers.push({
    name: 'INT_rayas',
    frame: wall,
    at: [0, 0, 1.5],
    props: { clue_id: 'taller.rayas', kind: 'observacion' },
  });
}

/** La cáscara de la sala vista por dentro: piedra casi negra que apenas recoge la luz de la Cámara. */
function shellWall(material: Material, light: Lighting, random: () => number): Mesh {
  const geometry = plain(new SphereGeometry(SHELL_RADIUS, 72, 36));
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  // Se da la vuelta a cada triángulo y a sus normales: se ve desde dentro.
  for (let i = 0; i < positions.count; i += 3) {
    for (const attribute of [positions, normals]) {
      const [x, y, z] = [attribute.getX(i + 1), attribute.getY(i + 1), attribute.getZ(i + 1)];
      attribute.setXYZ(i + 1, attribute.getX(i + 2), attribute.getY(i + 2), attribute.getZ(i + 2));
      attribute.setXYZ(i + 2, x, y, z);
    }
  }
  for (let i = 0; i < normals.count; i++) {
    normals.setXYZ(i, -normals.getX(i), -normals.getY(i), -normals.getZ(i));
  }
  const parts = new CentroParts(random);
  const noise = createNoise(54);
  parts.add(geometry, new Matrix4(), '#3b3146', {
    vary: 0,
    tint: (p) => 0.7 + 0.6 * fbm(noise, p.x * 0.18, p.y * 0.18, p.z * 0.18, 3),
  });
  return parts.mesh(SHELL_NAME, material, light);
}

/** La cáscara oscura de la sala (por dentro). */
export const SHELL_NAME = 'Taller_Sala_Cascara';

export function buildCentro(): CentroBuild {
  const random = seededRandom(53);
  const { material } = createCentroMaterial();
  const light = lighting();
  const parts = new CentroParts(random);
  const markers: CentroMarker[] = [];
  floor(parts);
  buildWalls(parts);
  buildCamaraBase(parts, frameOf(CAMARA));
  buildFurniture(parts, frameOf(COT), frameOf(TABLE));
  gate(parts, markers);
  sources(markers);
  const house = parts.mesh('Taller_Casa', material, light);
  house.userData.near_only = true;
  const camara = frameOf(CAMARA);
  const rings = buildCamaraRings(camara, material, light, random);
  const lit = [house, shellWall(material, light, random), ...rings, ...buildCamaraSource(camara)];
  const group = new Group();
  group.name = 'Taller_Centro';
  group.add(...lit, anchor(SKEPTIC_ANCHORS.home, frameOf(COT), SKEPTIC_SEAT));
  return { objects: [group], colliders: parts.colliders, markers };
}
