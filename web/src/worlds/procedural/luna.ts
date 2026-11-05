// La Luna de Hogar por código (Fase 11): gris azulada, sin aire, con cráteres, polvo claro y piedras sueltas. En la
// cara que mira a Hogar está el fragmento más grande que ha llegado nunca (lunaFragment.ts). Sustituye a luna.glb con
// el mismo contrato (raíz con radio, gravedad y reloj; COL_luna_Terreno, COL_luna_Lugares y COL_luna_Fragmento dentro
// de luna_Fragmento; INT_fragmento_luna y SPAWN_Luna). Las medidas, en lunaShape.ts.
import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
  type Material,
} from 'three';
import { FAR_HIDDEN } from '../../render/nearDetail';
import {
  applySkyLight,
  ball,
  colliderMesh,
  cylinder,
  frameAt,
  marker,
  piecesToMeshes,
  scatter,
  sphereTerrain,
  type XYZ,
} from './kit';
import { buildFragment } from './lunaFragment';
import {
  FRAGMENT_SITE,
  LUNA_GRAVITY,
  LUNA_ID,
  LUNA_RADIUS,
  LUNA_RELIEF,
  distanceToFragment,
  lunaGround,
  lunaSurface,
} from './lunaShape';
import { seededRandom } from './noise';
import { sunInWorld } from './sun';

export { LUNA_ID } from './lunaShape';
/** Subdivisión del terreno (la colisión usa la misma malla): aristas de unos dos metros en una bola de 35 m. */
export const LUNA_DETAIL = 20;

const PALETTE = {
  deep: '#4e5666',
  mid: '#8a94a6',
  high: '#b4bcc8',
  dust: '#ccd2dc',
  rock: '#6a7080',
  rockLight: '#9aa2b2',
  rockDark: '#4e5666',
} as const;
/** Alrededor del fragmento no se esparce nada (m). */
const CLEAR = 7;

const AMBIENT = { strength: 1.05, color: '#b8c4e0' } as const;

/** El color del suelo según su altura relativa (0 el fondo de un cráter, 1 la cima): tres bandas azul grisáceas. */
function groundColor(relief01: number): Color {
  const deep = new Color(PALETTE.deep);
  const mid = new Color(PALETTE.mid);
  const high = new Color(PALETTE.high);
  if (relief01 <= 0.4) return deep.lerp(mid, relief01 / 0.4);
  return mid.lerp(high, Math.min(1, (relief01 - 0.4) / 0.3));
}

interface LunaMaterials {
  ground: MeshStandardMaterial;
  stone: MeshStandardMaterial;
  loose: MeshStandardMaterial;
  light: MeshBasicMaterial;
}

function createMaterials(sun: Vector3): LunaMaterials {
  // Sin aire, la luz que llena las sombras es la que rebota de Hogar: fría y suave.
  const sky = {
    day: new Color(AMBIENT.color).multiplyScalar(0.9),
    ground: new Color('#6a7080'),
    night: new Color(0.04, 0.05, 0.09),
  };
  const make = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => {
    const material = new MeshStandardMaterial({ flatShading: true, ...options });
    applySkyLight(material, sun, sky);
    return material;
  };
  return {
    ground: make({ vertexColors: true, roughness: 0.95 }),
    stone: make({ vertexColors: true, roughness: 0.88 }),
    loose: make({ roughness: 0.9 }),
    light: new MeshBasicMaterial({ vertexColors: true }),
  };
}

