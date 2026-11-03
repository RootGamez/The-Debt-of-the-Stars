// Kit para modelar mundos por código (Fase 11): primitivas, marcos sobre la superficie, piezas con su
// colisión, terreno esférico, dispersión de detalle y la luz de cielo. Sustituye a blender/scripts/arte_comun.py.
//
// Ejes: se modela en el marco de Blender (Z arriba, latitud y longitud como en blender/marcas) y la raíz del
// mundo se gira −90° en X, igual que hacía el exportador glTF; así lat/lon, rumbos y marcas no cambian.
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  TorusGeometry,
  Vector3,
  type Material,
  type MeshStandardMaterial,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { seededRandom, type Random } from './noise';

export interface XYZ {
  x: number;
  y: number;
  z: number;
}
export type Triple = readonly [number, number, number];

const DEG = Math.PI / 180;
const Z_UP = new Vector3(0, 0, 1);

export const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Dirección unitaria de una latitud y longitud (grados), en el marco de Blender. */
export function direction(lat: number, lon: number): Vector3 {
  const la = lat * DEG;
  const lo = lon * DEG;
  return new Vector3(Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la));
}

/** Latitud y longitud (grados) de una dirección. */
export function latLon(d: XYZ): { lat: number; lon: number } {
  const l = Math.hypot(d.x, d.y, d.z) || 1;
  return { lat: Math.asin(clamp(d.z / l, -1, 1)) / DEG, lon: Math.atan2(d.y, d.x) / DEG };
}

/** Ángulo entre dos direcciones unitarias (radianes). */
export function angleBetween(a: XYZ, b: XYZ): number {
  return Math.acos(clamp(a.x * b.x + a.y * b.y + a.z * b.z, -1, 1));
}

// ---- Primitivas: centradas; cilindros y conos con eje Z y largo 1 (como en arte_comun.py) -----------------

const primitives = new Map<string, BufferGeometry>();

function primitive(key: string, create: () => BufferGeometry): BufferGeometry {
  let geometry = primitives.get(key);
  if (!geometry) {
    geometry = create();
    if (geometry.index) geometry = geometry.toNonIndexed();
    geometry.deleteAttribute('uv');
    primitives.set(key, geometry);
  }
  return geometry;
}

export const box = (): BufferGeometry => primitive('box', () => new BoxGeometry(1, 1, 1));

export const cylinder = (radius: number, sides = 8): BufferGeometry =>
  primitive(`cyl${radius}-${sides}`, () =>
    new CylinderGeometry(radius, radius, 1, sides).rotateX(Math.PI / 2),
  );

/** Cono truncado: `bottom` abajo (z = −0,5) y `top` arriba. */
export const cone = (bottom: number, top = 0, sides = 8): BufferGeometry =>
  primitive(`cone${bottom}-${top}-${sides}`, () =>
    new CylinderGeometry(top, bottom, 1, sides).rotateX(Math.PI / 2),
  );

export const ball = (radius: number, detail = 1): BufferGeometry =>
  primitive(`ball${radius}-${detail}`, () => new IcosahedronGeometry(radius, detail));

/** Toro de pie en el plano XZ (eje Y), como el de Blender. */
export const torus = (radius: number, tube: number, sides = 24, section = 6): BufferGeometry =>
  primitive(`torus${radius}-${tube}-${sides}-${section}`, () =>
    new TorusGeometry(radius, tube, section, sides).rotateX(Math.PI / 2),
  );

/** Arco de toro entre `from` y `to` (radianes, en el plano XZ desde +X hacia +Z). */
export const torusArc = (
  radius: number,
  tube: number,
  from: number,
  to: number,
  sides = 16,
  section = 6,
): BufferGeometry =>
  primitive(`arc${radius}-${tube}-${from}-${to}-${sides}-${section}`, () =>
    new TorusGeometry(radius, tube, section, sides, to - from).rotateZ(from).rotateX(Math.PI / 2),
  );

