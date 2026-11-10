// La estrella como un cuerpo modelado, igual que los planetas: una icosfera facetada con un color por cara
// (granulación y manchas), el borde oscurecido, una corona de dos cáscaras de luz y protuberancias que laten.
// Es el cuerpo que se ve; la luz que da es la PointLight del escenario (ver `stage.ts`).
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import type { StarSpec } from '../system/systemData';
import { prominenceSites, starSurfaceAt, starSurfaceNoise } from './starSurface';

const SURFACE_DETAIL = 22;
const SPOT_DARKNESS = 0.22;
const GRANULE_CONTRAST = 0.3;
const CORONA_SCALES: readonly [number, number] = [1.12, 1.45];
const PROMINENCE_COUNT: Record<StarSpec['kind'], number> = { solar: 4, enana_roja: 7, lejana: 2 };
const TWO_PI = Math.PI * 2;

export interface StarView {
  readonly object: Group;
  /** Una vez por fotograma con el reloj de Umbral: gira la estrella y hace latir su borde. */
  update(t: number): void;
  dispose(): void;
}

const SURFACE_VERTEX = /* glsl */ `
attribute vec3 color;
attribute float pulse;
varying vec3 vColor;
varying float vPulse;
varying vec3 vNormalView;
varying vec3 vViewDir;
void main() {
  vColor = color;
  vPulse = pulse;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalView = normalize(normalMatrix * normalize(position));
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const SURFACE_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec3 vColor;
varying float vPulse;
varying vec3 vNormalView;
varying vec3 vViewDir;
void main() {
  float facing = clamp(dot(normalize(vNormalView), normalize(vViewDir)), 0.0, 1.0);
  float limb = mix(0.45, 1.0, pow(facing, 0.55));
  float beat = 1.0 + 0.07 * sin(uTime * 0.7 + vPulse * 6.2831);
  gl_FragColor = vec4(vColor * limb * beat, 1.0);
}`;

const GLOW_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uPower;
uniform float uStrength;
varying vec3 vNormalView;
varying vec3 vViewDir;
void main() {
  float rim = 1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir)));
  gl_FragColor = vec4(uColor * pow(rim, uPower) * uStrength, 1.0);
}`;

/** Una cara por color: el geometry queda sin índice para que cada triángulo tenga el suyo. */
function surfaceGeometry(spec: StarSpec, seed: number): BufferGeometry {
  const geometry = new IcosahedronGeometry(spec.radius, SURFACE_DETAIL);
  const noise = starSurfaceNoise(seed);
  const base = new Color(spec.surfaceColor);
  const position = geometry.getAttribute('position');
  const faces = position.count / 3;
  const colors = new Float32Array(position.count * 3);
  const pulses = new Float32Array(position.count);
  const center = new Vector3();
  const corner = new Vector3();
  for (let f = 0; f < faces; f++) {
    center.set(0, 0, 0);
    for (let k = 0; k < 3; k++) center.add(corner.fromBufferAttribute(position, f * 3 + k));
    center.normalize();
    const { granule, spot } = starSurfaceAt(center, spec.spots, noise);
    const light = 1 - GRANULE_CONTRAST / 2 + GRANULE_CONTRAST * granule;
    const shade = light * (1 - spot * (1 - SPOT_DARKNESS));
    // Las celdas claras se acercan al blanco; las manchas se quedan en un rojo oscuro, no negro.
    const hot = Math.max(0, granule - 0.6) * (1 - spot);
    for (let k = 0; k < 3; k++) {
      const i = (f * 3 + k) * 3;
      colors[i] = base.r * shade + hot * 0.25;
      colors[i + 1] = base.g * shade + hot * 0.2;
      colors[i + 2] = base.b * shade + hot * 0.12;
      pulses[f * 3 + k] = ((f * 2654435761) >>> 0) / 4294967296;
    }
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setAttribute('pulse', new BufferAttribute(pulses, 1));
  return geometry;
}

function glowShell(radius: number, color: Color, power: number, strength: number): Mesh {
  return new Mesh(
    new SphereGeometry(radius, 40, 24),
    new ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uPower: { value: power },
        uStrength: { value: strength },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormalView = normalize(normalMatrix * normalize(position));
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: GLOW_FRAGMENT,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: BackSide,
    }),
  );
}

function prominenceArc(
  radius: number,
  site: Vector3,
  tangent: Vector3,
  height: number,
): BufferGeometry {
  const span = 0.35;
  const a = site
    .clone()
    .applyAxisAngle(tangent, -span)
    .multiplyScalar(radius * 0.98);
  const b = site.clone().multiplyScalar(radius * (1 + height));
  const c = site
    .clone()
    .applyAxisAngle(tangent, span)
    .multiplyScalar(radius * 0.98);
  return new TubeGeometry(new CatmullRomCurve3([a, b, c]), 24, radius * 0.025, 6, false);
}

/** Construye la estrella de `spec`. `seed` cambia el reparto de manchas y protuberancias. */
export function createStarView(spec: StarSpec, seed = 11): StarView {
  const object = new Group();
  object.name = spec.kind === 'enana_roja' ? 'La Brasa' : 'Estrella';

  const uTime = { value: 0 };
  const surface = new Mesh(
    surfaceGeometry(spec, seed),
    new ShaderMaterial({
      uniforms: { uTime },
      vertexShader: SURFACE_VERTEX,
      fragmentShader: SURFACE_FRAGMENT,
      toneMapped: false,
    }),
  );
  surface.name = 'Superficie';
  const body = new Group();
  body.add(surface);

  const light = new Color(spec.lightColor);
  const glow = new Color(spec.surfaceColor).lerp(light, 0.5);
  const shells = [
    glowShell(spec.radius * CORONA_SCALES[0], glow, 2.2, 1.7),
    glowShell(spec.radius * CORONA_SCALES[1], glow, 3.4, 0.8),
  ];
  for (const shell of shells) object.add(shell);

  // Protuberancias: arcos de luz que se levantan del borde y laten (en las enanas rojas, más y más grandes).
  const arcMaterial = new MeshBasicMaterial({
    color: glow,
    transparent: true,
    opacity: 0.85,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
  const arcs = prominenceSites(PROMINENCE_COUNT[spec.kind], seed + 3).map((site, i) => {
    const tangent = new Vector3(0, 1, 0).cross(site).normalize();
    const height = (spec.kind === 'enana_roja' ? 0.32 : 0.2) * (0.7 + (0.3 * ((i * 7) % 5)) / 4);
    const arc = new Mesh(prominenceArc(spec.radius, site, tangent, height), arcMaterial);
    arc.name = `Protuberancia ${String(i + 1)}`;
    body.add(arc);
    return { arc, phase: i * 1.7 };
  });
  object.add(body);

  return {
    object,
    update(t) {
      uTime.value = t;
      if (spec.spin > 0) body.rotation.y = (t / spec.spin) * TWO_PI;
      for (const { arc, phase } of arcs) {
        const swell = 0.75 + 0.25 * Math.sin(t * 0.5 + phase);
        arc.scale.setScalar(swell);
      }
    },
    dispose() {
      object.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        (o.geometry as BufferGeometry).dispose();
        const m = o.material as Material | Material[];
        for (const material of Array.isArray(m) ? m : [m]) material.dispose();
      });
    },
  };
}
