// La escena del final bueno en el navegador (F3): monta a los dos Ausentes en el banco del Mirador del Ocaso de
// Umbral, pone el sistema en su momento (Cicatriz alta sobre la Brasa, con el agujero estable dentro: el punto
// quieto), añade dos luces de relleno y reproduce el guion (game/miradorScene.ts) con el director de cinemáticas
// (game/cinematicRunner.ts). Al acabar, la tarjeta del final A. Solo existe con `?mundo=umbral&escena=mirador` y el
// final A guardado (o `?debug`); lo demás del juego sigue cargado, pero sin empezar: el reloj del ciclo no corre, la
// pausa no se abre y el explorador, la nave y los rombos no se ven.
import { Light, PointLight, Vector3, type Object3D, type PerspectiveCamera } from 'three';
import { buildAbsent, type AbsentRig } from '../character/absentModel';
import { PALM_SHARE, seatedGesture } from '../character/absentGestures';
import { gripTwist } from '../character/absentGrip';
import { ABSENT_SKELETONS, type AbsentWho } from '../character/absentSkeleton';
import { trackValue } from '../cinematic/timeline';
import { browserStore, loadSave, markEndingSeen } from '../core/save';
import { loadEndingCards } from '../data/endings';
import { createStillPoint } from '../render/stillPoint';
import { lettersPerSecond, type TextSettings } from '../typewriter/textPreferences';
import { voicePitch } from '../typewriter/speech';
import { lockGameKeys, showEndingCard } from '../ui/endingCard';
import { MIRADOR_ID, MIRADOR_SEAT_TOP } from '../worlds/procedural/umbral';
import type { Soundtrack } from '../audio/soundtrack';
import { t } from '../i18n';
import { createCinematicRunner, type CinematicRunner } from './cinematicRunner';
import { replay } from './crossings';
import {
  gestureAt,
  HER_CUP,
  MIRADOR_MUSIC,
  MIRADOR_PREROLL,
  MIRADOR_SYSTEM_TIME,
  miradorCinematic,
  miradorRequested,
  SEATS,
} from './miradorScene';

/** El mundo donde está el agujero estable (dentro de Cicatriz). */
const HOLE_WORLD = 'cicatriz';
const WHO: readonly AbsentWho[] = ['cientifica', 'esceptico'];
/** El grupo de rombos de las fuentes de cada mundo (render/sourceMarkers.ts). */
const SOURCE_MARKERS = 'Rombos de fuentes';
/** Las luces de relleno: el rebote cálido de la Brasa en la piedra y el contraluz frío de la noche. */
const WARM = {
  color: '#ffb27a',
  intensity: 2.6,
  range: 6,
  decay: 1.4,
  at: [0.05, 1.7, -0.25],
} as const;
const COOL = {
  color: '#93b6ff',
  intensity: 2.2,
  range: 7,
  decay: 1.4,
  at: [0.1, -2.1, 2.5],
} as const;
/** Media altura de la taza (su origen está en la base). */
const CUP_HALF = 0.06;

export interface MiradorRigOptions {
  scene: Object3D;
  /** La escena del mundo de Umbral (`runtime.world.scene`). */
  world: Object3D | undefined;
  system: { update(t: number): void; groupOf(world: string): Object3D | undefined };
  soundtrack: Soundtrack;
  reducedMotion: boolean;
  text: TextSettings;
  /** El explorador y la nave: se esconden (sus luces no, para no recompilar los materiales). */
  hide: readonly (Object3D | undefined)[];
  /** Al empezar: el juego deja de escuchar (lectura, pausa). */
  freeze(): void;
}

export interface MiradorSnapshot {
  time: number;
  shot: string;
  paused: boolean;
  done: boolean;
  /** La dirección del punto quieto desde el banco (marco del ancla) y su altura sobre el horizonte (°). */
  point: [number, number, number];
  elevation: number;
  /** Para encuadrar (marco del ancla, cm): la cabeza de cada uno, sus manos y la taza de él. */
  marks: Record<string, [number, number, number]>;
}

export interface MiradorRig {
  /** Cada fotograma, después de poner el sistema en su sitio: lo pone en el momento de la escena y la cámara. */
  apply(camera: PerspectiveCamera, dt: number): void;
  snapshot(): MiradorSnapshot;
  /** Para probar (`?debug`): salta a ese segundo de la escena, en pausa. */
  seek(time: number): void;
}

