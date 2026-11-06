import { describe, expect, it } from 'vitest';
import {
  HINT_SECONDS,
  ISLAND_FACT,
  MISSION_FACT,
  MOON_FRAGMENT_FACT,
  SHEET_FACT,
  TASK_IDS,
  isLoopTask,
  taskIds,
  TaskHints,
  TaskTracker,
  taskHint,
  taskTarget,
  type TaskState,
} from '../../src/game/tasks';

const START: TaskState = {
  walked: 0,
  facts: new Set(),
  opened: new Set(),
  registryOpened: false,
  piloting: false,
  onMoon: false,
};

describe('the tasks of the prologue', () => {
  it('go in the order of the story: move, neighbor, teacher, ship, island, director, Moon, back to the ship', () => {
    expect(TASK_IDS).toEqual([
      'andar',
      'vecina',
      'maestra',
      'ficha',
      'registro',
      'mecanica',
      'nave',
      'isla',
      'directora',
      'luna',
      'fragmento',
      'volver',
    ]);
  });

  it('asks for one thing at a time and moves on as each is done', () => {
    const tracker = new TaskTracker();
    let s = START;
    expect(tracker.update(s)).toBe('andar');
    s = { ...s, walked: 5 };
    expect(tracker.update(s)).toBe('vecina');
    s = { ...s, opened: new Set(['aldea.arbol']) };
    expect(tracker.update(s)).toBe('maestra');
    s = { ...s, opened: new Set([...s.opened, 'instituto.maestra']) };
    expect(tracker.update(s)).toBe('ficha');
    s = { ...s, facts: new Set([SHEET_FACT]) };
    expect(tracker.update(s)).toBe('registro');
    s = { ...s, registryOpened: true };
    expect(tracker.update(s)).toBe('mecanica');
    s = { ...s, opened: new Set([...s.opened, 'instituto.mecanica']) };
    expect(tracker.update(s)).toBe('nave');
    s = { ...s, piloting: true };
    expect(tracker.update(s)).toBe('isla');
    s = { ...s, facts: new Set([SHEET_FACT, ISLAND_FACT]) };
    expect(tracker.update(s)).toBe('directora');
    s = { ...s, facts: new Set([SHEET_FACT, ISLAND_FACT, MISSION_FACT]) };
    expect(tracker.update(s)).toBe('luna');
    s = { ...s, piloting: false, onMoon: true };
    expect(tracker.update(s)).toBe('fragmento');
    s = { ...s, facts: new Set([...s.facts, MOON_FRAGMENT_FACT]) };
    expect(tracker.update(s)).toBe('volver');
    s = { ...s, onMoon: false, piloting: true };
    expect(tracker.update(s)).toBeUndefined();
    expect(tracker.doneIds).toEqual(TASK_IDS);
  });

  it('never goes back, even if the state does', () => {
    const tracker = new TaskTracker();
    tracker.update({ ...START, walked: 5 });
    expect(tracker.update(START)).toBe('vecina');
    expect(tracker.isDone('andar')).toBe(true);
  });

  it('takes the earlier tasks as done when a later one is done first', () => {
    const tracker = new TaskTracker();
    expect(tracker.update({ ...START, piloting: true })).toBe('isla');
    expect(tracker.doneIds).toEqual([
      'andar',
      'vecina',
      'maestra',
      'ficha',
      'registro',
      'mecanica',
      'nave',
    ]);
  });

  it('lists every task with its box and marks the one that is on', () => {
    const tracker = new TaskTracker();
    tracker.update({ ...START, walked: 5 });
    const items = tracker.items(false);
    expect(items.map((i) => i.done)).toEqual([true, ...Array<boolean>(11).fill(false)]);
    expect(items.filter((i) => i.current).map((i) => i.id)).toEqual(['vecina']);
    expect(items[1]?.hint).toBe(taskHint('vecina', false));
  });

  it('points to the neighbor first and to the Moon later, and has a touch wording for each hint', () => {
    expect(taskTarget('vecina')).toEqual({ kind: 'source', id: 'aldea.arbol' });
    expect(taskTarget('luna')).toEqual({ kind: 'world', world: 'luna' });
    expect(taskTarget('andar')).toEqual({ kind: 'none' });
    for (const id of TASK_IDS) {
      expect(taskHint(id, true).length).toBeGreaterThan(0);
      expect(taskHint(id, true)).not.toMatch(/\bpulsa\b/i);
    }
  });
});

