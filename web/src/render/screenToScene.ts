// De lo que se ve en pantalla a la luz de la escena. Las esferas de gusano doblan el entorno ya pintado y lo pintan
// pasado por los tonos ACES de three y por sRGB, igual que la pantalla: así los materiales usan el mismo programa en
// los dos pases (con un lienzo lineal cambiaban de programa dos veces por fotograma y la primera vez compilaban otro:
// eran los tirones al asomar una Puerta). Para mezclar ese entorno con su propia luz como antes, la esfera lo devuelve
// a la luz lineal con esto. Solo vale para ACES (`render/stage.ts`); sin tonos, deshace solo el sRGB.
import { Matrix3 } from 'three';

type Rgb = readonly [number, number, number];

/** Las matrices de `ACESFilmicToneMapping` de three (r186), por columnas como en su `mat3`. */
export const ACES_INPUT: readonly number[] = [
  0.59719, 0.076, 0.0284, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777,
];
export const ACES_OUTPUT: readonly number[] = [
  1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602,
];
/** Three multiplica por la exposición y divide por esto antes de la curva. */
const ACES_SCALE = 0.6;

const inverseOf = (columns: readonly number[]): number[] => [
  ...new Matrix3().fromArray([...columns]).invert().elements,
];
const INPUT_INVERSE = inverseOf(ACES_INPUT);
const OUTPUT_INVERSE = inverseOf(ACES_OUTPUT);

function times(columns: readonly number[], v: Rgb): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++)
    out[i] = (columns[i] ?? 0) * v[0] + (columns[3 + i] ?? 0) * v[1] + (columns[6 + i] ?? 0) * v[2];
  return out;
}

const fit = (v: number): number =>
  (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);

/** Inversa de la curva de ACES (monótona para v ≥ 0): la raíz positiva de su cuadrática. */
function unfit(y: number): number {
  const c = Math.min(1, Math.max(0, y));
  const a = 0.983729 * c - 1;
  const b = 0.432951 * c - 0.0245786;
  const k = 0.238081 * c + 0.000090537;
  return (-b - Math.sqrt(Math.max(b * b - 4 * a * k, 0))) / (2 * a);
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const encode = (x: number): number => (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055);
const decode = (x: number): number => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);

/** `ACESFilmicToneMapping` de three (lineal, antes de sRGB). */
export function acesFilmic(color: Rgb, exposure: number): [number, number, number] {
  const scaled: Rgb = [
    (color[0] * exposure) / ACES_SCALE,
    (color[1] * exposure) / ACES_SCALE,
    (color[2] * exposure) / ACES_SCALE,
  ];
  const [r, g, b] = times(ACES_INPUT, scaled);
  const [x, y, z] = times(ACES_OUTPUT, [fit(r), fit(g), fit(b)]);
  return [clamp01(x), clamp01(y), clamp01(z)];
}

/** Lo que pinta la pantalla (ACES y sRGB) a partir de la luz de la escena. */
export function sceneToScreen(color: Rgb, exposure: number): [number, number, number] {
  const [r, g, b] = acesFilmic(color, exposure);
  return [encode(r), encode(g), encode(b)];
}

/** La vuelta atrás: la luz de la escena que da lo que se ve (lo recortado vuelve a verse igual). */
export function screenToScene(shown: Rgb, exposure: number): [number, number, number] {
  const [r, g, b] = times(OUTPUT_INVERSE, [decode(shown[0]), decode(shown[1]), decode(shown[2])]);
  const v = times(INPUT_INVERSE, [unfit(r), unfit(g), unfit(b)]);
  const scale = ACES_SCALE / exposure;
  return [Math.max(0, v[0] * scale), Math.max(0, v[1] * scale), Math.max(0, v[2] * scale)];
}

const glslMatrix = (columns: readonly number[]): string =>
  `mat3(${columns.map((n) => n.toPrecision(9)).join(', ')})`;

/** La misma vuelta atrás en GLSL, para un `ShaderMaterial` (usa `sRGBTransferEOTF` y la exposición de three). */
export const SCREEN_TO_SCENE_GLSL = /* glsl */ `
vec3 screenToScene(vec3 shown) {
  vec3 c = sRGBTransferEOTF(vec4(shown, 1.0)).rgb;
  #ifdef TONE_MAPPING
    vec3 y = clamp(${glslMatrix(OUTPUT_INVERSE)} * c, 0.0, 1.0);
    vec3 a = 0.983729 * y - 1.0;
    vec3 b = 0.432951 * y - 0.0245786;
    vec3 k = 0.238081 * y + 0.000090537;
    vec3 v = (-b - sqrt(max(b * b - 4.0 * a * k, 0.0))) / (2.0 * a);
    c = max(${glslMatrix(INPUT_INVERSE)} * v * (${ACES_SCALE.toFixed(1)} / toneMappingExposure), 0.0);
  #endif
  return c;
}`;
