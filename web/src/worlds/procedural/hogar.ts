// Hogar, el planeta de casa (CONTEXTO_PLANETAS.md §9), rehecho por código (Fase 11G; ✅ la idea, Anthony 2026-11-03).
// Sustituye a hogar.glb con el mismo contrato (raíz con radio, gravedad y reloj, y ahora el mar; mallas COL_; marcas
// SPAWN_, PARK_, INT_, ANIM_ y los Ool OOL_<quién> con su luz): un continente templado en la cara de día con el
// Instituto en su colina (hogarInstituto.ts), la aldea y la ciudad (hogarTown.ts), el campo y la costa
// (hogarFields.ts) y el Motor de la prueba mayor (hogarMotor.ts); en la cara de noche, islas con lo que solo encuentra
// quien se aleja (hogarSecrets.ts). El mismo mar y el mismo cielo de nubes que el Archivo. Las medidas, en
// hogarShape.ts.
import {
  BufferGeometry,
  Color,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ATMOSPHERES } from '../../data/atmospheres';
import { createWaves } from '../../physics/waves';
import { applyUnderwater, oceanMesh } from '../../render/ocean';
import { isMesh } from '../markers';
import { cloudLayer } from './clouds';
import { buildFields } from './hogarFields';
import { buildInstituto } from './hogarInstituto';
import { HOGAR_PALETTE as P, HogarBuilder } from './hogarKit';
import { buildMotor } from './hogarMotor';
import { buildSecrets } from './hogarSecrets';
import {
  HOGAR_ID,
  HOGAR_RADIUS,
  SEA_LEVEL,
  SITES,
  WAVE_HEIGHT,
  WAVE_SEED,
  hogarGround,
  surfaceDistance,
} from './hogarShape';
import { buildTown } from './hogarTown';
import {
  applySkyLight,
  ball,
  colliderMesh,
  cone,
  cylinder,
  marker,
  pieceMatrix,
  piecesToMeshes,
  placeInWorld,
  scatter,
  sphereTerrain,
  triangleCount,
  type PieceKind,
  type XYZ,
} from './kit';
import { createNoise, fbm, seededRandom } from './noise';
import { buildOol, OOL_UPRIGHT } from './ool';
import { sunInWorld } from './sun';

export { HOGAR_ID } from './hogarShape';
/** Subdivisión del terreno (la colisión usa la misma malla). */
export const HOGAR_DETAIL = 44;

const DEG = Math.PI / 180;
const Y = new Vector3(0, 1, 0);
const noise = createNoise(29);

/** ¿Está esta dirección dentro (o cerca) de algún lugar? Ahí no crece nada suelto. */
function nearSite(d: XYZ, margin: number): boolean {
  return Object.values(SITES).some(
    (s) => surfaceDistance(d, s.lat, s.lon) < Math.max(s.pad, 6) + margin,
  );
}

/** La cara de noche: lejos de la Brasa (para repartir más luces allí). */
function isNight(d: XYZ, sun: Vector3): boolean {
  return d.x * sun.x + d.y * sun.y + d.z * sun.z < -0.15;
}

function terrainColor(height: number, slope: number, d: XYZ, random: () => number): Color {
  const r = HOGAR_RADIUS + height;
  const jitter = (random() - 0.5) * 0.05;
  if (r < SEA_LEVEL - 2.5) {
    return new Color(slope > 0.35 ? P.rockDark : P.sand).offsetHSL(0, 0, jitter - 0.04);
  }
  if (r < SEA_LEVEL + 0.45) return new Color(P.sand).offsetHSL(0, 0, jitter);
  if (slope > 0.42) return new Color(P.rock).offsetHSL(0, 0, jitter);
  const meadow = fbm(noise, d.x * 6, d.y * 6, d.z * 6, 2);
  const tone = meadow > 0.18 ? P.grassLight : meadow < -0.2 ? P.moss : P.grass;
  return new Color(tone).offsetHSL(0, 0, jitter);
}

