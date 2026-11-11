// El juego de iconos táctiles: todos dibujados igual y con un nombre por cada cosa que se puede hacer.
import { describe, expect, it } from 'vitest';
import { ICON_NAMES, iconMarkup } from '../../../src/ui/touch/touchIcons';

describe('touch icons', () => {
  it('has the icons the plan names', () => {
    for (const name of [
      'jump',
      'up',
      'down',
      'seat',
      'stand',
      'read',
      'grab',
      'drop',
      'book',
      'map',
      'target',
      'stabilize',
      'camera',
      'brake',
      'land',
      'rollLeft',
      'rollRight',
      'light',
      'sight',
      'pause',
      'more',
      'fullscreen',
      'eye',
      'close',
    ]) {
      expect(ICON_NAMES).toContain(name);
    }
  });

  it('draws every icon as vector paths and never as text or emoji', () => {
    for (const name of ICON_NAMES) {
      const markup = iconMarkup(name);
      expect(markup).toMatch(/^(<(path|circle|rect|line|polyline|ellipse)\b[^>]*\/>)+$/);
      expect(markup).not.toMatch(/[^\x20-\x7e]/);
    }
  });

  it('gives each icon its own drawing', () => {
    const drawings = ICON_NAMES.map((name) => iconMarkup(name));
    expect(new Set(drawings).size).toBe(drawings.length);
  });
});
