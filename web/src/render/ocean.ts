// El océano de un mundo con mar (Fase 11E; reutilizable en cualquier mundo con agua): la superficie se mueve con
// el mismo oleaje que la física (physics/waves.ts) y el shader le da el color. Refleja el cielo según el ángulo
// (Fresnel), deja ver el fondo cuando se mira hacia abajo, brilla con la estrella y hace espuma en las crestas.
// De lejos se funde con el horizonte del cielo; de noche se apaga sin volverse negro. Desde abajo se ve la ventana
// clara de la superficie.
import {
  Color,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Vector3,
  type BufferGeometry,
  type MeshStandardMaterial,
} from 'three';
import { createWaves, maxWaveHeight, waveClock, type Wave } from '../physics/waves';

export interface OceanColors {
  /** El agua honda y la clara (las crestas con la luz detrás, lo que se ve al mirar hacia abajo). */
  deep: Color;
  shallow: Color;
  foam: Color;
  /** El cielo que refleja: el cénit y el horizonte (los del aire del mundo, para que se fundan). */
  sky: Color;
  horizon: Color;
  /** La superficie vista desde abajo. */
  under: Color;
}

export interface OceanSpec {
  name: string;
  /** Radio del nivel medio (m) y el oleaje (el mismo que lleva el `WaterBody` del mundo). */
  level: number;
  waves: readonly Wave[];
  /** Dónde está la estrella, en el marco de la malla (unitario). */
  sun: Vector3;
  colors: OceanColors;
  /** Distancias (m) a las que el mar empieza a fundirse con el horizonte y ya es solo horizonte. */
  haze: readonly [number, number];
  /** Opacidad al mirar hacia abajo (al rasar es casi opaco). */
  opacity: number;
  /** Semilla de los rizos finos, que solo cambian la luz. */
  seed?: number;
}

/** Los rizos: ondas cortas que no mueven la malla, solo la luz. Cuánto inclinan la superficie (pendiente). */
const RIPPLE_SLOPE = 0.07;
/** Longitudes de los rizos (m): cortas, pero no tanto que parpadeen de lejos. */
const RIPPLE_LENGTHS = [2.6, 1.7, 1.15, 0.8] as const;
/** Distancias (m) a las que los rizos se apagan: de lejos solo quedan las olas. */
const RIPPLE_FADE = [6, 28] as const;

const VERTEX = (count: number): string => /* glsl */ `
#define WAVES ${String(count)}
uniform float uTime;
uniform float uLevel;
uniform vec3 uWaveK[WAVES];
uniform float uWaveA[WAVES];
uniform float uWaveW[WAVES];
varying vec3 vPos;
varying vec3 vGrad;
varying float vHeight;
void main() {
  vec3 up = normalize(position);
  vec3 p = up * uLevel;
  float h = 0.0;
  vec3 grad = vec3(0.0);
  for (int i = 0; i < WAVES; i++) {
    float phase = dot(uWaveK[i], p) - uWaveW[i] * uTime;
    h += uWaveA[i] * sin(phase);
    grad += uWaveA[i] * cos(phase) * uWaveK[i];
  }
  vHeight = h;
  vGrad = grad;
  vPos = up * (uLevel + h);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(vPos, 1.0);
}`;