/** Une geometrías pintando cada una de un color (colores por vértice; la instancia solo los matiza). */
function withColors(parts: readonly (readonly [BufferGeometry, string])[]): BufferGeometry {
  const painted = parts.map(([geometry, color]) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const c = new Color(color);
    const count = g.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return g;
  });
  return mergeGeometries(painted);
}

/** Árbol de musgo suelto: tronco blando y copa doble. */
function treeGeometry(): BufferGeometry {
  return withColors([
    [
      cone(0.35, 0.2, 6)
        .clone()
        .applyMatrix4(pieceMatrix([0, 0, 1.1], undefined, [1, 1, 2.2])),
      P.woodDark,
    ],
    [
      ball(1, 1)
        .clone()
        .applyMatrix4(pieceMatrix([0, 0, 2.7], undefined, [1.3, 1.3, 1.05])),
      P.moss,
    ],
    [
      ball(1, 0)
        .clone()
        .applyMatrix4(pieceMatrix([0.7, 0.3, 2.3], undefined, [0.8, 0.8, 0.7])),
      P.mossDark,
    ],
  ]);
}

/** Una mata de hierba: unas hojas en punta. */
function tuftGeometry(): BufferGeometry {
  const random = seededRandom(17);
  const blades = Array.from({ length: 4 }, () =>
    cone(0.06, 0, 3)
      .clone()
      .applyMatrix4(
        pieceMatrix(
          [(random() - 0.5) * 0.2, (random() - 0.5) * 0.2, 0.22],
          [(random() - 0.5) * 0.6, (random() - 0.5) * 0.6, 0],
          [1, 1, 0.45 + random() * 0.2],
        ),
      ),
  );
  return withColors(blades.map((g) => [g, P.grassLight] as const));
}

/** Un bulbo de luz en su tallo (los de las cunetas y, sobre todo, los de la cara de noche). */
function bulbGeometry(): BufferGeometry {
  return withColors([
    [
      cylinder(0.025, 3)
        .clone()
        .applyMatrix4(pieceMatrix([0, 0, 0.35], undefined, [1, 1, 0.7])),
      P.mossDark,
    ],
    [
      ball(0.08, 0)
        .clone()
        .applyMatrix4(pieceMatrix([0, 0, 0.72])),
      P.glow,
    ],
  ]);
}

function rockGeometry(): BufferGeometry {
  const geometry = new DodecahedronGeometry(1, 0);
  geometry.deleteAttribute('uv');
  return geometry.scale(1, 0.8, 0.6);
}

export interface HogarOptions {
  detail?: number;
}

export interface HogarStats {
  terrain: number;
  places: number;
  ool: number;
  scatter: number;
  colliders: number;
}

interface HogarMaterials extends Record<PieceKind, Material> {
  ground: MeshStandardMaterial;
  ool: MeshStandardMaterial;
  plants: MeshStandardMaterial;
  rock: MeshStandardMaterial;
  bulbs: MeshBasicMaterial;
  /** Para lo que cuelga con su propia posición y giro: los Ool y las piezas que giran (ver placeInWorld). */
  moved: Record<PieceKind, Material>;
}

function createMaterials(sun: Vector3): { materials: HogarMaterials; lit: MeshStandardMaterial[] } {
  const sky = {
    day: new Color('#a9c2d6').multiplyScalar(1.45),
    ground: new Color('#9c8a62').multiplyScalar(1.2),
    night: new Color(0.06, 0.07, 0.14),
    // Aire limpio de mañana (🟡): lo lejano azulea de día y se hunde en azul de noche.
    haze: {
      day: new Color('#b4d2e8'),
      night: new Color('#101a30'),
      density: 0.0045,
      max: 0.4,
      radius: HOGAR_RADIUS,
    },
  };
  const lit: MeshStandardMaterial[] = [];
  const make = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
    moved = false,
  ): MeshStandardMaterial => {
    const material = new MeshStandardMaterial({ flatShading: true, ...options });
    applySkyLight(material, sun, sky, { moved });
    lit.push(material);
    return material;
  };
  const materials: HogarMaterials = {
    ground: make({ vertexColors: true, roughness: 0.95 }),
    stone: make({ vertexColors: true, roughness: 0.88 }),
    metal: make({ vertexColors: true, roughness: 0.45, metalness: 0.45 }),
    light: new MeshBasicMaterial({ vertexColors: true }),
    ool: make({ vertexColors: true, roughness: 0.92 }, true),
    plants: make({ vertexColors: true, roughness: 1, side: DoubleSide }),
    rock: make({ roughness: 0.9 }),
    bulbs: new MeshBasicMaterial({ vertexColors: true }),
    moved: {
      stone: make({ vertexColors: true, roughness: 0.88 }, true),
      metal: make({ vertexColors: true, roughness: 0.45, metalness: 0.45 }, true),
      light: new MeshBasicMaterial({ vertexColors: true }),
    },
  };
  return { materials, lit };
}

