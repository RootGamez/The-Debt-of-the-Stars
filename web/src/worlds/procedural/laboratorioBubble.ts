// La burbuja del Contrapeso, visible (hito E4 de docs/plan-finales.md §6; ✅ que cerca de él el tiempo corre deprisa,
// 🟡 el aspecto): una cáscara casi transparente alrededor del Contrapeso en su Banco, con el borde encendido y unas
// ondas que corren muy deprisa (dentro, el tiempo va ×5). El juego la esconde cuando se lo llevan y le da la hora
// (`uniforms.time`) en game/laboratoryRig.ts.
import { AdditiveBlending, Color, Mesh, ShaderMaterial, SphereGeometry, type Vector3 } from 'three';

export const BUBBLE_MESH = 'laboratorio_Burbuja';

const VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vLocal;
void main() {
  vLocal = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT = /* glsl */ `
uniform float time;
uniform float radius;
uniform vec3 rim;
uniform vec3 core;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vLocal;
void main() {
  vec3 p = vLocal / radius;
  float edge = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.4);
  float ripple = 0.5 + 0.5 * sin(p.y * 22.0 - time * 7.5 + sin(p.x * 9.0 + time * 3.1) * 1.5);
  float swirl = 0.5 + 0.5 * sin(atan(p.z, p.x) * 5.0 + time * 4.2 + p.y * 6.0);
  float shimmer = ripple * swirl;
  vec3 color = mix(core, rim, edge);
  float alpha = edge * 0.75 + shimmer * 0.07 + edge * shimmer * 0.35;
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

/** La burbuja centrada en `center` (marco del mundo), de radio `radius` (m). */
export function bubbleMesh(center: Vector3, radius: number): Mesh {
  const material = new ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      radius: { value: radius },
      rim: { value: new Color('#CFF2E6') },
      core: { value: new Color('#F2C27A') },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const mesh = new Mesh(new SphereGeometry(radius, 48, 32), material);
  mesh.name = BUBBLE_MESH;
  mesh.position.copy(center);
  mesh.renderOrder = 3;
  return mesh;
}
