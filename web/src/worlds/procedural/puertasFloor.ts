// El suelo del Archivo de las Puertas: fuera del tiempo, el tiempo se ve. Desde las bocas de casa salen anillos de luz
// que recorren el planetoide entero hasta las antípodas, despacio, uno tras otro, como las ondas de una piedra en el
// agua; y unos meridianos tenues los cruzan. Se hace en el shader de la malla del suelo.
import { Color, Vector3, type Mesh, type MeshStandardMaterial } from 'three';

/** Separación entre anillos, sobre el suelo (m). */
export const RIPPLE_SPACING = 3.2;
/** Velocidad a la que se alejan (m/s). */
export const RIPPLE_SPEED = 0.7;
const MERIDIANS = 24;

/** En qué fase (0–1) de su anillo está un punto a `distance` metros del centro, en el instante `time` (s). */
export function ripplePhase(distance: number, time: number): number {
  const x = (distance - time * RIPPLE_SPEED) / RIPPLE_SPACING;
  return x - Math.floor(x);
}

/**
 * Pinta los anillos sobre `material` alrededor de la dirección `centre` (marco del mundo) en una esfera de radio
 * `radius`, y hace que `mesh` los mueva en cada fotograma.
 */
export function applyTimeRipples(
  mesh: Mesh,
  material: MeshStandardMaterial,
  centre: Vector3,
  radius: number,
  color: Color,
): void {
  const uniforms = {
    uRippleTime: { value: 0 },
    uRippleCentre: { value: centre.clone().normalize() },
    uRippleColor: { value: color.clone() },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRipplePos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRipplePos = transformed;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uRippleTime;
        uniform vec3 uRippleCentre;
        uniform vec3 uRippleColor;
        varying vec3 vRipplePos;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec3 d = normalize(vRipplePos);
          float distance = acos(clamp(dot(d, uRippleCentre), -1.0, 1.0)) * ${radius.toFixed(2)};
          float x = (distance - uRippleTime * ${RIPPLE_SPEED.toFixed(2)}) / ${RIPPLE_SPACING.toFixed(2)};
          float f = fract(x);
          float w = fwidth(x) * 1.5;
          // El frente del anillo, nítido; detrás, una estela que se apaga.
          float ring = smoothstep(1.0 - w * 2.0, 1.0, f) + (1.0 - smoothstep(0.0, 0.35, f)) * 0.35;
          // Más vivos cerca de casa; casi nada en las antípodas.
          float fade = 1.0 - smoothstep(0.0, ${(radius * Math.PI).toFixed(2)}, distance) * 0.75;
          // Los meridianos: rayos tenues que salen del mismo centro.
          vec3 east = normalize(cross(uRippleCentre, abs(uRippleCentre.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)));
          vec3 north = cross(east, uRippleCentre);
          float around = atan(dot(d, east), dot(d, north)) / (2.0 * PI) * ${MERIDIANS.toFixed(1)};
          float m = abs(fract(around) - 0.5) * 2.0;
          float meridian = 1.0 - smoothstep(0.0, fwidth(around) * 3.0, 1.0 - m);
          totalEmissiveRadiance += uRippleColor * (ring * 0.9 * fade + meridian * 0.18);
        }`,
      );
  };
  const start = performance.now();
  mesh.onBeforeRender = () => {
    uniforms.uRippleTime.value = (performance.now() - start) / 1000;
  };
}
