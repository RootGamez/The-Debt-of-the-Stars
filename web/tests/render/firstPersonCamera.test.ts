import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { cameraPose, clampPitch, eyePoint } from '../../src/render/firstPersonCamera';
import { thirdPersonPose } from '../../src/render/thirdPersonCamera';
import { nearestInteractable } from '../../src/registry/interaction';
import { EYE_HEIGHT, MAX_PITCH_DEGREES } from '../../src/data/movement';

describe('eyePoint', () => {
  it('is where the first-person camera sits: above the feet along the local up', () => {
    const body = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(1, 0, 0));
    const feet = new Vector3(90, 3, -2);
    const camera = new Vector3();
    cameraPose(body, 0.4, feet, camera, new Quaternion());

    const eyes = eyePoint(body, feet, new Vector3());

    expect(eyes.distanceTo(camera)).toBeCloseTo(0);
  });

  it('keeps a note two metres ahead within reach in third person, where the camera would not', () => {
    const feet = new Vector3();
    const body = new Quaternion();
    const note = { id: 'nota', position: new Vector3(0, EYE_HEIGHT, -2) };
    const camera = new Vector3();
    const view = new Quaternion();
    thirdPersonPose(body, 0, feet, 3, undefined, camera, view);
    const forward = new Vector3(0, 0, -1).applyQuaternion(view);

    // La cámara de tercera persona queda fuera del alcance (el fallo: no salía el botón)…
    expect(nearestInteractable(camera, forward, [note])).toBeUndefined();
    // …pero desde los ojos del explorador sí se alcanza.
    expect(nearestInteractable(eyePoint(body, feet, new Vector3()), forward, [note])).toBe(note);
  });
});

describe('cameraPose', () => {
  it('places the eyes above the feet along the local up', () => {
    const body = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(1, 0, 0));
    const position = new Vector3();

    cameraPose(body, 0, new Vector3(90, 0, 0), position, new Quaternion());

    expect(position.x).toBeCloseTo(90 + EYE_HEIGHT);
    expect(position.y).toBeCloseTo(0);
  });

  it('looks forward with no pitch and up with positive pitch', () => {
    const level = new Quaternion();
    const raised = new Quaternion();
    cameraPose(new Quaternion(), 0, new Vector3(), new Vector3(), level);
    cameraPose(new Quaternion(), Math.PI / 4, new Vector3(), new Vector3(), raised);

    const levelView = new Vector3(0, 0, -1).applyQuaternion(level);
    const raisedView = new Vector3(0, 0, -1).applyQuaternion(raised);

    expect(levelView.z).toBeCloseTo(-1);
    expect(raisedView.y).toBeCloseTo(Math.SQRT1_2);
  });
});

describe('clampPitch', () => {
  it('limits looking up and down to the maximum angle', () => {
    const max = (MAX_PITCH_DEGREES * Math.PI) / 180;

    expect(clampPitch(10)).toBeCloseTo(max);
    expect(clampPitch(-10)).toBeCloseTo(-max);
    expect(clampPitch(0.3)).toBe(0.3);
  });
});
