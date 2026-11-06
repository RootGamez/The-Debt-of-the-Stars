// El ocular del telescopio (🟡): lo que se ve por él, como lógica pura. Con la alineación, la imagen del Nudo se ve
// torcida hacia la Brasa; con el índice a la corrección, la marca cae sobre el Nudo de verdad, y ahí se fija el rumbo.
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  DIAL_MAX,
  HOLD_SECONDS,
  HOME_VIEW,
  ZOOM_FIELDS,
  basisOf,
  bentStar,
  dialIsRight,
  dialMarker,
  imageDirection,
  nudoBearing,
  onTarget,
  patchStars,
  project,
  separation,
  starField,
  stepHold,
  viewBasis,
  type OcularSky,
  type OcularView,
} from '../../src/game/ocular';
import { LENS_DEFLECTION } from '../../src/system/lens';

const DEG = Math.PI / 180;
const unit = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z).normalize();

/** La Brasa a +X y el Nudo verdadero a 70° de ella, en el plano XZ. */
const brasa = unit(1, 0, 0);
const nudoDir = unit(Math.cos(70 * DEG), 0, Math.sin(70 * DEG));
const sky = (aligned: boolean): OcularSky => ({
  brasa,
  nudo: { dir: nudoDir, distance: 2800 },
  aligned,
  bodies: [],
});

/** La vista que apunta justo al Nudo verdadero (a 70° de la Brasa, girando alrededor de +Y). */
function viewAtNudo(zoom: number, dial: number): OcularView {
  // Por el eje vertical del campo: la cámara base sale de la Brasa con "arriba" = +Y, así que el giro es de yaw.
  const home = basisOf(brasa);
  const side = nudoDir.dot(home.right) > 0 ? 1 : -1;
  return { yaw: side * 70 * DEG, pitch: 0, zoom, dial };
}

describe('the eyepiece geometry', () => {
  it('looks at the Brasa from the start, and the Brasa falls in the middle of the field', () => {
    const basis = viewBasis(HOME_VIEW, sky(true));
    expect(separation(basis.forward, brasa)).toBeLessThan(1e-6);
    const at = project(basis, HOME_VIEW, brasa);
    expect(at?.[0]).toBeCloseTo(0, 6);
    expect(at?.[1]).toBeCloseTo(0, 6);
  });

  it('leaves out what is outside the field of view, and what is behind', () => {
    const basis = viewBasis(HOME_VIEW, sky(true));
    const wide = ZOOM_FIELDS[0] ?? 48;
    const far = unit(Math.cos((wide / 2) * 1.4 * DEG), 0, Math.sin((wide / 2) * 1.4 * DEG));
    expect(project(basis, HOME_VIEW, far)).toBeUndefined();
    expect(project(basis, HOME_VIEW, brasa.clone().negate())).toBeUndefined();
  });

  it('puts the edge of the field at ±1 and zooming in narrows the field', () => {
    const basis = viewBasis(HOME_VIEW, sky(true));
    const edge = ((ZOOM_FIELDS[0] ?? 48) / 2) * DEG;
    const right = basis.right;
    const onEdge = brasa
      .clone()
      .multiplyScalar(Math.cos(edge))
      .addScaledVector(right, Math.sin(edge));
    expect(Math.abs(project(basis, HOME_VIEW, onEdge)?.[0] ?? 9)).toBeCloseTo(1, 6);
    const near = unit(Math.cos(1 * DEG), 0, Math.sin(1 * DEG));
    const wideX = Math.abs(project(basis, HOME_VIEW, near)?.[0] ?? 0);
    const zoomed = { ...HOME_VIEW, zoom: 2 };
    const narrowX = Math.abs(project(viewBasis(zoomed, sky(true)), zoomed, near)?.[0] ?? 0);
    expect(narrowX).toBeGreaterThan(wideX);
  });
});

