// El cielo estrellado: la banda de la galaxia (luz difusa, nubes de estrellas, franjas de polvo y nebulosas) y
// miles de estrellas de colores. Todo está en el infinito: el sombreador usa solo la dirección, así que ningún
// viaje lo acerca. Al caminar sobre un planeta pequeño el cielo "gira", lo que ayuda a sentir la curvatura.
// Coste: dos draw calls. Dónde está cada estrella lo decide `starCatalog.ts` (puro, con tests).
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Data3DTexture,
  Group,
  LinearFilter,
  Mesh,
  Points,
  RedFormat,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Object3D,
} from 'three';
import type { StarKind } from '../system/systemData';
import { SKY_PRESETS, galacticFrame, generateStars, type SkyPreset } from './starCatalog';

/** Lado de la textura de ruido 3D (se repite: la banda la recorre varias veces sin que se note). */
const NOISE_SIZE = 32;
/** Lo que el cielo dibuja por encima del fondo: la banda (antes) y las estrellas (después). Ambos van antes que
 * el cielo de los mundos con aire (−0,5), que los tapa de día. */
const BAND_ORDER = -1.2;
const STARS_ORDER = -1;

/** Proyección al infinito: solo la dirección, en el fondo del todo pero dentro del volumen visible. */
const AT_INFINITY = /* glsl */ `
  vec4 skyClip(vec3 worldDirection) {
    vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * worldDirection, 0.0);
    clip.z = clip.w * 0.99999;
    return clip;
  }
`;

/**
 * La forma de la galaxia, compartida por la banda (por píxel) y las estrellas (por vértice, para que el polvo
 * las tape también): coordenadas galácticas, anchura de la banda, bulbo y franjas de polvo.
 */
const GALAXY = /* glsl */ `
  precision highp sampler3D;
  uniform sampler3D uNoise;
  uniform vec3 uPole;
  uniform vec3 uCore;
  uniform vec3 uSide;
  uniform float uBandWidth;
  uniform float uBulge;
  uniform float uDust;

  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      sum += amp * textureLod(uNoise, p / ${NOISE_SIZE.toFixed(1)}, 0.0).r;
      p = p * 2.03 + vec3(5.1, 1.7, 9.3);
      amp *= 0.5;
    }
    return sum / 0.9375;
  }

  struct Galactic { float b; float l; float toCore; float width; float disk; float bulge; };

  Galactic galactic(vec3 d) {
    Galactic g;
    g.b = asin(clamp(dot(d, uPole), -1.0, 1.0));
    g.l = atan(dot(d, uSide), dot(d, uCore));
    g.toCore = cos(g.l * 0.5);
    // La banda engorda hacia el núcleo.
    g.width = uBandWidth * (0.7 + 0.6 * g.toCore * g.toCore) * 1.15;
    g.disk = exp(-0.5 * (g.b / g.width) * (g.b / g.width));
    float bl = g.l / uBulge;
    float bb = g.b / (uBulge * 0.6);
    g.bulge = exp(-0.5 * (bl * bl + bb * bb));
    return g;
  }

  // Franjas de polvo: una grieta oscura e irregular a lo largo del centro de la banda, con hebras sueltas.
  float dustAt(vec3 d, Galactic g) {
    float wiggle = g.b - 0.3 * g.width * (fbm(d * 1.6 + 21.0) - 0.5);
    float lane = exp(-0.5 * (wiggle / (g.width * 0.3)) * (wiggle / (g.width * 0.3)));
    float strands = smoothstep(0.4, 0.7, fbm(d * 6.5 + 11.3));
    float wisps = smoothstep(0.55, 0.85, fbm(d * 13.0 + 3.0)) * g.disk;
    return clamp(uDust * (lane * (0.3 + 0.75 * strands) + 0.45 * wisps), 0.0, 0.95);
  }
`;

const BAND_VERTEX = /* glsl */ `
  varying vec3 vDir;
  ${AT_INFINITY}
  void main() {
    vDir = normalize(position);
    gl_Position = skyClip(normalize(mat3(modelMatrix) * vDir));
  }
`;

