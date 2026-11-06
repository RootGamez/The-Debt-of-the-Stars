// El prólogo por dentro: reúne las tareas (game/tasks.ts), su lista de la izquierda, el aviso de arriba y el
// indicador de la pantalla, y cada fotograma los pone al día con la partida. La tecla O despliega o recoge la lista
// (y, al desplegarla, vuelve a mostrar el aviso). Mientras se pilota, la nave apunta sola a lo que toca.
import { Vector3, type PerspectiveCamera } from 'three';
import type { WorldSources } from '../reading/worldSources';
import type { ReadingSession } from '../reading/readingSession';
import type { SystemScene } from '../render/systemScene';
import { createGuideView } from '../ui/guideView';
import { createTaskPanel } from '../ui/taskPanel';
import { createWaypointView } from '../ui/taskWaypoint';
import { placeWaypoint } from './waypoint';
import { TaskHints, taskHint, taskLabel, taskTarget, type TaskId, type TaskTracker } from './tasks';

/** Más cerca que esto de lo que señala, el indicador se quita (ya lo tienes delante: manda el aviso de E). */
const ARRIVED_DISTANCE = 3;
/** Un paso mayor que esto en un fotograma es un salto (depuración), no andar. */
const MAX_WALK_STEP = 1;

export interface TaskFrame {
  /** Segundos de juego (0 en pausa o leyendo). */
  dt: number;
  /** Se puede mostrar la interfaz (jugando, sin lectura ni cuaderno abiertos). */
  visible: boolean;
  piloting: boolean;
  /** El mundo donde está quien juega a pie, o el marco de la nave. */
  world: string;
  /** Los pies del jugador (o la nave). */
  position: Vector3;
  /** El cuaderno está abierto. */
  registryOpen: boolean;
}

export interface TaskRigOptions {
  tracker: TaskTracker;
  reading: ReadingSession;
  touch: boolean;
  camera: PerspectiveCamera;
  systemScene: SystemScene;
  /** Las fuentes de cada mundo (de ahí salen los sitios que señala el indicador). */
  sources: ReadonlyMap<string, WorldSources>;
  /** Radio de cada mundo (para medir la distancia hasta su superficie). */
  radiusOf: (world: string) => number | undefined;
  /** El mundo de la Luna: pisarla a pie da por hecha la tarea de ir. */
  moonWorld: string;
  /** Fija el objetivo de la nave (o lo quita). */
  setShipTarget: (world: string | undefined) => void;
}

export interface TaskRig {
  update(frame: TaskFrame): void;
  /** Para depurar y las pruebas. */
  snapshot(): {
    current: TaskId | null;
    done: readonly TaskId[];
    hint: string | null;
    expanded: boolean;
    hidden: boolean;
    waypoint: { label: string; onScreen: boolean } | null;
  };
  dispose(): void;
}

const HIDDEN_KEY = 'bucle-tiempo:ayudas-ocultas';

/** Si el jugador dejó la ayuda oculta (se recuerda: con la interfaz muy grande tapaba la pantalla). */
function loadHidden(): boolean {
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

function saveHidden(hidden: boolean): void {
  try {
    if (hidden) window.localStorage.setItem(HIDDEN_KEY, '1');
    else window.localStorage.removeItem(HIDDEN_KEY);
  } catch {
    // Sin almacenamiento (modo privado): se olvida al recargar.
  }
}

interface Place {
  world: string;
  local: Vector3;
}

export function createTaskRig(options: TaskRigOptions): TaskRig {
  const { tracker, reading, touch, camera, systemScene } = options;
  const panel = createTaskPanel(touch, (hidden) => {
    saveHidden(hidden);
    if (!hidden) hints.recall();
  });
  const guideView = createGuideView();
  const waypoint = createWaypointView();
  const hints = new TaskHints();
  panel.setHidden(loadHidden());
  const places = new Map<string, Place>();
  for (const [world, set] of options.sources) {
    for (const item of set.interactables) places.set(item.id, { world, local: item.position });
  }
  const abort = new AbortController();
  const lastFeet = new Vector3();
  const point = new Vector3();
  const inCamera = new Vector3();
  let walked = 0;
  let registryOpened = false;
  let current: TaskId | undefined;
  let visible = false;

  window.addEventListener(
    'keydown',
    (event) => {
      if ((event.code !== 'KeyO' && event.code !== 'KeyH') || event.repeat || !visible) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.target instanceof HTMLInputElement) return;
      // H oculta o muestra toda la ayuda (lista y avisos); O pliega o despliega la lista.
      if (event.code === 'KeyH') panel.setHidden(!panel.hidden);
      else if (panel.hidden) {
        panel.setHidden(false);
        panel.expand();
      } else if (panel.expanded) panel.toggle();
      else {
        panel.expand();
        hints.recall();
      }
    },
    { signal: abort.signal },
  );

  /** Pone en `point` el sitio de la tarea (en el espacio del mundo que se ve); `radius` se descuenta de la distancia. */
  function whereIs(id: TaskId): { radius: number } | undefined {
    const target = taskTarget(id);
    if (target.kind === 'none') return undefined;
    if (target.kind === 'world') {
      const group = systemScene.groupOf(target.world);
      if (!group) return undefined;
      group.getWorldPosition(point);
      return { radius: options.radiusOf(target.world) ?? 0 };
    }
    const place = places.get(target.id);
    if (!place) return undefined;
    point.copy(place.local);
    systemScene.groupOf(place.world)?.localToWorld(point);
    return { radius: 0 };
  }

  function showWaypoint(id: TaskId | undefined, show: boolean): void {
    const where = id !== undefined && show ? whereIs(id) : undefined;
    if (!id || !where) {
      waypoint.update(undefined);
      return;
    }
    const meters = Math.max(0, point.distanceTo(camera.position) - where.radius);
    if (taskTarget(id).kind === 'source' && meters < ARRIVED_DISTANCE) {
      waypoint.update(undefined);
      return;
    }
    camera.updateMatrixWorld();
    inCamera.copy(point).applyMatrix4(camera.matrixWorldInverse);
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
    waypoint.update({
      placement: placeWaypoint(inCamera, tanHalf, camera.aspect),
      label: taskLabel(id),
      meters,
    });
  }

  return {
    update(frame) {
      visible = frame.visible;
      if (!frame.piloting) {
        const step = lastFeet.distanceTo(frame.position);
        if (step < MAX_WALK_STEP) walked += step;
        lastFeet.copy(frame.position);
      }
      if (frame.registryOpen) registryOpened = true;
      current = tracker.update({
        walked,
        facts: reading.known,
        opened: reading.opened,
        registryOpened,
        piloting: frame.piloting,
        onMoon: !frame.piloting && frame.world === options.moonWorld,
      });
      panel.update(tracker.items(touch), frame.visible);
      const hintId = hints.update(current, frame.dt);
      guideView.update(
        hintId ? { id: hintId, text: taskHint(hintId, touch) } : undefined,
        frame.visible && !panel.hidden,
      );
      if (frame.piloting) {
        const target = current ? taskTarget(current) : undefined;
        options.setShipTarget(target?.kind === 'world' ? target.world : undefined);
      }
      showWaypoint(current, frame.visible);
    },
    snapshot() {
      return {
        current: current ?? null,
        done: tracker.doneIds,
        hint: guideView.shown ?? null,
        expanded: panel.expanded,
        hidden: panel.hidden,
        waypoint: waypoint.shown ?? null,
      };
    },
    dispose() {
      abort.abort();
      panel.dispose();
      guideView.dispose();
      waypoint.dispose();
    },
  };
}