/** Geometría suelta a partir de triángulos (x, y, z, x, y, z…), con normales planas. */
export function geometryFrom(positions: readonly number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const euler = new Euler();
const quaternion = new Quaternion();

/** Matriz de una pieza: posición, giro (Euler de Blender XYZ = Rz·Ry·Rx, en Three el orden 'ZYX') y escala. */
export function pieceMatrix(
  position: Triple = [0, 0, 0],
  rotation: Triple = [0, 0, 0],
  scale: Triple = [1, 1, 1],
): Matrix4 {
  euler.set(rotation[0], rotation[1], rotation[2], 'ZYX');
  return new Matrix4().compose(
    new Vector3(...position),
    quaternion.setFromEuler(euler),
    new Vector3(...scale),
  );
}

/**
 * Matriz de una rampa (una caja inclinada) cuya cara de arriba va de `from` a `to`, en el marco del lugar.
 * Se alarga un poco por abajo para que se hunda en el suelo y no deje escalón.
 */
export function rampMatrix(
  from: Triple,
  to: Triple,
  width: number,
  thickness = 0.35,
  extend = 1,
): Matrix4 {
  const a = new Vector3(...from);
  const b = new Vector3(...to);
  const along = b.clone().sub(a);
  b.addScaledVector(along, extend / along.length());
  along.subVectors(b, a);
  const run = Math.hypot(along.x, along.y);
  const pitch = Math.atan2(along.z, run);
  const yaw = Math.atan2(-along.x, along.y);
  const middle = a.clone().add(b).multiplyScalar(0.5);
  return pieceMatrix([middle.x, middle.y, middle.z], [pitch, 0, yaw]).multiply(
    pieceMatrix([0, 0, -thickness / 2], [0, 0, 0], [width, along.length(), thickness]),
  );
}

// ---- Marcos sobre la superficie (como Planeta.lugar) ------------------------------------------------------

/** Marco local de un lugar: Z arriba (radial), Y hacia el rumbo, X a la derecha. */
export class Frame {
  constructor(readonly base: Matrix4) {}

  at(position?: Triple, rotation?: Triple, scale?: Triple): Matrix4 {
    return this.base.clone().multiply(pieceMatrix(position, rotation, scale));
  }

  point(p: Triple): Vector3 {
    return new Vector3(...p).applyMatrix4(this.base);
  }

  up(): Vector3 {
    return new Vector3().setFromMatrixColumn(this.base, 2).normalize();
  }

  rotation(): Quaternion {
    return new Quaternion().setFromRotationMatrix(this.base);
  }
}

export interface PlaceOptions {
  /** Grados desde el norte hacia el este: hacia dónde mira +Y. */
  heading?: number;
  /** Cuánto se hunde por debajo del suelo elegido (m). */
  sink?: number;
  /** Radio del círculo donde se mide el suelo (m): los edificios no flotan en las cuestas. */
  footprint?: number;
  /** Con qué altura del círculo se queda: la más baja o la media (plataformas: la roca asoma por el lado alto). */
  ground?: 'lowest' | 'mean';
}

export interface Surface {
  radius: number;
  /** Distancia del centro al suelo en esa dirección unitaria. */
  groundRadius(d: XYZ): number;
}

export function frameAt(
  surface: Surface,
  lat: number,
  lon: number,
  options: PlaceOptions = {},
): Frame {
  const { heading = 0, sink = 0, footprint = 0, ground = 'lowest' } = options;
  const up = direction(lat, lon);
  let north = new Vector3(0, 0, 1).addScaledVector(up, -up.z);
  if (north.length() < 1e-6) north = new Vector3(1, 0, 0);
  north.normalize();
  const east = north.clone().cross(up).normalize();
  const h = heading * DEG;
  const forward = north.multiplyScalar(Math.cos(h)).addScaledVector(east, Math.sin(h)).normalize();
  const right = forward.clone().cross(up).normalize();
  const heights = [surface.groundRadius(up)];
  if (footprint > 0) {
    const degrees = footprint / surface.radius / DEG;
    for (let k = 0; k < 8; k++) {
      const a = (2 * Math.PI * k) / 8;
      const d = direction(
        lat + degrees * Math.cos(a),
        lon + (degrees * Math.sin(a)) / Math.max(0.2, Math.cos(lat * DEG)),
      );
      heights.push(surface.groundRadius(d));
    }
  }
  const height =
    ground === 'mean' ? heights.reduce((s, v) => s + v, 0) / heights.length : Math.min(...heights);
  const origin = up.clone().multiplyScalar(height - sink);
  return new Frame(new Matrix4().makeBasis(right, forward, up).setPosition(origin));
}

/** Rumbo (grados desde el norte hacia el este) que mira hacia una dirección del espacio. */
export function headingTowards(lat: number, lon: number, target: XYZ): number {
  const up = direction(lat, lon);
  const north = new Vector3(0, 0, 1).addScaledVector(up, -up.z).normalize();
  const east = north.clone().cross(up).normalize();
  const t = new Vector3(target.x, target.y, target.z);
  t.addScaledVector(up, -t.dot(up));
  return Math.atan2(t.dot(east), t.dot(north)) / DEG;
}

// ---- Piezas -----------------------------------------------------------------------------------------------

export type PieceKind = 'stone' | 'metal' | 'light';

export interface PieceOptions {
  /** Variación de luminosidad de esta pieza (las facetas no son todas iguales). */
  vary?: number;
  /** Multiplica el color (> 1 en las luces: brillan sin depender de la Brasa). */
  glow?: number;
  /**
   * Si se choca con ella. Por defecto, sí en piedra y metal salvo las piezas finas o pequeñas (tazas,
   * papeles, marcas de reloj): lo que no estorba al caminar no se lleva a la colisión.
   */
  solid?: boolean;
}

const MIN_SOLID_THICKNESS = 0.12;
const MIN_SOLID_SIZE = 0.35;
const extent = new Vector3();

/** Acumula piezas por material y su colisión; al final se unen en pocas mallas. */
export class PieceSet {
  readonly parts: Record<PieceKind, BufferGeometry[]> = { stone: [], metal: [], light: [] };
  readonly colliders: BufferGeometry[] = [];
  private readonly random: Random;

  constructor(seed: number) {
    this.random = seededRandom(seed);
  }

  add(
    color: string | Color,
    geometry: BufferGeometry,
    matrix: Matrix4,
    kind: PieceKind = 'stone',
    { vary = 0.025, glow = 1, solid }: PieceOptions = {},
  ): void {
    const g = geometry.clone().applyMatrix4(matrix);
    const c = new Color(color);
    if (vary) c.offsetHSL(0, 0, (this.random() - 0.5) * vary);
    c.multiplyScalar(glow);
    const count = g.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new BufferAttribute(colors, 3));
    this.parts[kind].push(g);
    if (solid ?? (kind !== 'light' && isSubstantial(g))) this.addCollider(g);
  }

  /** Solo colisión (piedras sueltas, piezas que se dibujan aparte). */
  addCollider(geometry: BufferGeometry): void {
    const only = new BufferGeometry();
    only.setAttribute('position', geometry.getAttribute('position').clone());
    this.colliders.push(only);
  }
}

