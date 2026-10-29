// La lente del Nudo en pantalla: su imagen (un brillo pálido en la dirección donde se VE, girada hacia la
// Brasa) y las estrellas de detrás, que se doblan alrededor de donde ESTÁ cuando se pasa cerca. Las reglas
// están en system/lens.ts (con tests); el sombreador repite allí la cuenta de `lensedAngle`.
import {
  AdditiveBlending,
  CanvasTexture,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Object3D,
  type Points,
  type PointsMaterial,
} from 'three';
import { apparentDirection, einsteinRadius, imageClarity } from '../system/lens';

/** A qué distancia de la cámara se dibuja la imagen (m) y qué ángulo ocupa (rad). */
const IMAGE_DISTANCE = 2500;
const IMAGE_ANGLE = (0.7 * Math.PI) / 180;
/** Más lejos de esto las estrellas no se doblan: de lejos, nada delata dónde está el Nudo. */
const STAR_BEND_RANGE = 1200;
const IMAGE_COLOR = 0xd8f0e0;

export interface LensInput {
  /** Posición de la cámara en la escena. */
  camera: Vector3;
  /** El Nudo en la escena (`undefined` si no hay Nudo en este sistema). */
  nudo: Object3D | undefined;
  /** La Brasa en la escena. */
  brasa: Vector3;
  aligned: boolean;
  inObservatory: boolean;
  /** Segundos reales (parpadeo). */
  time: number;
}

export interface LensSnapshot {
  visible: boolean;
  clarity: number;
  /** Ángulo entre donde se ve y donde está (grados), o null si no se ve. */
  offsetDegrees: number | null;
}

export interface LensView {
  update(input: LensInput): void;
  snapshot(): LensSnapshot;
  dispose(): void;
}

/** Un brillo redondo y suave, sin archivos: un degradado dibujado una vez. */
function glowTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(220,245,230,0.8)');
    gradient.addColorStop(1, 'rgba(120,160,140,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

/** Hace que las estrellas se doblen alrededor de `uLensCenter` (lente puntual, ver lensedAngle). */
function bendStars(
  material: PointsMaterial,
  center: { value: Vector3 },
  radius: { value: number },
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLensCenter = center;
    shader.uniforms.uLensRadius = radius;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uLensCenter;\nuniform float uLensRadius;',
      )
      .replace(
        '#include <project_vertex>',
        `vec3 world = (modelMatrix * vec4(transformed, 1.0)).xyz;
        if (uLensRadius > 0.0) {
          vec3 toStar = world - cameraPosition;
          float reach = length(toStar);
          vec3 star = toStar / reach;
          vec3 lens = normalize(uLensCenter - cameraPosition);
          float theta = acos(clamp(dot(star, lens), -1.0, 1.0));
          vec3 axis = cross(lens, star);
          if (theta > 1e-5 && theta < 0.8 && dot(axis, axis) > 1e-12) {
            float bent = (theta + sqrt(theta * theta + 4.0 * uLensRadius * uLensRadius)) * 0.5;
            axis = normalize(axis);
            float a = bent - theta;
            star = star * cos(a) + cross(axis, star) * sin(a) + axis * dot(axis, star) * (1.0 - cos(a));
            world = cameraPosition + star * reach;
          }
        }
        vec4 mvPosition = viewMatrix * vec4(world, 1.0);
        gl_Position = projectionMatrix * mvPosition;`,
      );
  };
  material.needsUpdate = true;
}

export function createLensView(scene: Object3D, sky: Points): LensView {
  const texture = glowTexture();
  const material = new SpriteMaterial({
    map: texture,
    color: IMAGE_COLOR,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const image = new Sprite(material);
  image.name = 'Imagen del Nudo';
  image.visible = false;
  const size = 2 * IMAGE_DISTANCE * Math.tan(IMAGE_ANGLE / 2);
  image.scale.set(size, size, 1);
  scene.add(image);

  const lensCenter = { value: new Vector3() };
  const lensRadius = { value: 0 };
  bendStars(sky.material as PointsMaterial, lensCenter, lensRadius);

  const truth = new Vector3();
  const toBrasa = new Vector3();
  const nudoPosition = new Vector3();
  let state: LensSnapshot = { visible: false, clarity: 0, offsetDegrees: null };

  return {
    update({ camera, nudo, brasa, aligned, inObservatory, time }) {
      if (!nudo) {
        image.visible = false;
        lensRadius.value = 0;
        state = { visible: false, clarity: 0, offsetDegrees: null };
        return;
      }
      nudo.getWorldPosition(nudoPosition);
      truth.subVectors(nudoPosition, camera);
      const distance = truth.length();
      lensCenter.value.copy(nudoPosition);
      lensRadius.value = distance < STAR_BEND_RANGE ? einsteinRadius(distance) : 0;

      toBrasa.subVectors(brasa, camera);
      const seen = apparentDirection(truth, toBrasa);
      const clarity = seen ? imageClarity({ aligned, inObservatory, distance, time }) : 0;
      image.visible = seen !== undefined && clarity > 0;
      if (seen && image.visible) {
        image.position.copy(camera).addScaledVector(seen, IMAGE_DISTANCE);
        material.opacity = clarity;
      }
      state = {
        visible: image.visible,
        clarity,
        offsetDegrees: seen ? (seen.angleTo(truth) * 180) / Math.PI : null,
      };
    },
    snapshot() {
      return { ...state };
    },
    dispose() {
      scene.remove(image);
      material.dispose();
      texture.dispose();
    },
  };
}
