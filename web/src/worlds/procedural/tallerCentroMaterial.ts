// La luz y la piel de la casa del escéptico (plan de finales, E5). La Sala del Centro está cerrada: no entra la Brasa.
// Lo alumbra la fuente de poder de la Cámara y una lámpara en la mesa, así que la luz va cocida en los vértices
// (suave, sin facetas) y el material no depende de las luces de la escena. Dos partes: `color` (la luz de siempre: el
// cielo violeta de la cáscara y la lámpara) y `aGlow` (la de la fuente, que se apaga con `uGlow` cuando sale de su
// sitio). En el sombreador, un grano de piedra y, en las caras de los muros, las rayas de la cuenta (`aTally`).
import {
  BufferAttribute,
  Color,
  MeshBasicMaterial,
  Vector3,
  type BufferGeometry,
  type IUniform,
} from 'three';
import { TALLY_GROUP, TALLY_ROW, TALLY_ROWS, TALLY_THOUSAND } from './tallerCentroShape';

/** Una luz puntual cocida: posición en el marco del Taller, color lineal × intensidad y alcance (m). */
export interface BakedLight {
  position: Vector3;
  color: Color;
  range: number;
}

/** El cielo de la sala: hacia arriba (radial) violeta oscuro, hacia el suelo casi negro. */
export interface BakedSky {
  up: Color;
  down: Color;
}

/** Las rayas de una cara: dónde empieza su cuenta (grupos) y cuántos grupos por fila (+ la fracción llena si va a medias). */
export interface TallyFace {
  offset: number;
  perRow: number;
  fill?: number;
}

const normal = new Vector3();
const toLight = new Vector3();
const point = new Vector3();
const radial = new Vector3();

function lightAt(p: Vector3, n: Vector3, lights: readonly BakedLight[], out: Color): Color {
  out.setRGB(0, 0, 0);
  for (const light of lights) {
    toLight.subVectors(light.position, p);
    const d = toLight.length();
    if (d < 1e-4) continue;
    toLight.divideScalar(d);
    // Envolvente suave (media luz por detrás) para que nada quede negro del todo de cara a la fuente.
    const wrap = Math.max(0, (n.dot(toLight) + 0.35) / 1.35);
    const fall = 1 / (1 + (d / light.range) ** 2);
    out.r += light.color.r * wrap * fall;
    out.g += light.color.g * wrap * fall;
    out.b += light.color.b * wrap * fall;
  }
  return out;
}

const sky = new Color();
const lit = new Color();
const glow = new Color();

/**
 * Cuece la luz en `color` (cielo + `steady`) y `aGlow` (`glowing`), multiplicada por el color propio de la pieza.
 * `occlusion(p)` (0–1) oscurece los rincones: junto al suelo y bajo los muebles. `flip` invierte las normales (la
 * cáscara se ve por dentro).
 */