function isSubstantial(geometry: BufferGeometry): boolean {
  geometry.computeBoundingBox();
  geometry.boundingBox?.getSize(extent);
  const smallest = Math.min(extent.x, extent.y, extent.z);
  const largest = Math.max(extent.x, extent.y, extent.z);
  return smallest >= MIN_SOLID_THICKNESS && largest >= MIN_SOLID_SIZE;
}

/** Une las piezas de cada tipo en una malla con su material. */
export function piecesToMeshes(
  pieces: PieceSet,
  materials: Record<PieceKind, Material>,
  prefix: string,
): Mesh[] {
  const names: Record<PieceKind, string> = { stone: 'Lugares', metal: 'Metal', light: 'Luces' };
  const meshes: Mesh[] = [];
  for (const kind of ['stone', 'metal', 'light'] as const) {
    const parts = pieces.parts[kind];
    if (parts.length === 0) continue;
    const mesh = new Mesh(mergeGeometries(parts), materials[kind]);
    mesh.name = `${prefix}_${names[kind]}`;
    mesh.castShadow = kind !== 'light';
    mesh.receiveShadow = kind !== 'light';
    meshes.push(mesh);
  }
  return meshes;
}

/** Malla de colisión (COL_): invisible, solo posiciones. */
export function colliderMesh(name: string, geometries: readonly BufferGeometry[]): Mesh {
  const mesh = new Mesh(mergeGeometries([...geometries]));
  mesh.name = name;
  mesh.visible = false;
  return mesh;
}

