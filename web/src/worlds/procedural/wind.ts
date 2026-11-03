// El viento de un mundo con aire (Fase 11): motas de polvo que flotan cerca del suelo y que el viento arrastra
// a ras de suelo. Todo el movimiento va en el shader (un tramo corto de giro alrededor de un eje y un vaivén por
// mota), así que no cuesta nada en la CPU. Las motas lejanas se apagan: solo se ven las que tienes alrededor.
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';
import { seededRandom } from './noise';
import type { XYZ } from './kit';

export interface WindDustSpec {
  name: string;
  /** Radio del suelo en una dirección unitaria. */
  groundRadius(d: XYZ): number;
  count: number;
  /** Alturas mínima y máxima sobre el suelo (m). */
  height: readonly [number, number];
  /** Eje alrededor del que sopla el viento (marco del mundo) y su velocidad angular (rad/s). */
  axis: Vector3;
  speed: number;
  color: Color;
  /** Tamaño en píxeles a un metro. */
  size: number;
  /** Distancia (m) a la que las motas ya no se ven. */
  reach: number;
  seed: number;
}

/** Ángulo (rad) que recorre cada mota antes de volver a nacer: unos 5 m en un mundo de 90 m. */
const DRIFT_RANGE = 0.06;

const VERTEX = /* glsl */ `
#define DRIFT_RANGE ${DRIFT_RANGE.toFixed(3)}
uniform float uTime;
uniform vec3 uAxis;
uniform float uSpeed;
uniform float uSize;
uniform float uReach;
attribute float aPhase;
varying float vFade;

vec3 turn(vec3 p, vec3 k, float a) {
  float c = cos(a);
  float s = sin(a);
  return p * c + cross(k, p) * s + k * dot(k, p) * (1.0 - c);
}

void main() {
  // Cada mota recorre un tramo corto con el viento y vuelve a nacer donde empezó (se apaga y se enciende en
  // los extremos): así no se aleja del suelo sobre el que se colocó. Va a su ritmo (aPhase) y sube y baja.
  float cycle = fract(uTime * uSpeed * (0.7 + 0.6 * fract(aPhase * 7.13)) / DRIFT_RANGE + aPhase);
  vec3 p = turn(position, uAxis, (cycle - 0.5) * DRIFT_RANGE);
  vec3 up = normalize(p);
  p += up * sin(uTime * 0.6 + aPhase * 6.2831) * 0.35;
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  float distance = -view.z;
  vFade = (1.0 - smoothstep(uReach * 0.5, uReach, distance)) * smoothstep(0.3, 1.5, distance);
  vFade *= (0.55 + 0.45 * sin(uTime * 1.3 + aPhase * 40.0)) * sin(cycle * 3.14159);
  gl_PointSize = uSize / max(distance, 0.5);
  gl_Position = projectionMatrix * view;
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vFade;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float round = 1.0 - smoothstep(0.2, 0.5, length(c));
  if (round * vFade < 0.01) discard;
  gl_FragColor = vec4(uColor, round * vFade * 0.6);
  #include <colorspace_fragment>
}`;

/** Las motas de polvo: un objeto `Points` que se anima solo mientras se dibuja. */
export function windDust(spec: WindDustSpec): Points {
  const random = seededRandom(spec.seed);
  const positions: number[] = [];
  const phases: number[] = [];
  const d = new Vector3();
  while (phases.length < spec.count) {
    d.set(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1);
    const lengthSq = d.lengthSq();
    if (lengthSq > 1 || lengthSq < 1e-4) continue;
    d.normalize();
    const [low, high] = spec.height;
    const r = spec.groundRadius(d) + low + random() * random() * (high - low);
    positions.push(d.x * r, d.y * r, d.z * r);
    phases.push(random());
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
  const uniforms = {
    uTime: { value: 0 },
    uAxis: { value: spec.axis.clone().normalize() },
    uSpeed: { value: spec.speed },
    uSize: { value: spec.size },
    uReach: { value: spec.reach },
    uColor: { value: spec.color.clone() },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const dust = new Points(geometry, material);
  dust.name = spec.name;
  // El giro mueve las motas fuera de su caja original: no se recortan por ella.
  dust.frustumCulled = false;
  dust.onBeforeRender = () => {
    uniforms.uTime.value = performance.now() / 1000;
  };
  return dust;
}
