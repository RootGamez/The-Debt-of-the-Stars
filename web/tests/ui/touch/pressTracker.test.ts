// El seguimiento de pulsaciones de un botón táctil: quién lo sostiene, cuándo actúa y cuándo suelta.
import { describe, expect, it, vi } from 'vitest';
import { createPressTracker, KEYBOARD_POINTER } from '../../../src/ui/touch/pressTracker';

function setup(mode: 'tap' | 'hold' | 'toggle', trigger?: 'down' | 'up') {
  const onPress = vi.fn();
  const onRelease = vi.fn();
  const onToggle = vi.fn();
  const tracker = createPressTracker({ mode, trigger, onPress, onRelease, onToggle });
  return { tracker, onPress, onRelease, onToggle };
}

describe('hold buttons', () => {
  it('press on down and release on up', () => {
    const { tracker, onPress, onRelease } = setup('hold');
    expect(tracker.down(1)).toBe(true);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(tracker.held).toBe(true);
    tracker.up(1, { inside: true });
    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(tracker.held).toBe(false);
  });

  it('keeps the action when the finger slides out of the button', () => {
    const { tracker, onRelease } = setup('hold');
    tracker.down(1);
    expect(onRelease).not.toHaveBeenCalled();
    tracker.up(1, { inside: false });
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('releases on a cancelled pointer', () => {
    const { tracker, onRelease } = setup('hold');
    tracker.down(1);
    tracker.up(1, { cancelled: true });
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('ignores a second finger while the first holds it', () => {
    const { tracker, onPress, onRelease } = setup('hold');
    tracker.down(1);
    expect(tracker.down(2)).toBe(false);
    tracker.up(2);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRelease).not.toHaveBeenCalled();
    tracker.up(1);
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('releases only once even if up arrives twice', () => {
    const { tracker, onRelease } = setup('hold');
    tracker.down(1);
    tracker.up(1);
    tracker.up(1);
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('cancelAll releases a held button (it was hidden or disabled)', () => {
    const { tracker, onRelease } = setup('hold');
    tracker.down(1);
    tracker.cancelAll();
    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(tracker.held).toBe(false);
  });

  it('cancelAll does nothing when nothing is held', () => {
    const { tracker, onRelease } = setup('hold');
    tracker.cancelAll();
    expect(onRelease).not.toHaveBeenCalled();
  });
});

describe('tap buttons', () => {
  it('act on down by default', () => {
    const { tracker, onPress, onRelease } = setup('tap');
    tracker.down(1);
    expect(onPress).toHaveBeenCalledTimes(1);
    tracker.up(1, { inside: true });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRelease).not.toHaveBeenCalled();
  });

  it('act on up when asked, only if released inside the button', () => {
    const { tracker, onPress } = setup('tap', 'up');
    tracker.down(1);
    expect(onPress).not.toHaveBeenCalled();
    tracker.up(1, { inside: true });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('report that they acted on up, so the click that follows can be dropped', () => {
    const { tracker } = setup('tap', 'up');
    tracker.down(1);
    expect(tracker.up(1, { inside: true })).toBe(true);
    tracker.down(2);
    expect(tracker.up(2, { inside: false })).toBe(false);
    expect(setup('tap').tracker.up(9)).toBe(false);
  });

  it('do not act on up when released outside or cancelled', () => {
    const { tracker, onPress } = setup('tap', 'up');
    tracker.down(1);
    tracker.up(1, { inside: false });
    tracker.down(2);
    tracker.up(2, { cancelled: true });
    expect(onPress).not.toHaveBeenCalled();
  });

  it('cancelAll drops a pending press without acting', () => {
    const { tracker, onPress } = setup('tap', 'up');
    tracker.down(1);
    tracker.cancelAll();
    tracker.up(1, { inside: true });
    expect(onPress).not.toHaveBeenCalled();
  });

  it('can be pressed again after releasing', () => {
    const { tracker, onPress } = setup('tap');
    tracker.down(1);
    tracker.up(1);
    tracker.down(2);
    expect(onPress).toHaveBeenCalledTimes(2);
  });
});

describe('toggle buttons', () => {
  it('flip on every press', () => {
    const { tracker, onToggle } = setup('toggle');
    tracker.down(1);
    tracker.up(1);
    expect(tracker.on).toBe(true);
    tracker.down(2);
    tracker.up(2);
    expect(tracker.on).toBe(false);
    expect(onToggle.mock.calls).toEqual([[true], [false]]);
  });

  it('can be set from outside without firing the handler', () => {
    const { tracker, onToggle } = setup('toggle');
    tracker.setOn(true);
    expect(tracker.on).toBe(true);
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('disabled buttons', () => {
  it('refuse every press', () => {
    const { tracker, onPress } = setup('hold');
    tracker.setDisabled(true);
    expect(tracker.down(1)).toBe(false);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('release a held button when they become disabled', () => {
    const { tracker, onRelease } = setup('hold');
    tracker.down(1);
    tracker.setDisabled(true);
    expect(onRelease).toHaveBeenCalledTimes(1);
  });
});

describe('activate (keyboard and screen readers)', () => {
  it('presses and releases a hold button in one go', () => {
    const { tracker, onPress, onRelease } = setup('hold');
    tracker.activate();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(tracker.held).toBe(false);
  });

  it('acts once for a tap even when its trigger is up', () => {
    const { tracker, onPress } = setup('tap', 'up');
    tracker.activate();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not interrupt a finger already holding the button', () => {
    const { tracker, onPress } = setup('hold');
    tracker.down(3);
    tracker.activate();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(tracker.held).toBe(true);
  });

  it('uses a pointer id that no finger has', () => {
    expect(KEYBOARD_POINTER).toBeLessThan(0);
  });
});