/** Esconde lo que no es luz (las luces siguen, apagadas o no: su número no cambia). */
function hideKeepingLights(root: Object3D): void {
  if (root instanceof Light) return;
  if (root.getObjectByProperty('isLight', true) === undefined) {
    root.visible = false;
    return;
  }
  for (const child of root.children) hideKeepingLights(child);
}

function fillLight(spec: typeof WARM | typeof COOL): PointLight {
  const light = new PointLight(spec.color, 0, spec.range, spec.decay);
  light.name = 'Mirador · relleno';
  return light;
}

/** La escena, si la página la pide; si no (o si falta el Mirador), nada. */
export function createMiradorRig(options: MiradorRigOptions): MiradorRig | undefined {
  const debug = new URLSearchParams(window.location.search).has('debug');
  const seen = loadSave(browserStore()).data.endings;
  if (!miradorRequested(window.location.search, seen, debug)) return undefined;
  const anchor = options.world?.getObjectByName(MIRADOR_ID);
  if (!anchor) return undefined;
  return buildMirador(options, anchor);
}

function buildMirador(options: MiradorRigOptions, anchor: Object3D): MiradorRig {
  const bodies = new Map<AbsentWho, AbsentRig>();
  /** Cuánto giran los brazos hacia dentro para abrazar la taza (medido en cada muñeco, antes de colgarlo). */
  const grips = new Map<AbsentWho, number>();
  for (const who of WHO) {
    const rig = buildAbsent(who);
    grips.set(who, gripTwist(rig));
    rig.root.rotation.x = Math.PI / 2; // su Y arriba es la Z del Mirador; su frente, hacia la Brasa
    rig.root.position.set(SEATS[who].x, SEATS[who].y, -MIRADOR_SEAT_TOP);
    anchor.add(rig.root);
    bodies.set(who, rig);
  }
  const herCup = anchor.getObjectByName(`${MIRADOR_ID}_Taza0`);
  const hisCup = anchor.getObjectByName(`${MIRADOR_ID}_Taza1`);
  const letter = anchor.getObjectByName(`${MIRADOR_ID}_Carta`);
  herCup?.position.set(...HER_CUP);
  if (letter) letter.visible = false; // en este tiempo nadie la ha escrito
  const warm = fillLight(WARM);
  const cool = fillLight(COOL);
  options.scene.add(warm, cool);
  const point = createStillPoint();
  options.scene.add(point.object);
  const markers: Object3D[] = [];
  options.world?.traverse((child) => {
    if (child.name === SOURCE_MARKERS) markers.push(child);
  });
  // Desde ya: al recargar en negro no debe asomar la pausa mientras se compilan los sombreadores.
  document.body.classList.add('cinematica');

  // La dirección del punto quieto desde el banco, en el momento de la escena: la necesita el guion.
  options.system.update(MIRADOR_SYSTEM_TIME);
  const pointDirection = holeDirection(options, anchor);
  const scene = miradorCinematic(pointDirection);
  const speakers = {
    cientifica: { name: t('La científica'), voice: voicePitch('La científica') },
    esceptico: { name: t('El escéptico'), voice: voicePitch('El escéptico') },
  };

  let runner: CinematicRunner | undefined;
  let posed = 0;
  const hole = new Vector3();
  const place = new Vector3();
  const palms = [new Vector3(), new Vector3()] as const;

  function start(): CinematicRunner {
    options.freeze();
    return createCinematicRunner({
      scene,
      frame: anchor,
      reducedMotion: options.reducedMotion,
      preroll: MIRADOR_PREROLL,
      speakers,
      label: t('Escena del Mirador'),
      draft: true,
      text: {
        lettersPerSecond: () => lettersPerSecond(options.text.current.speed),
        letterSound: () => options.text.current.letterSound,
      },
      audio: {
        running: () => options.soundtrack.snapshot().running,
        muted: () => options.soundtrack.muted,
        unlock: () => {
          options.soundtrack.unlock();
        },
        blip: (pitch) => {
          options.soundtrack.blip(pitch);
        },
      },
      onCue: (cue) => {
        if (cue.id === 'music.scene')
          options.soundtrack.playMusic(MIRADOR_MUSIC.scene, { fade: 9 });
        if (cue.id === 'music.end') options.soundtrack.playMusic(MIRADOR_MUSIC.end, { fade: 7 });
      },
      onEnd: showCard,
    });
  }

  function showCard(): void {
    const store = browserStore();
    const saved = markEndingSeen(store, loadSave(store), 'A');
    lockGameKeys();
    showEndingCard(
      loadEndingCards().A,
      [
        {
          label: t('Volver a jugar'),
          run: () => {
            replay(loadSave(browserStore()).data.prologueDone);
          },
        },
      ],
      saved ? undefined : t('No se ha podido guardar el final.'),
    );
  }

  /** Su taza entre las dos palmas, girando con el gesto. */
  function holdCup(rig: AbsentRig, turn: number): void {
    if (!hisCup) return;
    const reach = -ABSENT_SKELETONS[rig.who].handLength * PALM_SHARE;
    rig.root.updateMatrixWorld(true);
    rig.bones.handL.localToWorld(palms[0].set(0, reach, 0));
    rig.bones.handR.localToWorld(palms[1].set(0, reach, 0));
    anchor.worldToLocal(place.copy(palms[0]).add(palms[1]).multiplyScalar(0.5));
    hisCup.position.set(place.x, place.y, place.z - CUP_HALF);
    hisCup.rotation.set(0, 0, turn);
  }

  function pose(time: number, dt: number): void {
    posed += dt;
    for (const [who, rig] of bodies) {
      const gesture = gestureAt(scene, who, Math.max(0, time));
      rig.setPose(seatedGesture(who, posed, gesture, { grip: grips.get(who) }));
      if (who === 'esceptico') holdCup(rig, gesture.turn);
    }
  }

  function marks(): Record<string, [number, number, number]> {
    const found: Record<string, [number, number, number]> = {};
    const at = (name: string, object: Object3D | undefined): void => {
      if (!object) return;
      anchor.worldToLocal(object.getWorldPosition(place));
      found[name] = [
        Math.round(place.x * 100),
        Math.round(place.y * 100),
        Math.round(place.z * 100),
      ];
    };
    anchor.updateWorldMatrix(true, true);
    for (const [who, rig] of bodies) {
      at(`${who}.head`, rig.bones.head);
      at(`${who}.handL`, rig.bones.handL);
      at(`${who}.handR`, rig.bones.handR);
    }
    at('cup', hisCup);
    return found;
  }

  function light(time: number): void {
    anchor.updateWorldMatrix(true, false);
    warm.position.set(...WARM.at).applyMatrix4(anchor.matrixWorld);
    cool.position.set(...COOL.at).applyMatrix4(anchor.matrixWorld);
    warm.intensity = WARM.intensity * trackValue(scene, 'warm', time, 1);
    cool.intensity = COOL.intensity * trackValue(scene, 'cool', time, 1);
  }

  return {
    apply(camera, dt) {
      runner ??= start();
      options.system.update(MIRADOR_SYSTEM_TIME);
      for (const root of options.hide) if (root) hideKeepingLights(root);
      for (const group of markers) group.visible = false;
      runner.update(dt);
      const { time, paused } = runner.state;
      pose(time, paused ? 0 : dt);
      light(Math.max(0, time));
      runner.aim(camera);
      camera.updateMatrixWorld();
      const cicatriz = options.system.groupOf(HOLE_WORLD);
      if (cicatriz) point.update(camera, cicatriz.getWorldPosition(hole), 1);
    },
    snapshot() {
      const state = runner?.state;
      const time = state?.time ?? -MIRADOR_PREROLL;
      const shot = scene.shots.find((s) => time < s.end) ?? scene.shots.at(-1);
      return {
        time,
        shot: shot?.id ?? '',
        paused: state?.paused ?? false,
        done: state?.done ?? false,
        point: [...pointDirection],
        elevation: (Math.asin(pointDirection[2]) * 180) / Math.PI,
        marks: marks(),
      };
    },
    seek(time) {
      runner?.seek(time);
    },
  };
}

/** La dirección (unitaria, marco del ancla) del agujero estable vista desde el banco. */
function holeDirection(options: MiradorRigOptions, anchor: Object3D): [number, number, number] {
  const cicatriz = options.system.groupOf(HOLE_WORLD);
  if (!cicatriz) return [0, 0.94, 0.34];
  anchor.updateWorldMatrix(true, false);
  const local = anchor.worldToLocal(cicatriz.getWorldPosition(new Vector3())).normalize();
  return [local.x, local.y, local.z];
}