describe('the image of the Nudo and the dial', () => {
  it('shows the image bent towards the Brasa by the fixed lens angle', () => {
    const image = imageDirection(sky(true));
    expect(image).toBeDefined();
    if (!image) return;
    expect(separation(image, nudoDir)).toBeCloseTo(LENS_DEFLECTION / DEG, 3);
    expect(separation(image, brasa)).toBeCloseTo(70 - LENS_DEFLECTION / DEG, 3);
  });

  it('puts the marker of the dial back on the real Nudo when the dial says the lens angle', () => {
    const marker = dialMarker(sky(true), LENS_DEFLECTION / DEG);
    expect(marker).toBeDefined();
    if (marker) expect(separation(marker, nudoDir)).toBeLessThan(1e-3);
    const wrong = dialMarker(sky(true), 5);
    if (wrong) expect(separation(wrong, nudoDir)).toBeGreaterThan(10);
  });

  it('accepts the dial only near the lens angle', () => {
    expect(dialIsRight(18)).toBe(true);
    expect(dialIsRight(17)).toBe(true);
    expect(dialIsRight(12)).toBe(false);
    expect(dialIsRight(DIAL_MAX)).toBe(false);
  });

  it('tells how far the real Nudo is from the Brasa', () => {
    expect(nudoBearing(sky(true))).toBeCloseTo(70, 6);
  });
});

describe('fixing the bearing', () => {
  const onNudo = (zoom: number, dial: number): OcularView => viewAtNudo(zoom, dial);

  it('needs the alignment, a close zoom, the right dial and the cross on the ring', () => {
    expect(onTarget(onNudo(2, 18), sky(true))).toBe(true);
    expect(onTarget(onNudo(2, 18), sky(false))).toBe(false); // sin alineación el cielo tiembla
    expect(onTarget(onNudo(0, 18), sky(true))).toBe(false); // el anillo es demasiado fino
    expect(onTarget(onNudo(2, 4), sky(true))).toBe(false); // el índice mal puesto
    expect(onTarget(HOME_VIEW, sky(true))).toBe(false); // la cruz en otro sitio
  });

  it('holds for a while before it counts, and slips back when the cross moves off', () => {
    let held = 0;
    for (let i = 0; i < 10; i++) held = stepHold(held, true, 0.1);
    expect(held).toBeCloseTo(1, 6);
    held = stepHold(held, false, 0.25);
    expect(held).toBeCloseTo(0.5, 6);
    for (let i = 0; i < 40; i++) held = stepHold(held, true, 0.1);
    expect(held).toBe(HOLD_SECONDS);
  });
});

describe('the stars', () => {
  it('are the same every time and spread over the whole sphere', () => {
    const a = starField(200);
    const b = starField(200);
    expect(a[10]?.dir.toArray()).toEqual(b[10]?.dir.toArray());
    const north = a.filter((s) => s.dir.y > 0).length;
    expect(north).toBeGreaterThan(70);
    expect(north).toBeLessThan(130);
  });

  it('are pushed away from the Nudo by its lens, leaving a clear hole in the middle', () => {
    const nudo = { dir: nudoDir, distance: 2800 };
    const patch = patchStars(nudoDir);
    const before = patch.filter((s) => s.dir.angleTo(nudoDir) < 0.01).length;
    const after = patch.filter((s) => bentStar(s.dir, nudo).angleTo(nudoDir) < 0.01).length;
    expect(before).toBeGreaterThan(0);
    expect(after).toBe(0);
    for (const star of patch.slice(0, 40)) {
      expect(bentStar(star.dir, nudo).angleTo(nudoDir)).toBeGreaterThanOrEqual(
        star.dir.angleTo(nudoDir) - 1e-9,
      );
    }
  });

  it('crowd the stars of the patch on a ring around the real Nudo that the narrow field can see', () => {
    const nudo = { dir: nudoDir, distance: 2800 };
    const ring = patchStars(nudoDir).filter((s) => {
      const a = bentStar(s.dir, nudo).angleTo(nudoDir) / DEG;
      return a > 0.5 && a < 1.2;
    });
    expect(ring.length).toBeGreaterThan(8);
  });
});
