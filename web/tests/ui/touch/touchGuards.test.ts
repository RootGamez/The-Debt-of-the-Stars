// Que mantener pulsado en el teléfono no seleccione texto ni abra el menú del navegador.
import { describe, expect, it } from 'vitest';
import { installTouchGuards, isTextEntry, TOUCH_CLASS } from '../../../src/ui/touch/touchGuards';

interface FakeEvent {
  type: string;
  target: unknown;
  defaultPrevented: boolean;
  preventDefault(): void;
}

function fakeEvent(type: string, target: unknown): FakeEvent {
  const event: FakeEvent = {
    type,
    target,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  return event;
}

function fakeDocument() {
  const listeners = new Map<string, Set<(event: FakeEvent) => void>>();
  const classes = new Set<string>();
  return {
    classes,
    documentElement: {
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
      },
    },
    addEventListener(type: string, listener: (event: FakeEvent) => void, options?: unknown) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
      const signal = (options as { signal?: AbortSignal } | undefined)?.signal;
      signal?.addEventListener('abort', () => set.delete(listener));
    },
    fire(type: string, target: unknown = { tagName: 'DIV' }): FakeEvent {
      const event = fakeEvent(type, target);
      for (const listener of listeners.get(type) ?? []) listener(event);
      return event;
    },
    count(type: string): number {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

describe('isTextEntry', () => {
  it('is true for fields where text is typed', () => {
    expect(isTextEntry({ tagName: 'INPUT' })).toBe(true);
    expect(isTextEntry({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isTextEntry({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });

  it('is true for a text node inside a field', () => {
    expect(isTextEntry({ nodeType: 3, parentElement: { tagName: 'INPUT' } })).toBe(true);
  });

  it('is false for buttons, text and nothing', () => {
    expect(isTextEntry({ tagName: 'BUTTON' })).toBe(false);
    expect(isTextEntry({ tagName: 'P' })).toBe(false);
    expect(isTextEntry(null)).toBe(false);
    expect(isTextEntry(undefined)).toBe(false);
  });
});

describe('installTouchGuards', () => {
  it('marks the page as touch', () => {
    const doc = fakeDocument();
    installTouchGuards(doc);
    expect(doc.classes.has(TOUCH_CLASS)).toBe(true);
  });

  it.each(['contextmenu', 'selectstart', 'dragstart'])('cancels %s', (type) => {
    const doc = fakeDocument();
    installTouchGuards(doc);
    expect(doc.fire(type).defaultPrevented).toBe(true);
  });

  it.each(['contextmenu', 'selectstart', 'dragstart'])(
    'lets %s through in a text field',
    (type) => {
      const doc = fakeDocument();
      installTouchGuards(doc);
      expect(doc.fire(type, { tagName: 'INPUT' }).defaultPrevented).toBe(false);
    },
  );

  it('blocks the pinch gesture only where the game says so', () => {
    const doc = fakeDocument();
    const canvas = { tagName: 'CANVAS' };
    installTouchGuards(doc, { blocksGesture: (target) => target === canvas });
    expect(doc.fire('gesturestart', canvas).defaultPrevented).toBe(true);
    expect(doc.fire('gesturechange', canvas).defaultPrevented).toBe(true);
    expect(doc.fire('gesturestart', { tagName: 'P' }).defaultPrevented).toBe(false);
  });

  it('does not block the pinch gesture by default', () => {
    const doc = fakeDocument();
    installTouchGuards(doc);
    expect(doc.fire('gesturestart').defaultPrevented).toBe(false);
  });

  it('removes the class and every listener when disposed', () => {
    const doc = fakeDocument();
    const dispose = installTouchGuards(doc);
    dispose();
    expect(doc.classes.has(TOUCH_CLASS)).toBe(false);
    expect(doc.count('contextmenu')).toBe(0);
    expect(doc.fire('selectstart').defaultPrevented).toBe(false);
  });
});
