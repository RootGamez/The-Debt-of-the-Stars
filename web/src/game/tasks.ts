import { t } from '../i18n';
// Las tareas del prólogo (Fase 9, rehecho): una cadena corta de cosas por hacer en casa que enseña a moverse, a
// hablar, a leer y a pilotar y que cuenta una pequeña trama antes de ir a la Luna: la Maestra pide una pieza, hay
// que ir a buscarla a la isla del primer Albatros y llevársela a la Directora, que entonces da la misión. Cada tarea
// dice dónde está lo que pide (`target`) para que el indicador de la pantalla la señale. Lógica pura: la lista de la
// izquierda (ui/taskPanel.ts), la página del cuaderno y el indicador (ui/taskWaypoint.ts) solo la pintan.

export type TaskId =
  | 'andar'
  | 'vecina'
  | 'maestra'
  | 'ficha'
  | 'registro'
  | 'mecanica'
  | 'nave'
  | 'isla'
  | 'directora'
  | 'luna'
  | 'fragmento'
  | 'volver';

/** Adónde señala el indicador: una fuente del Registro (su marca INT_), un cuerpo del sistema o a nada. */
export type TaskTarget =
  { kind: 'none' } | { kind: 'source'; id: string } | { kind: 'world'; world: string };

/** Lo que las tareas necesitan saber de la partida en cada momento. */
export interface TaskState {
  /** Metros andados desde que empezó el prólogo. */
  walked: number;
  /** Hechos que se saben. */
  facts: ReadonlySet<string>;
  /** Fuentes abiertas (también las charlas que no dan hechos). */
  opened: ReadonlySet<string>;
  /** Se ha abierto el cuaderno alguna vez. */
  registryOpened: boolean;
  piloting: boolean;
  /** Estás a pie en la Luna. */
  onMoon: boolean;
}

interface TaskDef {
  id: TaskId;
  title: string;
  /** El nombre corto de lo que señala el indicador. */
  label: string;
  hint: { keys: string; touch: string };
  target: TaskTarget;
  done(state: TaskState): boolean;
}

/** Hecho que da la Directora al encargar la misión, y el que da la pieza de la isla. */
export const MISSION_FACT = 'casa.mision_luna';
export const ISLAND_FACT = 'casa.fragmento_isla';
export const SHEET_FACT = 'partida.vida_normal';
export const MOON_FRAGMENT_FACT = 'casa.fragmento_antiguo';
/** Metros que hay que andar para dar por aprendido moverse. */
const WALK_LESSON = 4;

const opened = (id: string) => (s: TaskState) => s.opened.has(id);