describe('the hint of the task', () => {
  it('shows when a task starts and goes away after a few seconds', () => {
    const hints = new TaskHints();
    expect(hints.update('andar', 0)).toBe('andar');
    expect(hints.update('andar', HINT_SECONDS - 1)).toBe('andar');
    expect(hints.update('andar', 2)).toBeUndefined();
  });

  it('comes back with a new task and when it is asked for again', () => {
    const hints = new TaskHints();
    hints.update('andar', 0);
    hints.update('andar', HINT_SECONDS + 1);
    expect(hints.update('vecina', 0)).toBe('vecina');
    hints.update('vecina', HINT_SECONDS + 1);
    expect(hints.update('vecina', 0)).toBeUndefined();
    hints.recall();
    expect(hints.update('vecina', 0)).toBe('vecina');
  });

  it('does not run while the game is paused', () => {
    const hints = new TaskHints();
    hints.update('andar', 0);
    for (let k = 0; k < 100; k++) hints.update('andar', 0);
    expect(hints.update('andar', 0)).toBe('andar');
  });

  it('shows nothing when every task is done', () => {
    const hints = new TaskHints();
    expect(hints.update(undefined, 1)).toBeUndefined();
  });
});

describe('the tasks of the loop (first steps in the unknown, then every planet)', () => {
  const LOOP: TaskState = {
    ...START,
    visited: new Set(['umbral']),
    explorable: ['umbral', 'archivo', 'taller'],
  };

  it('start with the building next to where you woke, then where you are, then the ship', () => {
    const tracker = new TaskTracker('bucle');
    expect(tracker.update(LOOP)).toBe('explorar');
    expect(taskTarget('explorar')).toEqual({ kind: 'source', id: 'umbral.mural' });
    expect(tracker.update({ ...LOOP, opened: new Set(['umbral.mural']) })).toBe('ubicarse');
    expect(taskTarget('ubicarse')).toEqual({ kind: 'source', id: 'umbral.consola_mando' });
    expect(tracker.update({ ...LOOP, opened: new Set(['umbral.consola_mando']) })).toBe(
      'nave_umbral',
    );
    expect(taskTarget('nave_umbral')).toEqual({ kind: 'ship' });
  });

  it('counts each step on its own: going to the ship first does not tick the others', () => {
    const tracker = new TaskTracker('bucle');
    expect(tracker.update({ ...LOOP, piloting: true })).toBe('explorar');
    expect(tracker.doneIds).toEqual(['nave_umbral']);
  });

  it('opens "every planet" only with the ship, and counts the worlds visited', () => {
    const tracker = new TaskTracker('bucle');
    tracker.update(LOOP);
    expect(tracker.items(false).map((i) => i.id)).toEqual(['explorar', 'ubicarse', 'nave_umbral']);
    expect(tracker.items(false)[0]?.mission).toBe('Primeros pasos en lo desconocido');
    tracker.update({ ...LOOP, piloting: true, visited: new Set(['umbral', 'archivo']) });
    const planets = tracker.items(false).find((i) => i.id === 'planetas');
    expect(planets?.title).toBe('Visita cada mundo del sistema (2/3)');
    expect(planets?.mission).toBe('Explora cada planeta del sistema');
    expect(planets?.done).toBe(false);
    tracker.update({ ...LOOP, visited: new Set(['umbral', 'archivo', 'taller']) });
    expect(tracker.isDone('planetas')).toBe(true);
  });

  it('remembers what was done in earlier games and ignores what is not of the loop', () => {
    const tracker = new TaskTracker('bucle', ['explorar', 'andar']);
    expect(tracker.update(LOOP)).toBe('ubicarse');
    expect(tracker.doneIds).toEqual(['explorar']);
    expect(isLoopTask('ubicarse')).toBe(true);
    expect(isLoopTask('andar')).toBe(false);
    expect(isLoopTask(7)).toBe(false);
  });

  it('keeps the prologue as it was', () => {
    expect(taskIds('prologo')).toEqual(TASK_IDS);
    expect(taskIds('bucle')).toEqual([
      'explorar',
      'ubicarse',
      'nave_umbral',
      'planetas',
      'cw_coger',
      'cw_llevar',
      'cw_motor',
      'cw_ruedas',
      'cw_pulso',
    ]);
  });
});

