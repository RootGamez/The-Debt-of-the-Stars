// La mordida nueva de la Luna (F4): solo con la variante, junto al fragmento sin tocarlo, y el terreno basto queda
// siempre por debajo del cuenco fino.
import { describe, expect, it } from 'vitest';
import { Vector3, type BufferGeometry } from 'three';
import { WorldDataError } from '../../../src/worlds/markers';
import { direction } from '../../../src/worlds/procedural/kit';
import {
  BITE,
  BITE_VARIANT,
  biteBowl,
  biteLip,
  biteSphere,
  carvedGround,
  depthBelowGround,
  inBite,
  lipOuter,
  lunaOptions,
  rimDistance,
} from '../../../src/worlds/procedural/lunaBite';
import {
  FRAGMENT_SITE,
  distanceToFragment,
  lunaGround,
} from '../../../src/worlds/procedural/lunaShape';

const sphere = biteSphere();

/** Una dirección a `distance` m (por el suelo) del centro de la mordida, en el rumbo `phi`. */
function around(distance: number, phi: number): Vector3 {
  const helper = Math.abs(sphere.up.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
  const e1 = helper.clone().cross(sphere.up).normalize();
  const e2 = sphere.up.clone().cross(e1).normalize();
  return sphere.up
    .clone()
    .multiplyScalar(lunaGround(sphere.up))
    .addScaledVector(e1, distance * Math.cos(phi))
    .addScaledVector(e2, distance * Math.sin(phi))
    .normalize();
}

/** Las normales de cara (como las calcula three: la cara de delante) de una geometría suelta, con su centro. */
function faces(geometry: BufferGeometry): { center: Vector3; normal: Vector3; area: number }[] {
  const position = geometry.getAttribute('position');
  const found: { center: Vector3; normal: Vector3; area: number }[] = [];
  const [a, b, c] = [new Vector3(), new Vector3(), new Vector3()];
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    const cross = c.clone().sub(b).cross(a.clone().sub(b));
    const area = cross.length() / 2;
    found.push({
      center: a.clone().add(b).add(c).divideScalar(3),
      normal: cross.normalize(),
      area,
    });
  }
  return found;
}

describe('the new bite of the Moon (F4, el final bueno)', () => {
  it('exists only with its variant; an unknown one is an error', () => {
    expect(lunaOptions(undefined)).toEqual({ bite: false });
    expect(lunaOptions(BITE_VARIANT)).toEqual({ bite: true });
    expect(() => lunaOptions('despues')).toThrow(WorldDataError);
  });

  it('sits next to the fragment, on the face toward Hogar, without touching it', () => {
    const fromFragment = distanceToFragment(sphere.up);
    expect(fromFragment).toBeGreaterThan(9);
    expect(fromFragment).toBeLessThan(15);
    // El fragmento y sus esquirlas (hasta 4,8 m) quedan fuera del corte y de lo que tapa el labio.
    expect(fromFragment - lipOuter()).toBeGreaterThan(2.5);
    const fragment = direction(FRAGMENT_SITE.lat, FRAGMENT_SITE.lon);
    expect(inBite(fragment)).toBe(false);
    expect(carvedGround(fragment)).toBe(lunaGround(fragment));
  });

  it('is a clean spherical scoop: deepest in the middle, as deep as the sphere reaches below the ground', () => {
    expect(inBite(sphere.up)).toBe(true);
    const depth = lunaGround(sphere.up) - sphere.center.length() + sphere.radius;
    expect(depth).toBeCloseTo(BITE.radius - BITE.above, 6);
    for (const phi of [0, 1.3, 2.9, 4.4]) {
      const rim = rimDistance(phi);
      expect(rim).toBeGreaterThan(3.5);
      expect(rim).toBeLessThan(BITE.radius + 0.5);
      expect(inBite(around(rim - 0.3, phi))).toBe(true);
      expect(inBite(around(rim + 0.3, phi))).toBe(false);
    }
  });

  it('leaves the ground untouched beyond what the lip covers', () => {
    for (let phi = 0; phi < Math.PI * 2; phi += 0.5) {
      const d = around(lipOuter() + 0.5, phi);
      expect(carvedGround(d)).toBe(lunaGround(d));
    }
  });

  it('sinks the coarse terrain below the fine bowl everywhere inside the bite', () => {
    for (let r = 0; r < 5; r += 0.5) {
      for (let phi = 0; phi < Math.PI * 2; phi += 0.4) {
        const d = around(r, phi);
        const along = d.dot(sphere.center);
        const bowl = along - Math.sqrt(along * along - sphere.center.lengthSq() + BITE.radius ** 2);
        expect(carvedGround(d)).toBeLessThan(bowl - 0.5);
      }
    }
  });

  it('builds the bowl facing its centre and never above the ground', () => {
    const bowl = biteBowl();
    for (const face of faces(bowl)) {
      if (face.area < 1e-6) continue;
      expect(face.center.length()).toBeLessThanOrEqual(
        lunaGround(face.center.clone().normalize()) + 0.01,
      );
      const inward = sphere.center.clone().sub(face.center);
      // Lo aplastado contra el suelo mira hacia arriba; lo demás, hacia el centro de la esfera.
      if (depthBelowGround(face.center) > 0.3) {
        expect(face.normal.dot(inward)).toBeGreaterThan(0);
      }
    }
  });

  it('builds the lip facing up, raised at the rim and tucked under the terrain at its outer edge', () => {
    const lip = faces(biteLip());
    for (const face of lip) {
      expect(face.normal.dot(face.center.clone().normalize())).toBeGreaterThan(0.5);
    }
    const heightOf = (p: Vector3): number => p.length() - lunaGround(p.clone().normalize());
    const near = lip.filter((face) => face.center.distanceTo(sphere.center) < BITE.radius + 0.6);
    const far = lip.filter((face) => face.center.distanceTo(sphere.center) > lipOuter() - 0.3);
    expect(near.length).toBeGreaterThan(0);
    expect(far.length).toBeGreaterThan(0);
    expect(Math.min(...near.map((face) => heightOf(face.center)))).toBeGreaterThan(0.03);
    expect(Math.max(...far.map((face) => heightOf(face.center)))).toBeLessThan(0);
  });
});
