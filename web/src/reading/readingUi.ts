// Conecta la lectura con el navegador: qué fuente tienes delante, el aviso, las teclas (E leer, R o
// Tab el Registro, Esc cerrar), el panel de lectura, el Registro, los rombos del mundo y los eventos
// que se presencian. La lógica está en readingSession.ts, interaction.ts y registryView.ts (con
// tests); esto lo cubren las pruebas de Playwright (e2e/reading.spec.ts).
import { Vector3, type PerspectiveCamera } from 'three';
import type { Player } from '../core/player';
import type { LoopSession } from '../core/loopSession';
import { surfaceUp } from '../physics/gravity';
import { lookAlong } from '../physics/surfaceFrame';
import type { Clues } from '../registry/clues';
import {
  insideRadius,
  nearestInteractable,
  promptLabel,
  type Interactable,
} from '../registry/interaction';
import { canGiveNew } from '../registry/knowledge';
import { keyAction } from './keyActions';
import { buildRegistryView } from '../registry/registryView';
import { createInteractPrompt } from '../ui/interactPrompt';
import { createNotice } from '../ui/notice';
import type { PauseOverlay } from '../ui/pauseOverlay';
import { createReadingPanel } from '../ui/readingPanel';
import { createRecordingPanel } from '../ui/recordingPanel';
import { createRegistryPanel } from '../ui/registryPanel';
import { WorldDataError } from '../worlds/markers';
import { RecordingPlayback } from './recording';
import type { OpenReading, ReadingSession } from './readingSession';
import type { WorldSources } from './worldSources';

export interface ReadingUiOptions {
  camera: PerspectiveCamera;
  /** Fuentes del mundo donde empieza el jugador. */
  sources: WorldSources;
  clues: Clues;
  reading: ReadingSession;
  loop: LoopSession;
  overlay: PauseOverlay;
  player: Player;
  touch: boolean;
}

export interface RegistrySnapshot {
  facts: string[];
  conclusions: string[];
  rumors: string[];
  /** Id de la fuente abierta, o null. */
  reading: string | null;
  registryOpen: boolean;
  /** La grabación que suena, o null. */
  recording: { speed: number; clarity: number; understood: boolean } | null;
}

/** Lo que el sonido necesita de la grabación que suena (el murmullo de la voz). */
export interface ListeningState {
  /** Velocidad de la voz respecto a la natural (1 = como se habló). */
  factor: number;
  /** Alguien habla ahora (no es un silencio entre frases). */
  speaking: boolean;
}

export interface ReadingUi {
  /** Una vez por fotograma, con el tiempo en segundos. */
  update(timeSeconds: number): void;
  /** El jugador pasa a otro mundo: sus fuentes sustituyen a las del anterior. */
  setWorld(sources: WorldSources): void;
  /** Oculta y desactiva las interacciones mientras se pilota. */
  setEnabled(enabled: boolean): void;
  /** Hay una lectura o el Registro abiertos: el ciclo y el movimiento deben esperar. */
  readonly blocking: boolean;
  /** Una grabación está sonando (para el murmullo), o null. */
  readonly listening: ListeningState | null;
  openRegistry(): void;
  /** Herramienta de depuración (`?debug`): coloca al jugador frente a una fuente. */
  teleportTo(clueId: string): boolean;
  snapshot(): RegistrySnapshot;
  dispose(): void;
}

/** Distancia a la que se deja al jugador de una fuente al teletransportarlo (m). */
const TELEPORT_DISTANCE = 1.4;
/** Paso máximo de una grabación por fotograma (s): tras un tirón no salta frases enteras. */
const MAX_PLAYBACK_STEP = 0.1;
const GROUND_PROBE = 3;
const GROUND_PROBE_DEPTH = 40;