/** El mar: una esfera entera al nivel del agua (donde hay tierra, queda debajo). */
function sea(sun: Vector3): Mesh {
  const air = ATMOSPHERES[HOGAR_ID];
  const geometry = new SphereGeometry(SEA_LEVEL, 192, 112);
  geometry.deleteAttribute('uv');
  const mesh = oceanMesh(geometry, {
    name: 'hogar_Mar',
    level: SEA_LEVEL,
    waves: createWaves(WAVE_HEIGHT, WAVE_SEED),
    // Del marco de Blender al de glTF: (x, z, −y).
    sun: new Vector3(sun.x, sun.z, -sun.y),
    colors: {
      deep: new Color('#1f6f8a'),
      shallow: new Color('#4fb3c4'),
      foam: new Color('#f3fafc'),
      sky: new Color(air?.zenith ?? 0x2f6fc0),
      horizon: new Color(air?.horizon ?? 0xb4d6ee),
      under: new Color('#2a8aa3'),
    },
    haze: [35, 130],
    opacity: 0.66,
    seed: WAVE_SEED,
  });
  mesh.renderOrder = 1;
  return mesh;
}

/** Lo que crece suelto: árboles, matas, piedras y bulbos de luz, lejos de los lugares y del agua. */
function growth(
  materials: HogarMaterials,
  sun: Vector3,
): { meshes: InstancedMesh[]; colliders: BufferGeometry[] } {
  const random = seededRandom(47);
  const dry = (d: XYZ, margin: number): boolean => hogarGround(d) > SEA_LEVEL + margin;
  const trees = scatter(
    {
      name: 'hogar_Arboles',
      geometry: treeGeometry(),
      material: materials.plants,
      count: 170,
      castShadow: true,
      groundRadius: hogarGround,
      solidAbove: 0.6,
      pick: (d, r) => {
        if (!dry(d, 0.8) || nearSite(d, 4) || fbm(noise, d.x * 4, d.y * 4 + 3, d.z * 4, 2) < -0.05)
          return null;
        const size = 0.7 + r() * 0.7;
        return {
          scale: [size, size, size * (0.85 + r() * 0.3)],
          sink: 0.1,
          color: r() < 0.5 ? '#ffffff' : '#dfe8d0',
        };
      },
    },
    random,
  );
  const tufts = scatter(
    {
      name: 'hogar_Matas',
      geometry: tuftGeometry(),
      material: materials.plants,
      count: 900,
      castShadow: false,
      groundRadius: hogarGround,
      pick: (d, r) => {
        if (!dry(d, 0.3) || nearSite(d, -2)) return null;
        const size = 0.7 + r() * 0.8;
        return { scale: [size, size, size], sink: 0.02, color: r() < 0.3 ? '#f0e0a0' : '#ffffff' };
      },
    },
    random,
  );
  const rocks = scatter(
    {
      name: 'hogar_Rocas',
      geometry: rockGeometry(),
      material: materials.rock,
      count: 260,
      castShadow: true,
      groundRadius: hogarGround,
      solidAbove: 0.7,
      pick: (d, r) => {
        if (nearSite(d, 1)) return null;
        const size = r() < 0.08 ? 0.9 + r() * 1 : 0.2 + r() * 0.4;
        return {
          scale: [size, size, size],
          sink: size * 0.3,
          color: r() < 0.5 ? P.rock : P.rockDark,
        };
      },
    },
    random,
  );
  const bulbs = scatter(
    {
      name: 'hogar_Bulbos',
      geometry: bulbGeometry(),
      material: materials.bulbs,
      count: 700,
      castShadow: false,
      groundRadius: hogarGround,
      pick: (d, r) => {
        if (!dry(d, 0.3) || nearSite(d, 0)) return null;
        // De noche crecen más: es lo que alumbra las islas lejanas.
        if (!isNight(d, sun) && r() < 0.8) return null;
        const size = 0.8 + r() * 0.8;
        return { scale: [size, size, size], sink: 0.02, color: '#ffffff' };
      },
    },
    random,
  );
  return {
    meshes: [trees.mesh, tufts.mesh, rocks.mesh, bulbs.mesh],
    colliders: [...trees.colliders, ...rocks.colliders],
  };
}

