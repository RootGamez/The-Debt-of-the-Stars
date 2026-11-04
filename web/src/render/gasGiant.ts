// La capa de nubes de un gigante de gas (Fase 11F, el Taller; reutilizable en cualquier otro): una esfera opaca
// pintada con bandas por latitud que corren a distinto paso, deformadas por remolinos, con la cara de noche y un
// borde de bruma. No tiene colisión: debajo no hay nada que pisar (ver physics/gas.ts). Se ve por los dos lados,
// así que al hundirse en ella todo se vuelve nube.
import { Color, DoubleSide, Mesh, ShaderMaterial, SphereGeometry, type Vector3 } from 'three';

export interface GasGiantSpec {
  name: string;
  radius: number;
  /** Dónde está la estrella, en el marco de la malla (unitario; se puede ir moviendo, ver worlds/procedural/sun.ts). */
  sun: Vector3;
  /** Los colores de las bandas, del ecuador hacia los polos (se repiten). */
  bands: readonly Color[];
  /** El color de la cara de noche y el de la bruma del borde. */
  night: Color;
  rim: Color;
  /** Cuántas bandas de polo a polo y cuánto deprisa corren (rad/s en el ecuador). */
  bandCount: number;
  speed: number;
  seed?: number;
}

const MAX_BANDS = 6;

const VERTEX = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vLocal = position;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FRAGMENT = /* glsl */ `
#define BANDS ${String(MAX_BANDS)}
uniform float uTime;
uniform vec3 uSun;
uniform vec3 uBands[BANDS];
uniform int uBandColors;
uniform vec3 uNight;
uniform vec3 uRim;
uniform float uBandCount;
uniform float uSpeed;
uniform float uSeed;
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vWorld;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + uSeed);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amplitude * noise(p);
    p = p * 2.07 + 1.3;
    amplitude *= 0.5;
  }
  return sum;
}
vec3 bandColor(float x) {
  float k = mod(x, float(uBandColors));
  int a = int(floor(k));
  int b = int(mod(float(a + 1), float(uBandColors)));
  vec3 ca = uBands[0];
  vec3 cb = uBands[0];
  for (int i = 0; i < BANDS; i++) {
    if (i == a) ca = uBands[i];
    if (i == b) cb = uBands[i];
  }
  return mix(ca, cb, smoothstep(0.25, 0.75, fract(k)));
}

void main() {
  vec3 d = normalize(vLocal);
  float lat = asin(clamp(d.z, -1.0, 1.0));
  // Cada latitud corre a su paso (las bandas vecinas se cruzan): se gira la dirección alrededor del eje Z.
  float shear = uTime * uSpeed * (1.0 + 0.6 * sin(lat * 7.0));
  float c = cos(shear);
  float s = sin(shear);
  vec3 q = vec3(c * d.x - s * d.y, s * d.x + c * d.y, d.z);
  // Las bandas se estiran a lo largo de la longitud: el ruido es más fino de norte a sur que de este a oeste.
  vec3 stretched = vec3(q.xy * 2.2, q.z * 12.0);
  vec3 warp = vec3(fbm(stretched + 1.1), fbm(stretched - 2.3), fbm(q * 4.0 + 4.7)) - 0.5;
  float x = (lat / 3.14159 + 0.5) * uBandCount + warp.x * 0.9 + warp.y * 0.35;
  vec3 color = bandColor(x);
  // Vetas finas dentro de cada banda y remolinos claros sueltos.
  float streak = noise(vec3(q.xy * 6.0 + warp.z * 2.0, q.z * 60.0));
  color *= 0.9 + 0.2 * streak;
  float swirl = smoothstep(0.66, 0.82, fbm(q * 7.0 + warp * 4.0));
  color = mix(color, uBands[0] * 1.05, swirl * 0.45);
  float light = dot(d, normalize(uSun));
  float day = smoothstep(-0.18, 0.35, light);
  color = mix(uNight, color * (0.55 + 0.45 * max(light, 0.0)), day);
  vec3 view = normalize(cameraPosition - vWorld);
  float rim = pow(1.0 - abs(dot(normalize(vNormalW), view)), 3.0);
  color = mix(color, uRim, rim * (0.25 + 0.55 * day));
  // Desde dentro de las nubes, todo es nube.
  if (!gl_FrontFacing) color = mix(uRim, uNight, 0.35);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

export function gasGiantMaterial(spec: GasGiantSpec): ShaderMaterial {
  if (spec.bands.length === 0 || spec.bands.length > MAX_BANDS) {
    throw new Error(`Un gigante de gas necesita de 1 a ${String(MAX_BANDS)} colores de banda`);
  }
  const bands = Array.from(
    { length: MAX_BANDS },
    (_, i) => spec.bands[i] ?? spec.bands[0] ?? new Color(),
  );
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSun: { value: spec.sun },
      uBands: { value: bands.map((b) => b.clone()) },
      uBandColors: { value: spec.bands.length },
      uNight: { value: spec.night.clone() },
      uRim: { value: spec.rim.clone() },
      uBandCount: { value: spec.bandCount },
      uSpeed: { value: spec.speed },
      uSeed: { value: spec.seed ?? 0.5 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: DoubleSide,
  });
}

/** La esfera de nubes del gigante, que se anima sola mientras se dibuja. */
export function gasGiantMesh(spec: GasGiantSpec): Mesh {
  const material = gasGiantMaterial(spec);
  const mesh = new Mesh(new SphereGeometry(spec.radius, 96, 64), material);
  mesh.name = spec.name;
  mesh.onBeforeRender = () => {
    const time = material.uniforms.uTime;
    if (time) time.value = performance.now() / 1000;
  };
  return mesh;
}
