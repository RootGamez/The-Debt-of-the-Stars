// Conecta la lectura con el navegador: qué fuente tienes delante, el aviso, las teclas (E leer, R o
// Tab el Registro, Esc cerrar), el panel de lectura, el Registro, los rombos del mundo y los eventos
// que se presencian. La lógica está en readingSession.ts, interaction.ts y registryView.ts (con
// tests); esto lo cubren las pruebas de Playwright (e2e/reading.spec.ts).
import { Vector3, type PerspectiveCamera } from 'three';
import type { Player } from '../core/player';
import type { LoopSession } from '../core/loopSession';
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
import { createRegistryPanel } from '../ui/registryPanel';
import { WorldDataError } from '../worlds/markers';
import type { ReadingSession } from './readingSession';
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
}

export interface ReadingUi {
  /** Una vez por fotograma, con el tiempo en segundos. */
  update(timeSeconds: number): void;
  /** El jugador pasa a otro mundo: sus fuentes sustituyen a las del anterior. */
  setWorld(sources: WorldSources): void;
  /** Hay una lectura o el Registro abiertos: el ciclo y el movimiento deben esperar. */
  readonly blocking: boolean;
  openRegistry(): void;
  /** Herramienta de depuración (`?debug`): coloca al jugador frente a una fuente. */
  teleportTo(clueId: string): boolean;
  snapshot(): RegistrySnapshot;
  dispose(): void;
}

/** Distancia a la que se deja al jugador de una fuente al teletransportarlo (m). */
const TELEPORT_DISTANCE = 1.4;
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

  const notice = createNotice();
  const registryPanel = createRegistryPanel(() => {
    closeRegistry();
  });
  const readingPanel = createReadingPanel(() => {
    closeReading();
  }, touch);
  const prompt = createInteractPrompt(touch, () => {
    activate();
  });

  function canInteract(): boolean {
    return (
      overlay.playing &&
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
    readingPanel.show(opened, opened.newFacts.map(lineOf));
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
      if (!overlay.playing && reading.frozen) closeReading(); // al pausar se cierra la lectura
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
    openRegistry,
    get blocking() {
      return reading.frozen || registryPanel.isOpen;
    },
    teleportTo(clueId) {
      const item = current.interactables.find((i) => i.id === clueId);
      if (!item) return false;
      const up = item.position.clone().sub(current.center).normalize();
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
      };
    },
    dispose() {
      abort.abort();
      notice.dispose();
      registryPanel.dispose();
      readingPanel.dispose();
      prompt.dispose();
    },
  };
}
