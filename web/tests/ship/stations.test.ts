import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { STATION_REACH, stationInFocus, type Station } from '../../src/ship/stations';

const STATIONS: Station[] = [
  { id: 'asiento', position: new Vector3(0, 0, -2) },
  { id: 'registro', position: new Vector3(2, 0, 0) },
  { id: 'mapa', position: new Vector3(0, 0, 1) },
];
const FORWARD = new Vector3(0, 0, -1);

describe('stationInFocus', () => {
  it('picks the one in front of the eyes and within reach', () => {
    const focused = stationInFocus(STATIONS, new Vector3(0, 0, -0.8), FORWARD);

    expect(focused?.id).toBe('asiento');
  });

  it('ignores what is behind you or to a side', () => {
    expect(stationInFocus(STATIONS, new Vector3(0, 0, 0), new Vector3(0, 1, 0))).toBeUndefined();
  });

  it('ignores what is out of reach', () => {
    const far = new Vector3(0, 0, -2 + STATION_REACH + 0.5);

    expect(stationInFocus(STATIONS, far, FORWARD)?.id).not.toBe('asiento');
  });

  it('prefers the one you look at more squarely when two are close', () => {
    const eye = new Vector3(1, 0, -1);
    const towardRegistry = new Vector3(1, 0, 1).normalize();

    expect(stationInFocus(STATIONS, eye, towardRegistry)?.id).toBe('registro');
  });
});