const DEFS: readonly TaskDef[] = [
  {
    id: 'andar',
    title: t('Aprende a moverte'),
    label: t('Moverte'),
    hint: {
      keys: t('Ratón para mirar · W A S D para andar · Mayús para correr · Espacio para saltar'),
      touch: t('Arrastra para mirar · el mando de la izquierda para andar'),
    },
    target: { kind: 'none' },
    done: (s) => s.walked >= WALK_LESSON,
  },
  {
    id: 'vecina',
    title: t('Habla con la vecina del árbol'),
    label: t('Vecina'),
    hint: {
      keys: t('Acércate a la vecina del árbol de la plaza y pulsa E para hablar'),
      touch: t('Acércate a la vecina del árbol de la plaza y toca Hablar'),
    },
    target: { kind: 'source', id: 'aldea.arbol' },
    done: opened('aldea.arbol'),
  },
  {
    id: 'maestra',
    title: t('Sube al Instituto y habla con la Maestra'),
    label: t('Maestra'),
    hint: {
      keys: t(
        'El Instituto está en la colina, siguiendo el camino de losas. La Maestra está en su aula: pulsa E para hablar',
      ),
      touch: t(
        'El Instituto está en la colina, siguiendo el camino de losas. La Maestra está en su aula: toca Hablar',
      ),
    },
    target: { kind: 'source', id: 'instituto.maestra' },
    done: opened('instituto.maestra'),
  },
  {
    id: 'ficha',
    title: t('Lee la ficha de riego del aula'),
    label: t('Ficha'),
    hint: {
      keys: t('La ficha de barro está sobre la mesa de la Maestra: mírala y pulsa E para leerla'),
      touch: t('La ficha de barro está sobre la mesa de la Maestra: mírala y toca Leer'),
    },
    target: { kind: 'source', id: 'instituto.ficha' },
    done: (s) => s.facts.has(SHEET_FACT),
  },
  {
    id: 'registro',
    title: t('Abre el cuaderno y repasa lo aprendido'),
    label: t('Cuaderno'),
    hint: {
      keys: t('Lo que aprendes queda en el cuaderno: ábrelo con Tab (T abre tus tareas)'),
      touch: t('Lo que aprendes queda en el cuaderno: ábrelo con su botón'),
    },
    target: { kind: 'none' },
    done: (s) => s.registryOpened,
  },
  {
    id: 'mecanica',
    title: t('Pide la nave a la mecánica del hangar'),
    label: t('Mecánica'),
    hint: {
      keys: t(
        'El hangar está al este del Instituto. La mecánica te espera en su cobertizo: pulsa E para hablar',
      ),
      touch: t(
        'El hangar está al este del Instituto. La mecánica te espera en su cobertizo: toca Hablar',
      ),
    },
    target: { kind: 'source', id: 'instituto.mecanica' },
    done: opened('instituto.mecanica'),
  },
  {
    id: 'nave',
    title: t('Sube al Albatros II'),
    label: t('Albatros II'),
    hint: {
      keys: t(
        'El Albatros II espera en la plataforma del hangar. Junto a la escotilla, F para subir; sentado en el asiento, F para pilotar',
      ),
      touch: t(
        'El Albatros II espera en la plataforma del hangar. Junto a la escotilla, toca Subir; sentado en el asiento, toca Pilotar',
      ),
    },
    target: { kind: 'source', id: 'instituto.mecanica' },
    done: (s) => s.piloting,
  },
  {
    id: 'isla',
    title: t('Busca la pieza en la isla del primer Albatros'),
    label: t('Isla'),
    hint: {
      keys: t(
        'Vuela al oeste, más allá del mar, siguiendo las boyas con farol. Ratón para apuntar · W avanzar · Espacio/C subir y bajar · X frena. Posa la nave con F y examina la pieza con E',
      ),
      touch: t(
        'Vuela al oeste, más allá del mar, siguiendo las boyas con farol. Posa la nave, bájate y toca Examinar junto a la pieza',
      ),
    },
    target: { kind: 'source', id: 'hogar.fragmento_isla' },
    done: (s) => s.facts.has(ISLAND_FACT),
  },
  {
    id: 'directora',
    title: t('Lleva la pieza a la Directora'),
    label: t('Directora'),
    hint: {
      keys: t(
        'La Directora espera en el Motor, junto al mar, al este del Instituto. Vuela de vuelta y habla con ella con E',
      ),
      touch: t(
        'La Directora espera en el Motor, junto al mar, al este del Instituto. Vuela de vuelta y toca Hablar',
      ),
    },
    target: { kind: 'source', id: 'instituto.directora' },
    done: (s) => s.facts.has(MISSION_FACT),
  },
  {
    id: 'luna',
    title: t('Vuela a la Luna y pósate'),
    label: t('Luna'),
    hint: {
      keys: t(
        'Sube con la nave: el tablero ya apunta a la Luna. W para ir hacia ella. Cerca, frena con X y baja despacio; con la nave quieta en el suelo, F para bajar',
      ),
      touch: t(
        'Sube con la nave: el tablero ya apunta a la Luna. Cerca, frena y baja despacio; con la nave quieta en el suelo, toca Levantarse',
      ),
    },
    target: { kind: 'world', world: 'luna' },
    done: (s) => s.onMoon,
  },
  {
    id: 'fragmento',
    title: t('Examina el fragmento de la Luna'),
    label: t('Fragmento'),
    hint: {
      keys: t('El fragmento está cerca: acércate y examínalo con E'),
      touch: t('El fragmento está cerca: acércate y toca Examinar'),
    },
    target: { kind: 'source', id: 'instituto.fragmento_luna' },
    done: (s) => s.facts.has(MOON_FRAGMENT_FACT),
  },
  {
    // ✅ (Anthony, 2026-11-06): al sentarse empieza la cinemática del gusano (game/wormholeCinematic.ts).
    id: 'volver',
    title: t('Vuelve al Albatros II'),
    label: t('Albatros II'),
    hint: {
      keys: t('Vuelve a la nave: junto a la escotilla, F para subir; sentado en el asiento, F'),
      touch: t('Vuelve a la nave: junto a la escotilla toca Subir y, en el asiento, Pilotar'),
    },
    target: { kind: 'none' },
    done: (s) => s.piloting && s.facts.has(MOON_FRAGMENT_FACT),
  },
];

