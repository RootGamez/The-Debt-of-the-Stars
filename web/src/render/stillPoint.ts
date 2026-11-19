// El punto quieto (F3, el final bueno): el agujero estable visto desde lejos, en el cielo de Umbral. Un núcleo negro
// con un anillo de luz fino y un halo cálido muy tenue, siempre de cara a quien mira y del mismo tamaño en el cielo
// (no crece: es lo que ella mira). Se dibuja un poco por delante de Cicatriz, en su dirección, así que lo de cerca (el
// banco, ellos) lo tapa y Cicatriz no. No late ni gira: está quieto.
import {
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  type Camera,
  type ColorRepresentation,
  Color,
} from 'three';

/** Radio aparente del núcleo y del halo (rad). */
const CORE_ANGLE = 0.004;
const HALO_ANGLE = 0.026;
/** Se dibuja a esta parte de la distancia real (por delante de la superficie de Cicatriz). */
const DRAW_SHARE = 0.8;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Premultiplicado: la luz se suma a lo de detrás y solo el núcleo lo tapa.
const fragmentShader = /* glsl */ `
  uniform float uStrength;
  uniform float uHalo;
  uniform vec3 uRing;
  uniform vec3 uGlow;
  varying vec2 vUv;
  void main() {
    float r = length(vUv * 2.0 - 1.0) * uHalo; // en radios del núcleo
    float core = 1.0 - smoothstep(0.9, 1.0, r);
    float ring = exp(-pow((r - 1.42) / 0.13, 2.0)) + 0.3 * exp(-pow((r - 1.9) / 0.4, 2.0));
    float halo = 0.2 * exp(-0.55 * r) * (1.0 - smoothstep(uHalo * 0.6, uHalo, r));
    vec3 light = (uRing * ring * 1.3 + uGlow * halo) * (1.0 - core);
    gl_FragColor = vec4(min(light, vec3(1.0)) * uStrength, core * uStrength);
  }
`;

export interface StillPoint {
  readonly object: Mesh;
  /** `center`: dónde está de verdad (coordenadas de la escena); `strength` 0–1. */
  update(camera: Camera, center: Vector3, strength: number): void;
  dispose(): void;
}

export function createStillPoint(
  ring: ColorRepresentation = '#fff1d8',
  glow: ColorRepresentation = '#ffc68a',
): StillPoint {
  const geometry = new PlaneGeometry(2, 2);
  const strengthUniform = { value: 1 };
  const material = new ShaderMaterial({
    uniforms: {
      uStrength: strengthUniform,
      uHalo: { value: HALO_ANGLE / CORE_ANGLE },
      uRing: { value: new Color(ring) },
      uGlow: { value: new Color(glow) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    premultipliedAlpha: true,
    blending: NormalBlending,
    depthWrite: false,
  });
  const object = new Mesh(geometry, material);
  object.name = 'Punto quieto';
  object.frustumCulled = false;
  object.renderOrder = 10;
  const eye = new Vector3();
  const toward = new Vector3();

  return {
    object,
    update(camera, center, strength) {
      camera.getWorldPosition(eye);
      toward.subVectors(center, eye);
      const distance = toward.length() * DRAW_SHARE;
      object.visible = strength > 0.001 && distance > 1;
      if (!object.visible) return;
      object.position.copy(eye).addScaledVector(toward.normalize(), distance);
      object.quaternion.copy(camera.quaternion);
      object.scale.setScalar(distance * Math.tan(HALO_ANGLE));
      strengthUniform.value = Math.min(1, strength);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
