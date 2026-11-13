// La estrella como un cuerpo modelado: una icosfera facetada (granulación y manchas por cara, muy suaves), una
// corona pegada al borde, un resplandor alrededor (el «bloom» que hace que un sol parezca un sol) y protuberancias
// que laten. Como en Outer Wilds, el disco se ve quemado: casi liso y brillante, sin corteza. Es solo lo que se ve;
// la luz que da es la PointLight del escenario (ver `stage.ts`), y nada de esto ilumina el sistema.
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
  PlaneGeometry,
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
/** Las manchas apenas oscurecen: una estrella no tiene corteza, a ojo se queda en un brillo casi liso. */
const SPOT_DARKNESS = 0.8;
const GRANULE_CONTRAST = 0.3;
const CORONA_SCALE = 1.1;
const PROMINENCE_COUNT: Record<StarSpec['kind'], number> = { solar: 4, enana_roja: 7, lejana: 2 };
const TWO_PI = Math.PI * 2;

/** Cómo se ve cada tipo de estrella: el disco quemado, su borde y el resplandor de alrededor. */
interface StarLook {
  /** Color del centro del disco (casi blanco: la estrella satura la vista). */
  core: number;
  /** Color hacia el borde del disco, donde se ve su tinte. */
  edge: number;
  /** Cuánto emite el disco antes de la exposición (1 − e^(−x)): más alto, más quemado. */
  exposure: number;
  /** Cuánto se nota la granulación (0 = disco liso). */
  detail: number;
  /** Color del resplandor. */
  glare: number;
  /** Tamaño del resplandor en radios de la estrella. */
  glareSize: number;
  /** Brillo del resplandor junto al disco. */
  glareStrength: number;
}

// Las enanas rojas a ojo no son rojas: se ven blanco anaranjado (rondan los 3000 K). Su tinte sale en el borde y
// en el resplandor; el centro se quema hacia un ámbar pálido.
const LOOKS: Record<StarSpec['kind'], StarLook> = {
  solar: {
    core: 0xfffdf4,
    edge: 0xffe6a8,
    exposure: 5,
    detail: 0.3,
    glare: 0xfff0d0,
    glareSize: 8,
    glareStrength: 1.3,
  },
  enana_roja: {
    core: 0xffdcae,
    edge: 0xff6a24,
    exposure: 4.5,
    detail: 0.4,
    glare: 0xff7a34,
    glareSize: 8,
    glareStrength: 1.6,
  },
  lejana: {
    core: 0xfff8ea,
    edge: 0xffd296,
    exposure: 4.5,
    detail: 0.3,
    glare: 0xffe2b8,
    glareSize: 7,
    glareStrength: 1.2,
  },
};

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

// La superficie emite: no la toca ninguna luz y no ilumina nada. Del centro (casi blanco) al borde (el tinte de
// la estrella) sin oscurecerse del todo; la granulación de cada cara solo hace titilar el brillo. La exposición
// (1 − e^(−x)) quema el disco sin recortar los canales de golpe.
const SURFACE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uCore;
uniform vec3 uEdge;
uniform float uExposure;
uniform float uDetail;
uniform float uBaseLum;
varying vec3 vColor;
varying float vPulse;
varying vec3 vNormalView;
varying vec3 vViewDir;
void main() {
  float facing = clamp(dot(normalize(vNormalView), normalize(vViewDir)), 0.0, 1.0);
  float lum = dot(vColor, vec3(0.2126, 0.7152, 0.0722)) / uBaseLum;
  float beat = 1.0 + 0.08 * sin(uTime * 0.9 + vPulse * 6.2831);
  float detail = mix(1.0, lum * beat, uDetail);
  vec3 tint = mix(uEdge, uCore, pow(facing, 0.6));
  vec3 emitted = tint * mix(0.45, 1.0, pow(facing, 0.5)) * detail * uExposure;
  gl_FragColor = vec4(1.0 - exp(-emitted), 1.0);
}`;

// El resplandor: un cuadrado que siempre mira a la cámara, con una caída suave alrededor del disco. Hace las veces
// del «bloom» (el juego no tiene posproceso). Se dibuja con prueba de profundidad: lo tapa lo que está delante.
const GLARE_VERTEX = /* glsl */ `
varying vec2 vOffset;
void main() {
  vOffset = position.xy;
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float scale = length(modelMatrix[0].xyz);
  gl_Position = projectionMatrix * (center + vec4(position.xy * scale, 0.0, 0.0));
}`;

const GLARE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform float uRadius;
uniform float uSize;
varying vec2 vOffset;
void main() {
  float r = length(vOffset) / uRadius;
  if (r > uSize) discard;
  float x = max(r - 1.0, 0.0);
  float halo = 0.55 / (1.0 + 6.0 * x * x) + 0.45 * exp(-1.1 * x);
  float fade = 1.0 - smoothstep(uSize * 0.55, uSize, r);
  gl_FragColor = vec4(uColor * halo * fade * uStrength, 1.0);
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

  const look = LOOKS[spec.kind];
  const base = new Color(spec.surfaceColor);
  const uTime = { value: 0 };
  const surface = new Mesh(
    surfaceGeometry(spec, seed),
    new ShaderMaterial({
      uniforms: {
        uTime,
        uCore: { value: new Color(look.core) },
        uEdge: { value: new Color(look.edge) },
        uExposure: { value: look.exposure },
        uDetail: { value: look.detail },
        uBaseLum: { value: Math.max(1e-3, 0.2126 * base.r + 0.7152 * base.g + 0.0722 * base.b) },
      },
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
  object.add(glowShell(spec.radius * CORONA_SCALE, new Color(look.glare), 2.4, 1.8));

  const glareSize = spec.radius * look.glareSize;
  const glare = new Mesh(
    new PlaneGeometry(glareSize * 2, glareSize * 2),
    new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(look.glare) },
        uStrength: { value: look.glareStrength },
        uRadius: { value: spec.radius },
        uSize: { value: look.glareSize },
      },
      vertexShader: GLARE_VERTEX,
      fragmentShader: GLARE_FRAGMENT,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  glare.name = 'Resplandor';
  object.add(glare);

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
