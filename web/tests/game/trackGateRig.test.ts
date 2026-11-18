// El portal caído de la Pista del Taller (E4, plan-finales §3.2): su reloj empieza fuera de hora (3 min 17 s), se pone
// en hora con las dos ruedas, se enciende con la secuencia de las 7:00 y, encendido, deja pasar en los dos sentidos
// (el anillo de la Pista y el de dentro del Centro) el resto del ciclo.
import { Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { TALLER_GATE } from '../../src/game/fallenGate';
import { createTrackGateRig } from '../../src/game/trackGateRig';
import { TELEPORTER, TRACK_ERROR } from '../../src/game/teleporter';
import type { Gate } from '../../src/worlds/gates';

const SEVEN = [TELEPORTER.event];

function ring(name: string, target: string, lock: string | undefined): Gate {
  return {
    name,
    target,
    lock,
    position: new Vector3(),
    up: new Vector3(0, 0, 1),
    forward: new Vector3(0, 1, 0),
  };
}
const OUT = ring('PASO_Pista', 'PASO_Centro', TELEPORTER.lock);
const IN = ring('PASO_Centro', 'PASO_Pista', TELEPORTER.lock);

function setup() {
  const scene = new Object3D();
  const veil = new Object3D();
  veil.userData['fallen_lock'] = TELEPORTER.lock;
  veil.userData['fallen_part'] = 'membrane';
  const lamp = new Object3D();
  lamp.userData['fallen_lock'] = TELEPORTER.lock;
  lamp.userData['fallen_part'] = 'blink';
  scene.add(veil, lamp);
  const clock = { now: 300 };
  const messages: string[] = [];
  const rig = createTrackGateRig({
    scene,
    reference: () => clock.now,
    notify: (m) => messages.push(m),
  });
  const setRight = (): void => {
    rig.play.turn(TALLER_GATE.id, 'minutes', -3);
    rig.play.turn(TALLER_GATE.id, 'seconds', -17);
  };
  return { rig, clock, messages, veil, setRight };
}

describe('the fallen gate of the Test Track', () => {
  it('starts each loop dead: the clock is 3 min 17 s ahead and both rings are shut', () => {
    const { rig, veil } = setup();
    rig.update(0.1, 0, SEVEN);
    expect(rig.play.reading(TALLER_GATE.id)).toMatchObject({
      target: 300,
      shown: 300 + TRACK_ERROR,
      matched: false,
    });
    expect(rig.gateOpen(OUT)).toBe(false);
    expect(rig.gateOpen(IN)).toBe(false);
    expect(rig.snapshot()).toMatchObject({ matched: false, open: false });
    expect(veil.visible).toBe(false);
  });

  it('does not light with the clock on time but without the sequence of 7:00', () => {
    const { rig, setRight } = setup();
    setRight();
    rig.update(1, 0, []);
    expect(rig.snapshot()).toMatchObject({ matched: true, open: false });
    expect(rig.gateOpen(OUT)).toBe(false);
  });

  it('does not light during 7:00 with the clock out of time', () => {
    const { rig } = setup();
    rig.update(1, 0, SEVEN);
    expect(rig.gateOpen(OUT)).toBe(false);
  });

  it('lights once at 7:00 with the clock set, says so, and lets you through both ways', () => {
    const { rig, messages, setRight, veil } = setup();
    setRight();
    rig.update(1, 0, SEVEN);
    rig.update(1, 1, SEVEN);
    expect(messages).toHaveLength(1);
    expect(rig.lit).toBe(true);
    expect(rig.gateOpen(OUT)).toBe(true);
    expect(rig.gateOpen(IN)).toBe(true);
    rig.update(2, 3, SEVEN);
    expect(veil.visible).toBe(true);
  });

  it('stays lit for the rest of the loop, even when the sequence is over', () => {
    const { rig, setRight, clock } = setup();
    setRight();
    rig.update(1, 0, SEVEN);
    clock.now = 840;
    rig.update(1, 1, []);
    expect(rig.gateOpen(IN)).toBe(true);
    expect(rig.gateOpen(OUT)).toBe(true);
  });

  it('cannot be switched off by turning the wheels once lit', () => {
    const { rig, setRight } = setup();
    setRight();
    rig.update(1, 0, SEVEN);
    rig.play.turn(TALLER_GATE.id, 'minutes', 5);
    expect(rig.gateOpen(OUT)).toBe(true);
  });

  it('falls out of time again and shuts when a new loop starts', () => {
    const { rig, setRight, veil } = setup();
    setRight();
    rig.update(1, 0, SEVEN);
    rig.reset();
    rig.update(0.1, 5, SEVEN);
    expect(rig.gateOpen(OUT)).toBe(false);
    expect(rig.snapshot()).toMatchObject({ matched: false, open: false });
    expect(veil.visible).toBe(false);
  });

  it('never decides over rings that are not its own', () => {
    const { rig } = setup();
    expect(rig.gateOpen(ring('PASO_Nudo', 'PASO_X', 'nudo'))).toBeUndefined();
    expect(rig.gateOpen(ring('PASO_Libre', 'PASO_Y', undefined))).toBeUndefined();
  });

  it('can be put on time for debugging, and the reader takes the `pista` lock source', () => {
    const { rig } = setup();
    expect(rig.setOnTime()).toBe(true);
    expect(rig.snapshot().matched).toBe(true);
    expect(Object.keys(rig.readers)).toEqual(['pista']);
  });
});
