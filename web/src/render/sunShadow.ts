// Sombra propia de la estrella. La luz de la estrella sigue siendo la PointLight de three (fases correctas en todos
// los mundos); aquí se le añade oclusión: un mapa de distancias dibujado desde la estrella hacia el jugador, y un
// parche en los materiales que multiplica SOLO la luz 0 (la estrella) por la visibilidad. Es la misma técnica que
// `applySkyLight`. Los cuerpos que proyectan sombra son los que ya llevan `castShadow` (el cristal no).
import {
  Matrix4,
  NearestFilter,
  PerspectiveCamera,
  RGBAFormat,
  ShaderChunk,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Material,
  type Object3D,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { sunShadowFocus, type FocusOptions } from './sunShadowFocus';

/** Capa de los cuerpos que proyectan sombra de la estrella. */
export const SUN_SHADOW_LAYER = 5;

const DEFAULT_SIZE = 2048;
const NORMAL_BIAS = 0.12;
const DEPTH_BIAS = 0.15;

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
      directLight.color *= sunVisibility();
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

export interface SunShadow {
  /** Dibuja el mapa. `star` y `focus` en coordenadas del mundo de la escena. */
  update(
    renderer: WebGLRenderer,
    scene: Scene,
    star: Vector3,
    focus: Vector3,
    options?: Partial<FocusOptions>,
  ): void;
  /** Hace que un material reciba la sombra (se puede llamar antes o después de otros `onBeforeCompile`). */
  receive(material: Material): void;
  /** Marca como proyectores de sombra las mallas con `castShadow` bajo `root`. */
  register(root: Object3D): void;
  /** Enciende o apaga el efecto (p. ej. dentro del Nudo, donde la estrella no ilumina). */
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

export function createSunShadow(size = DEFAULT_SIZE): SunShadow {
  const target = new WebGLRenderTarget(size, size, {
    format: RGBAFormat,
    type: UnsignedByteType,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: true,
  });
  const camera = new PerspectiveCamera(10, 1, 1, 100);
  camera.layers.set(SUN_SHADOW_LAYER);
  const uFar = { value: 100 };
  const material = createDistanceMaterial(uFar);
  const shared = {
    uSunShadowMap: { value: target.texture },
    uSunShadowMatrix: { value: new Matrix4() },
    uSunShadowPos: { value: new Vector3() },
    uSunShadowForward: { value: new Vector3(0, 0, -1) },
    uSunShadowFar: uFar,
    uSunShadowOn: { value: 0 },
    uSunShadowTexel: { value: new Vector2(1 / size, 1 / size) },
  };
  const forward = new Vector3();
  let enabled = true;

  return {
    update(renderer, scene, star, focus, options = {}) {
      if (!enabled) {
        shared.uSunShadowOn.value = 0;
        return;
      }
      const fit = sunShadowFocus(star, focus, { radius: 90, reach: 700, ...options });
      camera.fov = fit.fovDegrees;
      camera.near = fit.near;
      camera.far = fit.far;
      camera.position.copy(star);
      camera.up.set(0, 1, 0);
      if (Math.abs(forward.subVectors(focus, star).normalize().y) > 0.99) camera.up.set(1, 0, 0);
      camera.lookAt(focus);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      uFar.value = fit.far;
      shared.uSunShadowMatrix.value.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      shared.uSunShadowPos.value.copy(star);
      shared.uSunShadowForward.value.copy(forward);
      shared.uSunShadowOn.value = 1;

      const previousTarget = renderer.getRenderTarget();
      const previousOverride = scene.overrideMaterial;
      const previousBackground = scene.background;
      scene.overrideMaterial = material;
      scene.background = null;
      renderer.setRenderTarget(target);
      renderer.setClearColor(0xffffff, 1);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(previousTarget);
      scene.overrideMaterial = previousOverride;
      scene.background = previousBackground;
    },

    register(root) {
      root.traverse((object) => {
        if (object.castShadow) object.layers.enable(SUN_SHADOW_LAYER);
      });
    },

    receive(mat) {
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
          .replace(
            '#include <common>',
            `#include <common>
            uniform sampler2D uSunShadowMap;
            uniform mat4 uSunShadowMatrix;
            uniform vec3 uSunShadowPos;
            uniform vec3 uSunShadowForward;
            uniform float uSunShadowFar;
            uniform float uSunShadowOn;
            uniform vec2 uSunShadowTexel;
            varying vec3 vSunWorld;
            varying vec3 vSunNormal;
            ${PACK}
            float sunVisibility() {
              if (uSunShadowOn < 0.5) return 1.0;
              vec3 wp = vSunWorld + normalize(vSunNormal) * ${NORMAL_BIAS.toFixed(3)};
              vec4 c = uSunShadowMatrix * vec4(wp, 1.0);
              if (c.w <= 0.0) return 1.0;
              vec2 uv = c.xy / c.w * 0.5 + 0.5;
              if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 1.0;
              float mine = dot(wp - uSunShadowPos, uSunShadowForward) / uSunShadowFar;
              float lit = 0.0;
              for (int x = -1; x <= 1; x++) {
                for (int y = -1; y <= 1; y++) {
                  float seen = unpackDist(texture2D(uSunShadowMap, uv + vec2(float(x), float(y)) * uSunShadowTexel));
                  lit += (mine - ${DEPTH_BIAS.toFixed(3)} / uSunShadowFar > seen) ? 0.0 : 1.0;
                }
              }
              return lit / 9.0;
            }`,
          )
          .replace('#include <lights_fragment_begin>', SHADOWED_LIGHTS_BEGIN);
      };
      mat.needsUpdate = true;
    },

    setEnabled(value) {
      enabled = value;
      if (!value) shared.uSunShadowOn.value = 0;
    },

    dispose() {
      target.dispose();
      material.dispose();
    },
  };
}
