// Los anclajes del Cerco por código (🟡, plan `docs/plan-soles-y-luz-dinamica.md` §4.2): las dos estaciones de los
// polos donde se atan los anillos de los Ausentes y donde se puede desembarcar. Una esfera de 40 m con un tambor
// alrededor del ecuador (el cojinete por donde giran los brazos de los anillos: ahí no se pisa) y dos casquetes:
// el exterior, a oscuras y lejos de la estrella, con la pista de atraque y un edificio; y el interior, cara al sol,
// con lo que se construía para captar su energía. Una Puerta plegada une los dos casquetes (el collar no se cruza).
// Contrato de un mundo por código: raíz con radio, gravedad y reloj; COL_anclaje_Terreno y COL_anclaje_Lugares;
// SPAWN_, PARK_ y PASO_.
import {
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  type Material,
} from 'three';
import {
  ANCLAJE_CLOCK,
  ANCLAJE_GRAVITY,
  ANCLAJE_RADIUS,
  HUBS,
  anclajeGround,
  drumWeight,
  hubSites,
  sunDirection,
  type HubId,
  type HubSite,
} from './anclajeShape';
import {
  applySkyLight,
  box,
  colliderMesh,
  cone,
  cylinder,
  frameAt,
  marker,
  PieceSet,
  piecesToMeshes,
  sphereTerrain,
  torus,
  type Frame,
  type PieceKind,
  type Surface,
  type Triple,
} from './kit';
import { Y_UP } from './cicatrizKit';
import { Vector3 } from 'three';

/** Subdivisión del terreno (la colisión usa la misma malla): aristas de unos 3 m. */
const DETAIL = 16;

const P = {
  hullDark: '#3a414c',
  hullLight: '#6a727e',
  drum: '#7a5438',
  sand: '#c4af88',
  sandDark: '#8f7c5a',
  slate: '#47525e',
  copper: '#a8643a',
  panel: '#1b2634',
  paper: '#e4d8c0',
  lamp: '#ffcf8a',
  cool: '#9fd8ff',
} as const;

const AMBIENT = { strength: 0.95, color: '#8a7aa0' } as const;

const SURFACE: Surface = { radius: ANCLAJE_RADIUS, groundRadius: anclajeGround };

function createMaterials(
  id: HubId,
): Record<PieceKind, Material> & { ground: MeshStandardMaterial } {
  const sun = new Vector3(sunDirection(id).x, sunDirection(id).y, sunDirection(id).z);
  const sky = {
    day: new Color('#b8a8c8').multiplyScalar(0.9),
    ground: new Color('#6a5a58'),
    night: new Color(0.1, 0.1, 0.16),
  };
  const make = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => {
    const material = new MeshStandardMaterial({ flatShading: true, ...options });
    applySkyLight(material, sun, sky);
    return material;
  };
  return {
    ground: make({ vertexColors: true, roughness: 0.9 }),
    stone: make({ vertexColors: true, roughness: 0.88, side: DoubleSide }),
    metal: make({ vertexColors: true, roughness: 0.42, metalness: 0.5 }),
    light: new MeshBasicMaterial({ vertexColors: true }),
  };
}

function siteFrame(site: HubSite, sink = 0, footprint = 6): Frame {
  return frameAt(SURFACE, site.lat, site.lon, {
    heading: site.heading,
    footprint,
    sink,
    ground: 'highest',
  });
}

interface Marks {
  list: {
    name: string;
    frame: Frame;
    at: Triple;
    props?: Record<string, string | number | boolean>;
  }[];
  add(
    name: string,
    frame: Frame,
    at: Triple,
    props?: Record<string, string | number | boolean>,
  ): void;
}

function createMarks(): Marks {
  const list: Marks['list'] = [];
  return {
    list,
    add(name, frame, at, props) {
      list.push({ name, frame, at, ...(props && { props }) });
    },
  };
}

