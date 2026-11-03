// El Archivo, la biblioteca (CONTEXTO_PLANETAS.md §4), rehecho por código como planeta de agua (Fase 11E; ✅ la
// idea, Anthony 2026-11-03). Sustituye a archivo.glb con el mismo contrato (raíz con radio, gravedad, reloj y
// ahora el mar; mallas COL_; marcas SPAWN_, INT_ y EVT_): un mar de 70 m sobre un fondo de roca, unos islotes y,
// alrededor del ecuador, la Galería de vidrio con los archivos dentro (archivoGallery.ts).
import {
  BufferGeometry,
  Color,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { isMesh } from '../markers';
import {
  ARCHIVO_ID,
  LOCK,
  SEA_LEVEL,
  SEABED,
  SEABED_UNDER_TUBE,
  TUBE_BAND,
  TUBE_MAJOR,
  TUBE_MINOR,
  WAVE_HEIGHT,
  WAVE_SEED,
} from './archivoShape';
import { ARCHIVO_PALETTE as P, GalleryBuilder, glassTube } from './archivoGallery';
import {
  angleBetween,
  applySkyLight,
  ball,
  box,
  colliderMesh,
  cone,
  cylinder,
  direction,
  frameAt,
  marker,
  piecesToMeshes,
  scatter,
  smoothstep,
  sphereTerrain,
  torus,
  triangleCount,
  type Surface,
  type XYZ,
} from './kit';
import { createNoise, fbm, seededRandom } from './noise';
import { ATMOSPHERES } from '../../data/atmospheres';
import { createWaves } from '../../physics/waves';
import { applyUnderwater, oceanMesh } from '../../render/ocean';
import { cloudLayer } from './clouds';
import { sunInWorld } from './sun';

export { ARCHIVO_ID } from './archivoShape';
export const ARCHIVO_RADIUS = SEA_LEVEL;
/** Subdivisión del fondo (la colisión usa la misma malla). */
export const ARCHIVO_DETAIL = 36;

const DEG = Math.PI / 180;

/** Los islotes (🟡): uno en el Borde, donde se despierta, junto a la primera torre; los demás, lejos del tubo. */
const ISLETS = [
  { lat: 22, lon: -26, radius: 11, top: 71.8 },
  { lat: 40, lon: 110, radius: 13, top: 72.6 },
  { lat: -36, lon: -140, radius: 9, top: 71.4 },
  { lat: 58, lon: -70, radius: 7, top: 71 },
  { lat: -50, lon: 35, radius: 10, top: 71.6 },
  { lat: -20, lon: 150, radius: 6, top: 70.8 },
] as const;
const BORDE = ISLETS[0];
/** La orilla de los islotes queda un poco bajo el agua; de ahí cae al fondo en unos metros. */
const SHORE = SEA_LEVEL - 1.2;
const SKIRT = 9;
/** El fondo se allana bajo la esclusa. */
const LOCK_PAD = 7;

const noise = createNoise(19);

/** Radio del islote en esa distancia (m) de su centro, o el fondo si ya no llega. */
function isletRadius(islet: (typeof ISLETS)[number], distance: number): number {
  if (distance <= islet.radius) {
    const t = smoothstep(islet.radius * 0.45, islet.radius, distance);
    return islet.top + (SHORE - islet.top) * t;
  }
  const t = smoothstep(islet.radius, islet.radius + SKIRT, distance);
  return SHORE + (SEABED - SHORE) * t;
}

const ISLET_DIRS = ISLETS.map((i) => direction(i.lat, i.lon));
const LOCK_DIR = direction(0, LOCK.lon);

/** Distancia al centro del fondo (o de un islote) en una dirección unitaria. */
function seabedRadius(d: XYZ): number {
  let r = SEABED + fbm(noise, d.x * 3, d.y * 3, d.z * 3, 3) * 1.6;
  ISLETS.forEach((islet, k) => {
    const center = ISLET_DIRS[k];
    if (!center) return;
    const distance = angleBetween(d, center) * SEA_LEVEL;
    if (distance < islet.radius + SKIRT) r = Math.max(r, isletRadius(islet, distance));
  });
  // Bajo el tubo, el fondo deja paso para bucear por debajo.
  const lat = Math.abs(Math.asin(Math.max(-1, Math.min(1, d.z)))) / DEG;
  const band = 1 - smoothstep(TUBE_BAND - 3, TUBE_BAND, lat);
  if (band > 0) r = Math.min(r, SEABED_UNDER_TUBE + (r - SEABED_UNDER_TUBE) * (1 - band));
  const lock = angleBetween(d, LOCK_DIR) * SEABED;
  if (lock < LOCK_PAD + 3) r += (SEABED - r) * (1 - smoothstep(LOCK_PAD, LOCK_PAD + 3, lock));
  return r;
}

const seabed: Surface = { radius: SEABED, groundRadius: seabedRadius };

function seabedColor(height: number, slope: number, random: () => number): Color {
  const r = SEABED + height;
  if (r > SEA_LEVEL + 0.4) {
    return new Color(slope > 0.45 ? P.rockLight : P.pearlShade).offsetHSL(
      0,
      0,
      (random() - 0.5) * 0.05,
    );
  }
  if (r > SHORE - 0.6) return new Color(P.sandLight).offsetHSL(0, 0, (random() - 0.5) * 0.05);
  const tone = slope > 0.4 ? P.rockDark : random() < 0.5 ? P.sand : P.rock;
  return new Color(tone).offsetHSL(0, 0, (random() - 0.5) * 0.04);
}

/** La superficie del mar: una esfera sin la franja que ocupa el tubo (dentro del vidrio no hay agua). */
function seaGeometry(): BufferGeometry {
  // Donde el tubo corta el nivel del mar: 2·asin(r / 2R).
  const cut = 2 * Math.asin(TUBE_MINOR / (2 * TUBE_MAJOR)) - 0.07 * DEG;
  const cap = Math.PI / 2 - cut;
  const north = new SphereGeometry(SEA_LEVEL, 192, 56, 0, Math.PI * 2, 0, cap);
  const south = new SphereGeometry(SEA_LEVEL, 192, 56, 0, Math.PI * 2, Math.PI / 2 + cut, cap);
  const sea = mergeGeometries([north, south]);
  sea.deleteAttribute('uv');
  // En el marco de glTF (Y arriba, el eje del tubo), como SphereGeometry: el mar va en la raíz, no en el marco.
  return sea;
}

/** El Borde: un embarcadero de piedra en el islote donde se despierta, mirando al tubo. */
function borde(builder: GalleryBuilder): void {
  const f = frameAt(seabed, BORDE.lat, BORDE.lon, { heading: 180, footprint: 3 });
  const v = builder.pieces;
  v.add(P.pearl, cylinder(3, 12), f.at([0, 0, 0.1], undefined, [1, 1, 0.5]));
  v.add(P.gold, torus(3.0, 0.06, 32, 4), f.at([0, 0, 0.35], [Math.PI / 2, 0, 0]), 'metal', {
    solid: false,
  });
  for (const x of [-2.2, 2.2]) {
    v.add(P.steelDark, cylinder(0.06, 6), f.at([x, 1.6, 1.3], undefined, [1, 1, 2.2]), 'metal', {
      solid: true,
    });
    v.add(P.light, ball(0.12, 1), f.at([x, 1.6, 2.45]), 'light', { glow: 3, vary: 0 });
  }
  v.add(P.pearlShade, box(), f.at([0, -2.2, 0.55], undefined, [1.6, 0.45, 0.45]));
  builder.markers.push({ name: 'SPAWN_Borde', frame: f, at: [0, 0, 1], props: {} });
}

function rockGeometry(): BufferGeometry {
  const geometry = new DodecahedronGeometry(1, 0);
  geometry.deleteAttribute('uv');
  return geometry.scale(1, 0.8, 0.55);
}

function weedGeometry(): BufferGeometry {
  const random = seededRandom(37);
  const blades = Array.from({ length: 4 }, () => {
    const length = 1.2 + random() * 1.4;
    return cone(0.09, 0, 3)
      .clone()
      .scale(1, 1, length)
      .translate(0, 0, length / 2)
      .rotateX((random() - 0.5) * 0.5)
      .rotateZ(random() * Math.PI * 2);
  });
  return mergeGeometries(blades);
}

export interface ArchivoOptions {
  detail?: number;
}

export interface ArchivoStats {
  terrain: number;
  places: number;
  glass: number;
  colliders: number;
}

/** Construye el Archivo con la forma de una escena exportada: la raíz `archivo`, sus mallas y sus marcas. */
export function buildArchivo({ detail = ARCHIVO_DETAIL }: ArchivoOptions = {}): Group {
  const sun = sunInWorld(ARCHIVO_ID);
  const builder = new GalleryBuilder(seabed, sun);
  builder.build();
  borde(builder);

  const sky = {
    day: new Color('#9fb4c8').multiplyScalar(1.5),
    ground: new Color('#6f8a9a').multiplyScalar(1.2),
    night: new Color(0.05, 0.07, 0.13),
    // Aire limpio de mar (🟡): lo lejano se vuelve azul claro de día y azul hondo de noche.
    haze: {
      day: new Color('#a9cbe4'),
      night: new Color('#0d1a30'),
      density: 0.005,
      max: 0.4,
      radius: SEA_LEVEL,
    },
  };
  const lit = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => {
    const material = new MeshStandardMaterial({ flatShading: true, ...options });
    applySkyLight(material, sun, sky);
    return material;
  };
  const glass = (color: string, opacity: number): MeshStandardMaterial =>
    new MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
      roughness: 0.05,
      metalness: 0.2,
      side: DoubleSide,
      depthWrite: false,
    });
  const materials = {
    ground: lit({ vertexColors: true, roughness: 0.95 }),
    stone: lit({ vertexColors: true, roughness: 0.85 }),
    metal: lit({ vertexColors: true, roughness: 0.45, metalness: 0.5 }),
    light: new MeshBasicMaterial({ vertexColors: true }),
    rock: lit({ roughness: 0.92 }),
    weed: lit({ roughness: 1, side: DoubleSide }),
  };

  // Marco de Blender: el contenido se gira −90° en X (como el exportador glTF).
  const frame = new Group();
  frame.name = 'archivo_Marco';
  frame.rotation.x = -Math.PI / 2;

  const terrainGeometry = sphereTerrain({
    radius: SEABED,
    detail,
    height: (x, y, z) => seabedRadius({ x, y, z }) - SEABED,
    faceColor: (_x, _y, _z, h, slope, random) => seabedColor(h, slope, random),
  });
  const terrain = new Mesh(terrainGeometry, materials.ground);
  terrain.name = 'archivo_Terreno';
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  frame.add(terrain);
  const groundCollider = new Mesh(terrainGeometry);
  groundCollider.name = 'COL_archivo_Terreno';
  groundCollider.visible = false;
  frame.add(groundCollider);

  const air = ATMOSPHERES[ARCHIVO_ID];
  const sea = oceanMesh(seaGeometry(), {
    name: 'archivo_Mar',
    level: SEA_LEVEL,
    waves: createWaves(WAVE_HEIGHT, WAVE_SEED),
    // Del marco de Blender al de glTF: (x, z, −y).
    sun: new Vector3(sun.x, sun.z, -sun.y),
    colors: {
      deep: new Color('#1c6c8f'),
      shallow: new Color('#46a8c6'),
      foam: new Color('#f1f9fc'),
      sky: new Color(air?.zenith ?? 0x2f6fc0),
      horizon: new Color(air?.horizon ?? 0xb4d6ee),
      under: new Color('#2a8aa3'),
    },
    haze: [35, 120],
    opacity: 0.62,
    seed: WAVE_SEED,
  });
  sea.renderOrder = 1;
  // Lo hundido se tiñe del agua y lleva los reflejos de las olas; dentro del tubo seco, no.
  for (const material of [
    materials.ground,
    materials.stone,
    materials.metal,
    materials.rock,
    materials.weed,
  ]) {
    applyUnderwater(material, {
      level: SEA_LEVEL,
      sun,
      tint: new Color('#2b7d97'),
      dry: { axis: new Vector3(0, 0, 1), major: TUBE_MAJOR, minor: TUBE_MINOR },
    });
  }

  const tube = glassTube();
  const seaGlass = new Mesh(tube.lower, glass('#1a4f6a', 0.42));
  seaGlass.name = 'archivo_VidrioHundido';
  seaGlass.renderOrder = 2;
  const airGlass = new Mesh(tube.upper, glass('#d6eef6', 0.14));
  airGlass.name = 'archivo_Vidrio';
  airGlass.renderOrder = 3;
  frame.add(seaGlass, airGlass);
  builder.pieces.addCollider(tube.collider);

  for (const mesh of piecesToMeshes(builder.pieces, materials, 'archivo')) frame.add(mesh);

  const random = seededRandom(43);
  const underwater = (d: XYZ, margin: number): boolean => seabedRadius(d) < SHORE - margin;
  const rocks = scatter(
    {
      name: 'archivo_Rocas',
      geometry: rockGeometry(),
      material: materials.rock,
      count: 260,
      castShadow: true,
      groundRadius: seabedRadius,
      solidAbove: 0.7,
      pick: (d, r) => {
        if (angleBetween(d, LOCK_DIR) * SEABED < LOCK_PAD + 2) return null;
        const size = r() < 0.08 ? 0.9 + r() * 1.2 : 0.15 + r() * 0.45;
        return {
          scale: [size, size * (0.8 + r() * 0.4), size],
          sink: size * 0.3,
          color: [P.rock, P.rockDark, P.rockLight][Math.floor(r() * 3)] ?? P.rock,
        };
      },
    },
    random,
  );
  const weeds = scatter(
    {
      name: 'archivo_Algas',
      geometry: weedGeometry(),
      material: materials.weed,
      count: 900,
      castShadow: false,
      groundRadius: seabedRadius,
      pick: (d, r) => {
        if (!underwater(d, 2) || fbm(noise, d.x * 4 + 7, d.y * 4, d.z * 4, 2) < 0) return null;
        if (angleBetween(d, LOCK_DIR) * SEABED < LOCK_PAD) return null;
        const size = 0.7 + r() * 0.8;
        return { scale: [size, size, size], sink: 0.05, color: r() < 0.5 ? '#3f6a5a' : '#556f48' };
      },
    },
    random,
  );
  frame.add(rocks.mesh, weeds.mesh);
  // El cielo del mar (🟡): cúmulos bajos que el viento lleva hacia el este y velos altos más lentos.
  frame.add(
    cloudLayer({
      name: 'archivo_Nubes',
      radius: SEA_LEVEL + 26,
      sun,
      axis: new Vector3(0.15, -0.1, 1),
      speed: 0.004,
      cover: 0.42,
      scale: 3.2,
      day: new Color('#ffffff'),
      night: new Color('#2a3550'),
      opacity: 0.92,
      seed: 0.37,
    }),
    cloudLayer({
      name: 'archivo_Velos',
      radius: SEA_LEVEL + 40,
      sun,
      axis: new Vector3(-0.2, 0.3, 1),
      speed: 0.0015,
      cover: 0.3,
      scale: 1.6,
      day: new Color('#eaf3fb'),
      night: new Color('#1c2640'),
      opacity: 0.5,
      seed: 0.81,
    }),
  );
  for (const g of rocks.colliders) builder.pieces.addCollider(g);
  frame.add(colliderMesh('COL_archivo_Lugares', builder.pieces.colliders));

  // El rayo de la ranura de luz: EVT_, el juego lo enseña solo mientras dura su evento (4:00).
  const ray = new Mesh(
    mergeGeometries(builder.beam.parts.light),
    new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  ray.name = 'EVT_Archivo_Rayo';
  ray.userData.event = 'ranura_luz';
  ray.renderOrder = 4;
  frame.add(ray);

  for (const { name, frame: f, at, props } of builder.markers) {
    frame.add(marker(name, f.point(at), f.rotation(), props));
  }

  const root = new Object3D();
  root.name = ARCHIVO_ID;
  Object.assign(root.userData, {
    world_id: ARCHIVO_ID,
    radius: ARCHIVO_RADIUS,
    gravity: 1.5,
    clock_rate: 0.8,
    ambient: 0.5,
    ambient_color: '#8fa4c4',
    sea_level: SEA_LEVEL,
    dry_ring_major: TUBE_MAJOR,
    dry_ring_minor: TUBE_MINOR,
    sea_wave_height: WAVE_HEIGHT,
    sea_wave_seed: WAVE_SEED,
  });
  root.userData.stats = statsOf(frame, terrain, builder.pieces.colliders);
  root.add(frame, sea);

  const scene = new Group();
  scene.add(root);
  scene.updateMatrixWorld(true);
  return scene;
}

function statsOf(
  frame: Object3D,
  terrain: Mesh,
  colliders: readonly BufferGeometry[],
): ArchivoStats {
  const stats: ArchivoStats = {
    terrain: triangleCount(terrain.geometry),
    places: 0,
    glass: 0,
    colliders: colliders.reduce((sum, g) => sum + triangleCount(g), 0),
  };
  frame.traverse((object) => {
    if (!isMesh(object) || object.name.startsWith('COL_') || object === terrain) return;
    const count =
      triangleCount(object.geometry) * (object instanceof InstancedMesh ? object.count : 1);
    if (object.name.includes('Vidrio')) stats.glass += count;
    else stats.places += count;
  });
  return stats;
}