describe('the plan of the Counterweight (a mission that ticks itself off within the cycle)', () => {
  const DONE_BEFORE = ['explorar', 'ubicarse', 'nave_umbral', 'planetas'] as const;
  const ALL = new Set(['K3', 'K4', 'K5', 'K6']);
  const BENCH = { place: 'bench', motorOut: false, matched: false } as const;
  const LOOP: TaskState = { ...START, visited: new Set(['umbral']), explorable: ['umbral'] };
  const ids = (tracker: TaskTracker) => tracker.items(false).map((i) => i.id);

  it('does not show up until something of the Counterweight is understood', () => {
    const tracker = new TaskTracker('bucle', DONE_BEFORE);
    tracker.update({ ...LOOP, conclusions: new Set(['K3']), counterweight: BENCH });
    expect(ids(tracker).some((id) => id.startsWith('cw_'))).toBe(false);

    tracker.update({ ...LOOP, conclusions: new Set(['K4']), counterweight: BENCH });
    expect(ids(tracker).filter((id) => id.startsWith('cw_'))).toEqual([
      'cw_coger',
      'cw_llevar',
      'cw_motor',
      'cw_ruedas',
      'cw_pulso',
    ]);
    expect(tracker.items(false).find((i) => i.id === 'cw_coger')?.mission).toBe(
      'Detener el colapso',
    );
  });

  it('asks instead of telling while a step is not understood, and then points nowhere', () => {
    const tracker = new TaskTracker('bucle', DONE_BEFORE);
    tracker.update({ ...LOOP, conclusions: new Set(['K4']), counterweight: BENCH });
    const carry = tracker.items(false).find((i) => i.id === 'cw_llevar');

    expect(carry?.title).toBe('¿Dónde se instala el Contrapeso?');
    expect(tracker.target('cw_llevar')).toEqual({ kind: 'none' });

    tracker.update({ ...LOOP, conclusions: ALL, counterweight: BENCH });
    expect(tracker.items(false).find((i) => i.id === 'cw_llevar')?.title).toBe(
      'Llévalo a la Sala del Motor de Cicatriz',
    );
    expect(tracker.target('cw_llevar')).toEqual({ kind: 'world', world: 'cicatriz' });
  });

  it('never points at the Laboratory: finding it is the deduction', () => {
    expect(taskTarget('cw_coger')).toEqual({ kind: 'none' });
  });

  it('ticks each step from the state of this cycle, and unticks it when the cycle starts over', () => {
    const tracker = new TaskTracker('bucle', DONE_BEFORE);
    const at = (counterweight: NonNullable<TaskState['counterweight']>, world = 'laboratorio') =>
      tracker.update({ ...LOOP, conclusions: ALL, counterweight, world });

    expect(at(BENCH)).toBe('cw_coger');
    expect(at({ place: 'carried', motorOut: false, matched: false })).toBe('cw_llevar');
    expect(at({ place: 'carried', motorOut: false, matched: false }, 'cicatriz')).toBe('cw_motor');
    expect(at({ place: 'carried', motorOut: true, matched: false }, 'cicatriz')).toBe('cw_ruedas');
    expect(at({ place: 'cradle', motorOut: true, matched: true }, 'cicatriz')).toBe('cw_pulso');
    expect(at({ place: 'installed', motorOut: true, matched: true }, 'cicatriz')).toBeUndefined();

    expect(at(BENCH)).toBe('cw_coger');
    expect(tracker.doneIds).toEqual(DONE_BEFORE);
  });

  it('is not saved: the Counterweight goes back to its Bench every cycle', () => {
    expect(isLoopTask('cw_coger')).toBe(false);
    expect(new TaskTracker('bucle', ['cw_coger']).doneIds).toEqual([]);
  });
});
