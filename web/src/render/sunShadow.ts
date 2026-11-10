// Sombra propia de la estrella. La luz de la estrella sigue siendo la PointLight de three (fases correctas en todos
// los mundos); aquí se le añade oclusión: mapas de distancias dibujados desde la estrella hacia el jugador, y un
// parche en los materiales que multiplica SOLO la luz 0 (la estrella) por la visibilidad. Es la misma técnica que
// `applySkyLight`. Los cuerpos que proyectan sombra son los que ya llevan `castShadow` (el cristal no).
//
// Tres cascadas desde la estrella hacia el jugador: la de al lado (24 m, texeles de 2-3 cm: lo que se ve de cerca),
// la cercana (90 m: edificios, ventanas) y la lejana (160 m, solo lo que queda entre la estrella y la zona cercana:
// otros mundos, los anillos del Cerco), con penumbra que crece con la distancia al cuerpo que tapa, como un eclipse.
//
// Para que de cerca no se vea rota: el desplazamiento por la normal y el sesgo de profundidad crecen con el tamaño
// del texel y con lo rasante que llega la luz (sin franjas en el suelo ni en las paredes), la normal es la de la cara
// de verdad (derivadas de la posición: el mundo es facetado), el filtro es bilineal (bordes suaves, sin escalera) y
// las cámaras de sombra se encajan a texeles enteros (los bordes no tiemblan al andar).
import {
  Color,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  PerspectiveCamera,
  RGBAFormat,
  ShaderChunk,
  ShaderMaterial,
  UnsignedByteType,
  Vector3,
  WebGLRenderTarget,
  type Material,
  type Object3D,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { stableShadowAim, sunShadowFocus } from './sunShadowFocus';

/** Capa de los cuerpos que proyectan sombra de la estrella. */
export const SUN_SHADOW_LAYER = 5;

const DEFAULT_SIZE = 2048;
/** Cascada de al lado: radio de la zona (m). Sus proyectores llegan tan lejos como los de la cercana. */
const CLOSE_RADIUS = 24;
/** Cascada cercana: radio de la zona y hasta dónde llegan sus proyectores (m). */
const NEAR_RADIUS = 90;
const NEAR_REACH = 200;
/** Cascada lejana: radio de la zona; su mapa es más pequeño. */
const FAR_RADIUS = 160;
const FAR_SIZE_DIVISOR = 2;
/** Sin cascada lejana si la estrella está a menos de esto del jugador (m): no cabe nada entre medias. */
const FAR_MIN_DISTANCE = NEAR_REACH + 60;
/** Mínimo del relleno de cielo en un sitio donde el sol llegaría pero algo lo tapa (techos, paredes). */
const SHADED_FILL = 0.4;

const POINT_LIGHT_INFO = 'getPointLightInfo( pointLight, geometryPosition, directLight );';

/**
 * El trozo de three que recorre las luces puntuales, con la luz 0 (la estrella: es la primera de la escena)
 * multiplicada por su visibilidad. Se parte del texto de three para seguir su versión; si el texto cambia, falla
 * alto en lugar de quedarse sin sombra.
 */
const SHADOWED_LIGHTS_BEGIN = (() => {
  const chunk = ShaderChunk.lights_fragment_begin;
  if (!chunk.includes(POINT_LIGHT_INFO))
    throw new Error('sunShadow: three cambió lights_fragment_begin; hay que revisar el parche');
  return chunk.replace(
    POINT_LIGHT_INFO,
    `${POINT_LIGHT_INFO}
    #if UNROLLED_LOOP_INDEX == 0
      sunSeen = sunVisibility();
      directLight.color *= sunSeen;
    #endif`,
  );
})();

const PACK = /* glsl */ `
vec4 packDist(float v) {
  vec4 enc = fract(vec4(1.0, 255.0, 65025.0, 16581375.0) * v);
  enc -= enc.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
  return enc;
}
float unpackDist(vec4 c) {
  return dot(c, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
}`;

function createDistanceMaterial(uFar: { value: number }): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uFar },
    vertexShader: /* glsl */ `
      varying float vDist;
      void main() {
        #include <begin_vertex>
        #include <project_vertex>
        vDist = -mvPosition.z;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uFar;
      varying float vDist;
      ${PACK}
      void main() { gl_FragColor = packDist(clamp(vDist / uFar, 0.0, 0.999999)); }`,
  });
}

