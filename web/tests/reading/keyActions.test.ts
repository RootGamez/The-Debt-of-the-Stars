import { describe, expect, it } from 'vitest';
import { keyAction, type KeyContext, type KeyInput } from '../../src/reading/keyActions';

const context = (overrides: Partial<KeyContext> = {}): KeyContext => ({
  playing: true,
  readingOpen: false,
  registryOpen: false,
  canInteract: true,
  hasTarget: true,
  hasTasks: false,
  ...overrides,
});

const key = (code: string, extra: Partial<KeyInput> = {}): KeyInput => ({
  code,
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...extra,
});

describe('E', () => {
  it('reads the source in front of you', () => {
    expect(keyAction(context(), key('KeyE'))).toBe('interact');
  });

  it('closes the reading that is open, even without a target', () => {
    expect(keyAction(context({ readingOpen: true, hasTarget: false }), key('KeyE'))).toBe(
      'interact',
    );
  });

  it('does nothing without a source in front or when interaction is not possible', () => {
    expect(keyAction(context({ hasTarget: false }), key('KeyE'))).toBe('none');
    expect(keyAction(context({ canInteract: false }), key('KeyE'))).toBe('none');
  });
});

describe('Escape', () => {
  it('closes the Registro first', () => {
    expect(keyAction(context({ registryOpen: true, readingOpen: true }), key('Escape'))).toBe(
      'close-registry',
    );
  });

  it('closes a reading when the Registro is not open', () => {
    expect(keyAction(context({ readingOpen: true }), key('Escape'))).toBe('close-reading');
  });

  it('is left to the pause screen when nothing of ours is open', () => {
    expect(keyAction(context(), key('Escape'))).toBe('none');
  });
});

describe('R and Tab', () => {
  it('R opens the Registro and a second R closes it', () => {
    expect(keyAction(context(), key('KeyR'))).toBe('open-registry');
    expect(keyAction(context({ registryOpen: true, playing: false }), key('KeyR'))).toBe(
      'close-registry',
    );
  });

  it('R also works from the pause screen', () => {
    expect(keyAction(context({ playing: false }), key('KeyR'))).toBe('open-registry');
  });

  it('Tab opens the Registro only while playing, so it can still move the focus in the pause screen', () => {
    expect(keyAction(context(), key('Tab'))).toBe('open-registry');
    expect(keyAction(context({ playing: false }), key('Tab'))).toBe('none');
  });
});

describe('T', () => {
  it('does nothing without tasks (outside the prologue it is the ship targeting key)', () => {
    expect(keyAction(context(), key('KeyT'))).toBe('none');
  });

  it('opens the tasks page of the notebook in the prologue, and closes it again', () => {
    expect(keyAction(context({ hasTasks: true }), key('KeyT'))).toBe('open-tasks');
    expect(keyAction(context({ hasTasks: true, registryOpen: true }), key('KeyT'))).toBe(
      'close-registry',
    );
  });
});

describe('keys that must be ignored', () => {
  it.each([
    ['a held key (repeat)', { repeat: true }],
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
    ['Alt', { altKey: true }],
    ['Shift', { shiftKey: true }],
  ])('ignores %s', (_name, extra) => {
    for (const code of ['KeyE', 'KeyR', 'Tab', 'Escape']) {
      expect(keyAction(context({ readingOpen: true }), key(code, extra))).toBe('none');
    }
  });

  it('ignores unrelated keys', () => {
    expect(keyAction(context(), key('KeyW'))).toBe('none');
  });
});
