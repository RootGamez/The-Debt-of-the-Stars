// El Contrapeso por código (Fase 11; antes contrapeso.glb, de blender/scripts/generar_contrapeso.py; el aspecto, 🟡):
// el artilugio que terminaron los tres del Laboratorio para sustituir el motor viejo de Cicatriz. Gramática de los
// Ausentes: un núcleo de luz ámbar sujeto por dos husos de pizarra en un eje de latón; alrededor, tres anillos que
// giran (dos meridianos y el ecuador, como una esfera armilar) dentro de un aro fijo con doce marcas: su reloj. Un
// pie de arenisca en estratos y dos asas para llevarlo en brazos. Mide unos 0,8 m.
//
// Se diseña con Z arriba (como en Blender) y se pasa a Y arriba (como lo dejaba el glTF): los anillos
// (contrapeso_AnilloA/B/C, con `spin` en rad/s) giran sobre su Y local; contrapeso_Luz es el ámbar que brilla.
import {
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CounterweightModel } from '../../render/counterweightView';
import { ball, box, cone, cylinder, pieceMatrix, PieceSet, torus, type Triple } from './kit';

const C = {
  sandstone: '#B9AE96',
  sandstoneDark: '#8E8570',
  slate: '#2C3834',
  slateLight: '#4A5A54',
  brass: '#A88A50',
  brassDark: '#7A6236',
  amber: '#FFC070',
} as const;

/** El aro fijo (la esfera del reloj). */
const HOOP = 0.31;
const FOOT_TOP = -HOOP - 0.015;
const QUARTER = Math.PI / 2;

type Plane = 'meridian' | 'turnedMeridian' | 'equator';
/** Los anillos que giran dentro del aro, sin tocarse: nombre, radio, grosor, color, giro (rad/s) y plano. */
const RINGS: readonly (readonly [string, number, number, string, number, Plane])[] = [
  ['contrapeso_AnilloA', 0.25, 0.014, C.brass, 0.45, 'meridian'],
  ['contrapeso_AnilloB', 0.195, 0.012, C.sandstone, -0.7, 'turnedMeridian'],
  ['contrapeso_AnilloC', 0.145, 0.012, C.slateLight, 0.25, 'equator'],
];

/** De Z arriba (diseño) a Y arriba (el juego). */
const Z_TO_Y = new Matrix4().makeRotationX(-Math.PI / 2);

function merged(set: PieceSet, kind: 'stone' | 'light'): BufferGeometry {
  const geometry = mergeGeometries(set.parts[kind]);
  return geometry.applyMatrix4(Z_TO_Y);
}

/** Marcas de reloj sobre un aro de radio `radius`: en el plano XZ (meridiano) o XY (ecuador). */
function hourMarks(
  set: PieceSet,
  radius: number,
  count: number,
  color: string,
  plane: 'meridian' | 'equator',
): void {
  for (let k = 0; k < count; k++) {
    const a = (2 * Math.PI * k) / count;
    const tint = k === 0 ? C.amber : color;
    if (plane === 'equator') {
      set.add(
        tint,
        box(),
        pieceMatrix(
          [Math.cos(a) * radius, Math.sin(a) * radius, 0],
          [0, 0, a],
          [0.035, 0.016, 0.026],
        ),
      );
    } else {
      set.add(
        tint,
        box(),
        pieceMatrix(
          [Math.cos(a) * radius, 0, Math.sin(a) * radius],
          [0, -a, 0],
          [0.035, 0.026, 0.016],
        ),
      );
    }
  }
}

function ring(radius: number, tube: number, color: string, plane: Plane): PieceSet {
  const set = new PieceSet(radius * 1000);
  const turn: Triple =
    plane === 'turnedMeridian'
      ? [0, 0, QUARTER]
      : plane === 'equator'
        ? [QUARTER, 0, 0]
        : [0, 0, 0];
  set.add(color, torus(radius, tube, 28, 5), pieceMatrix(undefined, turn));
  if (plane === 'turnedMeridian') {
    // En el plano YZ: sus marcas también.
    for (let k = 0; k < 8; k++) {
      const a = (2 * Math.PI * k) / 8;
      set.add(
        k === 0 ? C.amber : C.slate,
        box(),
        pieceMatrix(
          [0, Math.cos(a) * radius, Math.sin(a) * radius],
          [a, 0, 0],
          [0.026, 0.035, 0.016],
        ),
      );
    }
  } else if (plane === 'equator') hourMarks(set, radius, 12, C.sandstone, 'equator');
  else hourMarks(set, radius, 8, C.slate, 'meridian');
  return set;
}

