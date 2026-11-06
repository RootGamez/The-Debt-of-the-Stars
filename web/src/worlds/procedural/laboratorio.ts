// El Nudo y el Laboratorio Oculto por código (Fase 11; CONTEXTO_PLANETAS.md §8): una cáscara negra con su Puerta de
// anillos y un muelle, y dentro, una cavidad donde la gravedad empuja hacia fuera y se camina por la cara interior.
// En el centro cuelga la semilla del Nudo con sus anillos; alrededor de ella, muy despacio (aquí el tiempo corre
// cinco veces más lento), orbita lo que el Laboratorio perdió al soltarse: papeles, libros, sillas, tazas, luces.
// Sobre la cara interior, una red de líneas frías (los estratos y los meridianos de los Ausentes) que rodea a quien
// mira por todas partes. Las zonas de trabajo están en laboratorioRooms.ts y las de la vida de cada día, en
// laboratorioLife.ts. Sustituye a laboratorio.glb con el mismo contrato (raíz con la cavidad y la luz de dentro;
// COL_laboratorio_Terreno y COL_laboratorio_Lugares; SPAWN_Laboratorio, PASO_Boca y PASO_Dentro, las INT_ y las ANIM_).
import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Euler,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NEAR_ONLY } from '../../render/nearDetail';
import {
  angleBetween,
  applySkyLight,
  ball,
  box,
  colliderMesh,
  cylinder,
  direction,
  piecesToMeshes,
  sphereTerrain,
  torus,
  pieceMatrix,
  type PieceKind,
  type PieceSet,
} from './kit';
import { LabBuilder, PALETTE as P } from './laboratorioKit';
import { buildLife } from './laboratorioLife';
import { buildRooms } from './laboratorioRooms';
import {
  INNER_SITES,
  LAB_CLOCK,
  LAB_GRAVITY,
  LAB_INNER_RADIUS,
  LAB_RADIUS,
  LABORATORIO_ID,
  OUTER_SITES,
  PATHS,
  along,
  inStratum,
  innerGround,
  insideFrame,
  insideHeading,
  outerGround,
  outsideFrame,
} from './laboratorioShape';
import { applySpiralBoard, boardSeamColor } from './laboratorioFloor';
import { seededRandom } from './noise';
import { sunInWorld } from './sun';

export { LABORATORIO_ID } from './laboratorioShape';
const OUTER_DETAIL = 16;
const INNER_DETAIL = 26;
const DEG = Math.PI / 180;

