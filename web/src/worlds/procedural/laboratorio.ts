// El Nudo y el Laboratorio Oculto por código (Fase 11; CONTEXTO_PLANETAS.md §8): una cáscara negra con su Puerta de
// anillos y un muelle, y dentro, una cavidad donde la gravedad empuja hacia fuera y se camina por la cara interior.
// En el centro cuelga la semilla del Nudo con sus anillos y su corona de luz; alrededor de ella, muy despacio, orbita
// lo que el Laboratorio perdió al soltarse: papeles, libros, sillas, tazas, luces. La cara interior es una marquetería
// en espiral (laboratorioFloor.ts) que lleva la vista a las zonas por senderos con faroles, y el aire de la cavidad
// funde lo lejano en una bruma cálida (E7). Las zonas de trabajo están en laboratorioRooms.ts; las de la vida de cada
// día, en laboratorioLife.ts, y sus casas, en laboratorioBuildings.ts. Sustituye a laboratorio.glb con el mismo
// contrato (raíz con la cavidad y la luz de dentro; COL_laboratorio_Terreno y COL_laboratorio_Lugares;
// SPAWN_Laboratorio, PASO_Boca y PASO_Dentro, las INT_ y las ANIM_).
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  Euler,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
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
import { dockClock } from './laboratorioGate';
import { buildLife } from './laboratorioLife';
import { buildRooms } from './laboratorioRooms';
import {
  INNER_SITES,
  LAB_GRAVITY,
  LAB_INNER_RADIUS,
  LAB_RADIUS,
  LABORATORIO_ID,
  NUDO_CLOCK,
  NUDO_LOCK,
  OUTER_SITES,
  PATHS,
  along,
  innerGround,
  insideFrame,
  insideHeading,
  outerGround,
  outsideFrame,
} from './laboratorioShape';
import { applyCavityHaze, applyLabFloor, type CavityHaze } from './laboratorioFloor';
import { seededRandom } from './noise';
import { sunInWorld } from './sun';

export { LABORATORIO_ID } from './laboratorioShape';
const OUTER_DETAIL = 16;
const INNER_DETAIL = 26;
/** Cada cuántos metros de sendero, un farol (alternando de lado). */
const LAMP_SPACING = 8;
/** El aire de la cavidad (🟡 E7): una bruma cálida que funde la cara de enfrente y deja nítido lo cercano. */
export const CAVITY_HAZE: CavityHaze = {
  color: new Color('#C2B392'),
  density: 0.026,
  max: 0.3,
};
/** La luz de dentro (🟡 E7): cálida, de lámpara, sin el verde clínico de antes. */
export const LAB_LIGHT = {
  interior: { color: '#FFE2B6', intensity: 1.7 },
  ambient: { color: '#B4AC9C', intensity: 1.05 },
  /** Lo que cada pieza de dentro brilla por sí misma: que nada caiga al negro. */
  emissive: '#1E1912',
} as const;

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

/**
 * Normales suaves para una malla sin índice: cada vértice, la media de las caras que lo comparten. El suelo de dentro
 * es una marquetería pulida, no roca: sus lomas se ven sin facetas que rompan el dibujo.
 */
function smoothNormals(geometry: BufferGeometry): void {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const key = (i: number): string =>
    `${String(Math.round(position.getX(i) * 1e3))},${String(Math.round(position.getY(i) * 1e3))},${String(Math.round(position.getZ(i) * 1e3))}`;
  const sums = new Map<string, Vector3>();
  for (let i = 0; i < position.count; i++) {
    const k = key(i);
    const sum = sums.get(k) ?? new Vector3();
    sum.x += normal.getX(i);
    sum.y += normal.getY(i);
    sum.z += normal.getZ(i);
    sums.set(k, sum);
  }
  for (let i = 0; i < position.count; i++) {
    const n = (sums.get(key(i)) ?? new Vector3(0, 0, 1)).clone().normalize();
    normal.setXYZ(i, n.x, n.y, n.z);
  }
  normal.needsUpdate = true;
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
  // Dentro, el color lo pone el sombreador del suelo: los vértices solo llevan una veta muy suave.
  const vein = new Color('#FFFFFF');
  const inner = sphereTerrain(
    {
      radius: LAB_INNER_RADIUS,
      detail: INNER_DETAIL,
      height: (x, y, z) => innerGround({ x, y, z }) - LAB_INNER_RADIUS,
      faceColor: (_x, _y, _z, _h, _slope, random) =>
        vein.clone().multiplyScalar(0.96 + random() * 0.04),
    },
    17,
  );
  const flipped = flipInward(inner);
  smoothNormals(flipped);
  return { outer, inner: flipped };
}

