import { Group, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createEngineRoomView, MOTOR_OUT_SECONDS } from '../../src/render/engineRoomView';
import { WorldDataError } from '../../src/worlds/markers';

function cicatriz() {
  const world = new Group();
  world.position.set(100, 0, 0); // el mundo no está en el origen de la escena
  const root = new Object3D();
  world.add(root);
  const motor = new Object3D();
  motor.name = 'cicatriz_MotorViejo';
  motor.position.set(0, 10, 0);
  const out = new Object3D();
  out.name = 'cicatriz_MotorFuera';
  out.position.set(-4, 1, 0);
  root.add(motor, out);
  return { world, motor };
}

describe('the engine room', () => {
  it('knows where the core is, in the frame of its world', () => {
    const { world } = cicatriz();

    expect(createEngineRoomView(world).coreCenter).toEqual(new Vector3(0, 10, 0));
  });

  it('takes the old motor out slowly, and puts it back for a new loop', () => {
    const { world, motor } = cicatriz();
    const room = createEngineRoomView(world);

    room.update(true, MOTOR_OUT_SECONDS / 2);
    expect(motor.position.y).toBeLessThan(10);
    expect(motor.position.y).toBeGreaterThan(1);

    room.update(true, MOTOR_OUT_SECONDS);
    expect(motor.position).toEqual(new Vector3(-4, 1, 0));

    room.update(false, 0);
    expect(motor.position).toEqual(new Vector3(0, 10, 0));
  });

  it('needs the old motor and where it goes in the model', () => {
    expect(() => createEngineRoomView(new Group())).toThrow(WorldDataError);
  });
});
