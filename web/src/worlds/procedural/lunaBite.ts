// La mordida nueva de la Luna (F4, el final bueno; 🟡 todo el aspecto): en el Hogar al que vuelves tres días después,
// junto al fragmento hay un corte esférico en el suelo, limpio como el de la losa. Solo existe con la variante
// `mordida` de la Luna (`loadWorld('luna', 'mordida')`); sin ella la Luna es la de siempre. Aquí, las medidas y las
// reglas puras (con tests) y las dos mallas finas: el cuenco (la esfera por dentro, con sus estratos) y el labio que
// tapa el borde. El terreno de la Luna es basto (aristas de 2 m): bajo el cuenco se hunde más (`carvedGround`) para
// que no asome, y el labio cubre la costura. Marco de Blender, como lunaShape.ts.
import { BufferAttribute, BufferGeometry, Color, Vector3 } from 'three';
import { WorldDataError } from '../markers';
import { frameAt, type Surface, type XYZ } from './kit';
import { FRAGMENT_SITE, LUNA_RADIUS, lunaGround, lunaSurface } from './lunaShape';
import { seededRandom } from './noise';

/** La variante de mundo (`loadWorld(id, variante)`) que pide la Luna con la mordida nueva. */
export const BITE_VARIANT = 'mordida';

export interface LunaOptions {
  /** Con la mordida nueva junto al fragmento (solo en el Hogar del final bueno). */
  bite: boolean;
}

/** La Luna de una variante de mundo: sin variante, la de siempre; con una que no existe, un error. */
export function lunaOptions(variant: string | undefined): LunaOptions {
  if (variant === undefined) return { bite: false };
  if (variant === BITE_VARIANT) return { bite: true };
  throw new WorldDataError(`luna no tiene la variante «${variant}»`);
}

/**
 * Dónde y cómo es (m): su sitio en el marco del fragmento (a su derecha y un poco detrás, lejos de las esquirlas y de
 * donde se aparece), el radio de la esfera y cuánto queda su centro por encima del suelo.
 */
export const BITE = {
  right: 10.5,
  forward: 5,
  radius: 5.2,
  above: 1.3,
  /** El terreno basto se hunde bajo una esfera así de más grande, y tanto más abajo (m). */
  carveMargin: 0.9,
  carveDrop: 0.3,
  /** El labio: lo que sobresale junto al borde y lo que se mete bajo el terreno en su borde de fuera (m). */
  lipRise: 0.16,
  lipTuck: 0.06,
  /** Lo que se extiende el labio más allá del hundimiento del terreno basto (una arista y algo). */
  lipReach: 2.3,
} as const;

export interface BiteSphere {
  center: Vector3;
  radius: number;
  /** La vertical del suelo en la mordida (unitaria, desde el centro de la Luna). */
  up: Vector3;
}

/** La esfera de la mordida, en el marco de la Luna. */
export function biteSphere(): BiteSphere {
  const site = frameAt(lunaSurface, FRAGMENT_SITE.lat, FRAGMENT_SITE.lon, {
    heading: FRAGMENT_SITE.heading,
  });
  const up = site.point([BITE.right, BITE.forward, 0]).normalize();
  const center = up.clone().multiplyScalar(lunaGround(up) + BITE.above);
  return { center, radius: BITE.radius, up };
}

const sphere = biteSphere();

/** Dónde entra (lo más cerca del centro de la Luna) un rayo desde el centro con dirección `d` en una esfera, o nada. */
function nearHit(d: XYZ, center: Vector3, radius: number): number | undefined {
  const along = d.x * center.x + d.y * center.y + d.z * center.z;
  const disc = along * along - center.lengthSq() + radius * radius;
  if (disc < 0) return undefined;
  return along - Math.sqrt(disc);
}

/** ¿Cae el suelo de esa dirección dentro de la esfera de la mordida? (allí el suelo es el cuenco) */
export function inBite(d: XYZ): boolean {
  const hit = nearHit(d, sphere.center, sphere.radius);
  return hit !== undefined && hit < lunaGround(d);
}

