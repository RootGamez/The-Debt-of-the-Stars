// El suelo de la cara interior del Laboratorio (hito E7, 🟡 el aspecto): una marquetería de dos piedras, marfil y
// verde salvia, en un tablero de ajedrez que se enrosca en espiral de un polo a otro de la cavidad. Las casillas son
// cuadradas en todas partes (el tablero se traza en la proyección de Mercator, girado: sus líneas son loxodrómicas) y
// se encogen hacia los polos hasta un medallón de latón, el ojo del remolino. Juntas finas de latón, cinco bandas de
// estratos en los paralelos con su filo frío, y encima lo que guía la vista: un círculo de luz cálida alrededor de
// cada zona (con las horas de un reloj), los senderos como alfombras de piedra clara con cantos de latón por los que
// corre, despacio, una luz hacia la zona siguiente, y la luz de los faroles en el suelo. Todo en el sombreador; la
// misma cuenta del tablero está en `boardCell`. El aire de la cavidad (una bruma cálida y fina que crece con la
// distancia) se aplica aquí y, con `applyCavityHaze`, a lo demás de dentro.
import {
  Color,
  Vector3,
  Vector4,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';

/**
 * El giro del tablero (dos enteros pares): en una vuelta completa de longitud se cruzan `BOARD_TURN[0]` columnas y
 * las filas bajan `BOARD_TURN[1]`. Así la vuelta cierra sin costura y las casillas, en el ecuador, miden unos 2,3 m.
 */
export const BOARD_TURN: readonly [number, number] = [52, 24];
/** Radio (m) del medallón de cada polo, donde las casillas ya serían más pequeñas que una mano. */
export const POLE_MEDALLION = 4.4;
/** Medio ancho (m) de las alfombras de piedra de los senderos (el pasillo llano mide 1,4 m a cada lado). */
export const RUNNER_HALF_WIDTH = 0.8;
/** Paso (m) entre los pulsos de luz que corren por los senderos y su velocidad (m/s). */
const PULSE_SPACING = 7;
const PULSE_SPEED = 0.85;

/** Colores del suelo y de su luz (🟡). */
export const FLOOR_COLORS = {
  tileLight: '#D2BE90',
  tileDark: '#4B6A5E',
  grout: '#A88552',
  strata: '#3E4F48',
  strataEdge: '#8FC4B4',
  runner: '#DCD0B2',
  inlay: '#D8CCAE',
  brass: '#B8914F',
  glow: '#FFB25E',
  cold: '#9FD0C0',
} as const;

/** El aire de la cavidad: color, cuánto se espesa por metro y lo más que tapa. */
export interface CavityHaze {
  color: Color;
  density: number;
  max: number;
}

/** Dónde están las zonas, los senderos y los faroles (en el marco del mundo, direcciones desde el centro). */
export interface FloorLayout {
  sites: readonly { direction: Vector3; clear: number }[];
  paths: readonly { from: Vector3; to: Vector3 }[];
  lamps: readonly Vector3[];
}

/** El tablero en la proyección de Mercator de la dirección `d` (unitaria): (lon, y) / 2π. */
function mercator(x: number, y: number, z: number): [number, number] {
  const length = Math.hypot(x, y, z) || 1;
  const s = Math.min(0.99995, Math.max(-0.99995, z / length));
  return [Math.atan2(y, x) / (2 * Math.PI), Math.atanh(s) / (2 * Math.PI)];
}

/** La casilla (columna, fila) de un punto de la cara interior, en el marco del mundo (Z arriba). */
export function boardCell(
  x: number,
  y: number,
  z: number,
): { column: number; row: number; dark: boolean } {
  const [u, v] = mercator(x, y, z);
  const [m, n] = BOARD_TURN;
  const column = Math.floor(m * u + n * v);
  const row = Math.floor(-n * u + m * v);
  return { column, row, dark: (((column + row) % 2) + 2) % 2 === 0 };
}

/** Lado (m) de una casilla a la latitud `lat` (rad) sobre una esfera de radio `radius`. */
export function boardCellSize(lat: number, radius: number): number {
  const [m, n] = BOARD_TURN;
  return (2 * Math.PI * radius * Math.cos(lat)) / Math.hypot(m, n);
}

/** Un sendero para el sombreador: su normal (el eje del arco), la tangente al salir y el ángulo que recorre. */
export function pathArc(
  from: Vector3,
  to: Vector3,
): { normal: Vector3; tangent: Vector3; angle: number } {
  const a = from.clone().normalize();
  const b = to.clone().normalize();
  const normal = a.clone().cross(b).normalize();
  return { normal, tangent: normal.clone().cross(a).normalize(), angle: a.angleTo(b) };
}

const glsl = (v: number): string => (Number.isInteger(v) ? `${String(v)}.0` : String(v));
const vec3 = (c: string): string => {
  const k = new Color(c);
  return `vec3(${glsl(+k.r.toFixed(4))}, ${glsl(+k.g.toFixed(4))}, ${glsl(+k.b.toFixed(4))})`;
};

const HAZE_VERTEX_COMMON = `
varying float vHazeDistance;`;
const HAZE_VERTEX = `
vHazeDistance = length(mvPosition.xyz);`;
const HAZE_FRAGMENT_COMMON = `
uniform vec3 uHazeColor;
uniform float uHazeDensity;
uniform float uHazeMax;
varying float vHazeDistance;`;
const HAZE_FRAGMENT = `
gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeColor, (1.0 - exp(-uHazeDensity * vHazeDistance)) * uHazeMax);`;

type Shader = Parameters<NonNullable<Material['onBeforeCompile']>>[0];

function hazeUniforms(haze: CavityHaze): Record<string, { value: unknown }> {
  return {
    uHazeColor: { value: haze.color.clone() },
    uHazeDensity: { value: haze.density },
    uHazeMax: { value: haze.max },
  };
}

function addHaze(shader: Shader): void {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>${HAZE_VERTEX_COMMON}`)
    .replace('#include <project_vertex>', `#include <project_vertex>${HAZE_VERTEX}`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>${HAZE_FRAGMENT_COMMON}`)
    .replace(
      '#include <tonemapping_fragment>',
      `${HAZE_FRAGMENT}\n#include <tonemapping_fragment>`,
    );
}

/** El aire de la cavidad sobre un material de dentro: lo lejano se funde en una bruma cálida. */
export function applyCavityHaze(material: Material, haze: CavityHaze): void {
  const uniforms = hazeUniforms(haze);
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    addHaze(shader);
  };
  material.customProgramCacheKey = () => 'lab-haze';
  material.needsUpdate = true;
}

