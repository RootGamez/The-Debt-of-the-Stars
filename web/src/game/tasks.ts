import { t } from '../i18n';
import type { CounterweightPlace } from './counterweight';
// Las tareas del prólogo (Fase 9, rehecho): una cadena corta de cosas por hacer en casa que enseña a moverse, a
// hablar, a leer y a pilotar y que cuenta una pequeña trama antes de ir a la Luna: la Maestra pide una pieza, hay
// que ir a buscarla a la isla del primer Albatros y llevársela a la Directora, que entonces da la misión. Cada tarea
// dice dónde está lo que pide (`target`) para que el indicador de la pantalla la señale. Lógica pura: la lista de la
// izquierda (ui/taskPanel.ts), la página del cuaderno y el indicador (ui/taskWaypoint.ts) solo la pintan.
// Desde el plan de la llegada (hito B) hay un segundo juego de tareas, el del bucle en el sistema de los Ausentes:
// "Primeros pasos en lo desconocido" y, ya con la nave, "Explora cada planeta del sistema". Ese sí se guarda.

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
  | 'volver'
  | 'explorar'
  | 'ubicarse'
  | 'nave_umbral'
  | 'planetas'
  | 'cw_coger'
  | 'cw_llevar'
  | 'cw_motor'
  | 'cw_ruedas'
  | 'cw_pulso';

/** Los juegos de tareas: el del prólogo en casa y el del bucle. */
export type TaskSetId = 'prologo' | 'bucle';

/** Adónde señala el indicador: una fuente del Registro (su marca INT_), un cuerpo del sistema, la nave o nada. */
export type TaskTarget =
  | { kind: 'none' }
  | { kind: 'source'; id: string }
  | { kind: 'world'; world: string }
  | { kind: 'ship' };

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
  /** Los mundos ya visitados (los que tienen nombre en la bitácora) y los que hay que visitar (solo el bucle). */
  visited?: ReadonlySet<string>;
  explorable?: readonly string[];
  /** El mundo donde estás (a pie o el marco de la nave). */
  world?: string;
  /** Las conclusiones que ya se entienden (K1…K8). */
  conclusions?: ReadonlySet<string>;
  /** El Contrapeso en este ciclo (la misión «Detener el colapso»). */
  counterweight?: CounterweightTaskView;
}

/** Lo que las tareas miran del Contrapeso: dónde está, si el motor viejo ya salió y si los relojes coinciden. */
export interface CounterweightTaskView {
  place: CounterweightPlace;
  motorOut: boolean;
  matched: boolean;
}

interface TaskDef {
  id: TaskId;
  /** La misión a la que pertenece (el título de la lista mientras es la de ahora). */
  mission?: string;
  /** No sale en la lista hasta que esta otra esté hecha. */
  after?: TaskId;
  title: string;
  /** El nombre corto de lo que señala el indicador. */
  label: string;
  hint: { keys: string; touch: string };
  target: TaskTarget;
  done(state: TaskState): boolean;
  /** Cuánto lleva hecho (se pinta tras el título: "2/5"). */
  progress?(state: TaskState): { done: number; total: number };
  /** En vivo: se tacha y se destacha con el estado de cada momento y no se guarda (lo del ciclo). */
  live?: boolean;
  /** No sale en la lista hasta que esto se cumpla. */
  shownWhen?(state: TaskState): boolean;
  /** Las conclusiones que hacen falta para entender el paso; sin ellas sale `unknownTitle` y no señala nada. */
  needs?: readonly string[];
  unknownTitle?: string;
}

/** Hecho que da la Directora al encargar la misión, y el que da la pieza de la isla. */
export const MISSION_FACT = 'casa.mision_luna';
export const ISLAND_FACT = 'casa.fragmento_isla';
export const SHEET_FACT = 'partida.vida_normal';
export const MOON_FRAGMENT_FACT = 'casa.fragmento_antiguo';
/** Metros que hay que andar para dar por aprendido moverse. */
const WALK_LESSON = 4;

const opened = (id: string) => (s: TaskState) => s.opened.has(id);

