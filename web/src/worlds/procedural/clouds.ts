// Las nubes de un mundo con aire (Fase 11): una capa esférica alrededor del planeta donde el ruido decide qué es
// nube y qué es cielo. El viento gira la capa despacio alrededor de un eje y el ruido cambia poco a poco, todo en
// el shader. La cara de día las ve blancas y la de noche, gris azulado; se ven desde abajo y desde el espacio.
import { Color, DoubleSide, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';

export interface CloudLayerSpec {
  name: string;
  /** Radio de la capa (distancia al centro del mundo, m). */
  radius: number;
  /** Dónde está la estrella, en el marco del mundo (unitario). */
  sun: Vector3;
  /** Eje del viento (marco del mundo) y su velocidad angular (rad/s). */
  axis: Vector3;
  speed: number;
  /** Cuánto cielo cubren (0–1) y qué tan grandes son (más, nubes más pequeñas). */
  cover: number;
  scale: number;
  day: Color;
  night: Color;
  opacity: number;
  seed: number;
}

/** Orden de dibujo de la capa: tras el cielo (−0,5) y antes que el mar, o después de todo lo transparente. */
const CLOUDS_UNDER = -0.25;
const CLOUDS_OVER = 1;

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uAxis;
uniform float uSpeed;
uniform vec3 uSun;
uniform float uCover;
uniform float uScale;
uniform float uSeed;
uniform vec3 uDay;
uniform vec3 uNight;
uniform float uOpacity;
varying vec3 vDir;

vec3 turn(vec3 p, vec3 k, float a) {
  float c = cos(a);
  float s = sin(a);
  return p * c + cross(k, p) * s + k * dot(k, p) * (1.0 - c);
}

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
  for (int i = 0; i < 5; i++) {
    sum += amplitude * noise(p);
    p = p * 2.03 + 1.7;
    amplitude *= 0.5;
  }
  return sum;
}

void main() {
  vec3 d = normalize(vDir);
  vec3 p = turn(d, uAxis, -uTime * uSpeed) * uScale;
  // Un segundo ruido, más lento, deforma el primero: las nubes cambian de forma mientras pasan.
  vec3 warp = vec3(fbm(p + uTime * 0.01), fbm(p + 5.2), fbm(p - 3.1)) - 0.5;
  float n = fbm(p + warp * 1.2);
  float edge = 1.0 - uCover;
  float cloud = smoothstep(edge - 0.06, edge + 0.12, n);
  if (cloud < 0.01) discard;
  float day = smoothstep(-0.2, 0.3, dot(d, uSun));
  // Más espesas, más oscuras por debajo.
  float thick = smoothstep(edge, edge + 0.3, n);
  vec3 color = mix(uNight, uDay * (1.0 - 0.22 * thick), day);
  gl_FragColor = vec4(color, cloud * uOpacity);
  #include <colorspace_fragment>
}`;

/** La capa de nubes: una esfera que se anima sola mientras se dibuja. */
export function cloudLayer(spec: CloudLayerSpec): Mesh {
  const uniforms = {
    uTime: { value: 0 },
    uAxis: { value: spec.axis.clone().normalize() },
    uSpeed: { value: spec.speed },
    uSun: { value: spec.sun.clone().normalize() },
    uCover: { value: spec.cover },
    uScale: { value: spec.scale },
    uSeed: { value: spec.seed },
    uDay: { value: spec.day.clone() },
    uNight: { value: spec.night.clone() },
    uOpacity: { value: spec.opacity },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  const clouds = new Mesh(new SphereGeometry(spec.radius, 64, 32), material);
  clouds.name = spec.name;
  // El mar y el vidrio también son transparentes y comparten centro con la capa: el orden de dibujo va según
  // de qué lado de las nubes está quien mira (desde fuera, encima de todo; desde dentro, debajo del agua y el
  // vidrio). Se decide en un cuadro y se aplica en el siguiente.
  const eye = new Vector3();
  clouds.onBeforeRender = (_renderer, _scene, camera) => {
    uniforms.uTime.value = performance.now() / 1000;
    const outside = clouds.worldToLocal(camera.getWorldPosition(eye)).length() > spec.radius;
    clouds.renderOrder = outside ? CLOUDS_OVER : CLOUDS_UNDER;
  };
  return clouds;
}
