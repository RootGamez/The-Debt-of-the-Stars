// El cielo de un mundo con aire (Fase 9): una esfera alrededor de quien mira, dibujada justo después de las
// estrellas y antes que todo lo demás, que las tapa según cuánto aire hay (system/atmosphere.ts). Degradado del
// horizonte al cénit, un resplandor alrededor de la estrella y bruma bajo el horizonte. Lo que está lejos (la
// estrella, la Luna) se dibuja encima. Sin aire (el sistema ajeno, o al salir al espacio), no se dibuja.
import {
  BackSide,
  Color,
  CustomBlending,
  Mesh,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  SphereGeometry,
  SrcAlphaFactor,
  Vector3,
  type Scene,
} from 'three';
import type { Atmosphere } from '../data/atmospheres';
import { airDensity } from '../system/atmosphere';

/** Radio de la esfera del cielo (m): dentro del plano lejano de la cámara. */
const SKY_RADIUS = 1500;

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = (modelMatrix * vec4(position, 0.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uUp;
uniform vec3 uSun;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uGround;
uniform float uDensity;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = dot(d, uUp);
  float s = max(dot(d, uSun), 0.0);
  vec3 sky = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, h));
  float low = 1.0 - smoothstep(0.0, 0.6, h);
  sky = mix(sky, uGlow, clamp(pow(s, 6.0) * 0.7 * low + pow(s, 48.0) * 0.6, 0.0, 1.0));
  vec3 color = h < 0.0 ? mix(uHorizon, uGround, smoothstep(0.0, -0.3, h)) : sky;
  gl_FragColor = vec4(color, uDensity);
  #include <colorspace_fragment>
}`;

export interface AtmosphereFrame {
  /** Dónde está quien mira (en la escena). */
  eye: Vector3;
  /** El mundo de referencia, si tiene aire: su centro (en la escena), su radio y su cielo. */
  world: { center: Vector3; radius: number; air: Atmosphere } | undefined;
  /** Dónde está la estrella (en la escena). */
  star: Vector3;
}

export interface AtmosphereView {
  update(frame: AtmosphereFrame): void;
  /** Cuánto cielo se ve (0–1), para depurar y para las pruebas. */
  readonly density: number;
  dispose(): void;
}

export function createAtmosphereView(scene: Scene): AtmosphereView {
  const uniforms = {
    uUp: { value: new Vector3(0, 1, 0) },
    uSun: { value: new Vector3(1, 0, 0) },
    uZenith: { value: new Color() },
    uHorizon: { value: new Color() },
    uGlow: { value: new Color() },
    uGround: { value: new Color() },
    uDensity: { value: 0 },
  };
  // Opaco a efectos de orden (va en la lista de lo opaco, tras las estrellas), pero mezclado por su alfa.
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    blending: CustomBlending,
    blendSrc: SrcAlphaFactor,
    blendDst: OneMinusSrcAlphaFactor,
  });
  const sky = new Mesh(new SphereGeometry(1, 32, 16), material);
  sky.name = 'Cielo';
  sky.scale.setScalar(SKY_RADIUS);
  sky.renderOrder = -0.5; // las estrellas van en -1
  sky.frustumCulled = false;
  sky.visible = false;
  scene.add(sky);
  let shown: Atmosphere | undefined;
  let density = 0;

  return {
    update({ eye, world, star }) {
      density = world
        ? airDensity(eye.distanceTo(world.center) - world.radius, world.air.height)
        : 0;
      sky.visible = density > 0;
      if (!world || !sky.visible) return;
      if (shown !== world.air) {
        shown = world.air;
        uniforms.uZenith.value.setHex(world.air.zenith);
        uniforms.uHorizon.value.setHex(world.air.horizon);
        uniforms.uGlow.value.setHex(world.air.glow);
        uniforms.uGround.value.setHex(world.air.ground);
      }
      sky.position.copy(eye);
      uniforms.uUp.value.subVectors(eye, world.center).normalize();
      uniforms.uSun.value.subVectors(star, eye).normalize();
      uniforms.uDensity.value = density;
    },
    get density() {
      return density;
    },
    dispose() {
      scene.remove(sky);
      sky.geometry.dispose();
      material.dispose();
    },
  };
}