/** Guarda en las mallas de un grupo recién colocado dónde quedan en el planeta (ver placeInWorld). */
function settle(group: Group): void {
  group.updateMatrix();
  for (const child of group.children) {
    if (!(child instanceof Mesh)) continue;
    const mesh = child as Mesh;
    mesh.updateMatrix();
    placeInWorld(mesh.geometry, group.matrix.clone().multiply(mesh.matrix));
  }
}

/** Los Ool, cada uno en su sitio y mirando hacia donde tiene que mirar. */
function placeOols(builder: HogarBuilder, material: MeshStandardMaterial): Group[] {
  return builder.ools.map(({ spec, frame, at, turn }) => {
    const ool = buildOol(spec, { body: material });
    ool.position.copy(frame.point(at));
    ool.quaternion
      .copy(frame.rotation())
      .multiply(OOL_UPRIGHT)
      .multiply(new Quaternion().setFromAxisAngle(Y, -turn * DEG));
    settle(ool);
    return ool;
  });
}

/** Las piezas que giran (ANIM_), con su eje en la Y local. */
function placeSpinners(builder: HogarBuilder, materials: HogarMaterials): Group[] {
  return builder.spinners.map(({ name, position, quaternion, spin, set }) => {
    const group = new Group();
    group.name = name;
    group.position.copy(position);
    group.quaternion.copy(quaternion);
    group.userData.spin = spin;
    group.add(...piecesToMeshes(set, materials.moved, `hogar_${name.slice('ANIM_'.length)}`));
    settle(group);
    return group;
  });
}

