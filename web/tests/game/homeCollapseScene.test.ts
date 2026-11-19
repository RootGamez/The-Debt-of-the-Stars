// Las escenas del final malo (F5): las dos llegadas y el colapso. Guion válido, cortes que no se notan, cámaras que
// no atraviesan el suelo ni la Puerta, y lo importante a la vista en su momento.
import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../../src/cinematic/cameraTrack';
import { cameraAt, trackValue, validateCinematic } from '../../src/cinematic/timeline';
import { COLLAPSE } from '../../src/game/homeCollapse';
import {
  arrivalByShip,
  arrivalOnFoot,
  collapseCinematic,
  ELDER,
  GATE_FLASH_CUE,
  heightAboveGround,
  HOME_PLACES,
  type CameraEnd,
} from '../../src/game/homeCollapseScene';
import { EN } from '../../src/i18n/en';
import { GATE_SPHERE_RADIUS } from '../../src/worlds/procedural/hogarLaterShape';

/** La vista del jugador al pie de la escalinata, mirando al Instituto (marco del ancla). */
const EYE: CameraEnd = { pos: [0, 7.6, -7.02], look: [0, 60, -7.02] };
const SHIP: Vec3 = [0, 9, 290];
const COCKPIT: CameraEnd = { pos: [0, 8.6, 290.4], look: [0, 30, 200] };
const MOON: Vec3 = [900, 1400, 600];

const onFoot = arrivalOnFoot(COLLAPSE.arrival.boca, EYE);
const byShip = arrivalByShip(COLLAPSE.arrival.archivo, SHIP, COCKPIT);
const collapse = collapseCinematic(COLLAPSE, MOON);

/** El ángulo (rad) entre lo que mira la cámara en `time` y un punto. */
function angleTo(scene: typeof collapse, time: number, point: Vec3): number {
  const { pos, look } = cameraAt(scene, time);
  const a = look.map((v, i) => v - (pos[i] ?? 0));
  const b = point.map((v, i) => v - (pos[i] ?? 0));
  const dot = a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
  return Math.acos(dot / (Math.hypot(...a) * Math.hypot(...b)));
}

function closeTo(a: Vec3, b: Vec3): void {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i] ?? 0, 3);
}

describe('the scenes of the bad ending (F5)', () => {
  it('are valid scripts that last what the data says', () => {
    for (const scene of [onFoot, byShip, collapse]) expect(validateCinematic(scene)).toEqual([]);
    expect(onFoot.duration).toBe(COLLAPSE.arrival.boca);
    expect(byShip.duration).toBe(COLLAPSE.arrival.archivo);
    expect(collapse.duration).toBe(COLLAPSE.scene.duration);
    expect(collapseCinematic(COLLAPSE, undefined).shots.length).toBe(collapse.shots.length);
  });

  it('knows where home is from the Gate: the centre below, the Instituto ahead', () => {
    expect(HOME_PLACES.center[2]).toBeLessThan(-120);
    expect(HOME_PLACES.instituto[1]).toBeGreaterThan(50);
    expect(heightAboveGround([0, 7.6, -8.1])).toBeCloseTo(0, 0);
  });
});