export function createReadingUi(options: ReadingUiOptions): ReadingUi {
  const { camera, clues, reading, loop, overlay, player, touch } = options;
  let current = options.sources;
  const abort = new AbortController();
  const lineOf = (id: string): string => clues.facts.get(id)?.line ?? id;

  const seen = new Set<string>();
  /** ¿Aún puede dar algo la fuente? Se calcula una vez y se invalida al aprender (no cada fotograma). */
  const givesNew = new Map<string, boolean>();
  reading.onLearn(() => {
    givesNew.clear();
  });
  const available: Interactable[] = [];
  const forward = new Vector3();
  let target: Interactable | undefined;
  let enabled = true;

  const notice = createNotice();
  const registryPanel = createRegistryPanel(() => {
    closeRegistry();
  });
  const readingPanel = createReadingPanel(() => {
    closeReading();
  }, touch);
  /** La grabación abierta: suena con el tiempo real aunque el ciclo esté detenido. */
  let playback: RecordingPlayback | null = null;
  let understoodShown = false;
  let lastTime: number | undefined;
  const recordingPanel = createRecordingPanel(
    () => {
      closeReading();
    },
    (speed) => {
      playback?.setSpeed(speed);
    },
    touch,
  );
  const prompt = createInteractPrompt(touch, () => {
    activate();
  });

  function canInteract(): boolean {
    return (
      overlay.playing &&
      enabled &&
      loop.director.phase === 'playing' &&
      player.state.grounded && // no se esquiva una caída abriendo una lectura en el aire
      !reading.frozen &&
      !registryPanel.isOpen
    );
  }

  function canGive(id: string): boolean {
    let value = givesNew.get(id);
    if (value === undefined) {
      const source = clues.sourceById.get(id);
      value = source !== undefined && canGiveNew(source, reading.known);
      givesNew.set(id, value);
    }
    return value;
  }

  function closeReading(): void {
    reading.close();
    readingPanel.hide();
    recordingPanel.hide();
    playback = null;
    if (!overlay.playing) overlay.focus(); // si se cerró al pausar, el foco vuelve a la pausa
  }

  function closeRegistry(): void {
    registryPanel.close();
    overlay.setInert(false);
    if (!overlay.playing) overlay.focus();
  }

  function openReading(id: string): void {
    const opened = reading.open(id, loop.activeEventIds);
    if (!opened) return;
    seen.add(id);
    if (opened.recording) openRecording(opened, opened.recording);
    else readingPanel.show(opened, opened.newFacts.map(lineOf));
  }

  function openRecording(
    opened: OpenReading,
    recording: NonNullable<OpenReading['recording']>,
  ): void {
    // Si ya se entendió en otro ciclo, se recuerda cómo sonaba bien: la rueda empieza ahí.
    const speed = recording.understoodBefore ? 1 / recording.rate : 1;
    playback = new RecordingPlayback(recording.lines, recording.rate, speed);
    understoodShown = false;
    recordingPanel.show(opened, playback.speed);
    recordingPanel.update(playback.view());
    if (opened.newFacts.length > 0) {
      notice.show(`Anotado en el Registro: ${opened.newFacts.map(lineOf).join(' · ')}`);
    }
  }

  /** La grabación avanza con el tiempo real; al entenderla entera se anota lo que dice. */
  function playRecording(dt: number): void {
    if (!playback || !reading.frozen) return;
    playback.update(Math.min(dt, MAX_PLAYBACK_STEP));
    const view = playback.view();
    recordingPanel.update(view);
    if (view.understood && !understoodShown) {
      understoodShown = true;
      recordingPanel.showUnderstood(reading.understand().map(lineOf));
    }
  }

  function activate(): void {
    if (reading.frozen) closeReading();
    else if (canInteract() && target) openReading(target.id);
  }

  function openRegistry(): void {
    if (reading.frozen) closeReading();
    if (overlay.playing) overlay.pause();
    overlay.setInert(true); // detrás del Registro no se puede reanudar con el teclado
    registryPanel.open(buildRegistryView(clues, reading.known));
  }

  function onKey(event: KeyboardEvent): void {
    const action = keyAction(
      {
        playing: overlay.playing,
        readingOpen: reading.frozen,
        registryOpen: registryPanel.isOpen,
        canInteract: canInteract(),
        hasTarget: target !== undefined,
      },
      event,
    );
    if (action === 'interact') activate();
    else if (action === 'close-registry') closeRegistry();
    else if (action === 'close-reading') closeReading();
    else if (action === 'open-registry') {
      if (event.code === 'Tab') event.preventDefault();
      openRegistry();
    }
  }
  window.addEventListener('keydown', onKey, { signal: abort.signal });

  function witnessEvents(): void {
    for (const event of current.eventSources) {
      if (!canGive(event.sourceId)) continue;
      if (!insideRadius(camera.position, event.position, event.radius)) continue;
      const learned = reading.witness(event.sourceId, loop.activeEventIds);
      if (learned.length > 0)
        notice.show(`Anotado en el Registro: ${learned.map(lineOf).join(' · ')}`);
    }
  }

  function findTarget(): Interactable | undefined {
    available.length = 0;
    for (const item of current.interactables) {
      if (reading.isAvailable(item.id, loop.activeEventIds)) available.push(item);
    }
    camera.getWorldDirection(forward);
    return canInteract() ? nearestInteractable(camera.position, forward, available) : undefined;
  }

  function wantsMarker(id: string): boolean {
    if (!reading.isAvailable(id, loop.activeEventIds)) return false;
    return canGive(id) || !seen.has(id);
  }

  return {
    update(timeSeconds) {
      const dt = lastTime === undefined ? 0 : Math.max(0, timeSeconds - lastTime);
      lastTime = timeSeconds;
      if (!overlay.playing && reading.frozen) closeReading(); // al pausar se cierra la lectura
      playRecording(dt);
      if (!enabled) {
        prompt.hide();
        current.markers.hide();
        target = undefined;
        return;
      }
      if (overlay.playing && loop.director.phase === 'playing' && !reading.frozen) witnessEvents();
      target = findTarget();
      const kind = target ? clues.sourceById.get(target.id)?.kind : undefined;
      if (target && kind) prompt.show(promptLabel(kind, touch));
      else prompt.hide();
      current.markers.update(timeSeconds, camera.position, wantsMarker);
    },
    setWorld(sources) {
      if (sources === current) return;
      // Nada de lo abierto en el mundo anterior debe quedarse abierto (ni el tiempo congelado).
      if (reading.frozen) closeReading();
      if (registryPanel.isOpen) closeRegistry();
      notice.hide();
      current.markers.hide();
      current = sources;
      target = undefined;
      prompt.hide();
    },
    setEnabled(value) {
      enabled = value;
      if (!enabled) {
        target = undefined;
        prompt.hide();
        current.markers.hide();
      }
    },
    openRegistry,
    get blocking() {
      return reading.frozen || registryPanel.isOpen;
    },
    get listening() {
      return playback && reading.frozen
        ? { factor: playback.factor, speaking: playback.speaking }
        : null;
    },
    teleportTo(clueId) {
      const item = current.interactables.find((i) => i.id === clueId);
      if (!item) return false;
      const up = surfaceUp(item.position, current.well);
      const side = new Vector3()
        .crossVectors(up, Math.abs(up.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0))
        .normalize();
      const spot = item.position.clone().addScaledVector(side, TELEPORT_DISTANCE);
      const above = spot.clone().addScaledVector(up, GROUND_PROBE);
      const distance = current.collision.raycast(above, up.clone().negate(), GROUND_PROBE_DEPTH);
      if (distance === null) throw new WorldDataError(`No hay suelo junto a ${clueId}`);
      const feet = above.addScaledVector(up, -distance);
      player.moveTo(feet, lookAlong(up, item.position.clone().sub(feet)));
      return true;
    },
    snapshot() {
      return {
        facts: [...reading.known],
        conclusions: [...reading.conclusions()],
        rumors: reading.rumors(),
        reading: reading.current?.source.id ?? null,
        registryOpen: registryPanel.isOpen,
        recording: playback
          ? { speed: playback.speed, clarity: playback.clarity, understood: playback.understood }
          : null,
      };
    },
    dispose() {
      abort.abort();
      notice.dispose();
      registryPanel.dispose();
      readingPanel.dispose();
      recordingPanel.dispose();
      prompt.dispose();
    },
  };
}
