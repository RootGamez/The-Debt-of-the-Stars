// La lente del Nudo en pantalla: su imagen (un brillo pálido en la dirección donde se VE, girada hacia la
// Brasa) y las estrellas de detrás, que se doblan alrededor de donde ESTÁ cuando se pasa cerca. Las reglas
// están en system/lens.ts (con tests); el sombreador de las estrellas (sky.ts) repite la cuenta de `lensedAngle`.
import {
  AdditiveBlending,
  CanvasTexture,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Object3D,
} from 'three';
import { holeEinstein } from '../system/blackHole';
import {
  apparentDirection,
  deadDoorGlow,
  doorGlow,
  einsteinRadius,
  imageClarity,
} from '../system/lens';
import { bendStars } from './sky';

/** A qué distancia de la cámara se dibuja la imagen (m) y qué ángulo ocupa (rad). */
const IMAGE_DISTANCE = 2500;
const IMAGE_ANGLE = (0.7 * Math.PI) / 180;
/** Más lejos de esto las estrellas no se doblan: de lejos, nada delata dónde está el Nudo. */
const STAR_BEND_RANGE = 1200;
const IMAGE_COLOR = 0xd8f0e0;
/** El tamaño del brillo de la Puerta (m) y lo fuerte que llega a verse (0–1). */
const DOOR_SIZE = 18;
const DOOR_STRENGTH = 0.55;
/** El reloj que parpadea en el centro del anillo muerto (m). */
const CLOCK_SIZE = 3.2;
const DEAD_COLOR = 0xb8c8c0;
const CLOCK_COLOR = 0xffc070;

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
  /** El agujero negro (Fase 8): dónde está en la escena y su radio; `undefined` si aún no ha nacido. */
  hole?: { position: Vector3; radius: number } | undefined;
  /**
   * La Puerta del Nudo está encendida (E4). Apagada por la huida, su brillo es el de un anillo muerto con un reloj que
   * parpadea. Sin decirlo, encendida.
   */
  doorLit?: boolean;
}

export interface LensSnapshot {
  visible: boolean;
  clarity: number;
  /** Ángulo entre donde se ve y donde está (grados), o null si no se ve. */
  offsetDegrees: number | null;
  /** Las estrellas se doblan (falso con calidad baja). */
  bending: boolean;
  /** Radio angular (rad) de la lente del agujero negro desde la cámara. */
  holeLens: number;
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

/** Un anillo con doce horas, sin archivos: el anillo muerto de la Puerta apagada (E4). */
function ringTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const c = size / 2;
    context.strokeStyle = 'rgba(255,255,255,0.9)';
    context.lineWidth = size * 0.045;
    context.beginPath();
    context.arc(c, c, size * 0.36, 0, Math.PI * 2);
    context.stroke();
    context.lineWidth = size * 0.02;
    for (let k = 0; k < 12; k++) {
      const a = (Math.PI * 2 * k) / 12;
      context.beginPath();
      context.moveTo(c + Math.cos(a) * size * 0.4, c + Math.sin(a) * size * 0.4);
      context.lineTo(c + Math.cos(a) * size * 0.46, c + Math.sin(a) * size * 0.46);
      context.stroke();
    }
  }
  return new CanvasTexture(canvas);
}

interface DoorGlow {
  /** `lit`: la Puerta encendida (brillo de siempre); apagada, el anillo muerto con su reloj. */
  update(position: Vector3, distance: number, lit: boolean, time: number): void;
  dispose(): void;
}

function additive(map: CanvasTexture, color: number): SpriteMaterial {
  return new SpriteMaterial({
    map,
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

/** El brillo tenue de la Puerta del Nudo, en el sitio donde está de verdad (a menos de 300 m). */
function createDoorGlow(scene: Object3D, glow: CanvasTexture): DoorGlow {
  const ring = ringTexture();
  const sprite = (material: SpriteMaterial, name: string, size: number): Sprite => {
    const s = new Sprite(material);
    s.name = name;
    s.visible = false;
    s.scale.set(size, size, 1);
    scene.add(s);
    return s;
  };
  const litMaterial = additive(glow, IMAGE_COLOR);
  const deadMaterial = additive(ring, DEAD_COLOR);
  const clockMaterial = additive(glow, CLOCK_COLOR);
  const door = sprite(litMaterial, 'Brillo de la Puerta del Nudo', DOOR_SIZE);
  const dead = sprite(deadMaterial, 'Anillo muerto de la Puerta del Nudo', DOOR_SIZE);
  const clock = sprite(clockMaterial, 'Reloj de la Puerta del Nudo', CLOCK_SIZE);
  return {
    update(position, distance, lit, time) {
      const shine = lit ? doorGlow(distance) : 0;
      const off = lit ? { ring: 0, clock: 0 } : deadDoorGlow(distance, time);
      door.visible = shine > 0;
      dead.visible = off.ring > 0;
      clock.visible = off.clock > 0;
      for (const s of [door, dead, clock]) if (s.visible) s.position.copy(position);
      litMaterial.opacity = shine * DOOR_STRENGTH;
      deadMaterial.opacity = off.ring * DOOR_STRENGTH;
      clockMaterial.opacity = off.clock * DOOR_STRENGTH;
    },
    dispose() {
      for (const s of [door, dead, clock]) scene.remove(s);
      for (const m of [litMaterial, deadMaterial, clockMaterial]) m.dispose();
      ring.dispose();
    },
  };
}

/** @param bending `false` (calidad baja): las estrellas no se doblan. */
export function createLensView(scene: Object3D, sky: Object3D, bending = true): LensView {
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
  // El brillo tenue de la Puerta, en el sitio donde está de verdad (a menos de 300 m).
  const door = createDoorGlow(scene, texture);

  // Lente 0: el Nudo. Lente 1: el agujero negro.
  const lensCenters = { value: [new Vector3(), new Vector3()] };
  const lensRadii = { value: [0, 0] };
  if (bending) bendStars(sky, lensCenters, lensRadii);

  const truth = new Vector3();
  const toBrasa = new Vector3();
  const nudoPosition = new Vector3();
  let state: LensSnapshot = {
    visible: false,
    clarity: 0,
    offsetDegrees: null,
    bending,
    holeLens: 0,
  };

  return {
    update({ camera, nudo, brasa, aligned, inObservatory, time, hole, doorLit = true }) {
      const holeLens = hole ? holeEinstein(hole.radius, hole.position.distanceTo(camera)) : 0;
      lensRadii.value[1] = holeLens;
      if (hole) lensCenters.value[1]?.copy(hole.position);
      if (!nudo) {
        image.visible = false;
        door.update(camera, Infinity, true, time);
        lensRadii.value[0] = 0;
        state = { visible: false, clarity: 0, offsetDegrees: null, bending, holeLens };
        return;
      }
      nudo.getWorldPosition(nudoPosition);
      truth.subVectors(nudoPosition, camera);
      const distance = truth.length();
      door.update(nudoPosition, distance, doorLit, time);
      lensCenters.value[0]?.copy(nudoPosition);
      lensRadii.value[0] = distance < STAR_BEND_RANGE ? einsteinRadius(distance) : 0;

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
        bending,
        holeLens,
      };
    },
    snapshot() {
      return { ...state };
    },
    dispose() {
      scene.remove(image);
      door.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
