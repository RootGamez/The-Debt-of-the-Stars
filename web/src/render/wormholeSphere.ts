// El agujero de gusano del juego (pedido de Anthony): una esfera, como lo sería uno de verdad y como se ve en
// no un anillo con un velo. Desde fuera es una bola de cristal que dobla el espacio: en el borde,
// el entorno se ve comprimido y estirado alrededor de ella (con un fino aro brillante, el anillo de Einstein) y, por
// el centro, se asoma otro lugar (el otro lado: un cielo de estrellas y luz). Se usa igual para las Puertas
// plegadas, la boca del cielo del Archivo de las Puertas y el gusano de la Luna.
//
// Para doblar el entorno hace falta tenerlo en una textura: `renderWithWormholes` pinta primero la escena sin las
// esferas en un lienzo aparte y luego la pinta de verdad; si no hay ninguna esfera a la vista, es un solo pase.
import {
  Color,
  DoubleSide,
  FrontSide,
  Frustum,
  HalfFloatType,
  Matrix4,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Camera,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';

/** El radio de la esfera base (m): se escala hasta el tamaño que haga falta. */
export const WORMHOLE_RADIUS = 1;

const VERTEX = /* glsl */ `
uniform vec3 uCenter;
varying vec3 vWorld;
varying vec2 vCenterUv;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 c = projectionMatrix * viewMatrix * vec4(uCenter, 1.0);
  vCenterUv = c.xy / max(c.w, 1e-4) * 0.5 + 0.5;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uBackdrop;
uniform vec2 uSize;
uniform vec3 uCenter;
uniform float uRadius;
uniform float uTime;
uniform float uOpen;
uniform vec3 uTint;
uniform float uDark;
varying vec3 vWorld;
varying vec2 vCenterUv;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// El otro lado: un cielo luminoso con un horizonte cálido y un mundo grande que asoma, y estrellas.
vec3 otherSide(vec3 d) {
  float a = uTime * 0.05;
  d = vec3(d.x * cos(a) - d.z * sin(a), d.y, d.x * sin(a) + d.z * cos(a));
  vec3 cell = floor(d * 90.0);
  float h = hash(cell);
  float star = step(0.985, h) * (0.5 + 0.5 * hash(cell + 7.0));
  float haze = 0.5 + 0.5 * sin(6.0 * d.x + 3.0 * d.y + uTime * 0.2) * sin(5.0 * d.z - 2.0 * d.y);
  float up = d.y * 0.5 + 0.5;
  vec3 sky = mix(vec3(0.10, 0.16, 0.34), uTint * 1.35, pow(up, 1.6) * 0.75 + haze * 0.22);
  float horizon = smoothstep(0.1, -0.35, d.y);
  sky = mix(sky, vec3(1.0, 0.78, 0.5), horizon * 0.85);
  float planet = smoothstep(0.55, 0.50, length(d - normalize(vec3(0.55, 0.12, 0.83))));
  sky = mix(sky, vec3(0.72, 0.86, 1.0) * (0.7 + 0.3 * haze), planet * 0.9);
  return sky + vec3(star) * vec3(1.0, 0.95, 0.85) * 1.8;
}

void main() {
  vec3 rd = normalize(vWorld - cameraPosition);
  vec3 toCenter = uCenter - cameraPosition;
  float along = dot(toCenter, rd);
  vec3 offset = (cameraPosition + rd * along - uCenter) / uRadius;
  float b = clamp(length(offset), 0.0, 1.0);

  vec2 uv = gl_FragCoord.xy / uSize;
  // Alrededor de la esfera el entorno se comprime y se estira: se muestrea más lejos del centro, y vuelve a lo normal
  // en el borde exacto (para que no haya costura).
  float edge = clamp((b - 0.45) / 0.55, 0.0, 1.0);
  float warp = 1.0 + 2.4 * pow(sin(3.14159265 * edge), 1.3);
  vec2 lensed = vCenterUv + (uv - vCenterUv) * warp;
  vec3 around = texture2D(uBackdrop, clamp(lensed, 0.001, 0.999)).rgb;

  // Por el centro, el otro lado, ensanchado como un ojo de pez.
  vec3 bent = normalize(rd + offset * 1.7);
  // Pintada de negro (el agujero negro): por el centro no se asoma ningún lugar, solo oscuridad.
  vec3 inside = mix(otherSide(bent), vec3(0.0), uDark);
  float through = 1.0 - smoothstep(0.55, 0.82, b);
  vec3 color = mix(around, inside, through);

  // El anillo de Einstein: un hilo de luz donde el entorno se pliega.
  float ring = exp(-pow((b - 0.84) / 0.03, 2.0));
  color += vec3(1.0, 0.9, 0.7) * ring * 0.9;
  // Un velo suave de luz en el borde y un destello en el corazón.
  color += uTint * (pow(b, 6.0) * 0.18 + pow(1.0 - b, 4.0) * 0.12) * (1.0 - uDark);

  float alpha = (1.0 - smoothstep(0.97, 1.0, b)) * uOpen;
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Lo que comparten todas las esferas: el entorno ya pintado y el tamaño de la pantalla. */
const shared = {
  backdrop: { value: null as Texture | null },
  size: { value: new Vector2(1, 1) },
};
const registered = new Set<Object3D>();

export interface WormholeSphere {
  /** La esfera (de radio `WORMHOLE_RADIUS`; se coloca y se escala desde fuera). */
  root: Mesh;
  /** Segundos reales, para que el otro lado se mueva. */
  time: { value: number };
  /** Lo abierta que está (0 invisible, 1 del todo). */
  open: { value: number };
  /** El color del otro lado. */
  tint: { value: Color };
  dispose(): void;
}

/** Una esfera de agujero de gusano. */
export interface WormholeOptions {
  /** Pintada de negro: dobla igual el entorno, pero por el centro no hay otro lado (agujero negro). Dibuja las dos caras. */
  dark?: boolean;
}

export function createWormholeSphere(
  tint = 0x9cc8ff,
  { dark = false }: WormholeOptions = {},
): WormholeSphere {
  const time = { value: 0 };
  const open = { value: 1 };
  const tintUniform = { value: new Color(tint) };
  const center = new Vector3();
  const radius = { value: WORMHOLE_RADIUS };
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uBackdrop: shared.backdrop,
      uSize: shared.size,
      uCenter: { value: center },
      uRadius: radius,
      uTime: time,
      uOpen: open,
      uTint: tintUniform,
      uDark: { value: dark ? 1 : 0 },
    },
    transparent: true,
    depthWrite: true,
    // Quien está dentro del horizonte (en Cicatriz, donde nace) lo ve todo negro: hacen falta las caras de dentro.
    side: dark ? DoubleSide : FrontSide,
  });
  const mesh = new Mesh(new SphereGeometry(WORMHOLE_RADIUS, 48, 32), material);
  mesh.name = 'GusanoEsfera';
  mesh.frustumCulled = false;
  // El centro y el radio verdaderos (con la escala y el padre) para la cuenta del sombreador.
  const scale = new Vector3();
  mesh.onBeforeRender = () => {
    mesh.getWorldPosition(center);
    mesh.getWorldScale(scale);
    radius.value = WORMHOLE_RADIUS * scale.x;
  };
  registered.add(mesh);
  return {
    root: mesh,
    time,
    open,
    tint: tintUniform,
    dispose() {
      registered.delete(mesh);
      mesh.removeFromParent();
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}

function isShown(object: Object3D): boolean {
  for (let o: Object3D | null = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

let target: WebGLRenderTarget | undefined;
const frustum = new Frustum();
const projection = new Matrix4();
const buffer = new Vector2();
const hidden: Object3D[] = [];

/** Las esferas abiertas y a la vista (solo si hay alguna hace falta el pase de fondo). */
function inView(camera: Camera): Object3D[] {
  camera.updateMatrixWorld();
  projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projection);
  const seen: Object3D[] = [];
  for (const sphere of registered) {
    if (!isShown(sphere)) continue;
    const mesh = sphere as Mesh;
    mesh.geometry.computeBoundingSphere();
    const bounds = mesh.geometry.boundingSphere;
    if (!bounds) continue;
    const world = bounds.clone().applyMatrix4(mesh.matrixWorld);
    if (frustum.intersectsSphere(world)) seen.push(sphere);
  }
  return seen;
}

/** Qué fracción de la pantalla mide la textura del entorno que doblan las esferas (1 = completa). */
let backdropScale = 1;

export function setWormholeBackdropScale(scale: number): void {
  backdropScale = Math.min(1, Math.max(0.25, scale));
}

/**
 * Pinta la escena. Con esferas de gusano a la vista, antes pinta el entorno sin ellas en una textura (a la que las
 * esferas se miran para doblarlo); sin ellas, es un solo pase como siempre.
 */
export function renderWithWormholes(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
  const seen = inView(camera);
  if (seen.length === 0) {
    renderer.render(scene, camera);
    return;
  }
  renderer.getDrawingBufferSize(buffer);
  // La textura puede ser más pequeña que la pantalla (Configuración): las esferas la leen por coordenadas
  // normalizadas (`uSize` sigue siendo la pantalla), así que solo se ve algo más blanda tras el cristal.
  const width = Math.max(1, Math.round(buffer.x * backdropScale));
  const height = Math.max(1, Math.round(buffer.y * backdropScale));
  if (!target || target.width !== width || target.height !== height) {
    target?.dispose();
    target = new WebGLRenderTarget(width, height, { type: HalfFloatType });
  }
  shared.size.value.copy(buffer);
  hidden.length = 0;
  for (const sphere of seen) {
    sphere.visible = false;
    hidden.push(sphere);
  }
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  for (const sphere of hidden) sphere.visible = true;
  shared.backdrop.value = target.texture;
  renderer.render(scene, camera);
}