const FRAGMENT = (ripples: number): string => /* glsl */ `
#define RIPPLES ${String(ripples)}
uniform float uTime;
uniform float uLevel;
uniform float uMaxHeight;
uniform vec3 uEye;
uniform vec3 uSun;
uniform vec3 uRippleK[RIPPLES];
uniform float uRippleW[RIPPLES];
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFoam;
uniform vec3 uSky;
uniform vec3 uHorizon;
uniform vec3 uUnder;
uniform vec2 uHaze;
uniform float uOpacity;
varying vec3 vPos;
varying vec3 vGrad;
varying float vHeight;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
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

void main() {
  vec3 up = normalize(vPos);
  vec3 p = up * uLevel;
  // Los rizos finos se suman a la pendiente de las olas: solo cambian la luz.
  vec3 grad = vGrad;
  vec3 toEye = uEye - vPos;
  float distance = length(toEye);
  float rippleFade = 1.0 - smoothstep(${RIPPLE_FADE[0].toFixed(1)}, ${RIPPLE_FADE[1].toFixed(1)}, distance);
  for (int i = 0; i < RIPPLES; i++) {
    vec3 k = uRippleK[i];
    grad += ${RIPPLE_SLOPE.toFixed(3)} * rippleFade * cos(dot(k, p) - uRippleW[i] * uTime) * k / length(k);
  }
  grad -= up * dot(grad, up);
  vec3 n = normalize(up - grad);
  vec3 v = toEye / max(distance, 1e-4);
  float day = smoothstep(-0.25, 0.3, dot(up, uSun));
  float light = mix(0.32, 1.0, day);

  if (!gl_FrontFacing) {
    // Desde abajo: la ventana de la superficie, clara justo encima y verde azulada al rasar.
    vec3 down = -n;
    float window = smoothstep(0.55, 0.9, dot(v, -down));
    vec3 color = mix(uUnder, mix(uHorizon, uSky, 0.5) * 1.15, window) * light;
    // Las olas vistas desde abajo: donde la superficie se inclina, la luz se rompe en vetas claras.
    float tilt = clamp((1.0 - dot(n, up)) * 220.0, 0.0, 1.0);
    color *= 0.82 + 0.5 * tilt;
    float sunSpot = pow(max(dot(-v, uSun), 0.0), 40.0) * day;
    gl_FragColor = vec4(color + vec3(sunSpot), 0.88);
    #include <colorspace_fragment>
    return;
  }

  float facing = max(dot(n, v), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
  vec3 r = reflect(-v, n);
  vec3 reflected = mix(uHorizon, uSky, smoothstep(0.0, 0.6, dot(r, up)));
  // El cuerpo del agua: clara en las crestas con la luz detrás y al mirar hacia abajo; honda en los valles.
  float crest = clamp(vHeight / max(uMaxHeight, 1e-3) * 0.5 + 0.5, 0.0, 1.0);
  float backlight = pow(max(dot(v, -uSun), 0.0), 3.0) * crest;
  vec3 body = mix(uDeep, uShallow, clamp(facing * 0.45 + crest * 0.25 + backlight * 0.6, 0.0, 1.0));
  vec3 color = mix(body, reflected, clamp(fresnel * 0.9, 0.0, 1.0)) * light;
  // El brillo de la estrella en el agua, en puntitos donde los rizos lo reflejan.
  color += vec3(1.0, 0.95, 0.85) * pow(max(dot(r, uSun), 0.0), 260.0) * 1.8 * day;
  color += vec3(1.0, 0.92, 0.8) * pow(max(dot(r, uSun), 0.0), 18.0) * 0.08 * day;
  // Espuma en lo alto de las crestas, deshecha en manchas.
  float foamNoise = noise(p * 1.6 + vec3(uTime * 0.2)) * 0.6 + noise(p * 4.3 - vec3(uTime * 0.35)) * 0.4;
  float foam = smoothstep(0.62, 0.95, crest) * smoothstep(0.45, 0.75, foamNoise);
  color = mix(color, uFoam * light, foam * 0.85);
  // De lejos, el horizonte del cielo: así el mar no deja una raya donde termina.
  // y al rasar (el borde del planeta), el mismo color que el cielo tiene justo encima.
  float haze = max(smoothstep(uHaze.x, uHaze.y, distance), (1.0 - smoothstep(0.0, 0.16, dot(v, up))) * 0.85);
  color = mix(color, uHorizon * light, haze);
  float alpha = mix(uOpacity, 1.0, max(fresnel, max(foam, haze)));
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}`;

/** El material del océano: se anima solo al dibujarse (ver `oceanMesh`). */
export function oceanMaterial(spec: OceanSpec): ShaderMaterial {
  // Direcciones de rizo sacadas del mismo generador; el largo, de RIPPLE_LENGTHS.
  const ripples = createWaves(1, (spec.seed ?? 1) + 17)
    .slice(0, RIPPLE_LENGTHS.length)
    .map((w, i) => {
      const k = (2 * Math.PI) / (RIPPLE_LENGTHS[i] ?? 1);
      return { k: w.k.clone().setLength(k), omega: Math.sqrt(9.8 * k) };
    });
  const { colors } = spec;
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLevel: { value: spec.level },
      uMaxHeight: { value: maxWaveHeight(spec.waves) },
      uEye: { value: new Vector3() },
      uSun: { value: spec.sun.clone().normalize() },
      uWaveK: { value: spec.waves.map((w) => w.k.clone()) },
      uWaveA: { value: spec.waves.map((w) => w.amplitude) },
      uWaveW: { value: spec.waves.map((w) => w.omega) },
      uRippleK: { value: ripples.map((w) => w.k) },
      uRippleW: { value: ripples.map((w) => w.omega) },
      uDeep: { value: colors.deep.clone() },
      uShallow: { value: colors.shallow.clone() },
      uFoam: { value: colors.foam.clone() },
      uSky: { value: colors.sky.clone() },
      uHorizon: { value: colors.horizon.clone() },
      uUnder: { value: colors.under.clone() },
      uHaze: { value: [spec.haze[0], spec.haze[1]] },
      uOpacity: { value: spec.opacity },
    },
    vertexShader: VERTEX(spec.waves.length),
    fragmentShader: FRAGMENT(ripples.length),
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}

const eye = new Vector3();