/** Construye Hogar con la forma de una escena exportada: la raíz `hogar`, sus mallas y sus marcas. */
export function buildHogar({ detail = HOGAR_DETAIL }: HogarOptions = {}): Group {
  const sun = sunInWorld(HOGAR_ID);
  const { materials, lit } = createMaterials(sun);
  const builder = new HogarBuilder();
  buildInstituto(builder);
  buildTown(builder);
  buildFields(builder);
  buildMotor(builder);
  buildSecrets(builder);

  // Marco de Blender: el contenido se gira −90° en X (como el exportador glTF).
  const frame = new Group();
  frame.name = 'hogar_Marco';
  frame.rotation.x = -Math.PI / 2;

  const terrainGeometry = sphereTerrain({
    radius: HOGAR_RADIUS,
    detail,
    height: (x, y, z) => hogarGround({ x, y, z }) - HOGAR_RADIUS,
    faceColor: (x, y, z, h, slope, random) => terrainColor(h, slope, { x, y, z }, random),
  });
  const terrain = new Mesh(terrainGeometry, materials.ground);
  terrain.name = 'hogar_Terreno';
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  frame.add(terrain);
  const groundCollider = new Mesh(terrainGeometry);
  groundCollider.name = 'COL_hogar_Terreno';
  groundCollider.visible = false;
  frame.add(groundCollider);

  for (const mesh of piecesToMeshes(builder.pieces, materials, 'hogar')) frame.add(mesh);
  const showcase = piecesToMeshes(builder.showcase, materials, 'hogar')[0];
  if (showcase) {
    showcase.name = 'hogar_FragmentosVitrinas';
    frame.add(showcase);
  }
  const glass = new Mesh(
    mergeGeometries(builder.glass),
    new MeshStandardMaterial({
      color: '#dff2f4',
      transparent: true,
      opacity: 0.22,
      roughness: 0.05,
      metalness: 0.1,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  glass.name = 'hogar_Vidrio';
  glass.renderOrder = 3;
  const still = new Mesh(
    mergeGeometries(builder.still),
    new MeshStandardMaterial({
      color: P.water,
      transparent: true,
      opacity: 0.78,
      roughness: 0.1,
      metalness: 0.2,
      emissive: new Color('#1d4f5e'),
      emissiveIntensity: 0.4,
    }),
  );
  still.name = 'hogar_Acequias';
  frame.add(glass, still);

  const { meshes, colliders } = growth(materials, sun);
  frame.add(...meshes);
  for (const g of colliders) builder.pieces.addCollider(g);
  frame.add(colliderMesh('COL_hogar_Lugares', builder.pieces.colliders));

  const ools = placeOols(builder, materials.ool);
  frame.add(...ools, ...placeSpinners(builder, materials));
  for (const { name, frame: f, at, props } of builder.markers) {
    frame.add(marker(name, f.point(at), f.rotation(), props));
  }

  // Lo hundido se tiñe del agua y lleva los reflejos de las olas.
  for (const material of lit) {
    applyUnderwater(material, { level: SEA_LEVEL, sun, tint: new Color('#2b7d97') });
  }
  // El cielo (🟡): cúmulos de buen tiempo que el viento lleva hacia el este y velos altos más lentos.
  frame.add(
    cloudLayer({
      name: 'hogar_Nubes',
      radius: HOGAR_RADIUS + 34,
      sun,
      axis: new Vector3(0.1, -0.2, 1),
      speed: 0.0035,
      cover: 0.4,
      scale: 3.4,
      day: new Color('#ffffff'),
      night: new Color('#2a3550'),
      opacity: 0.9,
      seed: 0.23,
    }),
    cloudLayer({
      name: 'hogar_Velos',
      radius: HOGAR_RADIUS + 50,
      sun,
      axis: new Vector3(-0.3, 0.2, 1),
      speed: 0.0012,
      cover: 0.28,
      scale: 1.7,
      day: new Color('#f2f6fb'),
      night: new Color('#1c2640'),
      opacity: 0.5,
      seed: 0.61,
    }),
  );

  const root = new Object3D();
  root.name = HOGAR_ID;
  Object.assign(root.userData, {
    world_id: HOGAR_ID,
    radius: HOGAR_RADIUS,
    gravity: 1,
    clock_rate: 1,
    ambient: 0.55,
    ambient_color: '#f2dcc0',
    sea_level: SEA_LEVEL,
    sea_wave_height: WAVE_HEIGHT,
    sea_wave_seed: WAVE_SEED,
  });
  root.userData.stats = statsOf(frame, terrain, builder.pieces.colliders);
  root.add(frame, sea(sun));

  const scene = new Group();
  scene.add(root);
  scene.updateMatrixWorld(true);
  return scene;
}

function statsOf(frame: Object3D, terrain: Mesh, colliders: readonly BufferGeometry[]): HogarStats {
  const stats: HogarStats = {
    terrain: triangleCount(terrain.geometry),
    places: 0,
    ool: 0,
    scatter: 0,
    colliders: colliders.reduce((sum, g) => sum + triangleCount(g), 0),
  };
  frame.traverse((object) => {
    if (!isMesh(object) || object.name.startsWith('COL_') || object === terrain) return;
    if (object.name.includes('Nubes') || object.name.includes('Velos')) return;
    const count =
      triangleCount(object.geometry) * (object instanceof InstancedMesh ? object.count : 1);
    if (object instanceof InstancedMesh) stats.scatter += count;
    else if (object.name.includes('ool') || object.name.startsWith('OOL_')) stats.ool += count;
    else stats.places += count;
  });
  return stats;
}