/** Los faroles de los senderos, entre zona y zona y alternando de lado; devuelve dónde alumbran el suelo. */
function paths(b: LabBuilder): Vector3[] {
  const lamps: Vector3[] = [];
  PATHS.forEach(([from, to], n) => {
    const a = INNER_SITES[from];
    const c = INNER_SITES[to];
    const length =
      angleBetween(direction(a.lat, a.lon), direction(c.lat, c.lon)) * LAB_INNER_RADIUS;
    const gap = length - a.clear - c.clear - 2;
    const count = Math.round(gap / LAMP_SPACING);
    for (let k = 0; k < count; k++) {
      const t = (a.clear + 1 + (gap * (k + 0.5)) / count) / length;
      const point = along(a, c, t);
      const next = along(a, c, Math.min(1, t + 0.05));
      const f = insideFrame(point.lat, point.lon, insideHeading(point, next));
      const side = (k + n) % 2 ? 1 : -1;
      b.lantern(b.inside, f, side * 1.15, 0, 0, 2.3);
      lamps.push(f.point([side * 1.15, 0.45, 0]));
    }
  });
  return lamps;
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

const HALO_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;

const HALO_FRAGMENT = /* glsl */ `
uniform vec3 inner;
uniform vec3 outer;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float facing = abs(dot(normalize(vNormal), normalize(vView)));
  float glow = pow(facing, 3.0);
  gl_FragColor = vec4(mix(outer, inner, pow(facing, 8.0)) * glow, 1.0);
}
`;

/**
 * La corona de la semilla (E7): una esfera de luz que solo pinta su cara de atrás, así la semilla negra la tapa por
 * el centro y alrededor queda un resplandor, frío junto a ella y cálido hacia fuera. Se ve de dónde sale la luz.
 */
function seedHalo(): Mesh {
  const material = new ShaderMaterial({
    uniforms: {
      inner: { value: new Color('#D8F0E6').multiplyScalar(0.55) },
      outer: { value: new Color('#FFB866').multiplyScalar(0.3) },
    },
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: BackSide,
  });
  const mesh = new Mesh(new SphereGeometry(5.5, 32, 20), material);
  mesh.name = 'laboratorio_Corona';
  mesh.renderOrder = 2;
  return mesh;
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
  // La huida la apagó (E4): sin luz ni paso hasta que se pone en hora el reloj del muelle.
  b.gate(s, f, top, { lock: NUDO_LOCK, name: 'Boca' });
  b.mark('PASO_Boca', f, [0, 0, top], { destino: 'PASO_Dentro', cerradura: NUDO_LOCK });
  const dock = OUTER_SITES.muelle;
  const m = outsideFrame(dock.lat, dock.lon, 0);
  dockClock(b, m, top);
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

/** Los materiales de dentro: piedra, metal y luz (con el aire de la cavidad salvo en lo que brilla) y el vidrio. */
function insideMaterials(): { pieces: Record<PieceKind, Material>; glass: Material } {
  const make = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => {
    const material = new MeshStandardMaterial({
      flatShading: true,
      emissive: new Color(LAB_LIGHT.emissive),
      ...options,
    });
    applyCavityHaze(material, CAVITY_HAZE);
    return material;
  };
  const glass = new MeshStandardMaterial({
    color: new Color('#D6EEE4'),
    transparent: true,
    opacity: 0.2,
    roughness: 0.08,
    metalness: 0.1,
    depthWrite: false,
    side: DoubleSide,
  });
  applyCavityHaze(glass, CAVITY_HAZE);
  return {
    pieces: {
      stone: make({ vertexColors: true, roughness: 0.86 }),
      metal: make({ vertexColors: true, roughness: 0.42, metalness: 0.5 }),
      light: new MeshBasicMaterial({ vertexColors: true }),
    },
    glass,
  };
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
  const inside = insideMaterials();
  const materials: Record<'outside' | 'inside', Record<PieceKind, Material>> = {
    outside: {
      stone: outsideMaterial({ vertexColors: true, roughness: 0.95 }),
      metal: outsideMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.45 }),
      light: new MeshBasicMaterial({ vertexColors: true }),
    },
    inside: inside.pieces,
  };
  const builder = new LabBuilder(materials.inside);
  buildRooms(builder);
  buildLife(builder);
  const lamps = paths(builder);
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
  // La cara interior lleva su propio material: la marquetería en espiral (laboratorioFloor.ts), con normales suaves.
  const boardMaterial = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.62,
    metalness: 0.04,
    emissive: new Color(LAB_LIGHT.emissive),
  });
  const innerMesh = new Mesh(inner, boardMaterial);
  applyLabFloor(
    innerMesh,
    boardMaterial,
    {
      sites: Object.values(INNER_SITES).map((s) => ({
        direction: direction(s.lat, s.lon),
        clear: s.clear,
      })),
      paths: PATHS.map(([a, c]) => ({
        from: direction(INNER_SITES[a].lat, INNER_SITES[a].lon),
        to: direction(INNER_SITES[c].lat, INNER_SITES[c].lon),
      })),
      lamps,
    },
    CAVITY_HAZE,
  );
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
  const glass: Mesh[] = [];
  if (builder.glass.length > 0) {
    const panes = new Mesh(mergeGeometries(builder.glass), inside.glass);
    panes.name = 'laboratorio_Vidrio';
    panes.renderOrder = 1;
    glass.push(panes);
  }
  const halo = seedHalo();
  // Lo de dentro no se ve desde los otros mundos: solo se dibuja estando en el Nudo.
  for (const mesh of [innerMesh, ...insidePieces, cold, ...glass, halo, ...builder.extras])
    mesh.userData[NEAR_ONLY] = true;
  frame.add(...insidePieces, ...outsidePieces, cold, ...glass, halo);
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
    clock_rate: NUDO_CLOCK,
    inner_radius: LAB_INNER_RADIUS,
    interior_light: LAB_LIGHT.interior.intensity,
    interior_light_color: LAB_LIGHT.interior.color,
    ambient: LAB_LIGHT.ambient.intensity,
    ambient_color: LAB_LIGHT.ambient.color,
  });
  root.add(frame);
  const scene = new Group();
  scene.add(root);
  scene.updateMatrixWorld(true);
  return scene;
}
