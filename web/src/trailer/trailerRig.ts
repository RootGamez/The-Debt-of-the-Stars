// El modo tráiler (`?debug&trailer`): quita el HUD, deja volar una cámara libre para buscar planos y marcar
// fotogramas clave (F8 la enciende, WASD/Q/E la mueven, Mayús corre, K marca), reproduce tomas por fotogramas
// clave pegadas a un mundo (los mundos se mueven por sus órbitas) y deja avanzar el juego fotograma a fotograma
// para grabar sin tirones. Se maneja desde `window.__juego.trailer` (lo usa `scripts/grabar-trailer.ts`).
import { Euler, Quaternion, Vector3, type Object3D, type PerspectiveCamera } from 'three';
import { SOURCE_MARKERS_NAME } from '../render/sourceMarkers';
import { sampleAt, validatePath, type CameraKey, type Vec3 } from './cameraPath';

export interface Shot {
  /** Mundo al que va pegada la cámara (sus coordenadas locales). */
  world: string;
  keys: readonly CameraKey[];
}

/** Lo que el rig necesita del juego. */
export interface TrailerHost {
  /** El grupo de un mundo en la escena (se mueve con su órbita). */
  groupOf(world: string): Object3D | undefined;
  /** El mundo de referencia (el que está en el origen). */
  referenceWorld(): string | undefined;
  /** Detiene el bucle de tiempo real; `step` avanza un fotograma exacto y lo dibuja. */
  pauseLoop(): void;
  resumeLoop(): void;
  step(dt: number): void;
  canvas: HTMLCanvasElement;
  /** La escena: en el tráiler se apagan las ayudas que flotan en el mundo (los rombos de las fuentes). */
  scene: Object3D;
}

export interface TrailerRig {
  /** true si la cámara del tráiler manda (libre o en una toma). */
  readonly driving: boolean;
  /** Si la cámara libre está encendida, se queda con el ratón y devuelve true. */
  takeLook(x: number, y: number): boolean;
  /** Coloca la cámara (llamar después de mover los mundos y antes de dibujar). */
  apply(camera: PerspectiveCamera, dt: number): void;
}

const FREE_SPEED = 6; // m/s
const FREE_RUN = 6; // multiplica con Mayús
const LOOK_SENSITIVITY = 0.0022;
const PITCH_LIMIT = Math.PI / 2 - 0.01;
/** Por encima de esto (coseno) se mira casi en vertical y no se cambia el «arriba». */
const STRAIGHT_DOWN = 0.97;
const ORIGIN = new Vector3();
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'];

/** Lo que se maneja desde `window.__juego.trailer`. */
export interface TrailerApi {
  free(on: boolean): boolean;
  marks(): { world: string | undefined; keys: CameraKey[] };
  clearMarks(): void;
  mark(): CameraKey | undefined;
  setFree(world: string, pos: Vec3, look: Vec3, fov?: number): void;
  play(shot: Shot, time?: number): void;
  stop(): void;
  pauseLoop(): void;
  resumeLoop(): void;
  step(frames?: number, dt?: number): void;
  capture(type?: string, quality?: number): string;
}

export function trailerRequested(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has('debug') && params.has('trailer');
}

const round = (v: number): number => Math.round(v * 100) / 100;
const vec = (v: Vector3): Vec3 => [round(v.x), round(v.y), round(v.z)];

