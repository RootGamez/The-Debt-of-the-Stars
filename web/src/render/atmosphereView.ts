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
uniform vec3 uDayZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uGround;
uniform vec3 uNight;
uniform float uHasNight;
uniform float uDensity;
uniform float uNightOpacity;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = dot(d, uUp);
  float s = max(dot(d, uSun), 0.0);
  // Sin cortes en el horizonte: el resplandor sigue un poco por debajo y el suelo entra poco a poco.
  float above = max(h, 0.0);
  float sunHeight = dot(uUp, uSun);
  // Con la estrella alta el cénit pasa al de mediodía; junto al terminador se queda el de ocaso.
  vec3 zenith = mix(uZenith, uDayZenith, smoothstep(0.15, 0.75, sunHeight));
  vec3 sky = mix(uHorizon, zenith, smoothstep(0.0, 0.55, above));
  float low = 1.0 - smoothstep(0.0, 0.6, above);
  sky = mix(sky, uGlow, clamp(pow(s, 6.0) * 0.7 * low + pow(s, 48.0) * 0.6, 0.0, 1.0));
  vec3 color = mix(sky, uGround, smoothstep(0.0, 0.35, -h));
  // Con la estrella bajo el horizonte el cielo se apaga; queda un resto de luz del lado por donde se fue.
  float day = smoothstep(-0.25, 0.08, sunHeight);
  vec3 night = mix(uNight, uHorizon * 0.35, pow(s, 3.0) * (1.0 - smoothstep(0.0, 0.5, h)));
  color = mix(color, night, uHasNight * (1.0 - day));
  gl_FragColor = vec4(color, uDensity * mix(uNightOpacity, 1.0, max(day, 1.0 - uHasNight)));
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
  /** Cuánto tapa a las estrellas (la densidad por la opacidad del aire; < 1 en un aire fino). */
  readonly coverage: number;
  dispose(): void;
}

export function createAtmosphereView(scene: Scene): AtmosphereView {
  const uniforms = {
    uUp: { value: new Vector3(0, 1, 0) },
    uSun: { value: new Vector3(1, 0, 0) },
    uZenith: { value: new Color() },
    uDayZenith: { value: new Color() },
    uNightOpacity: { value: 1 },
    uHorizon: { value: new Color() },
    uGlow: { value: new Color() },
    uGround: { value: new Color() },
    uNight: { value: new Color() },
    uHasNight: { value: 0 },
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
      if (!world || !sky.visible) {
        uniforms.uDensity.value = 0;
        return;
      }
      if (shown !== world.air) {
        shown = world.air;
        uniforms.uZenith.value.setHex(world.air.zenith);
        uniforms.uDayZenith.value.setHex(world.air.dayZenith ?? world.air.zenith);
        const opacity = world.air.opacity ?? 1;
        uniforms.uNightOpacity.value = Math.min(1, (world.air.nightOpacity ?? opacity) / opacity);
        uniforms.uHorizon.value.setHex(world.air.horizon);
        uniforms.uGlow.value.setHex(world.air.glow);
        uniforms.uGround.value.setHex(world.air.ground);
        uniforms.uNight.value.setHex(world.air.night ?? world.air.zenith);
        uniforms.uHasNight.value = world.air.night === undefined ? 0 : 1;
      }
      sky.position.copy(eye);
      uniforms.uUp.value.subVectors(eye, world.center).normalize();
      uniforms.uSun.value.subVectors(star, eye).normalize();
      uniforms.uDensity.value = density * (world.air.opacity ?? 1);
    },
    get density() {
      return density;
    },
    get coverage() {
      return uniforms.uDensity.value;
    },
    dispose() {
      scene.remove(sky);
      sky.geometry.dispose();
      material.dispose();
    },
  };
}
