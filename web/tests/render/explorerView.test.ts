// El explorador en la escena: sigue los pies y la orientación del jugador, anda cuando se mueve, se esconde
// pilotando, en primera persona oculta la cabeza y se retrasa, y sus filamentos brillan al leer.
import { describe, expect, it } from 'vitest';
import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  Vector3,
} from 'three';
import {
  CARRY_FIRST_PERSON_BACK,
  createExplorerView,
  FIRST_PERSON_BACK,
  FIRST_PERSON_DOWN,
  type ExplorerFrame,
} from '../../src/render/explorerView';
import { chasePose } from '../../src/render/firstPersonCamera';
import { EYE_HEIGHT, WALK_SPEED } from '../../src/data/movement';

function frame(overrides: Partial<ExplorerFrame> = {}): ExplorerFrame {
  return {
    feet: new Vector3(0, 10, 0),
    body: new Quaternion(),
    pitch: 0,
    velocity: new Vector3(),
    grounded: true,
    swimming: false,
    landings: 0,
    landingSpeed: 0,
    dt: 1 / 60,
    visible: true,
    firstPerson: false,
    reading: false,
    lightOn: false,
    ...overrides,
  };
}

const glowOf = (scene: Group): number => {
  const mesh = scene.getObjectByName('EXPLORADOR_head_glow') as Mesh | undefined;
  return (mesh?.material as MeshStandardMaterial).emissiveIntensity;
};