/** Un edificio de una sala: paredes con puerta al frente y una ventana a cada lado, y un techo. */
function hall(set: PieceSet, f: Frame, size: Triple, color: string, roofGap = 0): void {
  const [w, d, h] = size;
  const t = 0.4;
  const wall = (at: Triple, scale: Triple): void => {
    set.add(color, box(), f.at(at, undefined, scale), 'stone');
  };
  wall([0, d / 2 - t / 2, h / 2], [w, t, h]); // fondo
  wall([-w / 2 + t / 2, 0, h / 2], [t, d, h]);
  wall([w / 2 - t / 2, 0, h / 2], [t, d, h]);
  // Frente: puerta al centro (2 m) y una ventana (de 1,0 a 2,4 m) a cada lado.
  const door = 2;
  const side = (w - door) / 2;
  for (const s of [-1, 1]) {
    const x = (s * (door + side)) / 2;
    wall([x, -d / 2 + t / 2, 0.5], [side, t, 1]);
    wall([x, -d / 2 + t / 2, (2.4 + h) / 2], [side, t, h - 2.4]);
    wall([x - (s * (side - 1.2)) / 2 - s * 0.6, -d / 2 + t / 2, 1.7], [0.6, t, 1.4]);
  }
  wall([0, -d / 2 + t / 2, (2.4 + h) / 2 - 0.2], [door, t, h - 2.4 + 0.4]);
  // Techo; con `roofGap` un tragaluz a lo largo por el que entra la estrella.
  if (roofGap > 0) {
    const half = (w - roofGap) / 2;
    for (const s of [-1, 1]) {
      set.add(
        color,
        box(),
        f.at([(s * (roofGap + half)) / 2, 0, h + t / 2], undefined, [half, d, t]),
        'stone',
      );
    }
  } else {
    set.add(color, box(), f.at([0, 0, h + t / 2], undefined, [w, d, t]), 'stone');
  }
}

function landingPad(set: PieceSet, f: Frame): void {
  set.add(P.hullLight, cylinder(7, 24), f.at([0, 0, 0.1], undefined, [1, 1, 0.6]), 'stone');
  set.add(P.lamp, torus(6.4, 0.12, 32, 4), f.at([0, 0, 0.45]), 'light', { glow: 1.6 });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const at: Triple = [Math.cos(a) * 7.6, Math.sin(a) * 7.6, 0];
    set.add(P.slate, cylinder(0.18, 6), f.at([at[0], at[1], 1.1], undefined, [1, 1, 2.4]), 'metal');
    set.add(P.lamp, box(), f.at([at[0], at[1], 2.5], undefined, [0.5, 0.5, 0.3]), 'light', {
      glow: 1.8,
    });
  }
}

/** El anillo de la Puerta plegada, de pie, con su base. */
function gate(set: PieceSet, f: Frame): void {
  set.add(P.sandDark, cylinder(2.6, 20), f.at([0, 0, 0.2], undefined, [1, 1, 0.5]), 'stone');
  set.add(P.sand, torus(1.8, 0.22, 24, 6), f.at([0, 0, 2.0], [Math.PI / 2, 0, 0]), 'stone');
  set.add(P.lamp, torus(1.45, 0.04, 32, 3), f.at([0, 0, 2.0], [Math.PI / 2, 0, 0]), 'light', {
    glow: 1.4,
  });
}

function outerCap(id: HubId, set: PieceSet, marks: Marks): void {
  const sites = hubSites(id);
  const pad = siteFrame(sites.pad, 0.1, 8);
  landingPad(set, pad);
  marks.add('SPAWN_Anclaje', pad, [0, -6.5, 1.0]);
  marks.add('PARK_Nave', pad, [0, 0, 0.45]);
  const house = siteFrame(sites.building, 0.1, 7);
  hall(set, house, [10, 8, 3.8], P.sand);
  // Dentro: una mesa larga con papeles y un tablero encendido al fondo.
  set.add(P.slate, box(), house.at([0, 1.5, 0.45], undefined, [6, 1.2, 0.9]), 'metal');
  set.add(P.paper, box(), house.at([-1, 1.5, 0.95], undefined, [0.9, 0.7, 0.05]), 'stone', {
    vary: 0,
  });
  set.add(P.lamp, box(), house.at([0, 3.7, 2.0], undefined, [5, 0.1, 1.4]), 'light', { glow: 1.3 });
  const plaque = siteFrame(sites.plaque, 0.1, 3);
  set.add(P.slate, box(), plaque.at([0, 0, 0.7], undefined, [2.4, 0.5, 1.4]), 'stone');
  set.add(P.copper, box(), plaque.at([0, -0.27, 1.0], undefined, [1.9, 0.06, 0.8]), 'metal');
  const door = siteFrame(sites.gateOuter, 0.1, 5);
  gate(set, door);
  marks.add('PASO_Eje', door, [0, 0, 2.0], { destino: 'PASO_Sol' });
}