/** Hace que proyecten sombra las mallas opacas y con luz de `root` (el explorador, la nave): lo que no la llevaba. */
export function castShadowsFrom(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const material: unknown = Array.isArray(object.material) ? object.material[0] : object.material;
    if (material instanceof MeshStandardMaterial && !material.transparent) object.castShadow = true;
  });
}

export interface SunShadowOptions {
  /** Radio de la estrella (m): da el tamaño de la penumbra de los eclipses. */
  starRadius: number;
}

export interface SunShadow {
  /** Dibuja los mapas. `star` y `focus` en coordenadas del mundo de la escena. */
  update(
    renderer: WebGLRenderer,
    scene: Scene,
    star: Vector3,
    focus: Vector3,
    options?: Partial<SunShadowOptions>,
  ): void;
  /** Hace que un material reciba la sombra (se puede llamar antes o después de otros `onBeforeCompile`). */
  receive(material: Material): void;
  /** Marca como proyectores de sombra las mallas con `castShadow` bajo `root`. */
  register(root: Object3D): void;
  /** Enciende o apaga el efecto (p. ej. dentro del Nudo, donde la estrella no ilumina). */
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

/** Un mapa de distancias: su cámara, su textura y sus uniformes. */
interface Cascade {
  target: WebGLRenderTarget;
  camera: PerspectiveCamera;
  material: ShaderMaterial;
  far: { value: number };
  matrix: { value: Matrix4 };
  on: { value: number };
  /** Un texel en coordenadas de textura (1 / tamaño). */
  texel: { value: number };
  /** Cuánto mide un texel a la distancia del foco (m). */
  texelMeters: { value: number };
}

function createCascade(size: number): Cascade {
  const target = new WebGLRenderTarget(size, size, {
    format: RGBAFormat,
    type: UnsignedByteType,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: true,
  });
  const camera = new PerspectiveCamera(10, 1, 1, 100);
  camera.layers.set(SUN_SHADOW_LAYER);
  const far = { value: 100 };
  return {
    target,
    camera,
    material: createDistanceMaterial(far),
    far,
    matrix: { value: new Matrix4() },
    on: { value: 0 },
    texel: { value: 1 / size },
    texelMeters: { value: 1 },
  };
}

const lookTarget = new Vector3();

interface AimLimits {
  near: number;
  far: number;
  fov: number;
  /** Distancia de la estrella al foco: da cuánto mide un texel allí. */
  distance: number;
}

/** Apunta la cámara de la cascada desde la estrella en `direction` (unitario) y deja listos sus uniformes. */
function aim(cascade: Cascade, star: Vector3, direction: Vector3, limits: AimLimits): void {
  const { camera } = cascade;
  camera.fov = limits.fov;
  camera.near = limits.near;
  camera.far = limits.far;
  camera.position.copy(star);
  camera.up.set(0, 1, 0);
  if (Math.abs(direction.y) > 0.99) camera.up.set(1, 0, 0);
  camera.lookAt(lookTarget.copy(star).add(direction));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  cascade.far.value = limits.far;
  cascade.matrix.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const span = 2 * Math.tan((limits.fov * Math.PI) / 360) * limits.distance;
  cascade.texelMeters.value = span / cascade.target.width;
}

/** Una cascada nítida, encajada a texeles enteros para que sus bordes no tiemblen al moverse. */
function aimStable(
  cascade: Cascade,
  star: Vector3,
  focus: Vector3,
  fit: { near: number; far: number; fovDegrees: number; distance: number },
): void {
  const stable = stableShadowAim(star, focus, fit.fovDegrees, cascade.target.width);
  aim(cascade, star, stable.direction, {
    near: fit.near,
    far: fit.far,
    fov: stable.fovDegrees,
    distance: fit.distance,
  });
}

function drawCascade(renderer: WebGLRenderer, scene: Scene, cascade: Cascade, clear: Color): void {
  const previousTarget = renderer.getRenderTarget();
  const previousClear = renderer.getClearColor(clear).getHex();
  const previousAlpha = renderer.getClearAlpha();
  scene.overrideMaterial = cascade.material;
  renderer.setRenderTarget(cascade.target);
  renderer.setClearColor(0xffffff, 1);
  renderer.clear();
  renderer.render(scene, cascade.camera);
  renderer.setRenderTarget(previousTarget);
  renderer.setClearColor(previousClear, previousAlpha);
}

const GLSL_COMMON = /* glsl */ `
  uniform sampler2D uSunCloseMap;
  uniform sampler2D uSunNearMap;
  uniform sampler2D uSunFarMap;
  uniform mat4 uSunCloseMatrix;
  uniform mat4 uSunNearMatrix;
  uniform mat4 uSunFarMatrix;
  uniform vec3 uSunShadowPos;
  uniform float uSunCloseFar;
  uniform float uSunNearFar;
  uniform float uSunFarFar;
  uniform float uSunCloseOn;
  uniform float uSunNearOn;
  uniform float uSunFarOn;
  uniform float uSunCloseTexel;
  uniform float uSunNearTexel;
  uniform float uSunFarTexel;
  uniform float uSunCloseTexelMeters;
  uniform float uSunNearTexelMeters;
  uniform float uSunFarTexelMeters;
  uniform float uSunStarAngle;
  varying vec3 vSunWorld;
  varying vec3 vSunNormal;
  ${PACK}
  float sunSeen = 1.0;

  // PCF bilineal de 3x3 (16 lecturas): cada comparación pesa según dónde cae el punto dentro de su texel, así el
  // borde de la sombra es una rampa suave y no una escalera de texeles.
  float sunPcf(sampler2D map, vec2 uv, float texel, float mine) {
    vec2 st = uv / texel - 0.5;
    vec2 base = floor(st);
    vec2 f = st - base;
    vec2 center = (base + 0.5) * texel;
    float sum = 0.0;
    for (int j = -1; j <= 2; j++) {
      float wy = j == -1 ? 1.0 - f.y : (j == 2 ? f.y : 1.0);
      for (int i = -1; i <= 2; i++) {
        float wx = i == -1 ? 1.0 - f.x : (i == 2 ? f.x : 1.0);
        float seen = unpackDist(texture2D(map, center + vec2(float(i), float(j)) * texel));
        sum += wx * wy * step(mine, seen);
      }
    }
    return sum / 9.0;
  }

  // Una cascada nítida (la de al lado o la cercana). 'edge' dice cuánto se aleja el punto del borde del mapa (en
  // fracción del mapa; < 0 fuera). La distancia guardada es la del eje de la cámara: la w del recorte.
  float sunCascade(sampler2D map, mat4 matrix, float far, float texel, vec3 wp, float bias, out float edge) {
    edge = -1.0;
    vec4 c = matrix * vec4(wp, 1.0);
    if (c.w <= 0.0) return 1.0;
    vec2 uv = c.xy / c.w * 0.5 + 0.5;
    edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    if (edge <= 0.0) return 1.0;
    float mine = (c.w - bias) / far;
    if (mine > 1.0) return 1.0; // más allá del plano far del mapa: nada que comparar
    return sunPcf(map, uv, texel, mine);
  }

  // Cascada lejana: cuerpos grandes entre la estrella y el punto. La penumbra crece con la distancia al cuerpo
  // que tapa (la estrella no es un punto): se busca el tapador y se filtra con un radio proporcional.
  float sunFarLit(vec3 wp) {
    vec4 c = uSunFarMatrix * vec4(wp, 1.0);
    if (c.w <= 0.0) return 1.0;
    vec2 uv = c.xy / c.w * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 1.0;
    float mine = c.w / uSunFarFar;
    float bias = 0.8 / uSunFarFar;
    float blocked = 0.0;
    float depthSum = 0.0;
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 2.39996;
      vec2 o = vec2(cos(a), sin(a)) * sqrt((float(i) + 0.5) / 12.0) * 36.0;
      float seen = unpackDist(texture2D(uSunFarMap, uv + o * uSunFarTexel));
      if (seen < 0.999 && mine - bias > seen) { blocked += 1.0; depthSum += seen; }
    }
    if (blocked < 0.5) return 1.0;
    float gap = (mine - depthSum / blocked) * uSunFarFar;
    float radius = clamp(gap * uSunStarAngle / uSunFarTexelMeters, 1.0, 36.0);
    float lit = 0.0;
    for (int i = 0; i < 16; i++) {
      float a = float(i) * 2.39996;
      vec2 o = vec2(cos(a), sin(a)) * sqrt((float(i) + 0.5) / 16.0) * radius;
      float seen = unpackDist(texture2D(uSunFarMap, uv + o * uSunFarTexel));
      lit += (seen < 0.999 && mine - bias > seen) ? 0.0 : 1.0;
    }
    return lit / 16.0;
  }

  float sunVisibility() {
    if (uSunNearOn < 0.5) return 1.0;
    // La normal de la cara de verdad (el mundo es facetado; la del vértice puede ir suavizada), del lado de la
    // normal de la malla.
    vec3 g = cross(dFdx(vSunWorld), dFdy(vSunWorld));
    vec3 n = dot(g, g) > 1e-14 ? normalize(g) : normalize(vSunNormal);
    if (dot(n, vSunNormal) < 0.0) n = -n;
    float ndl = dot(n, normalize(uSunShadowPos - vSunWorld));
    // 0 de cara al sol, 1 rasante, 2 de espaldas: cuánto se separa el punto de su cara antes de mirar el mapa.
    float slope = clamp(1.0 - ndl, 0.0, 2.0);
    // Sesgo de profundidad: algo más de medio texel de cara, más cuanto más rasante (tangente, con tope).
    float tangent = ndl > 0.25 ? sqrt(1.0 - ndl * ndl) / ndl : 4.0;
    float edge;
    float closeLit = 1.0;
    float closeWeight = 0.0;
    if (uSunCloseOn > 0.5) {
      float t = uSunCloseTexelMeters;
      closeLit = sunCascade(uSunCloseMap, uSunCloseMatrix, uSunCloseFar, uSunCloseTexel,
        vSunWorld + n * t * (1.0 + slope), t * (0.6 + 0.6 * tangent), edge);
      closeWeight = smoothstep(0.0, 0.12, edge);
    }
    float lit = closeLit;
    if (closeWeight < 1.0) {
      float t = uSunNearTexelMeters;
      float nearLit = sunCascade(uSunNearMap, uSunNearMatrix, uSunNearFar, uSunNearTexel,
        vSunWorld + n * t * (1.0 + slope), t * (0.6 + 0.6 * tangent), edge);
      lit = mix(nearLit, closeLit, closeWeight);
    }
    if (uSunFarOn > 0.5) lit = min(lit, sunFarLit(vSunWorld + n * 0.6));
    return lit;
  }`;

export function createSunShadow(size = DEFAULT_SIZE): SunShadow {
  const patched = new WeakSet<Material>();
  const close = createCascade(size);
  const near = createCascade(size);
  const far = createCascade(Math.max(256, size / FAR_SIZE_DIVISOR));
  const cascades = [close, near, far];
  const shared = {
    uSunCloseMap: { value: close.target.texture },
    uSunNearMap: { value: near.target.texture },
    uSunFarMap: { value: far.target.texture },
    uSunCloseMatrix: close.matrix,
    uSunNearMatrix: near.matrix,
    uSunFarMatrix: far.matrix,
    uSunShadowPos: { value: new Vector3() },
    uSunCloseFar: close.far,
    uSunNearFar: near.far,
    uSunFarFar: far.far,
    uSunCloseOn: close.on,
    uSunNearOn: near.on,
    uSunFarOn: far.on,
    uSunCloseTexel: close.texel,
    uSunNearTexel: near.texel,
    uSunFarTexel: far.texel,
    uSunCloseTexelMeters: close.texelMeters,
    uSunNearTexelMeters: near.texelMeters,
    uSunFarTexelMeters: far.texelMeters,
    uSunStarAngle: { value: 0.05 },
  };
  const toFocus = new Vector3();
  const clearColor = new Color();
  let enabled = true;

  function switchOff(): void {
    for (const cascade of cascades) cascade.on.value = 0;
  }

  return {
    update(renderer, scene, star, focus, options = {}) {
      if (!enabled) {
        switchOff();
        return;
      }
      const distance = star.distanceTo(focus);
      shared.uSunShadowPos.value.copy(star);
      const nearFit = sunShadowFocus(star, focus, { radius: NEAR_RADIUS, reach: NEAR_REACH });
      aimStable(near, star, focus, nearFit);
      near.on.value = 1;
      // La de al lado: mismos proyectores (hasta NEAR_REACH hacia la estrella), zona mucho más pequeña.
      const closeFit = sunShadowFocus(star, focus, { radius: CLOSE_RADIUS, reach: NEAR_REACH });
      const useClose = distance > NEAR_RADIUS;
      close.on.value = useClose ? 1 : 0;
      if (useClose) aimStable(close, star, focus, closeFit);
      // Cuánto se ve la estrella desde aquí (radio angular, rad): lo que ensancha la penumbra de los eclipses.
      shared.uSunStarAngle.value = distance > 0 ? (options.starRadius ?? 0) / distance : 0;

      const useFar = distance > FAR_MIN_DISTANCE;
      far.on.value = useFar ? 1 : 0;
      if (useFar) {
        const farFit = sunShadowFocus(star, focus, { radius: FAR_RADIUS, reach: distance });
        toFocus.subVectors(focus, star).normalize();
        aim(far, star, toFocus, {
          near: 1,
          far: nearFit.near - 4,
          fov: farFit.fovDegrees,
          distance,
        });
        far.texelMeters.value = (2 * FAR_RADIUS) / far.target.width;
      }

      const previousOverride = scene.overrideMaterial;
      const previousBackground = scene.background;
      scene.background = null;
      try {
        drawCascade(renderer, scene, near, clearColor);
        if (useClose) drawCascade(renderer, scene, close, clearColor);
        if (useFar) drawCascade(renderer, scene, far, clearColor);
      } finally {
        scene.overrideMaterial = previousOverride;
        scene.background = previousBackground;
        renderer.setRenderTarget(null);
      }
    },

    register(root) {
      root.traverse((object) => {
        if (object.castShadow) object.layers.enable(SUN_SHADOW_LAYER);
      });
    },

    receive(mat) {
      if (patched.has(mat)) return;
      patched.add(mat);
      // Three usa el texto de `onBeforeCompile` como clave del programa: sin esto, todos los materiales parcheados
      // compartirían programa aunque su parche propio fuera distinto.
      const previousKey = mat.customProgramCacheKey.bind(mat);
      mat.customProgramCacheKey = () => `${previousKey()}|sunshadow`;
      const previous = mat.onBeforeCompile.bind(mat);
      mat.onBeforeCompile = (shader, renderer) => {
        previous(shader, renderer);
        Object.assign(shader.uniforms, shared);
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
            varying vec3 vSunWorld;
            varying vec3 vSunNormal;`,
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            {
              vec4 sunP = vec4(transformed, 1.0);
              vec3 sunN = objectNormal;
              #ifdef USE_INSTANCING
                sunP = instanceMatrix * sunP;
                sunN = mat3(instanceMatrix) * sunN;
              #endif
              vSunWorld = (modelMatrix * sunP).xyz;
              vSunNormal = normalize(mat3(modelMatrix) * sunN);
            }`,
          );
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${GLSL_COMMON}`)
          .replace('#include <lights_fragment_begin>', SHADOWED_LIGHTS_BEGIN);
        // Un interior no recibe el cielo entero: donde el sol llegaría (cara de día del mundo) pero algo lo tapa, el
        // relleno de cielo y ambiente baja. Solo con la luz de cielo del mundo (`vSkyDay`).
        if (shader.fragmentShader.includes('varying float vSkyDay')) {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <aomap_fragment>',
            `#include <aomap_fragment>
            reflectedLight.indirectDiffuse *= mix(1.0, ${SHADED_FILL.toFixed(2)}, (1.0 - sunSeen) * vSkyDay * uSunNearOn);`,
          );
        }
      };
      mat.needsUpdate = true;
    },

    setEnabled(value) {
      enabled = value;
      if (!value) switchOff();
    },

    dispose() {
      for (const cascade of cascades) {
        cascade.target.dispose();
        cascade.material.dispose();
      }
    },
  };
}