/** El trozo del sombreador que pinta el suelo (tras `color_fragment`). */
function floorFragment(): string {
  const [m, n] = BOARD_TURN;
  const C = FLOOR_COLORS;
  return `
  {
    vec3 d = normalize(vBoardPos);
    float r = length(vBoardPos);
    float s = clamp(d.z, -0.99995, 0.99995);
    float lat = asin(s);
    float lon = atan(d.y, d.x);
    vec2 uv = vec2(lon, 0.5 * log((1.0 + s) / (1.0 - s))) / (2.0 * PI);
    vec2 cell = vec2(${glsl(m)} * uv.x + ${glsl(n)} * uv.y, ${glsl(-n)} * uv.x + ${glsl(m)} * uv.y);
    // La misma casilla una vuelta más allá: sus derivadas no saltan en lon = ±π (sin costura).
    vec2 cellB = cell + (lon < 0.0 ? vec2(${glsl(m)}, ${glsl(-n)}) : vec2(0.0));
    vec2 w = min(fwidth(cell), fwidth(cellB)) + 1e-5;
    // Tablero filtrado: lo que es más pequeño que un píxel se funde en el tono medio (sin muaré).
    vec2 i2 = 2.0 * (abs(fract((cell - 0.5 * w) * 0.5) - 0.5) - abs(fract((cell + 0.5 * w) * 0.5) - 0.5)) / w;
    float check = 0.5 - 0.5 * i2.x * i2.y;
    vec3 base = mix(${vec3(C.tileDark)}, ${vec3(C.tileLight)}, check);
    // Juntas de latón, finas; se apagan donde las casillas ya no se distinguen.
    vec2 fc = fract(cell);
    vec2 e = min(fc, 1.0 - fc);
    vec2 g = 1.0 - smoothstep(vec2(0.011), vec2(0.011) + w, e);
    float grout = max(g.x, g.y) * (1.0 - smoothstep(0.05, 0.22, max(w.x, w.y)));
    base = mix(base, ${vec3(C.grout)}, grout * 0.85);
    float pxm = max(length(dFdx(vBoardPos)), length(dFdy(vBoardPos))) + 1e-4; // un píxel, en metros
    // Los estratos: una banda oscura en cada paralelo de 30°, con los filos fríos.
    float latDeg = degrees(lat);
    float kLat = floor(latDeg / 30.0 + 0.5) * 30.0;
    float band = abs(latDeg - kLat) * PI / 180.0 * r;
    float isBand = step(abs(kLat), 61.0);
    float bandIn = (1.0 - smoothstep(0.32, 0.32 + pxm, band)) * isBand;
    float bandEdge = (1.0 - smoothstep(0.025, 0.025 + pxm, abs(band - 0.36))) * isBand;
    base = mix(base, ${vec3(C.strata)}, bandIn);
    float cold = bandEdge;
    // Los meridianos de los Ausentes, cada 45°: un hilo frío.
    float pxLon = min(fwidth(lon), fwidth(lon < 0.0 ? lon + 2.0 * PI : lon)) + 1e-5;
    float lonStep = PI / 4.0;
    float mer = abs(mod(lon, lonStep) - lonStep * 0.5) / pxLon;
    float merLine = (1.0 - smoothstep(0.6, 1.6, mer)) * (1.0 - smoothstep(55.0, 70.0, abs(latDeg)));
    // El medallón de cada polo: el ojo del remolino.
    float polar = (0.5 * PI - abs(lat)) * r;
    float medal = 1.0 - smoothstep(${glsl(POLE_MEDALLION)} - pxm, ${glsl(POLE_MEDALLION)} + pxm, polar);
    if (medal > 0.0) {
      float spin = lon * sign(lat) + polar * 0.9;
      float petals = step(0.5, fract(spin / (2.0 * PI) * 12.0));
      vec3 m0 = mix(${vec3(C.tileDark)}, ${vec3(C.tileLight)}, petals);
      float dial = step(${glsl(POLE_MEDALLION - 1.0)}, polar);
      float tick = step(0.82, fract(lon / (2.0 * PI) * 48.0)) * step(${glsl(POLE_MEDALLION - 0.85)}, polar)
        * step(polar, ${glsl(POLE_MEDALLION - 0.3)});
      m0 = mix(m0, ${vec3(C.strata)}, dial);
      m0 = mix(m0, ${vec3(C.brass)}, tick);
      float ringA = 1.0 - smoothstep(0.04, 0.04 + pxm, abs(polar - ${glsl(POLE_MEDALLION - 0.12)}));
      float ringB = 1.0 - smoothstep(0.03, 0.03 + pxm, abs(polar - ${glsl(POLE_MEDALLION - 1.05)}));
      float hub = 1.0 - smoothstep(0.55, 0.55 + pxm, polar);
      m0 = mix(m0, ${vec3(C.brass)}, max(max(ringA, ringB), hub));
      base = mix(base, m0, medal);
      cold += ringB * medal;
    }
    // Los senderos: alfombras de piedra clara con cantos de latón; por el centro corre la luz hacia la zona siguiente.
    float runner = 0.0;
    float runnerEdge = 0.0;
    float joint = 0.0;
    float pulse = 0.0;
    float nearPath = 1e3;
    for (int k = 0; k < LAB_PATHS; k++) {
      vec4 nA = uPathNormal[k];
      vec3 t0 = uPathTangent[k];
      vec3 a0 = uPathFrom[k];
      float off = abs(dot(d, nA.xyz)) * r;
      float along = atan(dot(d, t0), dot(d, a0));
      if (along < 0.0 || along > nA.w) continue;
      nearPath = min(nearPath, off - ${glsl(RUNNER_HALF_WIDTH)});
      if (off > ${glsl(RUNNER_HALF_WIDTH + 0.1)}) continue;
      float am = along * r;
      runner = max(runner, 1.0 - smoothstep(${glsl(RUNNER_HALF_WIDTH)} - pxm, ${glsl(RUNNER_HALF_WIDTH)}, off));
      runnerEdge = max(runnerEdge, 1.0 - smoothstep(0.035, 0.035 + pxm, abs(off - ${glsl(RUNNER_HALF_WIDTH - 0.09)})));
      float fj = fract(am / 1.8);
      joint = max(joint, 1.0 - smoothstep(0.012, 0.012 + pxm / 1.8, min(fj, 1.0 - fj)));
      float phase = fract(am / ${glsl(PULSE_SPACING)} - uBoardTime * ${glsl(PULSE_SPEED / PULSE_SPACING)});
      float dash = smoothstep(0.0, 0.05, phase) * (1.0 - smoothstep(0.05, 0.32, phase));
      pulse = max(pulse, dash * (1.0 - smoothstep(0.1, 0.1 + pxm, off)));
    }
    vec3 runnerColor = mix(${vec3(C.runner)}, ${vec3(C.grout)}, joint * 0.55);
    runnerColor = mix(runnerColor, ${vec3(C.brass)}, runnerEdge);
    base = mix(base, runnerColor, runner);
    // Las zonas: una losa clara, un aro de latón y, fuera, el círculo de luz con las horas de un reloj.
    float ring = 0.0;
    float nearSite = 1e3;
    for (int k = 0; k < LAB_SITES; k++) {
      vec4 site = uSites[k];
      float rho = length(d - site.xyz) * r;
      float edge = rho - site.w;
      nearSite = min(nearSite, edge);
      if (edge > 1.2) continue;
      vec3 e1 = normalize(cross(site.xyz, vec3(0.0, 0.0, 1.0)));
      vec3 e2 = cross(site.xyz, e1);
      float ang = atan(dot(d, e2), dot(d, e1));
      float hours = fract(ang / (2.0 * PI) * 24.0);
      float inlay = 1.0 - smoothstep(0.3, 0.3 + pxm, edge);
      float line = 1.0 - smoothstep(0.03, 0.03 + pxm, abs(edge - 0.34));
      float glowBand = smoothstep(0.42, 0.42 + pxm, edge) * (1.0 - smoothstep(0.78, 0.78 + pxm, edge));
      float tick = step(0.86, hours) * glowBand;
      float outer = 1.0 - smoothstep(0.025, 0.025 + pxm, abs(edge - 0.86));
      base = mix(base, ${vec3(C.inlay)}, inlay);
      base = mix(base, ${vec3(C.brass)}, max(line, outer));
      base = mix(base, ${vec3(C.strata)}, glowBand * 0.8);
      base = mix(base, ${vec3(C.brass)}, tick);
      float breathe = 0.82 + 0.18 * sin(uBoardTime * 0.7 + float(k) * 1.7);
      ring = max(ring, (glowBand * 0.55 + tick * 0.9 + line * 0.35) * breathe);
    }
    // La luz de los faroles en el suelo.
    float pool = 0.0;
    for (int k = 0; k < LAB_LAMPS; k++) {
      float dl = length(d - uLamps[k]) * r;
      pool = max(pool, 1.0 - smoothstep(0.0, 3.2, dl));
    }
    pool *= pool;
    // Las líneas frías solo lejos de las zonas y de los senderos.
    float clear = smoothstep(0.4, 1.4, nearSite) * smoothstep(0.2, 0.8, nearPath);
    cold *= clear;
    merLine *= clear * (1.0 - medal);
    diffuseColor.rgb *= base * (1.0 + 0.18 * pool);
    boardGlow = ${vec3(C.glow)} * (ring * 0.9 + pulse * 0.75 + runner * 0.05 + pool * 0.1)
      + ${vec3(C.cold)} * (cold * 0.35 + merLine * 0.22);
  }`;
}