function body(set: PieceSet): void {
  // El pie en estratos: arenisca oscura, una franja de pizarra y arenisca clara arriba.
  set.add(
    C.sandstoneDark,
    cone(0.23, 0.22, 14),
    pieceMatrix([0, 0, FOOT_TOP - 0.08], undefined, [1, 1, 0.04]),
  );
  set.add(
    C.sandstoneDark,
    cylinder(0.2, 14),
    pieceMatrix([0, 0, FOOT_TOP - 0.095], undefined, [1, 1, 0.01]),
  );
  set.add(
    C.slate,
    cylinder(0.19, 14),
    pieceMatrix([0, 0, FOOT_TOP - 0.0475], undefined, [1, 1, 0.025]),
  );
  set.add(
    C.sandstone,
    cone(0.16, 0.11, 14),
    pieceMatrix([0, 0, FOOT_TOP - 0.0175], undefined, [1, 1, 0.035]),
  );
  // El aro fijo con sus marcas (arriba no: ahí está la tapa) y dos asas a los lados.
  set.add(C.slate, torus(HOOP, 0.02, 32, 6), pieceMatrix());
  for (let k = 1; k < 12; k++) {
    const a = QUARTER + (2 * Math.PI * k) / 12;
    set.add(
      C.sandstone,
      box(),
      pieceMatrix([Math.cos(a) * HOOP, 0, Math.sin(a) * HOOP], [0, -a, 0], [0.055, 0.05, 0.02]),
    );
  }
  for (const side of [-1, 1]) {
    set.add(C.brass, torus(0.055, 0.013, 14, 4), pieceMatrix([side * (HOOP + 0.06), 0, 0]));
    set.add(
      C.brassDark,
      cylinder(0.022, 8),
      pieceMatrix([side * (HOOP + 0.005), 0, 0], [0, QUARTER, 0], [1, 1, 0.03]),
    );
  }
  // El eje de latón, de polo a polo, y la tapa de arriba.
  set.add(
    C.brass,
    cylinder(0.016, 8),
    pieceMatrix([0, 0, 0.005], undefined, [1, 1, 2 * HOOP + 0.02]),
  );
  set.add(
    C.sandstone,
    cone(0.05, 0.02, 10),
    pieceMatrix([0, 0, HOOP + 0.035], undefined, [1, 1, 0.05]),
  );
  // Dos husos de pizarra sujetan el núcleo.
  for (const sign of [-1, 1]) {
    set.add(
      C.slate,
      cone(0.016, 0.055, 10),
      pieceMatrix([0, 0, sign * 0.11], [sign > 0 ? 0 : Math.PI, 0, 0], [1, 1, 0.09]),
    );
    set.add(
      C.brass,
      cylinder(0.06, 10),
      pieceMatrix([0, 0, sign * 0.067], undefined, [1, 1, 0.012]),
    );
  }
  // El núcleo y el anillo de luz de la tapa: ámbar.
  set.add(C.amber, ball(0.065, 1), pieceMatrix(), 'light', { vary: 0, glow: 1.2 });
  set.add(
    C.amber,
    torus(0.04, 0.008, 12, 4),
    pieceMatrix([0, 0, HOOP + 0.035], [QUARTER, 0, 0]),
    'light',
    {
      vary: 0,
      glow: 1.2,
    },
  );
}

/** El Contrapeso, listo para ponerlo en su Banco, en brazos, en la nave o en la cuna. */
export function buildCounterweight(): CounterweightModel {
  const paint = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7 });
  const glow = new MeshBasicMaterial({ vertexColors: true });
  const object = new Group();
  object.name = 'Contrapeso';
  const set = new PieceSet(7);
  body(set);
  const shell = new Mesh(merged(set, 'stone'), paint);
  shell.name = 'contrapeso_Cuerpo';
  const light = new Mesh(merged(set, 'light'), glow);
  light.name = 'contrapeso_Luz';
  object.add(shell, light);
  const rings: CounterweightModel['rings'] = [];
  for (const [name, radius, tube, color, spin, plane] of RINGS) {
    const mesh = new Mesh(merged(ring(radius, tube, color, plane), 'stone'), paint);
    mesh.name = name;
    mesh.userData.spin = spin;
    object.add(mesh);
    rings.push({ object: mesh, spin });
  }
  for (const child of object.children) child.castShadow = true;
  return { object, rings };
}