describe('the explorer in the scene', () => {
  it('stands at the feet of the player, and a step behind the eyes in first person', () => {
    const scene = new Group();
    const view = createExplorerView(scene);
    const root = scene.getObjectByName('EXPLORADOR');
    view.update(frame());
    expect(root?.position.toArray()).toEqual([0, 10, 0]);
    view.update(frame({ firstPerson: true }));
    // Frente −Z: detrás es +Z; y un poco más abajo.
    expect(root?.position.z).toBeCloseTo(FIRST_PERSON_BACK);
    expect(root?.position.y).toBeCloseTo(10 - FIRST_PERSON_DOWN);
    // Las botas siguen sobre el suelo: se ven al mirar abajo.
    const boots = new Box3().setFromObject(scene.getObjectByName('EXPLORADOR_footL') ?? scene);
    expect(boots.min.y).toBeGreaterThan(10 - FIRST_PERSON_DOWN - 0.01);
    expect(scene.getObjectByName('EXPLORADOR_head')?.visible).toBe(false);
    expect(view.snapshot().firstPerson).toBe(true);
    view.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('walks with the speed over the ground, not the vertical one', () => {
    const scene = new Group();
    const view = createExplorerView(scene);
    for (let k = 0; k < 60; k++) {
      view.update(frame({ velocity: new Vector3(0, -3, -WALK_SPEED) }));
    }
    const walking = view.snapshot();
    expect(walking.speed).toBeCloseTo(WALK_SPEED);
    expect(walking.move).toBeGreaterThan(0.9);
    expect(walking.phase).toBeGreaterThan(1);
    expect(walking.triangles).toBeGreaterThan(0);
  });

  it('hides while flying the ship', () => {
    const scene = new Group();
    const view = createExplorerView(scene);
    view.update(frame({ visible: false }));
    expect(view.snapshot().visible).toBe(false);
  });

  it('makes its filaments glow brighter while reading', () => {
    const scene = new Group();
    const view = createExplorerView(scene);
    view.update(frame());
    const calm = glowOf(scene);
    for (let k = 0; k < 60; k++) view.update(frame({ reading: true }));
    expect(glowOf(scene)).toBeGreaterThan(calm * 2);
  });

  it('turns on the spot with small steps', () => {
    const scene = new Group();
    const view = createExplorerView(scene);
    const body = new Quaternion();
    const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.05);
    for (let k = 0; k < 30; k++) {
      body.multiply(turn);
      view.update(frame({ body: body.clone() }));
    }
    expect(view.snapshot().phase).toBeGreaterThan(0.3);
  });
});

describe('the debug camera outside', () => {
  it('sits behind and above the explorer, looking at it', () => {
    const position = new Vector3();
    const quaternion = new Quaternion();
    chasePose(new Quaternion(), new Vector3(), position, quaternion);
    expect(position.z).toBeGreaterThan(1.5); // detrás (+Z)
    expect(position.y).toBeGreaterThan(0.5);
    const look = new Vector3(0, 0, -1).applyQuaternion(quaternion);
    expect(look.z).toBeLessThan(-0.7);
  });

  it('goes round to the front', () => {
    const position = new Vector3();
    chasePose(new Quaternion(), new Vector3(), position, new Quaternion(), Math.PI);
    expect(position.z).toBeLessThan(-1.5);
  });

  it('shines from the tips of its antennas, with a halo seen only from outside', () => {
    const scene = new Group();
    const view = createExplorerView(scene);
    const light = scene.getObjectByName('EXPLORADOR_luz') as PointLight;
    const tips = scene.getObjectByName('EXPLORADOR_head_antenna') as Mesh;
    const material = tips.material as MeshStandardMaterial;
    const calm = material.emissiveIntensity;
    for (let i = 0; i < 120; i++) view.update(frame({ lightOn: true }));
    // Por encima de la cabeza: las antenas salen de lo alto del casco (los ojos van a ~1,06 m).
    expect(light.position.y).toBeGreaterThan(10 + 1.2);
    expect(material.emissiveIntensity).toBeGreaterThan(calm * 3);
    expect(view.snapshot().halo).toBe(true);
    for (let i = 0; i < 10; i++) view.update(frame({ lightOn: true, firstPerson: true }));
    expect(view.snapshot().halo).toBe(false);
    expect(light.position.y).toBeGreaterThan(10 + 1.2);
    expect(light.intensity).toBeGreaterThan(0);
  });

  it('lights its surroundings sky blue from its antennas when the body light is on, and not while piloting', () => {
    const scene = new Group();
    const view = createExplorerView(scene);
    const light = scene.getObjectByName('EXPLORADOR_luz') as PointLight;
    const before = glowOf(scene);
    for (let i = 0; i < 120; i++) view.update(frame({ lightOn: true }));
    expect(light.intensity).toBeGreaterThan(0);
    expect(view.snapshot().light).toBe(light.intensity);
    expect(light.color.b).toBeGreaterThan(light.color.r);
    expect(light.position.y).toBeGreaterThan(10.5);
    expect(glowOf(scene)).toBeGreaterThan(before);
    view.update(frame({ lightOn: true, visible: false }));
    expect(light.intensity).toBe(0);
    expect(light.visible).toBe(true);
    for (let i = 0; i < 120; i++) view.update(frame({ lightOn: false }));
    expect(light.intensity).toBeLessThan(0.1);
  });

  it('carries a held thing between its hands, at its real size, raising it with the arms', () => {
    const scene = new Group();
    const view = createExplorerView(scene);
    // Una caja de 20 × 30 × 20 cm con Z arriba (como los modelos de los puzles).
    const thing = new Mesh(new BoxGeometry(0.2, 0.2, 0.3));
    thing.name = 'caja';
    view.update(frame());
    view.hands.hold(thing);
    view.update(frame());
    expect(view.snapshot().carry).toBeLessThan(0.2);
    const low = new Box3().setFromObject(thing).getCenter(new Vector3()).y;
    for (let i = 0; i < 60; i++) {
      view.hands.hold(thing);
      view.update(frame());
    }
    expect(view.snapshot().carry).toBe(1);
    expect(view.snapshot().holding).toBe('caja');
    expect(thing.scale.x).toBe(1);
    const box = new Box3().setFromObject(thing);
    const size = box.getSize(new Vector3());
    // De pie: su Z de modelo va arriba (Y de la escena), y no se encoge.
    expect(size.y).toBeCloseTo(0.3, 1);
    expect(size.x).toBeCloseTo(0.2, 1);
    const center = box.getCenter(new Vector3());
    // Subió al cogerlo; queda delante del pecho (frente −Z) y por debajo de los ojos.
    expect(center.y).toBeGreaterThan(low);
    expect(center.z).toBeLessThan(-0.25);
    expect(box.max.y).toBeLessThan(10 + EYE_HEIGHT);
    // Las dos manos lo tocan por los costados.
    for (const name of ['EXPLORADOR_handL', 'EXPLORADOR_handR']) {
      const hand = new Box3().setFromObject(scene.getObjectByName(name) ?? scene);
      expect(hand.distanceToPoint(center)).toBeLessThan(0.2);
    }
  });

  it('in first person, carrying brings the body under the eyes so the thing is seen ahead', () => {
    const scene = new Group();
    const view = createExplorerView(scene);
    const thing = new Mesh(new BoxGeometry(0.2, 0.2, 0.2));
    for (let i = 0; i < 60; i++) {
      view.hands.hold(thing);
      view.update(frame({ firstPerson: true }));
    }
    const root = scene.getObjectByName('EXPLORADOR');
    expect(root?.position.z).toBeCloseTo(CARRY_FIRST_PERSON_BACK);
    // Visto desde los ojos (cámara con fov 50, mirando al frente) cae dentro de la vista, abajo.
    const center = new Box3().setFromObject(thing).getCenter(new Vector3());
    const below = 10 + EYE_HEIGHT - center.y;
    const ahead = -center.z;
    expect(ahead).toBeGreaterThan(0.2);
    expect(Math.atan2(below, ahead)).toBeLessThan((25 * Math.PI) / 180);
  });

  it('lowers the arms when the thing goes somewhere else', () => {
    const scene = new Group();
    const view = createExplorerView(scene);
    const thing = new Mesh(new BoxGeometry(0.2, 0.2, 0.2));
    for (let i = 0; i < 60; i++) {
      view.hands.hold(thing);
      view.update(frame());
    }
    scene.add(thing);
    for (let i = 0; i < 60; i++) view.update(frame());
    expect(view.snapshot().carry).toBe(0);
    expect(view.snapshot().holding).toBeUndefined();
  });
});
