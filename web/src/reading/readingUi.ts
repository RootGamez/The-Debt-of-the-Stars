// Conecta la lectura con el navegador: qué fuente tienes delante, el aviso, las teclas (E leer, R o
// Tab el Registro, Esc cerrar), el panel de lectura, el Registro, los rombos del mundo y los eventos
// que se presencian. La lógica está en readingSession.ts, interaction.ts y registryView.ts (con
// tests); esto lo cubren las pruebas de Playwright (e2e/reading.spec.ts).
import { Vector3, type PerspectiveCamera, type Scene } from 'three';
import type { Player } from '../core/player';
import type { LoopSession } from '../core/loopSession';
import type { RaycastWorld } from '../physics/collisionWorld';
import { lookAlong } from '../physics/surfaceFrame';
import { createSourceMarkers } from '../render/sourceMarkers';
import type { Clues } from '../registry/clues';
import {
  insideRadius,
  nearestInteractable,
  promptLabel,
  type Interactable,
} from '../registry/interaction';
import { canGiveNew } from '../registry/knowledge';
import { buildRegistryView } from '../registry/registryView';
import { createInteractPrompt } from '../ui/interactPrompt';
import { createNotice } from '../ui/notice';
import type { PauseOverlay } from '../ui/pauseOverlay';
import { createReadingPanel } from '../ui/readingPanel';
import { createRegistryPanel } from '../ui/registryPanel';
import type { LoadedWorld } from '../worlds/loadWorld';
import { WorldDataError } from '../worlds/markers';
import type { ReadingSession } from './readingSession';

export interface ReadingUiOptions {
  scene: Scene;
  camera: PerspectiveCamera;
  world: LoadedWorld;
  clues: Clues;
  reading: ReadingSession;
  loop: LoopSession;
  overlay: PauseOverlay;
  player: Player;
  collision: RaycastWorld;
  planetCenter: Vector3;
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
  openRegistry(): void;
  /** Herramienta de depuración (`?debug`): coloca al jugador frente a una fuente. */
  teleportTo(clueId: string): boolean;
  snapshot(): RegistrySnapshot;
  dispose(): void;
}

interface EventSource {
  sourceId: string;
  position: Vector3;
  radius: number;
}

/** Distancia a la que se deja al jugador de una fuente al teletransportarlo (m). */
const TELEPORT_DISTANCE = 1.4;
const GROUND_PROBE = 3;
const GROUND_PROBE_DEPTH = 40;

function worldPosition(object: { getWorldPosition(target: Vector3): Vector3 }): Vector3 {
  return object.getWorldPosition(new Vector3());
}

export function createReadingUi(options: ReadingUiOptions): ReadingUi {
  const { scene, camera, world, clues, reading, loop, overlay, player, planetCenter, touch } =
    options;
  const abort = new AbortController();
  const lineOf = (id: string): string => clues.facts.get(id)?.line ?? id;

  const interactables: Interactable[] = world.markers.interactions
    .filter((m) => clues.sourceById.has(m.clueId))
    .map((m) => ({ id: m.clueId, position: worldPosition(m.object) }));
  const eventSources: EventSource[] = world.markers.triggers.flatMap((trigger) => {
    const source = clues.sources.find((s) => s.kind === 'evento' && s.eventName === trigger.event);
    return source
      ? [{ sourceId: source.id, position: worldPosition(trigger.object), radius: trigger.radius }]
      : [];
  });

  const seen = new Set<string>();
  const available: Interactable[] = [];
  const forward = new Vector3();
  let target: Interactable | undefined;

  const notice = createNotice();
  const markers = createSourceMarkers(scene, interactables, planetCenter);
  const registryPanel = createRegistryPanel(() => {
    registryPanel.close();
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
      !reading.frozen &&
      !registryPanel.isOpen
    );
  }

  function closeReading(): void {
    reading.close();
    readingPanel.hide();
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
    registryPanel.open(buildRegistryView(clues, reading.known));
  }

  function onKey(event: KeyboardEvent): void {
    if (event.repeat) return;
    if (event.code === 'KeyE') activate();
    else if (event.code === 'Escape') {
      if (registryPanel.isOpen) registryPanel.close();
      else if (reading.frozen) closeReading();
    } else if (event.code === 'KeyR') {
      if (registryPanel.isOpen) registryPanel.close();
      else openRegistry();
    } else if (event.code === 'Tab' && overlay.playing) {
      event.preventDefault(); // en pausa, Tab sigue moviendo el foco entre botones
      openRegistry();
    }
  }
  window.addEventListener('keydown', onKey, { signal: abort.signal });

  function witnessEvents(): void {
    for (const event of eventSources) {
      if (!insideRadius(camera.position, event.position, event.radius)) continue;
      const learned = reading.witness(event.sourceId, loop.activeEventIds);
      if (learned.length > 0)
        notice.show(`Anotado en el Registro: ${learned.map(lineOf).join(' · ')}`);
    }
  }

  function findTarget(): Interactable | undefined {
    available.length = 0;
    for (const item of interactables) {
      if (reading.isAvailable(item.id, loop.activeEventIds)) available.push(item);
    }
    camera.getWorldDirection(forward);
    return canInteract() ? nearestInteractable(camera.position, forward, available) : undefined;
  }

  function wantsMarker(id: string): boolean {
    const source = clues.sourceById.get(id);
    if (!source || !reading.isAvailable(id, loop.activeEventIds)) return false;
    return canGiveNew(source, reading.known) || !seen.has(id);
  }

  return {
    update(timeSeconds) {
      if (!overlay.playing && reading.frozen) closeReading(); // al pausar se cierra la lectura
      if (overlay.playing && loop.director.phase === 'playing' && !reading.frozen) witnessEvents();
      target = findTarget();
      const kind = target ? clues.sourceById.get(target.id)?.kind : undefined;
      if (target && kind) prompt.show(promptLabel(kind, touch));
      else prompt.hide();
      markers.update(timeSeconds, camera.position, wantsMarker);
    },
    openRegistry,
    teleportTo(clueId) {
      const item = interactables.find((i) => i.id === clueId);
      if (!item) return false;
      const up = item.position.clone().sub(planetCenter).normalize();
      const side = new Vector3()
        .crossVectors(up, Math.abs(up.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0))
        .normalize();
      const spot = item.position.clone().addScaledVector(side, TELEPORT_DISTANCE);
      const above = spot.clone().addScaledVector(up, GROUND_PROBE);
      const distance = options.collision.raycast(above, up.clone().negate(), GROUND_PROBE_DEPTH);
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
      markers.dispose();
      registryPanel.dispose();
      readingPanel.dispose();
      prompt.dispose();
    },
  };
}
