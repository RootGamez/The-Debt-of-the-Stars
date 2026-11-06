import { describe, expect, it } from 'vitest';
import {
  HINT_SECONDS,
  ISLAND_FACT,
  MISSION_FACT,
  MOON_FRAGMENT_FACT,
  SHEET_FACT,
  TASK_IDS,
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