const PROLOGUE_DEFS: readonly TaskDef[] = [
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

/** El hecho que dan el mural y la consola de la Sala de Mando (plan de la llegada, D8). */
export const HOME_FACT = 'umbral.hogar_ausentes';
const FIRST_STEPS = t('Primeros pasos en lo desconocido');
const EXPLORE_ALL = t('Explora cada planeta del sistema');

/** Los mundos explorables ya visitados, de los que hay. */
function visitedOf(s: TaskState): { done: number; total: number } {
  const all = s.explorable ?? [];
  return { done: all.filter((w) => s.visited?.has(w)).length, total: all.length };
}

// Plan de la llegada, hito B (✅ la misión, Anthony 2026-11-06; 🟡 cómo se cumple cada paso, D8).
const LOOP_DEFS: readonly TaskDef[] = [
  {
    id: 'explorar',
    mission: FIRST_STEPS,
    title: t('Explora el edificio junto al que despertaste'),
    label: t('Casa de Estudio'),
    hint: {
      keys: t(
        'La Casa de Estudio está a unos pasos de donde despertaste. Entra y mira el mural del muro de la izquierda con E',
      ),
      touch: t(
        'La Casa de Estudio está a unos pasos de donde despertaste. Entra y toca Examinar junto al mural',
      ),
    },
    target: { kind: 'source', id: 'umbral.mural' },
    done: opened('umbral.mural'),
  },
  {
    id: 'ubicarse',
    mission: FIRST_STEPS,
    title: t('Averigua dónde estás'),
    label: t('Sala de Mando'),
    hint: {
      keys: t('La Sala de Mando está junto a La Boca. Lee su consola con E'),
      touch: t('La Sala de Mando está junto a La Boca. Toca Leer junto a su consola'),
    },
    target: { kind: 'source', id: 'umbral.consola_mando' },
    done: opened('umbral.consola_mando'),
  },
  {
    id: 'nave_umbral',
    mission: FIRST_STEPS,
    title: t('Vuelve al Albatros II'),
    label: t('Albatros II'),
    hint: {
      keys: t(
        'La nave está donde cayó, sobre el hielo. Sube por la escalerilla con F y, en el asiento, F para pilotar',
      ),
      touch: t(
        'La nave está donde cayó, sobre el hielo. Toca Subir junto a la escalerilla y, en el asiento, Pilotar',
      ),
    },
    target: { kind: 'ship' },
    done: (s) => s.piloting,
  },
  {
    id: 'planetas',
    mission: EXPLORE_ALL,
    after: 'nave_umbral',
    title: t('Visita cada mundo del sistema'),
    label: t('Mundos'),
    hint: {
      keys: t(
        'Pilotando, T elige otro mundo como objetivo; el mapa de órbitas está en la mesa de la nave. Al llegar a cada mundo, ponle nombre',
      ),
      touch: t(
        'Pilotando, elige otro mundo como objetivo; el mapa de órbitas está en la mesa de la nave. Al llegar a cada mundo, ponle nombre',
      ),
    },
    target: { kind: 'none' },
    done: (s) => {
      const { done, total } = visitedOf(s);
      return total > 0 && done >= total;
    },
    progress: visitedOf,
  },
];

// Plan de historia y puzzles físicos, §5.2 (✅ D5, Anthony 2026-11-06): con algo del Contrapeso entendido, sus
// pasos salen como una misión que se tacha sola en el ciclo. Lo que aún no se entiende sale como pregunta y no
// señala nada; el Banco del Laboratorio nunca se señala (encontrarlo es la deducción).
const STOP_COLLAPSE = t('Detener el colapso');
const UNKNOWN_HINT_TEXT = t(
  'Aún no lo entiendo: en el cuaderno, las páginas de deducción dicen qué me falta',
);
const COUNTERWEIGHT_CONCLUSIONS = ['K4', 'K5', 'K6'];
const cw = (s: TaskState): CounterweightTaskView =>
  s.counterweight ?? { place: 'bench', motorOut: false, matched: false };
const atInstall = (place: CounterweightPlace): boolean =>
  place === 'cradle' || place === 'installed';

const COUNTERWEIGHT_STEPS: readonly TaskDef[] = [
  {
    id: 'cw_coger',
    title: t('Coge el Contrapeso del Banco del Laboratorio'),
    unknownTitle: t('¿Dónde está el Contrapeso?'),
    needs: ['K3', 'K4'],
    label: t('Contrapeso'),
    hint: {
      keys: t('Está en su Banco, en el Laboratorio: E para cogerlo. En brazos no se corre'),
      touch: t('Está en su Banco, en el Laboratorio: toca Coger. En brazos no se corre'),
    },
    target: { kind: 'none' },
    done: (s) => cw(s).place !== 'bench',
  },
  {
    id: 'cw_llevar',
    title: t('Llévalo a la Sala del Motor de Cicatriz'),
    unknownTitle: t('¿Dónde se instala el Contrapeso?'),
    needs: ['K6'],
    label: t('Cicatriz'),
    hint: {
      keys: t('Súbelo a la nave y vuela a Cicatriz; la Sala del Motor rodea el centro del planeta'),
      touch: t(
        'Súbelo a la nave y vuela a Cicatriz; la Sala del Motor rodea el centro del planeta',
      ),
    },
    target: { kind: 'world', world: 'cicatriz' },
    done: (s) => {
      const { place } = cw(s);
      return atInstall(place) || (place === 'carried' && s.world === 'cicatriz');
    },
  },
  {
    id: 'cw_motor',
    title: t('Saca el motor viejo con la palanca antes de las 9:00'),
    unknownTitle: t('¿Qué hay que quitar para ponerlo?'),
    needs: ['K4', 'K6'],
    label: t('Palanca'),
    hint: {
      keys: t(
        'La palanca está en la consola, delante del núcleo: E para tirar. Después del pulso ya no sale',
      ),
      touch: t(
        'La palanca está en la consola, delante del núcleo: toca Tirar. Después del pulso ya no sale',
      ),
    },
    target: { kind: 'source', id: 'cicatriz.palanca' },
    done: (s) => cw(s).motorOut,
  },
  {
    id: 'cw_ruedas',
    title: t('En la cuna, iguala su reloj con el de la máquina'),
    unknownTitle: t('¿Qué pasa con su reloj?'),
    needs: ['K5'],
    label: t('Cuna'),
    hint: {
      keys: t(
        'Ponlo en la cuna con E y gira las dos ruedas hasta que los dos relojes marquen lo mismo',
      ),
      touch: t('Ponlo en la cuna y gira las dos ruedas hasta que los dos relojes marquen lo mismo'),
    },
    target: { kind: 'source', id: 'cicatriz.cuna' },
    done: (s) => {
      const { place, matched } = cw(s);
      return place === 'installed' || (place === 'cradle' && matched);
    },
  },
  {
    id: 'cw_pulso',
    title: t('Espera al pulso de las 9:00'),
    unknownTitle: t('¿Cuándo encaja?'),
    needs: ['K6'],
    label: t('Pulso'),
    hint: {
      keys: t('Con los relojes iguales, el pulso de las 9:00 lo sube de la cuna al núcleo'),
      touch: t('Con los relojes iguales, el pulso de las 9:00 lo sube de la cuna al núcleo'),
    },
    target: { kind: 'none' },
    done: (s) => cw(s).place === 'installed',
  },
];

const COUNTERWEIGHT_DEFS: readonly TaskDef[] = COUNTERWEIGHT_STEPS.map((def) => ({
  ...def,
  mission: STOP_COLLAPSE,
  live: true,
  shownWhen: (s: TaskState) =>
    COUNTERWEIGHT_CONCLUSIONS.some((id) => s.conclusions?.has(id) === true),
}));

const SETS: Readonly<Record<TaskSetId, { defs: readonly TaskDef[]; chain: boolean }>> = {
  // En el prólogo hacer algo de más adelante da por hecho lo anterior; en el bucle cada paso cuenta por sí solo.
  prologo: { defs: PROLOGUE_DEFS, chain: true },
  bucle: { defs: [...LOOP_DEFS, ...COUNTERWEIGHT_DEFS], chain: false },
};

/** Las tareas de cada juego, en orden. */
export function taskIds(set: TaskSetId): readonly TaskId[] {
  return SETS[set].defs.map((d) => d.id);
}

/** Las del prólogo (las de siempre). */
export const TASK_IDS: readonly TaskId[] = taskIds('prologo');

/** Para validar lo guardado: las tareas del bucle. */
export function isLoopTask(id: unknown): id is TaskId {
  return typeof id === 'string' && LOOP_DEFS.some((d) => d.id === id && !d.live);
}

function defOf(id: TaskId): TaskDef {
  const def = [...PROLOGUE_DEFS, ...LOOP_DEFS, ...COUNTERWEIGHT_DEFS].find((d) => d.id === id);
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
  /** La misión (el título de la lista cuando esta tarea es la de ahora). */
  mission?: string;
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
  private readonly defs: readonly TaskDef[];
  private readonly chain: boolean;
  private state: TaskState | undefined;

  /** @param already lo hecho en otras partidas (las del bucle se guardan). */
  constructor(
    readonly set: TaskSetId = 'prologo',
    already: Iterable<TaskId> = [],
  ) {
    this.defs = SETS[set].defs;
    this.chain = SETS[set].chain;
    for (const id of already) if (this.defs.some((d) => d.id === id && !d.live)) this.done.add(id);
  }

  /** Apunta lo hecho con este estado y devuelve la tarea que toca ahora (o ninguna si ya están todas). */
  update(state: TaskState): TaskId | undefined {
    this.state = state;
    if (this.chain) {
      let last = -1;
      this.defs.forEach((def, index) => {
        if (this.isDoneNow(def) || def.done(state)) last = index;
      });
      for (let index = 0; index <= last; index++) {
        const def = this.defs[index];
        if (def) this.done.add(def.id);
      }
    } else {
      for (const def of this.defs) if (!def.live && def.done(state)) this.done.add(def.id);
    }
    return this.currentDef()?.id;
  }

  /** Hecha ya: lo apuntado o, si es en vivo, lo que dice el estado de este momento. */
  private isDoneNow(def: TaskDef): boolean {
    if (def.live) return this.state !== undefined && def.done(this.state);
    return this.done.has(def.id);
  }

  /** Las tareas en vivo solo cuentan cuando se muestran (su condición de aparecer). */
  private isShown(def: TaskDef): boolean {
    if (def.after !== undefined && !this.done.has(def.after)) return false;
    return def.shownWhen === undefined || (this.state !== undefined && def.shownWhen(this.state));
  }

  private currentDef(): TaskDef | undefined {
    return this.defs.find((def) => this.isShown(def) && !this.isDoneNow(def));
  }

  isDone(id: TaskId): boolean {
    const def = this.defs.find((d) => d.id === id);
    return def !== undefined && this.isDoneNow(def);
  }

  /** Solo las apuntadas (las tareas en vivo no se guardan). */
  get doneIds(): readonly TaskId[] {
    return this.defs.filter((d) => !d.live && this.done.has(d.id)).map((d) => d.id);
  }

  /** A dónde apunta la tarea: a ninguna parte mientras el jugador aún no entiende el paso. */
  target(id: TaskId): TaskTarget {
    const def = this.defs.find((d) => d.id === id);
    if (def && !this.understands(def)) return { kind: 'none' };
    return taskTarget(id);
  }

  private understands(def: TaskDef): boolean {
    const known = this.state?.conclusions;
    return def.needs === undefined || def.needs.every((id) => known?.has(id) === true);
  }

  /** La lista para pintarla (sin las que aún no se han abierto). */
  items(touch: boolean): TaskItem[] {
    const current = this.currentDef()?.id;
    return this.defs
      .filter((def) => this.isShown(def))
      .map((def) => {
        const progress = this.state && def.progress?.(this.state);
        const unknown = !this.understands(def) && def.unknownTitle !== undefined;
        const baseTitle = unknown && def.unknownTitle !== undefined ? def.unknownTitle : def.title;
        const item: TaskItem = {
          id: def.id,
          title: progress
            ? `${baseTitle} (${String(progress.done)}/${String(progress.total)})`
            : baseTitle,
          done: this.isDoneNow(def),
          current: def.id === current,
          hint: unknown ? UNKNOWN_HINT_TEXT : touch ? def.hint.touch : def.hint.keys,
        };
        return def.mission === undefined ? item : { ...item, mission: def.mission };
      });
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
