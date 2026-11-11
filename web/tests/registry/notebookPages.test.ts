import { describe, expect, it } from 'vitest';
import { loadClues } from '../../src/data/pistas';
import { TaskTracker } from '../../src/game/tasks';
import { buildRegistryView } from '../../src/registry/registryView';
import {
  PAGE_CAPACITY,
  notebookPages,
  prologuePages,
  sectionPage,
  spreadOf,
  weightOf,
  type NotebookPage,
} from '../../src/registry/notebookPages';
import { withDiscovery, worldPages } from '../../src/worlds/worldLog';

const clues = loadClues();
const nothingNew = { facts: new Set<string>(), worlds: new Set<string>() };

function pagesFor(known: ReadonlySet<string>, fresh = nothingNew): NotebookPage[] {
  const log = withDiscovery({}, 'umbral', 0);
  return notebookPages(buildRegistryView(clues, known), worldPages(log, clues, known), fresh);
}

function threadPages(pages: readonly NotebookPage[]) {
  return pages.filter((page) => page.kind === 'thread');
}

const everything = new Set(clues.facts.keys());

describe('the pages of the notebook', () => {
  it('opens with the cover and ends with the back cover, always on whole leaves', () => {
    for (const known of [new Set<string>(), everything]) {
      const pages = pagesFor(known);
      expect(pages[0]?.kind).toBe('cover');
      expect(pages.at(-1)?.kind).toBe('back');
      expect(pages.length % 2).toBe(0);
    }
  });

  it('has the flyleaf, "what I know", every question and the log of worlds, in that order', () => {
    const kinds = pagesFor(new Set()).map((page) => page.kind);

    expect(kinds.indexOf('flyleaf')).toBe(1);
    expect(kinds.indexOf('known')).toBe(2);
    expect(kinds.indexOf('thread')).toBe(3);
    expect(kinds.indexOf('worlds')).toBeGreaterThan(kinds.lastIndexOf('thread'));
    expect(kinds.indexOf('world')).toBe(kinds.indexOf('worlds') + 1);
  });

  it('gives each question a page even when nothing is known about it yet', () => {
    const pages = threadPages(pagesFor(new Set()));

    expect(pages.map((page) => page.threadId)).toEqual(clues.threads.map((thread) => thread.id));
    expect(pages.every((page) => page.entries.length === 0)).toBe(true);
  });

  it('continues a long question on the next page instead of overflowing', () => {
    const pages = threadPages(pagesFor(everything));

    expect(pages.length).toBeGreaterThan(clues.threads.length);
    for (const page of pages) expect(page.entries.length).toBeLessThanOrEqual(PAGE_CAPACITY);
    const parts = pages.filter((page) => page.part > 0);
    expect(parts.length).toBeGreaterThan(0);
    // Todo lo sabido sigue estando: ningún hecho se pierde al partir.
    const written = pages.flatMap((page) => page.entries.map((entry) => entry.id));
    for (const thread of buildRegistryView(clues, everything).threads) {
      for (const fact of thread.facts) expect(written).toContain(fact.id);
    }
  });

  it('marks what was noted since the notebook was last opened', () => {
    const known = new Set(['silencio.consejo_existe']);
    const pages = pagesFor(known, {
      facts: new Set(['silencio.consejo_existe']),
      worlds: new Set(['umbral']),
    });

    const entries = threadPages(pages).flatMap((page) => page.entries);
    expect(entries.find((entry) => entry.id === 'silencio.consejo_existe')?.fresh).toBe(true);
    const umbral = pages.find((page) => page.kind === 'world' && page.world.id === 'umbral');
    expect(umbral).toMatchObject({ fresh: true });
  });

  it('numbers the worlds in the index with the page where each one is', () => {
    const pages = pagesFor(new Set());
    const index = pages.find((page) => page.kind === 'worlds');

    for (const entry of index?.kind === 'worlds' ? index.worlds : []) {
      const page = pages[entry.page];
      expect(page?.kind === 'world' && page.world.id).toBe(entry.id);
    }
    expect(index?.kind === 'worlds' && index.worlds.map((w) => w.name)).toEqual([
      'Hogar',
      'Luna',
      'Umbral',
    ]);
  });
});

describe('turning to a page', () => {
  it('shows the cover closed, then two pages at a time', () => {
    expect(spreadOf(0)).toBe(0);
    expect(spreadOf(1)).toBe(1);
    expect(spreadOf(2)).toBe(1);
    expect(spreadOf(3)).toBe(2);
  });

  it('finds where the questions and the worlds start', () => {
    const pages = pagesFor(new Set());

    expect(pages[sectionPage(pages, 'thread')]?.kind).toBe('thread');
    expect(pages[sectionPage(pages, 'worlds')]?.kind).toBe('worlds');
    expect(sectionPage([{ kind: 'cover' }, { kind: 'back' }], 'worlds')).toBe(0);
  });
});

describe('the notebook of the prologue', () => {
  const tasks = new TaskTracker().items(false);
  const learned = (n: number) =>
    Array.from({ length: n }, (_, k) => ({
      id: `casa.hecho${String(k)}`,
      line: `Hecho ${String(k)}`,
      fresh: k === 0,
    }));

  it('has only the cover, the flyleaf, the tasks and what has been learned: nothing about the Absent', () => {
    const pages = prologuePages(tasks, learned(3));
    expect(pages.map((p) => p.kind)).toEqual([
      'cover',
      'flyleaf',
      'tasks',
      'learned',
      'blank',
      'back',
    ]);
    expect(
      pages.some((p) => p.kind === 'thread' || p.kind === 'known' || p.kind === 'worlds'),
    ).toBe(false);
  });

  it('puts the tasks on the first page you see when you open it', () => {
    const pages = prologuePages(tasks, []);
    expect(sectionPage(pages, 'tasks')).toBe(2);
    expect(spreadOf(2)).toBe(1);
  });

  it('keeps whole leaves and spills what is learned onto more pages when it does not fit', () => {
    const pages = prologuePages(tasks, learned(PAGE_CAPACITY * 2 + 1));
    expect(pages.filter((p) => p.kind === 'learned').length).toBeGreaterThan(2);
    expect(pages.length % 2).toBe(0);
    expect(pages.at(-1)?.kind).toBe('back');
  });

  it('shows an empty page of lessons when nothing is learned yet', () => {
    const pages = prologuePages(tasks, []);
    const page = pages.find((p) => p.kind === 'learned');
    expect(page).toMatchObject({ kind: 'learned', total: 0 });
  });

  it('gives one deduction page to every conclusion already started, right after "what I know"', () => {
    const pages = pagesFor(new Set(['lab.existe_lugar_lento']));
    const kinds = pages.map((page) => page.kind);
    const deductions = pages.flatMap((page) =>
      page.kind === 'deduction' ? [page.deduction.id] : [],
    );

    expect(deductions).toEqual(['K1', 'K3']);
    expect(kinds.indexOf('deduction')).toBe(kinds.indexOf('known') + 1);
  });

  it('has no deduction pages when nothing is known', () => {
    expect(pagesFor(new Set()).some((page) => page.kind === 'deduction')).toBe(false);
  });

  it('gives a fact with a sketch more room, so its page fills up sooner', () => {
    const plain = { kind: 'fact' as const, id: 'a', line: 'x', related: [], fresh: false };
    const sketched = { ...plain, sketch: 'mapa_cielo' };

    expect(weightOf(sketched)).toBeGreaterThan(weightOf(plain));
  });
});