export function triangleCount(geometry: BufferGeometry): number {
  return (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3;
}

// ---- Terreno ----------------------------------------------------------------------------------------------

export interface TerrainSpec {
  radius: number;
  /** Subdivisión de la icosfera: 20·(detail+1)² triángulos. */
  detail: number;
  /** Altura sobre el radio en una dirección unitaria. */
  height(x: number, y: number, z: number): number;
  /** Color de una cara: su centro (dirección unitaria), su altura y su pendiente (0 plana, 1 vertical). */
  faceColor(x: number, y: number, z: number, height: number, slope: number, random: Random): Color;
}

/** Icosfera desplazada, facetada y con un color por cara. */
export function sphereTerrain(spec: TerrainSpec, seed = 11): BufferGeometry {
  const base = new IcosahedronGeometry(1, spec.detail);
  base.deleteAttribute('normal');
  base.deleteAttribute('uv');
  const indexed = mergeVertices(base, 1e-6);
  const position = indexed.getAttribute('position');
  const p = new Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).normalize();
    p.multiplyScalar(spec.radius + spec.height(p.x, p.y, p.z));
    position.setXYZ(i, p.x, p.y, p.z);
  }
  const geometry = indexed.toNonIndexed();
  geometry.computeVertexNormals();
  const faces = geometry.getAttribute('position');
  const colors = new Float32Array(faces.count * 3);
  const random = seededRandom(seed);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const center = new Vector3();
  const normal = new Vector3();
  const edge = new Vector3();
  for (let f = 0; f < faces.count; f += 3) {
    a.fromBufferAttribute(faces, f);
    b.fromBufferAttribute(faces, f + 1);
    c.fromBufferAttribute(faces, f + 2);
    center.copy(a).add(b).add(c).divideScalar(3);
    const r = center.length();
    center.divideScalar(r);
    normal.subVectors(c, b).cross(edge.subVectors(a, b)).normalize();
    const slope = 1 - Math.abs(normal.dot(center));
    const color = spec.faceColor(center.x, center.y, center.z, r - spec.radius, slope, random);
    for (let k = 0; k < 3; k++) colors.set([color.r, color.g, color.b], (f + k) * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

// ---- Detalle disperso (instancias) ------------------------------------------------------------------------

export interface ScatterPick {
  scale: Triple;
  sink: number;
  color: string;
  /** Inclinación aleatoria máxima (rad). */
  tilt?: number;
}

export interface ScatterSpec {
  name: string;
  geometry: BufferGeometry;
  material: Material;
  count: number;
  castShadow: boolean;
  /** Si en esa dirección va una instancia y cómo (o null). */
  pick(d: Vector3, random: Random): ScatterPick | null;
  /** Radio del suelo en esa dirección. */
  groundRadius(d: XYZ): number;
  /** Con escala mayor que esta, la instancia también se choca (piedras grandes). */
  solidAbove?: number;
}

/** Reparte instancias por la esfera; devuelve la malla y las colisiones de las que estorban. */
export function scatter(
  spec: ScatterSpec,
  random: Random,
): { mesh: InstancedMesh; colliders: BufferGeometry[] } {
  const chosen: [Vector3, ScatterPick][] = [];
  for (let attempt = 0; attempt < spec.count * 30 && chosen.length < spec.count; attempt++) {
    const d = new Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1);
    const lengthSq = d.lengthSq();
    if (lengthSq > 1 || lengthSq < 1e-4) continue;
    d.normalize();
    const pick = spec.pick(d, random);
    if (pick) chosen.push([d, pick]);
  }
  const mesh = new InstancedMesh(spec.geometry, spec.material, chosen.length);
  mesh.name = spec.name;
  const colliders: BufferGeometry[] = [];
  const m = new Matrix4();
  const q = new Quaternion();
  const turn = new Quaternion();
  const color = new Color();
  chosen.forEach(([d, pick], i) => {
    q.setFromUnitVectors(Z_UP, d);
    q.multiply(turn.setFromAxisAngle(Z_UP, random() * Math.PI * 2));
    if (pick.tilt)
      q.multiply(turn.setFromAxisAngle(new Vector3(1, 0, 0), (random() - 0.5) * pick.tilt));
    const r = spec.groundRadius(d) - pick.sink;
    m.compose(d.clone().multiplyScalar(r), q, new Vector3(...pick.scale));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, color.set(pick.color).offsetHSL(0, 0, (random() - 0.5) * 0.06));
    if (spec.solidAbove !== undefined && Math.max(...pick.scale) > spec.solidAbove) {
      colliders.push(spec.geometry.clone().applyMatrix4(m));
    }
  });
  mesh.castShadow = spec.castShadow;
  mesh.receiveShadow = true;
  return { mesh, colliders };
}

// ---- Marcas de juego --------------------------------------------------------------------------------------

export type MarkerProps = Record<string, string | number | boolean>;

/** Una marca (SPAWN_, INT_, TRIG_, PARK_…) con sus propiedades en userData, como las exportaba Blender. */
export function marker(
  name: string,
  position: Vector3,
  rotation: Quaternion,
  props: MarkerProps = {},
): Object3D {
  const object = new Object3D();
  object.name = name;
  object.position.copy(position);
  object.quaternion.copy(rotation);
  Object.assign(object.userData, props);
  return object;
}

/** Giro mínimo que lleva Z a `up` (las marcas sin rumbo de blender/scripts/marcas.py). */
export function uprightRotation(up: Vector3): Quaternion {
  return new Quaternion().setFromUnitVectors(Z_UP, up.clone().normalize());
}