/**
 * Pinta el suelo de la cara interior sobre `material` (sus colores de vértice dan solo una veta suave) con las zonas,
 * los senderos y los faroles de `layout`, le pone el aire de la cavidad y hace que `mesh` avance su luz.
 */
export function applyLabFloor(
  mesh: Mesh,
  material: MeshStandardMaterial,
  layout: FloorLayout,
  haze: CavityHaze,
): void {
  const arcs = layout.paths.map((p) => ({ ...pathArc(p.from, p.to), from: p.from.clone() }));
  const uniforms = {
    uBoardTime: { value: 0 },
    uSites: {
      value: layout.sites.map(
        (s) => new Vector4(...s.direction.clone().normalize().toArray(), s.clear),
      ),
    },
    uPathNormal: { value: arcs.map((a) => new Vector4(...a.normal.toArray(), a.angle)) },
    uPathTangent: { value: arcs.map((a) => a.tangent) },
    uPathFrom: { value: arcs.map((a) => a.from.normalize()) },
    uLamps: { value: layout.lamps.map((l) => l.clone().normalize()) },
    ...hazeUniforms(haze),
  };
  const defines = `
  #define LAB_SITES ${String(layout.sites.length)}
  #define LAB_PATHS ${String(arcs.length)}
  #define LAB_LAMPS ${String(layout.lamps.length)}`;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBoardPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBoardPos = transformed;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>${defines}
        uniform float uBoardTime;
        uniform vec4 uSites[LAB_SITES];
        uniform vec4 uPathNormal[LAB_PATHS];
        uniform vec3 uPathTangent[LAB_PATHS];
        uniform vec3 uPathFrom[LAB_PATHS];
        uniform vec3 uLamps[LAB_LAMPS];
        varying vec3 vBoardPos;
        vec3 boardGlow;`,
      )
      .replace('#include <color_fragment>', `#include <color_fragment>\n${floorFragment()}`)
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += boardGlow;',
      );
    addHaze(shader);
  };
  material.customProgramCacheKey = () => 'lab-floor';
  material.needsUpdate = true;
  const start = performance.now();
  mesh.onBeforeRender = () => {
    uniforms.uBoardTime.value = (performance.now() - start) / 1000;
  };
}
