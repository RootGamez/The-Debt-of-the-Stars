import { describe, expect, it } from 'vitest';
import { filterLookEvent, MAX_LOOK_EVENT_PIXELS } from '../../src/core/lookFilter';

describe('filterLookEvent', () => {
  it('deja pasar un gesto normal', () => {
    expect(filterLookEvent(12, -4)).toEqual({ x: 12, y: -4 });
  });

  it('deja pasar un giro rápido de un ratón lento (125 Hz)', () => {
    expect(filterLookEvent(-90, 10)).toEqual({ x: -90, y: 10 });
  });

  it('descarta el salto del cursor de cientos de píxeles en un evento', () => {
    expect(filterLookEvent(555, 3)).toBeNull();
    expect(filterLookEvent(0, -1232)).toBeNull();
  });

  it('el límite justo todavía cuenta', () => {
    expect(filterLookEvent(MAX_LOOK_EVENT_PIXELS, 0)).not.toBeNull();
  });

  it('descarta valores rotos', () => {
    expect(filterLookEvent(Number.NaN, 0)).toBeNull();
  });
});