/** Rocas, losas de polvo claro y cantos sueltos por toda la Luna (lejos del fragmento). */
function scatterDetails(loose: Material): {
  meshes: Mesh[];
  colliders: ReturnType<typeof scatter>['colliders'];
} {
  const random = seededRandom(5);
  const away = (d: XYZ): boolean => distanceToFragment(d) > CLEAR;
  const rocks = scatter(
    {
      name: 'luna_Rocas',
      geometry: ball(1, 1),
      material: loose,
      count: 90,
      castShadow: true,
      groundRadius: lunaGround,
      solidAbove: 0.5,
      pick: (d, r) => {
        if (!away(d)) return null;
        const size = 0.3 + r() * 0.9;
        const tones = [PALETTE.rock, PALETTE.rockLight, PALETTE.rockDark];
        return {
          scale: [size, size * (0.6 + r() * 0.4), size * (0.45 + r() * 0.35)],
          sink: 0.15 - size * 0.25,
          color: tones[Math.floor(r() * tones.length)] ?? PALETTE.rock,
          tilt: 1,
        };
      },
    },
    random,
  );
  const dust = scatter(
    {
      name: 'luna_Polvo',
      geometry: cylinder(1, 9),
      material: loose,
      count: 60,
      castShadow: false,
      groundRadius: lunaGround,
      pick: (d, r) => {
        if (!away(d)) return null;
        const size = 1 + r() * 1.6;
        return { scale: [size, size * (0.6 + r() * 0.4), 0.04], sink: -0.01, color: PALETTE.dust };
      },
    },
    random,
  );
  const pebbles = scatter(
    {
      name: 'luna_Cantos',
      geometry: ball(1, 0),
      material: loose,
      count: 160,
      castShadow: false,
      groundRadius: lunaGround,
      pick: (d, r) => {
        if (!away(d)) return null;
        const size = 0.06 + r() * 0.1;
        return {
          scale: [size, size, size],
          sink: -size * 0.2,
          color: r() < 0.5 ? PALETTE.rock : PALETTE.rockLight,
        };
      },
    },
    random,
  );
  const meshes = [rocks.mesh, dust.mesh, pebbles.mesh];
  // De lejos (con la Luna en el cielo de otro mundo) no se ve nada de esto: solo el suelo y el fragmento.
  for (const mesh of meshes) mesh.userData[FAR_HIDDEN] = true;
  return { meshes, colliders: rocks.colliders };
}

/** Construye la Luna con la forma de una escena exportada: la raíz `luna`, sus mallas y sus marcas. */
export function buildLuna(): Group {
  const sun = sunInWorld(LUNA_ID);
  const mat = createMaterials(sun);
  // Marco de Blender: el contenido se gira −90° en X (como el exportador glTF).
  const frame = new Group();
  frame.name = 'luna_Marco';
  frame.rotation.x = -Math.PI / 2;

  const terrainGeometry = sphereTerrain(
    {
      radius: LUNA_RADIUS,
      detail: LUNA_DETAIL,
      height: (x, y, z) => lunaGround({ x, y, z }) - LUNA_RADIUS,
      faceColor: (_x, _y, _z, h, _slope, random) =>
        groundColor((h / (LUNA_RADIUS * LUNA_RELIEF) + 1) / 2).offsetHSL(
          0,
          0,
          (random() - 0.5) * 0.04,
        ),
    },
    5,
  );
  const terrain = new Mesh(terrainGeometry, mat.ground);
  terrain.name = 'luna_Terreno';
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  const groundCollider = new Mesh(terrainGeometry);
  groundCollider.name = 'COL_luna_Terreno';
  groundCollider.visible = false;
  frame.add(terrain, groundCollider);

  const details = scatterDetails(mat.loose);
  frame.add(...details.meshes);
  if (details.colliders.length > 0) frame.add(colliderMesh('COL_luna_Lugares', details.colliders));

  // El fragmento, aparte: el juego lo quita entero (con su colisión) en el Hogar de antes.
  const site = frameAt(lunaSurface, FRAGMENT_SITE.lat, FRAGMENT_SITE.lon, {
    heading: FRAGMENT_SITE.heading,
    footprint: FRAGMENT_SITE.footprint,
    sink: FRAGMENT_SITE.sink,
  });
  const fragment = buildFragment(site);
  const [stone, glow] = piecesToMeshes(
    fragment,
    { stone: mat.stone, metal: mat.stone, light: mat.light },
    'luna',
  );
  if (stone) {
    stone.name = 'luna_Fragmento';
    stone.add(colliderMesh('COL_luna_Fragmento', fragment.colliders));
    frame.add(stone);
  }
  if (glow) {
    glow.name = 'luna_Fragmento_Luz';
    frame.add(glow);
  }
  frame.add(
    marker('INT_fragmento_luna', site.point([0, -1.7, 1.5]), site.rotation(), {
      clue_id: 'instituto.fragmento_luna',
      kind: 'objeto',
    }),
    // Frente al fragmento, a siete pasos, mirándolo.
    marker('SPAWN_Luna', site.point([0.5, -7, 1]), site.rotation()),
  );

  const root = new Object3D();
  root.name = LUNA_ID;
  Object.assign(root.userData, {
    world_id: LUNA_ID,
    radius: LUNA_RADIUS,
    gravity: LUNA_GRAVITY,
    clock_rate: 1,
    ambient: AMBIENT.strength,
    ambient_color: AMBIENT.color,
  });
  root.add(frame);

  const scene = new Group();
  scene.add(root);
  scene.updateMatrixWorld(true);
  return scene;
}