// ---- Luz de cielo -----------------------------------------------------------------------------------------

export interface SkyLightColors {
  /** Desde arriba, en la cara de día. */
  day: Color;
  /** Rebote del suelo, en la cara de día. */
  ground: Color;
  /** En la cara de noche. */
  night: Color;
  /** Bruma por distancia (perspectiva aérea), solo en mundos con aire. */
  haze?: HazeColors;
}

export interface HazeColors {
  /** Color de la bruma en la cara de día y en la de noche. */
  day: Color;
  night: Color;
  /** Cuánto se espesa por metro de distancia. */
  density: number;
  /** Lo más que tapa (0–1): lo lejano nunca desaparece del todo. */
  max: number;
  /** Radio del mundo: la bruma se ve desde cerca del suelo y se va al subir con la nave. */
  radius: number;
}

/** Altura sobre el suelo (m) a la que la bruma empieza a irse y a la que ya no se ve. */
const HAZE_FADE: readonly [number, number] = [25, 140];

/**
 * Relleno de cielo para un planeta pequeño. Una luz hemisférica apunta siempre al mismo "arriba", que en
 * una esfera no existe: aquí "arriba" es la vertical de cada punto. En la cara de día, cielo desde arriba y
 * rebote cálido desde abajo; en la de noche, apenas un violeta frío. Se calcula en el marco del propio
 * planeta (las mallas cuelgan del marco con su centro en el origen), así que no depende de dónde lo coloque
 * el sistema. `sunLocal` es la dirección de la Brasa en ese marco (fija si la rotación está bloqueada).
 */
export function applySkyLight(
  material: MeshStandardMaterial,
  sunLocal: Vector3,
  colors: SkyLightColors,
): void {
  const uniforms = {
    uSkySun: { value: sunLocal },
    uSkyDay: { value: colors.day },
    uSkyGround: { value: colors.ground },
    uSkyNight: { value: colors.night },
  };
  const { haze } = colors;
  const hazeUniforms = haze && {
    uHazeDay: { value: haze.day },
    uHazeNight: { value: haze.night },
    uHazeDensity: { value: haze.density },
    uHazeMax: { value: haze.max },
    uHazeRadius: { value: haze.radius },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uSkySun;
        varying float vSkyDay;
        varying vec3 vSkyUpView;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 skyPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          skyPosition = instanceMatrix * skyPosition;
        #endif
        vec3 skyUp = normalize(skyPosition.xyz);
        vSkyDay = smoothstep(-0.12, 0.35, dot(skyUp, uSkySun));
        vSkyUpView = normalize((viewMatrix * modelMatrix * vec4(skyUp, 0.0)).xyz);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uSkyDay;
        uniform vec3 uSkyGround;
        uniform vec3 uSkyNight;
        varying float vSkyDay;
        varying vec3 vSkyUpView;`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          float skyHemi = 0.5 + 0.5 * dot(normal, normalize(vSkyUpView));
          vec3 skyColor = mix(uSkyNight, mix(uSkyGround, uSkyDay, skyHemi), vSkyDay);
          reflectedLight.indirectDiffuse += skyColor * BRDF_Lambert(diffuseColor.rgb);
        }`,
      );
    if (hazeUniforms) {
      Object.assign(shader.uniforms, hazeUniforms);
      // La altura de quien mira se mide en el vertex shader: el fragment no tiene modelMatrix.
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uHazeRadius;
          varying float vHazeNear;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vec3 hazeCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          float hazeHeight = length(cameraPosition - hazeCenter) - uHazeRadius;
          vHazeNear = 1.0 - smoothstep(${HAZE_FADE[0].toFixed(1)}, ${HAZE_FADE[1].toFixed(1)}, hazeHeight);`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uHazeDay;
          uniform vec3 uHazeNight;
          uniform float uHazeDensity;
          uniform float uHazeMax;
          varying float vHazeNear;`,
        )
        .replace(
          '#include <tonemapping_fragment>',
          `{
            // Perspectiva aérea: cuanto más lejos, más color de cielo. Desde el espacio, nada.
            float hazeAmount = (1.0 - exp(-uHazeDensity * length(vViewPosition))) * uHazeMax * vHazeNear;
            gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(uHazeNight, uHazeDay, vSkyDay), hazeAmount);
          }
          #include <tonemapping_fragment>`,
        );
    }
  };
  material.customProgramCacheKey = () => (haze ? 'sky-light-haze' : 'sky-light');
  material.needsUpdate = true;
}