export function bake(
  geometry: BufferGeometry,
  albedo: Color,
  options: {
    sky: BakedSky;
    steady: readonly BakedLight[];
    glowing: readonly BakedLight[];
    occlusion: (p: Vector3) => number;
    flip?: boolean;
  },
): void {
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const count = positions.count;
  const colors = new Float32Array(count * 3);
  const glows = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    point.fromBufferAttribute(positions, i);
    normal.fromBufferAttribute(normals, i).normalize();
    if (options.flip) normal.negate();
    radial.copy(point).normalize();
    const ao = options.occlusion(point);
    sky.copy(options.sky.down).lerp(options.sky.up, 0.5 + 0.5 * normal.dot(radial));
    lightAt(point, normal, options.steady, lit).add(sky).multiplyScalar(ao);
    lightAt(point, normal, options.glowing, glow).multiplyScalar(ao);
    colors.set([lit.r * albedo.r, lit.g * albedo.g, lit.b * albedo.b], i * 3);
    glows.set([glow.r * albedo.r, glow.g * albedo.g, glow.b * albedo.b], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setAttribute('aGlow', new BufferAttribute(glows, 3));
}

/** Rellena `aTally`: (u, v, comienzo de la cuenta, grupos por fila + fracción); sin rayas, todo 0. */
export function setTally(
  geometry: BufferGeometry,
  uv?: (index: number) => readonly [number, number],
  face?: TallyFace,
): void {
  const count = geometry.getAttribute('position').count;
  const data = new Float32Array(count * 4);
  if (uv && face) {
    const w = face.perRow + Math.min(0.999, Math.max(0, face.fill ?? 0));
    for (let i = 0; i < count; i++) {
      const [u, v] = uv(i);
      data.set([u, v, face.offset, w], i * 4);
    }
  }
  geometry.setAttribute('aTally', new BufferAttribute(data, 4));
}

const VERTEX_HEAD = /* glsl */ `
attribute vec3 aGlow;
attribute vec4 aTally;
varying vec3 vGlow;
varying vec4 vTally;
varying vec3 vStone;
`;

const VERTEX_BODY = /* glsl */ `
vGlow = aGlow;
vTally = aTally;
vStone = position;
`;

const f = (x: number): string => x.toFixed(4);

const FRAGMENT_HEAD = /* glsl */ `
uniform float uGlow;
varying vec3 vGlow;
varying vec4 vTally;
varying vec3 vStone;
float centroHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float centroHash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float centroNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  float a = mix(centroHash3(i), centroHash3(i + vec3(1, 0, 0)), u.x);
  float b = mix(centroHash3(i + vec3(0, 1, 0)), centroHash3(i + vec3(1, 1, 0)), u.x);
  float c = mix(centroHash3(i + vec3(0, 0, 1)), centroHash3(i + vec3(1, 0, 1)), u.x);
  float d = mix(centroHash3(i + vec3(0, 1, 1)), centroHash3(i + vec3(1, 1, 1)), u.x);
  return mix(mix(a, b, u.y), mix(c, d, u.y), u.z);
}
float centroStroke(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
// Las rayas de la cuenta: grupos de cuatro palos y uno cruzado, hechos a mano (ninguno igual); uno de cada
// ${TALLY_THOUSAND} grupos es un trazo largo (mil vueltas). Devuelve cuánto hay de raya en este punto (0–1).
float centroTally(vec4 t) {
  if (t.w < 0.5 || t.x < 0.0 || t.y < 0.0) return 0.0;
  float perRow = floor(t.w);
  float fill = fract(t.w);
  float row = floor(t.y / ${f(TALLY_ROW)});
  float g = floor(t.x / ${f(TALLY_GROUP)});
  if (g >= perRow || row >= ${f(TALLY_ROWS)}) return 0.0;
  if (fill > 0.0) {
    float rows = fill * ${f(TALLY_ROWS)};
    if (row > floor(rows) || (row == floor(rows) && g >= floor(fract(rows) * perRow))) return 0.0;
  }
  vec2 q = vec2(t.x - g * ${f(TALLY_GROUP)}, t.y - row * ${f(TALLY_ROW)});
  float seed = centroHash(vec2(g + t.z * 0.37, row));
  float d = 1e3;
  if (mod(t.z + row * perRow + g, ${f(TALLY_THOUSAND)}) < 0.5) {
    d = centroStroke(q, vec2(-0.03, 0.12 + seed * 0.08), vec2(${f(TALLY_GROUP)} + 0.03, 0.17 + seed * 0.05)) * 0.55;
  } else {
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      float j = centroHash(vec2(seed * 13.0 + fk, row + fk * 7.0));
      float tilt = (centroHash(vec2(fk + 3.0, seed)) - 0.5) * 0.07;
      float x = 0.06 + fk * 0.075 + (j - 0.5) * 0.025;
      d = min(d, centroStroke(q, vec2(x - tilt, 0.04 + j * 0.035), vec2(x + tilt, 0.28 + (1.0 - j) * 0.035)));
    }
    d = min(d, centroStroke(q, vec2(0.015, 0.22 + seed * 0.05), vec2(0.35, 0.07 + seed * 0.04)));
  }
  float aa = max(fwidth(d), 1e-4);
  float mark = 1.0 - smoothstep(0.008 - aa, 0.008 + aa, d);
  // De lejos las rayas se funden en un tono: así no tiemblan.
  float far = smoothstep(0.006, 0.02, length(fwidth(t.xy)));
  return mix(mark, 0.12, far);
}
`;

const FRAGMENT_COLOR = /* glsl */ `
vec3 centroLight = vColor.rgb + vGlow * uGlow;
float centroGrain = 0.9 + 0.14 * centroNoise(vStone * 2.7) + 0.06 * centroNoise(vStone * 13.0);
centroLight *= centroGrain;
float centroMark = centroTally(vTally);
// La raya deja ver la piedra clara de debajo y su fondo recoge algo de polvo.
centroLight = mix(centroLight, centroLight * 2.1 + vec3(0.012, 0.01, 0.008), centroMark);
diffuseColor.rgb = centroLight;
`;

/** Dónde guarda el material su `uGlow` (en `material.userData`), para que el juego lo baje. */
export const CENTRO_GLOW_KEY = 'centroGlow';

export interface CentroMaterial {
  material: MeshBasicMaterial;
  /** Cuánto alumbra la fuente de poder (1 en su sitio, 0 fuera). */
  glow: IUniform<number>;
}

/** El material de la casa: luz cocida, grano de piedra y rayas. Se comparte entre la casa y los anillos. */
export function createCentroMaterial(): CentroMaterial {
  const glowUniform: IUniform<number> = { value: 1 };
  const material = new MeshBasicMaterial({ vertexColors: true });
  material.name = 'taller_Centro';
  material.userData[CENTRO_GLOW_KEY] = glowUniform;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGlow = glowUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT_COLOR}`);
  };
  material.customProgramCacheKey = () => 'taller-centro';
  return { material, glow: glowUniform };
}