export function createTrailerRig(host: TrailerHost): TrailerRig {
  document.body.classList.add('trailer');
  const held = new Set<string>();
  const marks: CameraKey[] = [];
  let free = false;
  let shot: (Shot & { time: number }) | undefined;
  let freeWorld: string | undefined;
  /** La cámara libre, en coordenadas locales de `freeWorld`. */
  const freePos = new Vector3();
  const freeRot = new Euler(0, 0, 0, 'YXZ');
  let freeFov = 70;
  let seeded = false;
  let markClock = 0;

  const local = new Vector3();
  const lookAt = new Vector3();
  const tmpQ = new Quaternion();
  const forward = new Vector3();
  const right = new Vector3();
  const up = new Vector3();
  const radial = new Vector3();
  const view = new Vector3();
  const lastUp = new Vector3(0, 1, 0);

  const toScene = (world: string, point: Vec3, target: Vector3): Vector3 => {
    const group = host.groupOf(world);
    target.set(...point);
    if (!group) return target;
    return target.applyQuaternion(group.quaternion).add(group.position);
  };

  /** Toma la pose actual de la cámara del juego como punto de partida de la cámara libre. */
  const seedFrom = (camera: PerspectiveCamera): void => {
    freeWorld = host.referenceWorld();
    const group = freeWorld === undefined ? undefined : host.groupOf(freeWorld);
    freePos.copy(camera.position);
    tmpQ.copy(camera.quaternion);
    if (group) {
      freePos.sub(group.position).applyQuaternion(tmpQ.copy(group.quaternion).invert());
      tmpQ.multiply(camera.quaternion);
    }
    freeRot.setFromQuaternion(tmpQ, 'YXZ');
    freeFov = camera.fov;
    seeded = true;
  };

  const mark = (): CameraKey | undefined => {
    if (!free || freeWorld === undefined) return undefined;
    forward.set(0, 0, -1).applyEuler(freeRot);
    const key: CameraKey = {
      t: round(markClock),
      pos: vec(freePos),
      look: vec(lookAt.copy(freePos).addScaledVector(forward, 10)),
      fov: round(freeFov),
    };
    marks.push(key);
    markClock += 2;
    const text = JSON.stringify({ world: freeWorld, key });
    void navigator.clipboard.writeText(text).catch(() => undefined);
    console.warn('[tráiler] clave', text); // se lee en la consola al buscar planos
    return key;
  };

  const onKey = (event: KeyboardEvent, down: boolean): void => {
    if (down && event.code === 'F8') {
      event.preventDefault();
      free = !free;
      seeded = false;
      shot = undefined;
      return;
    }
    if (!free) return;
    if (down && event.code === 'KeyK') mark();
    if (MOVE_KEYS.includes(event.code) || event.code === 'KeyK') {
      // La cámara libre se queda con las teclas: el explorador no se mueve.
      event.stopImmediatePropagation();
      if (down) held.add(event.code);
      else held.delete(event.code);
    }
  };
  window.addEventListener(
    'keydown',
    (e) => {
      onKey(e, true);
    },
    { capture: true },
  );
  window.addEventListener(
    'keyup',
    (e) => {
      onKey(e, false);
    },
    { capture: true },
  );

  const moveFree = (dt: number): void => {
    const axis = (plus: string, minus: string): number =>
      (held.has(plus) ? 1 : 0) - (held.has(minus) ? 1 : 0);
    const speed = FREE_SPEED * (held.has('ShiftLeft') || held.has('ShiftRight') ? FREE_RUN : 1);
    forward.set(0, 0, -1).applyEuler(freeRot);
    right.set(1, 0, 0).applyEuler(freeRot);
    up.set(0, 1, 0).applyEuler(freeRot);
    freePos
      .addScaledVector(forward, axis('KeyW', 'KeyS') * speed * dt)
      .addScaledVector(right, axis('KeyD', 'KeyA') * speed * dt)
      .addScaledVector(up, axis('KeyE', 'KeyQ') * speed * dt);
  };

  const api: TrailerApi = {
    /** Enciende o apaga la cámara libre. */
    free(on: boolean) {
      free = on;
      seeded = false;
      shot = undefined;
      return free;
    },
    /** Las claves marcadas con K (o `mark()`), con el mundo de la cámara libre. */
    marks: () => ({ world: freeWorld, keys: [...marks] }),
    clearMarks() {
      marks.length = 0;
      markClock = 0;
    },
    mark,
    /** Fija la cámara libre en una pose local de `world` (para buscar planos desde código). */
    setFree(world: string, pos: Vec3, look: Vec3, fov = freeFov) {
      free = true;
      seeded = true;
      shot = undefined;
      freeWorld = world;
      freePos.set(...pos);
      tmpQ.setFromUnitVectors(new Vector3(0, 0, -1), new Vector3(...look).sub(freePos).normalize());
      freeRot.setFromQuaternion(tmpQ, 'YXZ');
      freeFov = fov;
    },
    /** Empieza una toma en su segundo `time` (0 por defecto). Lanza si la ruta no es válida. */
    play(next: Shot, time = 0) {
      validatePath(next.keys);
      free = false;
      shot = { ...next, time };
    },
    stop() {
      shot = undefined;
      free = false;
    },
    pauseLoop() {
      host.pauseLoop();
    },
    resumeLoop() {
      host.resumeLoop();
    },
    /** Avanza `frames` fotogramas de `dt` segundos (con el bucle detenido). */
    step(frames = 1, dt = 1 / 60) {
      for (let i = 0; i < frames; i += 1) host.step(dt);
    },
    /** La imagen del último fotograma dibujado. */
    capture: (type = 'image/png', quality) => host.canvas.toDataURL(type, quality),
  };
  if (window.__juego) window.__juego.trailer = api;

  return {
    get driving() {
      return free || shot !== undefined;
    },
    takeLook(x, y) {
      if (!free) return false;
      freeRot.y -= x * LOOK_SENSITIVITY;
      freeRot.x = Math.min(Math.max(freeRot.x - y * LOOK_SENSITIVITY, -PITCH_LIMIT), PITCH_LIMIT);
      return true;
    },
    apply(camera, dt) {
      // Los rombos de las fuentes son ayuda de juego, no parte del mundo: en el tráiler no se ven.
      for (const group of host.scene.getObjectsByProperty('name', SOURCE_MARKERS_NAME)) {
        group.visible = false;
      }
      if (shot) {
        const sample = sampleAt(shot.keys, shot.time);
        shot.time += dt;
        toScene(shot.world, sample.pos, camera.position);
        toScene(shot.world, sample.look, local);
        // El «arriba» es la vertical del mundo bajo la cámara: el horizonte sale derecho en cualquier punto
        // de la esfera. Mirando casi en vertical se conserva el de antes (si no, la imagen giraría de golpe).
        const group = host.groupOf(shot.world);
        radial
          .copy(camera.position)
          .sub(group?.position ?? ORIGIN)
          .normalize();
        view.copy(local).sub(camera.position).normalize();
        if (Math.abs(radial.dot(view)) < STRAIGHT_DOWN) lastUp.copy(radial);
        camera.up.copy(lastUp);
        camera.lookAt(local);
        camera.up.set(0, 1, 0);
        if (camera.fov !== sample.fov) {
          camera.fov = sample.fov;
          camera.updateProjectionMatrix();
        }
        return;
      }
      if (!free) return;
      if (!seeded) seedFrom(camera);
      moveFree(dt);
      if (freeWorld === undefined) return;
      toScene(freeWorld, [freePos.x, freePos.y, freePos.z], camera.position);
      const group = host.groupOf(freeWorld);
      camera.quaternion.setFromEuler(freeRot);
      if (group) camera.quaternion.premultiply(group.quaternion);
      if (camera.fov !== freeFov) {
        camera.fov = freeFov;
        camera.updateProjectionMatrix();
      }
    },
  };
}