/** Da la vuelta a los triángulos de una geometría sin índice (la cara interior mira hacia el centro). */
function flipInward(geometry: BufferGeometry): BufferGeometry {
  for (const name of ['position', 'color'] as const) {
    const attribute = geometry.getAttribute(name);
    if (!(attribute as unknown)) continue;
    const a = attribute.array;
    for (let i = 0; i + 8 < a.length; i += 9) {
      for (let c = 0; c < 3; c++) {
        const t = a[i + 3 + c] ?? 0;
        a[i + 3 + c] = a[i + 6 + c] ?? 0;
        a[i + 6 + c] = t;
      }
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

function shells(): { outer: BufferGeometry; inner: BufferGeometry } {
  const outerTones = ['#0B0A10', '#17151E', '#26232F'].map((c) => new Color(c));
  const outer = sphereTerrain(
    {
      radius: LAB_RADIUS,
      detail: OUTER_DETAIL,
      height: (x, y, z) => outerGround({ x, y, z }) - LAB_RADIUS,
      faceColor: (_x, _y, _z, h, _slope, random) =>
        (outerTones[h > 0.6 ? 2 : h > -0.2 ? 1 : 0] ?? new Color())
          .clone()
          .offsetHSL(0, 0, (random() - 0.5) * 0.02),
    },
    13,
  );
  const innerTones = ['#56605A', '#7C8A7E', '#A3AE9F'].map((c) => new Color(c));
  const stratum = new Color('#47514A');
  const inner = sphereTerrain(
    {
      radius: LAB_INNER_RADIUS,
      detail: INNER_DETAIL,
      height: (x, y, z) => innerGround({ x, y, z }) - LAB_INNER_RADIUS,
      faceColor: (x, y, z, h, _slope, random) => {
        if (inStratum({ x, y, z })) return stratum.clone();
        const tone = innerTones[h > 0.15 ? 0 : h > -0.15 ? 1 : 2] ?? new Color();
        return tone.clone().offsetHSL(0, 0, (random() - 0.5) * 0.04);
      },
    },
    17,
  );
  return { outer, inner: flipInward(inner) };
}

/** Senderos de losas entre las zonas, con farolas cada tanto. */
function paths(b: LabBuilder): void {
  const slab = 1.8;
  PATHS.forEach(([from, to], n) => {
    const a = INNER_SITES[from];
    const c = INNER_SITES[to];
    const length =
      angleBetween(direction(a.lat, a.lon), direction(c.lat, c.lon)) * LAB_INNER_RADIUS;
    const steps = Math.max(2, Math.floor(length / slab));
    for (let k = 1; k < steps; k++) {
      const point = along(a, c, k / steps);
      const next = along(a, c, Math.min(1, k / steps + 0.05));
      const f = insideFrame(point.lat, point.lon, insideHeading(point, next));
      b.solid(
        b.inside,
        k % 2 ? P.sandstone : P.sandstoneDark,
        box(),
        f.at([0, 0, -0.1], undefined, [1.3, slab - 0.12, 0.3]),
      );
      if (k % 5 === 0) b.lantern(b.inside, f, (k + n) % 2 ? 1.1 : -1.1, 0, 0.05, 2.0);
    }
  });
}

/** Lejos de las zonas: ahí van las líneas frías del suelo. */
function clearOfSites(lat: number, lon: number): boolean {
  const d = direction(lat, lon);
  return Object.values(INNER_SITES).every(
    (s) => angleBetween(d, direction(s.lat, s.lon)) * LAB_INNER_RADIUS > s.clear + 1.5,
  );
}

/** La red fría de la cara interior: los paralelos de los estratos (cada 30°) y ocho meridianos. */
function coldGrid(b: LabBuilder): void {
  const step = 4;
  const piece = step * DEG * LAB_INNER_RADIUS * 0.82;
  for (const lat of [-60, -30, 0, 30, 60]) {
    const width = piece / Math.cos(lat * DEG);
    for (let lon = 0; lon < 360; lon += step) {
      if (!clearOfSites(lat, lon)) continue;
      const f = insideFrame(lat, lon, 90);
      b.glowCold(box(), f.at([0, 0, 0.03], undefined, [0.07, Math.min(width, piece), 0.03]));
    }
  }
  for (let lon = 22.5; lon < 360; lon += 45) {
    for (let lat = -80; lat <= 80; lat += step) {
      if (!clearOfSites(lat, lon)) continue;
      const f = insideFrame(lat, lon, 0);
      b.glowCold(box(), f.at([0, 0, 0.03], undefined, [0.05, piece, 0.03]));
    }
  }
}

/** La semilla del Nudo: negra, con un halo frío y tres anillos que giran muy despacio. */
function seed(b: LabBuilder): void {
  b.view(b.inside, P.black, ball(0.9, 2), pieceMatrix());
  b.glowCold(torus(1.25, 0.03, 24, 3), pieceMatrix(undefined, [0.3, 0.2, 0]));
  b.glowCold(torus(1.45, 0.015, 24, 3), pieceMatrix(undefined, [1.2, -0.4, 0.3]));
  const rings: readonly [number, [number, number, number]][] = [
    [2.2, [0.4, 0, 0]],
    [2.8, [1.3, 0.6, 0]],
    [3.4, [0.2, 1.1, 0.5]],
  ];
  rings.forEach(([radius, tilt], k) => {
    b.spinning(
      `ANIM_semilla_${String(k)}`,
      new Vector3(),
      new Quaternion().setFromEuler(new Euler(...tilt)),
      0.03 * (1 + k),
      (set) => {
        set.add(
          k === 1 ? P.board : P.sandstone,
          torus(radius, 0.08, 18, 3),
          pieceMatrix([0, 0, 0], [Math.PI / 2, 0, 0]),
          'stone',
          { solid: false },
        );
        for (let t = 0; t < 4; t++) {
          const a = (2 * Math.PI * t) / 4;
          set.add(
            P.brass,
            box(),
            pieceMatrix(
              [Math.cos(a) * radius, 0, Math.sin(a) * radius],
              [0, -a, 0],
              [0.3, 0.12, 0.12],
            ),
            'metal',
            { solid: false },
          );
        }
      },
    );
  });
}

/** Lo que orbita la semilla: cinco anillos invisibles de restos, cada uno en su plano y a su paso. */
function orbits(b: LabBuilder): void {
  const random = seededRandom(131);
  const debris = (set: PieceSet, radius: number, count: number): void => {
    for (let k = 0; k < count; k++) {
      const a = (2 * Math.PI * k) / count + random() * 0.3;
      const r = radius + (random() - 0.5) * 2.2;
      const at: [number, number, number] = [
        Math.cos(a) * r,
        (random() - 0.5) * 1.6,
        Math.sin(a) * r,
      ];
      const turn: [number, number, number] = [random() * 3, random() * 3, random() * 3];
      const kind = k % 6;
      if (kind === 0)
        set.add(P.paper, box(), pieceMatrix(at, turn, [0.34, 0.01, 0.44]), 'stone', {
          solid: false,
        });
      else if (kind === 1)
        set.add(
          [P.seal, P.blanket, P.green][k % 3] ?? P.green,
          box(),
          pieceMatrix(at, turn, [0.25, 0.06, 0.34]),
          'stone',
          { solid: false },
        );
      else if (kind === 2)
        set.add(P.amber, ball(0.07, 1), pieceMatrix(at), 'light', {
          solid: false,
          glow: 1.5,
          vary: 0,
        });
      else if (kind === 3)
        set.add(P.white, cylinder(0.05, 8), pieceMatrix(at, turn, [1, 1, 0.1]), 'stone', {
          solid: false,
        });
      else if (kind === 4)
        set.add(P.chalk, box(), pieceMatrix(at, turn, [0.3, 0.3, 0.01]), 'stone', { solid: false });
      else {
        // Una silla entera, dando vueltas.
        set.add(P.wood, box(), pieceMatrix(at, turn, [0.45, 0.06, 0.45]), 'stone', {
          solid: false,
        });
        set.add(
          P.wood,
          box(),
          pieceMatrix([at[0], at[1] + 0.25, at[2]], turn, [0.45, 0.5, 0.05]),
          'stone',
          { solid: false },
        );
      }
    }
  };
  const planes: readonly [number, [number, number, number], number, number][] = [
    [6, [0.2, 0, 0.1], 0.05, 22],
    [8.5, [1.1, 0.3, 0], -0.035, 26],
    [11, [0.6, 1.4, 0.2], 0.025, 30],
    [13.5, [1.9, 0.2, 0.9], -0.02, 32],
    [15.5, [0.1, 0.8, 1.6], 0.015, 26],
  ];
  planes.forEach(([radius, tilt, spin, count], k) => {
    b.spinning(
      `ANIM_orbita_${String(k)}`,
      new Vector3(),
      new Quaternion().setFromEuler(new Euler(...tilt)),
      Math.abs(spin),
      (set) => {
        debris(set, radius, count);
      },
    );
  });
}

/** Por fuera: la Puerta de la cáscara, el muelle y un cinturón de estratos roto en tramos. */
function outside(b: LabBuilder): void {
  const s = b.outside;
  const top = 0.05;
  const gate = OUTER_SITES.puerta;
  const f = outsideFrame(gate.lat, gate.lon, 180);
  b.solid(s, P.sandstoneDark, cylinder(3.0, 16), f.at([0, 0, top - 0.5], undefined, [1, 1, 1.0]));
  b.gate(s, f, top);
  b.mark('PASO_Boca', f, [0, 0, top], { destino: 'PASO_Dentro' });
  const dock = OUTER_SITES.muelle;
  const m = outsideFrame(dock.lat, dock.lon, 0);
  b.solid(s, P.sandstoneDark, cylinder(4.0, 20), m.at([0, 0, top - 0.6], undefined, [1, 1, 1.2]));
  b.view(s, P.board, cylinder(3.6, 20), m.at([0, 0, top + 0.01], undefined, [1, 1, 0.02]));
  for (let k = 0; k < 24; k++) {
    const a = (2 * Math.PI * k) / 24;
    const mm = m.at(
      [Math.cos(a) * 3.3, Math.sin(a) * 3.3, top + 0.03],
      [0, 0, a],
      [0.4, 0.08, 0.02],
    );
    if (k % 6 === 0) b.lamp(s, box(), mm);
    else b.view(s, P.sandstone, box(), mm);
  }
  for (const x of [-3.4, 3.4]) {
    b.solid(s, P.greyDark, cylinder(0.1, 6), m.at([x, 3.4, top + 0.9], undefined, [1, 1, 1.8]));
    b.lamp(s, ball(0.16, 1), m.at([x, 3.4, top + 1.9]));
  }
  for (let k = 0; k < 5; k++) {
    const t = outsideFrame(0, -80 + k * 40, 90);
    b.solid(s, k % 2 ? P.shell : P.greyDark, box(), t.at([0, 0, 0.1], undefined, [0.8, 7.0, 0.9]));
    b.view(s, P.brass, box(), t.at([0, 0, 0.57], undefined, [0.84, 7.0, 0.06]));
  }
}

/** Construye el Nudo y el Laboratorio con la forma de una escena exportada. */
export function buildLaboratorio(): Group {
  const sun = sunInWorld(LABORATORIO_ID);
  const outsideMaterial = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => {
    const material = new MeshStandardMaterial({ flatShading: true, ...options });
    applySkyLight(material, sun, {
      day: new Color('#5a5470'),
      ground: new Color('#201c28'),
      night: new Color(0.02, 0.02, 0.03),
    });
    return material;
  };
  // Dentro no llega la Brasa: luce la semilla (la luz de dentro la pone el juego) y un poco de verde propio.
  const insideMaterial = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial =>
    new MeshStandardMaterial({ flatShading: true, emissive: new Color('#1a2420'), ...options });
  const lamps = new MeshBasicMaterial({ vertexColors: true });
  const materials: Record<'outside' | 'inside', Record<PieceKind, Material>> = {
    outside: {
      stone: outsideMaterial({ vertexColors: true, roughness: 0.95 }),
      metal: outsideMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.45 }),
      light: lamps,
    },
    inside: {
      stone: insideMaterial({ vertexColors: true, roughness: 0.88 }),
      metal: insideMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.5 }),
      light: lamps,
    },
  };
  const builder = new LabBuilder(materials.inside);
  buildRooms(builder);
  buildLife(builder);
  paths(builder);
  coldGrid(builder);
  seed(builder);
  orbits(builder);
  outside(builder);

  const frame = new Group();
  frame.name = 'laboratorio_Marco';
  frame.rotation.x = -Math.PI / 2;

  const { outer, inner } = shells();
  const outerMesh = new Mesh(outer, materials.outside.stone);
  outerMesh.name = 'laboratorio_Terreno';
  outerMesh.castShadow = true;
  outerMesh.receiveShadow = true;
  // La cara interior lleva su propio material: el tablero en espiral (laboratorioFloor.ts).
  const boardMaterial = insideMaterial({ vertexColors: true, roughness: 0.82 });
  const innerMesh = new Mesh(inner, boardMaterial);
  applySpiralBoard(innerMesh, boardMaterial, boardSeamColor(P.fold));
  innerMesh.name = 'laboratorio_Cara_Interior';
  innerMesh.receiveShadow = true;
  frame.add(outerMesh, innerMesh, colliderMesh('COL_laboratorio_Terreno', [outer, inner]));

  const insidePieces = piecesToMeshes(builder.inside, materials.inside, 'laboratorio');
  const outsidePieces = piecesToMeshes(builder.outside, materials.outside, 'laboratorio_Fuera');
  const cold = new Mesh(
    mergeGeometries(builder.cold),
    new MeshBasicMaterial({ color: new Color(P.fold).multiplyScalar(1.15) }),
  );
  cold.name = 'laboratorio_Frio';
  // Lo de dentro no se ve desde los otros mundos: solo se dibuja estando en el Nudo.
  for (const mesh of [innerMesh, ...insidePieces, cold, ...builder.extras])
    mesh.userData[NEAR_ONLY] = true;
  frame.add(...insidePieces, ...outsidePieces, cold);
  frame.add(
    colliderMesh('COL_laboratorio_Lugares', [
      ...builder.inside.colliders,
      ...builder.outside.colliders,
    ]),
  );
  frame.add(...builder.extras, ...builder.markers);

  const root = new Object3D();
  root.name = LABORATORIO_ID;
  Object.assign(root.userData, {
    world_id: LABORATORIO_ID,
    radius: LAB_RADIUS,
    gravity: LAB_GRAVITY,
    clock_rate: LAB_CLOCK,
    inner_radius: LAB_INNER_RADIUS,
    interior_light: 1.5,
    interior_light_color: '#F0DDB8',
    ambient: 1.4,
    ambient_color: '#A8B8A8',
  });
  root.add(frame);
  const scene = new Group();
  scene.add(root);
  scene.updateMatrixWorld(true);
  return scene;
}