function innerCap(id: HubId, set: PieceSet, marks: Marks): void {
  const sites = hubSites(id);
  const centre = siteFrame(sites.inner, 0.1, 9);
  if (id === 'norte') {
    // El receptor: un plato que mira a la estrella sobre un mástil, con sus cables al suelo.
    set.add(P.slate, cylinder(2.4, 16), centre.at([0, 0, 0.5], undefined, [1, 1, 1]), 'stone');
    set.add(P.copper, cylinder(0.5, 10), centre.at([0, 0, 3.5], undefined, [1, 1, 6]), 'metal');
    set.add(
      P.panel,
      cone(5.5, 0.8, 18),
      centre.at([0, 0, 7.6], [Math.PI, 0, 0], [1, 1, 2.2]),
      'metal',
    );
    set.add(P.lamp, torus(4.6, 0.1, 28, 4), centre.at([0, 0, 6.3], [0, 0, 0]), 'light', {
      glow: 1.2,
    });
  } else {
    // El almacén de captadores, con un tragaluz por el que entra la estrella.
    hall(set, centre, [12, 8, 4.2], P.sandDark, 2.4);
    for (let k = 0; k < 3; k++) {
      set.add(
        P.panel,
        box(),
        centre.at([-3.5 + k * 3.5, 1.5, 0.9], undefined, [2.4, 1.6, 1.8]),
        'metal',
      );
    }
  }
  const door = siteFrame(sites.gateInner, 0.1, 5);
  gate(set, door);
  marks.add('PASO_Sol', door, [0, 0, 2.0], { destino: 'PASO_Eje' });
}

function terrainMesh(id: HubId, material: Material): { terrain: Mesh; collider: Mesh } {
  const geometry = sphereTerrain(
    {
      radius: ANCLAJE_RADIUS,
      detail: DETAIL,
      height: (x, y, z) => anclajeGround({ x, y, z }) - ANCLAJE_RADIUS,
      faceColor: (_x, _y, z, _h, _slope, random) => {
        const outer = z * HUBS[id].outer > 0;
        const base = new Color(outer ? P.hullDark : P.hullLight);
        const drum = drumWeight({ x: 0, y: 0, z });
        // Planchas: cada cara un poco distinta; el tambor, de cobre oscuro.
        return base.lerp(new Color(P.drum), drum * 0.9).offsetHSL(0, 0, (random() - 0.5) * 0.05);
      },
    },
    17,
  );
  const terrain = new Mesh(geometry, material);
  terrain.name = 'anclaje_Terreno';
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  const collider = new Mesh(geometry);
  collider.name = 'COL_anclaje_Terreno';
  collider.visible = false;
  return { terrain, collider };
}

/** Construye un anclaje con la forma de una escena exportada: la raíz, sus mallas y sus marcas. */
export function buildAnclaje(id: HubId): Group {
  const spec = HUBS[id];
  const materials = createMaterials(id);
  const set = new PieceSet(spec.outer === 1 ? 31 : 37);
  const marks = createMarks();
  outerCap(id, set, marks);
  innerCap(id, set, marks);

  // Marco de Blender: el contenido se gira −90° en X (como el exportador glTF).
  const frame = new Group();
  frame.name = `${spec.world}_Marco`;
  frame.rotation.x = -Math.PI / 2;
  const { terrain, collider } = terrainMesh(id, materials.ground);
  frame.add(terrain, collider);
  frame.add(...piecesToMeshes(set, materials, 'anclaje'));
  frame.add(colliderMesh('COL_anclaje_Lugares', set.colliders));
  for (const { name, frame: f, at, props } of marks.list) {
    const rotation = f.rotation();
    if (name.startsWith('PASO_')) rotation.multiply(Y_UP);
    frame.add(marker(name, f.point(at), rotation, props));
  }

  const root = new Object3D();
  root.name = spec.world;
  Object.assign(root.userData, {
    world_id: spec.world,
    radius: ANCLAJE_RADIUS,
    gravity: ANCLAJE_GRAVITY,
    clock_rate: ANCLAJE_CLOCK,
    ambient: AMBIENT.strength,
    ambient_color: AMBIENT.color,
  });
  root.add(frame);

  const scene = new Group();
  scene.add(root);
  scene.updateMatrixWorld(true);
  return scene;
}