/** La malla del océano: `geometry` es la esfera del nivel medio (o trozos de ella), en el marco de la malla. */
export function oceanMesh(geometry: BufferGeometry, spec: OceanSpec): Mesh {
  if (spec.waves.length === 0) throw new Error(`${spec.name}: el océano necesita al menos una ola`);
  const material = oceanMaterial(spec);
  const mesh = new Mesh(geometry, material);
  mesh.name = spec.name;
  // La malla se mueve en el shader: la caja de la esfera quieta no basta para recortarla.
  mesh.frustumCulled = false;
  const uniforms = material.uniforms as { uTime: { value: number }; uEye: { value: Vector3 } };
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    uniforms.uTime.value = waveClock();
    underwaterTime.value = uniforms.uTime.value;
    uniforms.uEye.value.copy(mesh.worldToLocal(camera.getWorldPosition(eye)));
  };
  return mesh;
}

export interface UnderwaterSpec {
  /** Radio del nivel del mar (m) en el marco de la malla, con el centro del mundo en el origen. */
  level: number;
  /** Dónde está la estrella, en el marco de la malla (unitario). */
  sun: Vector3;
  /** El color del agua que tiñe lo hundido. */
  tint: Color;
  /** Un tubo seco alrededor de `axis` (como la Galería del Archivo): dentro no hay agua. */
  dry?: { axis: Vector3; major: number; minor: number };
}

/** El reloj de los reflejos del fondo: lo adelanta el océano al dibujarse. */
const underwaterTime = { value: 0 };

/**
 * Lo que queda bajo el mar se tiñe del color del agua según lo hondo que está y lleva los reflejos de la luz
 * que entra por las olas (cáusticas), más débiles cuanto más abajo. Se suma a lo que ya haga el material (por
 * ejemplo `applySkyLight`), que tiene que estar puesto antes.
 */
export function applyUnderwater(material: MeshStandardMaterial, spec: UnderwaterSpec): void {
  const previous = material.onBeforeCompile.bind(material);
  const previousKey = material.customProgramCacheKey.bind(material);
  const uniforms = {
    uUwLevel: { value: spec.level },
    uUwSun: { value: spec.sun.clone().normalize() },
    uUwTint: { value: spec.tint.clone() },
    uUwRingAxis: { value: (spec.dry?.axis ?? new Vector3(0, 0, 1)).clone().normalize() },
    uUwRing: { value: [spec.dry?.major ?? 0, spec.dry?.minor ?? 0] },
    uUwTime: underwaterTime,
  };
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vUwPos;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 uwPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          uwPosition = instanceMatrix * uwPosition;
        #endif
        #ifdef SKY_MOVED
          uwPosition = vec4(skyPlanet, 1.0);
        #endif
        vUwPos = uwPosition.xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uUwLevel;
        uniform vec3 uUwSun;
        uniform vec3 uUwTint;
        uniform vec3 uUwRingAxis;
        uniform vec2 uUwRing;
        uniform float uUwTime;
        varying vec3 vUwPos;
        float uwCell(vec2 p) {
          // Una red de líneas brillantes que se deforma: dos ondas cruzadas con el mínimo de su distancia.
          vec2 q = p + vec2(sin(p.y * 1.3 + uUwTime * 0.9), cos(p.x * 1.1 - uUwTime * 0.7)) * 0.6;
          float a = abs(sin(q.x * 1.7 + uUwTime * 0.5) + sin(q.y * 1.9 - uUwTime * 0.4));
          return pow(clamp(1.0 - a * 0.6, 0.0, 1.0), 6.0);
        }`,
      )
      .replace(
        '#include <tonemapping_fragment>',
        `{
          float uwRadius = length(vUwPos);
          float uwAlong = dot(vUwPos, uUwRingAxis);
          float uwAround = length(vUwPos - uUwRingAxis * uwAlong) - uUwRing.x;
          bool uwDry = uUwRing.y > 0.0 && length(vec2(uwAround, uwAlong)) < uUwRing.y;
          float uwDepth = uUwLevel - uwRadius;
          if (uwDepth > 0.0 && !uwDry) {
            vec3 uwUp = vUwPos / max(uwRadius, 1e-4);
            float uwDay = smoothstep(-0.2, 0.3, dot(uwUp, uUwSun));
            // Las cáusticas, en el plano del suelo: dos direcciones para que no se vean en tiras.
            vec3 uwSide = normalize(cross(uwUp, abs(uwUp.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
            vec2 uwFlat = vec2(dot(vUwPos, uwSide), dot(vUwPos, cross(uwUp, uwSide)));
            float uwLight = max(uwCell(uwFlat * 0.9), uwCell(uwFlat * 1.4 + 3.7));
            float uwFade = exp(-uwDepth / 10.0) * smoothstep(0.0, 0.6, uwDepth);
            gl_FragColor.rgb += vec3(0.75, 0.95, 1.0) * uwLight * uwFade * uwDay * 0.9;
            gl_FragColor.rgb = mix(gl_FragColor.rgb, uUwTint * mix(0.35, 1.0, uwDay), 1.0 - exp(-uwDepth * 0.07));
          }
        }
        #include <tonemapping_fragment>`,
      );
  };
  material.customProgramCacheKey = () => `${previousKey()}|underwater`;
  material.needsUpdate = true;
}