describe('the two arrivals', () => {
  it('open from black and end exactly on the view the game starts with', () => {
    for (const [scene, end] of [
      [onFoot, EYE],
      [byShip, COCKPIT],
    ] as const) {
      expect(trackValue(scene, 'fade', 0)).toBe(1);
      expect(trackValue(scene, 'fade', 4)).toBe(0);
      expect(trackValue(scene, 'bars', scene.duration)).toBe(0);
      const last = cameraAt(scene, scene.duration);
      closeTo(last.pos, end.pos);
      closeTo(last.look, end.look);
      // Con movimiento reducido el último plano también acaba ahí.
      closeTo(cameraAt(scene, scene.duration, true).pos, end.pos);
    }
  });

  it('walks out of the lit Gate on foot without going through the ground or into its sphere', () => {
    expect(onFoot.cues.map((cue) => cue.id)).toContain(GATE_FLASH_CUE);
    for (let time = 0; time <= onFoot.duration; time += 0.25) {
      const { pos } = cameraAt(onFoot, time);
      expect(heightAboveGround(pos)).toBeGreaterThan(0.4);
      expect(Math.hypot(...pos)).toBeGreaterThan(GATE_SPHERE_RADIUS);
    }
    // El primer plano enseña la Puerta.
    expect(angleTo(onFoot, 1, [0, 0, 0])).toBeLessThan(0.2);
  });

  it('shows the ship from outside, then the lit Gate, and blinks to black into the cabin', () => {
    const { pos } = cameraAt(byShip, 1);
    expect(Math.hypot(pos[0] - SHIP[0], pos[1] - SHIP[1], pos[2] - SHIP[2])).toBeGreaterThan(10);
    expect(angleTo(byShip, 1, SHIP)).toBeLessThan(0.25);
    const aerial = byShip.shots.find((s) => s.id === 'puerta');
    if (!aerial) throw new Error('falta el plano de la Puerta');
    expect(angleTo(byShip, aerial.start + 1, [0, 0, 0])).toBeLessThan(0.3);
    expect(heightAboveGround(cameraAt(byShip, aerial.start + 1).pos)).toBeGreaterThan(40);
    // Se entra en el casco a oscuras.
    const cabin = byShip.shots.find((s) => s.id === 'cabina');
    if (!cabin) throw new Error('falta el paso a la cabina');
    for (let time = cabin.start; time <= byShip.duration; time += 0.1) {
      expect(trackValue(byShip, 'fade', time)).toBeCloseTo(1, 3);
    }
  });
});

describe('the collapse', () => {
  const born = COLLAPSE.hole.born;

  it('cuts in from the game without black and ends in black before the card', () => {
    expect(trackValue(collapse, 'fade', 0)).toBe(0);
    expect(trackValue(collapse, 'bars', 0)).toBe(0);
    expect(trackValue(collapse, 'fade', COLLAPSE.fade[1])).toBe(1);
    expect(trackValue(collapse, 'fade', collapse.duration)).toBe(1);
  });

  it('is looking at the throat of the Gate when the hole is born', () => {
    expect(angleTo(collapse, born, [0, 0, 0])).toBeLessThan(0.15);
    expect(heightAboveGround(cameraAt(collapse, born).pos)).toBeGreaterThan(1);
  });

  it('keeps the cameras above the ground while Hogar is still whole', () => {
    for (let time = 0; time < COLLAPSE.absorption.hogar[0]; time += 0.25) {
      expect(heightAboveGround(cameraAt(collapse, time).pos)).toBeGreaterThan(1);
    }
  });

  it('watches the Moon fall, and then sees Hogar and the hole together from space', () => {
    const [moonFrom] = COLLAPSE.absorption.luna;
    // Los dos en el cuadro (medio fov vertical de ese plano, ~0,53 rad).
    expect(angleTo(collapse, moonFrom + 1, MOON)).toBeLessThan(0.5);
    expect(angleTo(collapse, moonFrom + 1, [0, 0, 0])).toBeLessThan(0.5);
    expect(heightAboveGround(cameraAt(collapse, moonFrom + 1).pos)).toBeGreaterThan(1);
    const space = collapse.shots.find((s) => s.id === 'espacio');
    if (!space) throw new Error('falta el plano del espacio');
    const middle = (space.start + space.end) / 2;
    expect(angleTo(collapse, middle, HOME_PLACES.center)).toBeLessThan(0.35);
    expect(angleTo(collapse, middle, [0, 0, 0])).toBeLessThan(0.35);
  });

  it('says little, through an elder of home, and every line has its English', () => {
    expect(collapse.lines.length).toBeLessThanOrEqual(4);
    const spoken = collapse.lines.reduce((sum, line) => sum + line.end - line.start, 0);
    expect(spoken / collapse.duration).toBeLessThan(0.3);
    for (const line of collapse.lines) {
      expect(line.speaker).toBe(ELDER);
      expect(EN[line.text]).toBeTruthy();
      expect(line.end).toBeLessThanOrEqual(COLLAPSE.fade[0]);
    }
  });
});