const BAND_FRAGMENT = /* glsl */ `
  ${GALAXY}
  uniform float uGlow;
  uniform float uLight;
  uniform vec3 uCoreColor;
  uniform vec3 uArmColor;
  uniform vec3 uNebula;
  uniform vec3 uReflection;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);
    Galactic g = galactic(d);
    // Un brillo muy tenue cerca del plano (la luz de lo que no se resuelve) y nada más fuera de la banda.
    float spread = g.b / (g.width * 4.0);
    float base = 0.015 * exp(-0.5 * spread * spread);
    if (g.disk < 0.004 && g.bulge < 0.004) {
      gl_FragColor = vec4(uArmColor * base * uGlow * uLight * 0.3, 1.0);
      return;
    }

    float clouds = fbm(d * 3.2);
    float star = smoothstep(0.3, 0.85, clouds);
    float density = g.disk * (0.2 + 1.1 * star) * (0.5 + 0.5 * g.toCore) + g.bulge * (1.3 + 0.7 * clouds);
    float dust = dustAt(d, g);
    density *= 1.0 - dust;

    float warm = clamp(g.bulge * 1.4 + 0.2 * star * g.disk, 0.0, 1.0);
    vec3 col = mix(uArmColor, uCoreColor, warm) * density;
    // Nebulosas de emisión (rosadas, nudos pegados al plano) y de reflexión (azuladas, velos más anchos).
    float knots = smoothstep(0.56, 0.8, fbm(d * 9.0 + 37.0)) * (0.4 + 0.6 * smoothstep(0.4, 0.8, clouds));
    col += uNebula * knots * g.disk * (1.0 - 0.6 * dust) * 1.8;
    float veils = smoothstep(0.62, 0.9, fbm(d * 4.5 - 19.0));
    float halo = g.b / (g.width * 2.5);
    col += uReflection * veils * (g.disk * 0.4 + 0.15 * exp(-0.5 * halo * halo)) * 0.35;
    col += uArmColor * base;
    gl_FragColor = vec4(col * uGlow * uLight * 0.3, 1.0);
  }
`;

const STARS_VERTEX = /* glsl */ `
  ${GALAXY}
  attribute vec3 color;
  attribute float flux;
  uniform float uPixelRatio;
  uniform vec3 uLensCenter[2];
  uniform float uLensRadius[2];
  varying vec3 vColor;
  varying float vBright;
  varying float vHalo;
  ${AT_INFINITY}
  void main() {
    vec3 local = normalize(position);
    vec3 star = normalize(mat3(modelMatrix) * local);
    // Las lentes (el Nudo y el agujero negro) doblan la luz de las estrellas de detrás (ver lensView.ts).
    for (int i = 0; i < 2; i++) {
      float einstein = uLensRadius[i];
      if (einstein <= 0.0) continue;
      vec3 lens = normalize(uLensCenter[i] - cameraPosition);
      float theta = acos(clamp(dot(star, lens), -1.0, 1.0));
      vec3 axis = cross(lens, star);
      // Hasta dónde alcanza: se apaga suave para que no quede costura en el cielo.
      float span = clamp(6.0 * einstein, 0.8, 3.0);
      if (theta > 1e-5 && theta < span && dot(axis, axis) > 1e-12) {
        float bent = (theta + sqrt(theta * theta + 4.0 * einstein * einstein)) * 0.5;
        axis = normalize(axis);
        float a = (bent - theta) * (1.0 - smoothstep(0.5 * span, span, theta));
        star = star * cos(a) + cross(axis, star) * sin(a) + axis * dot(axis, star) * (1.0 - cos(a));
      }
    }
    gl_Position = skyClip(star);
    float s = sqrt(flux);
    vColor = color;
    // El polvo tapa las estrellas lejanas de la banda; las brillantes están delante y no.
    Galactic g = galactic(local);
    float hidden = g.disk > 0.05 ? dustAt(local, g) * (1.0 - smoothstep(0.01, 0.15, flux)) : 0.0;
    vBright = (0.08 + pow(flux, 0.3)) * (1.0 - hidden);
    vHalo = smoothstep(0.25, 1.0, s);
    gl_PointSize = (2.2 + 9.0 * s * s + 3.0 * s) * uPixelRatio;
  }
`;

const STARS_FRAGMENT = /* glsl */ `
  uniform float uLight;
  varying vec3 vColor;
  varying float vBright;
  varying float vHalo;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(p, p);
    if (r2 > 1.0 || vBright < 0.01) discard;
    // Un núcleo nítido casi blanco y, en las brillantes, un halo con el color de la estrella.
    float core = exp(-r2 * mix(2.5, 22.0, vHalo));
    float halo = exp(-r2 * 6.0) * vHalo * 0.45;
    vec3 tint = mix(vColor, vec3(1.0), core * 0.35 * vHalo);
    gl_FragColor = vec4(tint * (core + halo) * vBright * uLight, 1.0);
  }
`;

/** Los uniformes de la forma de la galaxia: los mismos objetos en la banda y en las estrellas. */
type Uniforms = Record<string, { value: unknown }>;

function galaxyUniforms(preset: SkyPreset, noise: Data3DTexture): Uniforms {
  const { pole, core } = galacticFrame(preset);
  return {
    uNoise: { value: noise },
    uPole: { value: pole },
    uCore: { value: core },
    uSide: { value: new Vector3().crossVectors(pole, core) },
    uBandWidth: { value: (preset.bandWidth * Math.PI) / 180 },
    uBulge: { value: (preset.bulgeSize * Math.PI) / 180 },
    uDust: { value: preset.dust },
  };
}

interface SkyUniforms {
  band: ShaderMaterial;
  stars: ShaderMaterial;
  noise: Data3DTexture;
}