export const TASK_IDS: readonly TaskId[] = DEFS.map((d) => d.id);

function defOf(id: TaskId): TaskDef {
  const def = DEFS.find((d) => d.id === id);
  if (!def) throw new Error(`Tarea desconocida: ${id}`);
  return def;
}

export function taskTarget(id: TaskId): TaskTarget {
  return defOf(id).target;
}

export function taskLabel(id: TaskId): string {
  return defOf(id).label;
}

export function taskHint(id: TaskId, touch: boolean): string {
  return touch ? defOf(id).hint.touch : defOf(id).hint.keys;
}

/** Una tarea tal como la pintan la lista y el cuaderno. */
export interface TaskItem {
  id: TaskId;
  title: string;
  done: boolean;
  current: boolean;
  hint: string;
}

/**
 * Las tareas con lo ya hecho: avanza con el estado, no retrocede (lo hecho se apunta) y, si se hace una tarea de más
 * adelante, las anteriores se dan por hechas (quien sube a la nave sin que se lo pidan ya sabe lo que había antes).
 */
export class TaskTracker {
  private readonly done = new Set<TaskId>();

  /** Apunta lo hecho con este estado y devuelve la tarea que toca ahora (o ninguna si ya están todas). */
  update(state: TaskState): TaskId | undefined {
    let last = -1;
    DEFS.forEach((def, index) => {
      if (this.done.has(def.id) || def.done(state)) last = index;
    });
    for (let index = 0; index <= last; index++) {
      const def = DEFS[index];
      if (def) this.done.add(def.id);
    }
    return DEFS.find((def) => !this.done.has(def.id))?.id;
  }

  isDone(id: TaskId): boolean {
    return this.done.has(id);
  }

  get doneIds(): readonly TaskId[] {
    return TASK_IDS.filter((id) => this.done.has(id));
  }

  /** La lista entera para pintarla. */
  items(touch: boolean): TaskItem[] {
    const current = DEFS.find((def) => !this.done.has(def.id))?.id;
    return DEFS.map((def) => ({
      id: def.id,
      title: def.title,
      done: this.done.has(def.id),
      current: def.id === current,
      hint: touch ? def.hint.touch : def.hint.keys,
    }));
  }
}

/** Cuánto se muestra el aviso de una tarea nueva (s de juego) antes de irse a la lista de la izquierda. */
export const HINT_SECONDS = 14;

/**
 * El aviso de la tarea (el papel de arriba en el centro): aparece al empezar la tarea y se va a los pocos segundos,
 * o antes si se hace; vuelve si el jugador pide verlo otra vez (la tecla O o la lista).
 */
export class TaskHints {
  private shown: TaskId | undefined;
  private left = 0;

  /** @param dt segundos de juego transcurridos (0 en pausa o leyendo). @returns la tarea cuyo aviso se ve ahora. */
  update(current: TaskId | undefined, dt: number): TaskId | undefined {
    if (current !== this.shown) {
      this.shown = current;
      this.left = current === undefined ? 0 : HINT_SECONDS;
    } else {
      this.left = Math.max(0, this.left - dt);
    }
    return this.left > 0 ? current : undefined;
  }

  /** Vuelve a mostrar el aviso de la tarea actual. */
  recall(): void {
    if (this.shown !== undefined) this.left = HINT_SECONDS;
  }
}