/** El suelo del terreno basto con la mordida: bajo ella se hunde de sobra para que el cuenco fino no lo vea asomar. */
export function carvedGround(d: XYZ): number {
  const ground = lunaGround(d);
  const hit = nearHit(d, sphere.center, sphere.radius + BITE.carveMargin);
  return hit === undefined ? ground : Math.min(ground, hit - BITE.carveDrop);
}

/** La superficie de la Luna mordida (la del terreno basto). */
export const lunaBitten: Surface = { radius: LUNA_RADIUS, groundRadius: carvedGround };

/** El suelo de verdad (sin mordida) en el punto `p`, medido desde su dirección. */
function groundAt(p: Vector3): number {
  return lunaGround(p.clone().normalize());
}

/** Dos ejes del plano del suelo en la mordida. */
function tangents(up: Vector3): [Vector3, Vector3] {
  const helper = Math.abs(up.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
  const e1 = helper.clone().cross(up).normalize();
  const e2 = up.clone().cross(e1).normalize();
  return [e1, e2];
}

/** Un punto de la esfera: `theta` desde el fondo (0) hacia arriba, `phi` alrededor. */
function onSphere(theta: number, phi: number, axes: [Vector3, Vector3]): Vector3 {
  const [e1, e2] = axes;
  return sphere.center
    .clone()
    .addScaledVector(e1, sphere.radius * Math.sin(theta) * Math.cos(phi))
    .addScaledVector(e2, sphere.radius * Math.sin(theta) * Math.sin(phi))
    .addScaledVector(sphere.up, -sphere.radius * Math.cos(theta));
}

/** Del suelo hacia dentro (m): cuánto queda bajo el suelo un punto del cuenco (0 en el borde). */
export function depthBelowGround(p: Vector3): number {
  return Math.max(0, groundAt(p) - p.length());
}

/** Lo alto que sube el cuenco (rad desde el fondo): por encima del suelo más alto que pueda haber en el borde. */
const THETA_MAX = (100 * Math.PI) / 180;
const BOWL_RINGS = 26;
const BOWL_SEGMENTS = 72;
const STRATA = 0.55;
const FRESH = {
  light: new Color('#bcc5d2'),
  band: new Color('#a2acbc'),
  deep: new Color('#78829a'),
  rim: new Color('#e4e9f0'),
  lip: new Color('#8f99ab'),
  dust: new Color('#c9d0da'),
} as const;

/** El color de la roca recién cortada a esa profundidad: estratos claros y oscuros, más oscura al fondo. */
export function strataColor(depth: number): Color {
  if (depth < 0.12) return FRESH.rim.clone();
  const band = Math.floor(depth / STRATA) % 2 === 0 ? FRESH.light : FRESH.band;
  const deep = Math.min(1, depth / (sphere.radius - BITE.above));
  return band.clone().lerp(FRESH.deep, deep * 0.55);
}

/** Triángulos sueltos con un color por cara (sombreado plano, como el resto de la Luna). */
function facesToGeometry(
  faces: readonly (readonly [Vector3, Vector3, Vector3, Color])[],
): BufferGeometry {
  const positions = new Float32Array(faces.length * 9);
  const colors = new Float32Array(faces.length * 9);
  faces.forEach(([a, b, c, color], f) => {
    [a, b, c].forEach((p, k) => {
      positions.set([p.x, p.y, p.z], f * 9 + k * 3);
      colors.set([color.r, color.g, color.b], f * 9 + k * 3);
    });
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * El cuenco: la esfera vista por dentro, de cara a su centro. Lo que queda por encima del suelo se aplasta contra él
 * (debajo del labio).
 */
export function biteBowl(): BufferGeometry {
  const axes = tangents(sphere.up);
  const grid: Vector3[][] = [];
  for (let i = 0; i <= BOWL_RINGS; i++) {
    const theta = (i / BOWL_RINGS) * THETA_MAX;
    const row: Vector3[] = [];
    for (let j = 0; j < BOWL_SEGMENTS; j++) {
      const p = onSphere(theta, (j / BOWL_SEGMENTS) * Math.PI * 2, axes);
      const ground = groundAt(p);
      row.push(p.length() > ground ? p.normalize().multiplyScalar(ground) : p);
    }
    grid.push(row);
  }
  const faces: [Vector3, Vector3, Vector3, Color][] = [];
  const centroid = new Vector3();
  const add = (a: Vector3, b: Vector3, c: Vector3): void => {
    centroid.copy(a).add(b).add(c).divideScalar(3);
    faces.push([a, b, c, strataColor(depthBelowGround(centroid))]);
  };
  for (let i = 0; i < BOWL_RINGS; i++) {
    const lower = grid[i];
    const upper = grid[i + 1];
    if (!lower || !upper) continue;
    for (let j = 0; j < BOWL_SEGMENTS; j++) {
      const k = (j + 1) % BOWL_SEGMENTS;
      const [a, b, c, d] = [lower[j], lower[k], upper[j], upper[k]];
      if (!a || !b || !c || !d) continue;
      // De cara al centro de la esfera (se ve desde arriba, desde dentro).
      if (i > 0) add(a, c, b);
      add(b, c, d);
    }
  }
  return facesToGeometry(faces);
}

/** A qué distancia del eje de la mordida (por el plano del suelo) corta la esfera el suelo, en el rumbo `phi`. */
export function rimDistance(phi: number): number {
  const axes = tangents(sphere.up);
  let low = 0;
  let high = THETA_MAX;
  for (let k = 0; k < 40; k++) {
    const mid = (low + high) / 2;
    const p = onSphere(mid, phi, axes);
    if (p.length() < groundAt(p)) low = mid;
    else high = mid;
  }
  return sphere.radius * Math.sin(low);
}

/** Hasta dónde se hunde el terreno basto (m, por el plano del suelo), más lo que lo tapa el labio. */
export function lipOuter(): number {
  const carve = sphere.radius + BITE.carveMargin;
  return Math.sqrt(carve * carve - BITE.above * BITE.above) + BITE.lipReach;
}

const LIP_RINGS = 7;

/** El labio: un anillo de polvo claro desde el borde del cuenco, algo levantado, que se mete bajo el terreno. */
export function biteLip(): BufferGeometry {
  const axes = tangents(sphere.up);
  const [e1, e2] = axes;
  const outer = lipOuter();
  const random = seededRandom(19);
  const grid: Vector3[][] = [];
  for (let i = 0; i <= LIP_RINGS; i++) {
    const s = i / LIP_RINGS;
    const row: Vector3[] = [];
    for (let j = 0; j < BOWL_SEGMENTS; j++) {
      const phi = (j / BOWL_SEGMENTS) * Math.PI * 2;
      const r = rimDistance(phi) + (outer - rimDistance(phi)) * s * s;
      const flat = sphere.up
        .clone()
        .multiplyScalar(lunaGround(sphere.up))
        .addScaledVector(e1, r * Math.cos(phi))
        .addScaledVector(e2, r * Math.sin(phi));
      const rise = BITE.lipRise * (1 - s) ** 2 - BITE.lipTuck * s;
      row.push(flat.normalize().multiplyScalar(lunaGround(flat) + rise));
    }
    grid.push(row);
  }
  const faces: [Vector3, Vector3, Vector3, Color][] = [];
  for (let i = 0; i < LIP_RINGS; i++) {
    const inner = grid[i];
    const next = grid[i + 1];
    if (!inner || !next) continue;
    const tone = i === 0 ? FRESH.rim : FRESH.dust.clone().lerp(FRESH.lip, i / (LIP_RINGS - 1));
    for (let j = 0; j < BOWL_SEGMENTS; j++) {
      const k = (j + 1) % BOWL_SEGMENTS;
      const [a, b, c, d] = [inner[j], inner[k], next[j], next[k]];
      if (!a || !b || !c || !d) continue;
      const shade = (): Color => tone.clone().offsetHSL(0, 0, (random() - 0.5) * 0.03);
      // De cara hacia fuera de la Luna.
      faces.push([a, c, b, shade()], [b, c, d, shade()]);
    }
  }
  return facesToGeometry(faces);
}