const skies = new WeakMap<Object3D, SkyUniforms>();

/** Ruido de valor en una textura 3D: el filtro trilineal de la GPU lo suaviza gratis. */
function noiseTexture(seed: number): Data3DTexture {
  const data = new Uint8Array(NOISE_SIZE ** 3);
  let state = seed * 2654435761;
  for (let i = 0; i < data.length; i++) {
    state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x9e3779b9) | 0;
    data[i] = (state >>> 24) & 255;
  }
  const texture = new Data3DTexture(data, NOISE_SIZE, NOISE_SIZE, NOISE_SIZE);
  texture.format = RedFormat;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = RepeatWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

function colorOf(hex: number): Color {
  return new Color().setHex(hex, 'srgb-linear');
}

function createBand(preset: SkyPreset, galaxy: Uniforms): Mesh {
  const material = new ShaderMaterial({
    uniforms: {
      ...galaxy,
      uGlow: { value: preset.bandGlow },
      uLight: { value: 1 },
      uCoreColor: { value: colorOf(preset.coreColor) },
      uArmColor: { value: colorOf(preset.armColor) },
      uNebula: { value: colorOf(preset.nebulaColor) },
      uReflection: { value: colorOf(preset.reflectionColor) },
    },
    vertexShader: BAND_VERTEX,
    fragmentShader: BAND_FRAGMENT,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const band = new Mesh(new SphereGeometry(1, 64, 32), material);
  band.name = 'Galaxia';
  band.frustumCulled = false;
  band.renderOrder = BAND_ORDER;
  return band;
}

function createStars(preset: SkyPreset, galaxy: Uniforms): Points {
  const catalog = generateStars(preset);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(catalog.directions, 3));
  geometry.setAttribute('color', new BufferAttribute(catalog.colors, 3));
  geometry.setAttribute('flux', new BufferAttribute(catalog.flux, 1));
  const material = new ShaderMaterial({
    uniforms: {
      ...galaxy,
      uPixelRatio: { value: 1 },
      uLight: { value: 1 },
      uLensCenter: { value: [new Vector3(), new Vector3()] },
      uLensRadius: { value: [0, 0] },
    },
    vertexShader: STARS_VERTEX,
    fragmentShader: STARS_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const stars = new Points(geometry, material);
  stars.name = 'Estrellas sueltas';
  stars.frustumCulled = false;
  stars.renderOrder = STARS_ORDER;
  // El tamaño de los puntos va en píxeles del lienzo: se ajusta a la densidad de la pantalla.
  stars.onBeforeRender = (renderer) => {
    const uniform = material.uniforms.uPixelRatio;
    if (uniform) uniform.value = renderer.getPixelRatio();
  };
  return stars;
}

/**
 * El cielo de un sistema: cada tipo de estrella (casa, el sistema ajeno, las Puertas) ve la galaxia desde otro
 * sitio. Se gira con el marco de referencia (`systemScene`); su posición no importa.
 */
export function createStarfield(kind: StarKind = 'solar'): Group {
  const preset = SKY_PRESETS[kind];
  const noise = noiseTexture(preset.seed);
  const galaxy = galaxyUniforms(preset, noise);
  const band = createBand(preset, galaxy);
  const stars = createStars(preset, galaxy);
  const sky = new Group();
  sky.name = 'Estrellas';
  sky.add(band, stars);
  skies.set(sky, {
    band: band.material as ShaderMaterial,
    stars: stars.material as ShaderMaterial,
    noise,
  });
  return sky;
}

function setUniform(material: ShaderMaterial, name: string, value: unknown): void {
  const uniform = material.uniforms[name];
  if (uniform) uniform.value = value;
}

/** Cuánto brillan las estrellas (1 = todo): al final del ciclo se apagan con lo demás (Fase 8D). */
export function dimStars(sky: Object3D, light: number): void {
  const parts = skies.get(sky);
  if (!parts) return;
  setUniform(parts.band, 'uLight', light);
  setUniform(parts.stars, 'uLight', light);
}

/**
 * Las lentes que doblan las estrellas (lente 0: el Nudo; 1: el agujero negro). `lensView` cambia los valores
 * cada fotograma; radio 0 = esa lente no dobla nada.
 */
export function bendStars(
  sky: Object3D,
  centers: { value: Vector3[] },
  radii: { value: number[] },
): void {
  const parts = skies.get(sky);
  if (!parts) return;
  parts.stars.uniforms.uLensCenter = centers;
  parts.stars.uniforms.uLensRadius = radii;
}

export function disposeStarfield(sky: Object3D): void {
  const parts = skies.get(sky);
  if (!parts) return;
  for (const child of sky.children) {
    if (child instanceof Mesh) (child.geometry as BufferGeometry).dispose();
    else if (child instanceof Points) (child.geometry as BufferGeometry).dispose();
  }
  parts.band.dispose();
  parts.stars.dispose();
  parts.noise.dispose();
  skies.delete(sky);
}
