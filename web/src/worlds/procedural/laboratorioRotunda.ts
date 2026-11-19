// El templete de la cámara de frío del Laboratorio (E7; medidas en laboratorioArchitecture.ts, `ROTUNDA`): ocho
// columnas en corro, un anillo de dinteles de columna a columna y una cúpula rebajada de cobre con un óculo de latón.
// Cubre la cámara sin cerrarla: entre columna y columna se pasa, y por el óculo se ve la semilla.
import { SphereGeometry, type BufferGeometry } from 'three';
import { box, cylinder, geometryFrom, torus, type Frame, type Triple } from './kit';
import { ROTUNDA, columnAngles } from './laboratorioArchitecture';
import { FLOOR, LabBuilder, PALETTE as P } from './laboratorioKit';

/** Media cúpula sin la tapa de arriba (el óculo), de radio 1, Z arriba; `inward` le da la vuelta a las caras. */
function openDome(oculus: number, inward: boolean): BufferGeometry {
  const half = new SphereGeometry(1, 28, 6, 0, Math.PI * 2, oculus, Math.PI / 2 - oculus)
    .rotateX(Math.PI / 2)
    .toNonIndexed();
  const p = half.getAttribute('position');
  const out: number[] = [];
  for (let k = 0; k < p.count; k += 3) {
    const order = inward ? [0, 2, 1] : [0, 1, 2];
    for (const i of order) out.push(p.getX(k + i), p.getY(k + i), p.getZ(k + i));
  }
  half.dispose();
  return geometryFrom(out);
}

let domes: { outer: BufferGeometry; inner: BufferGeometry } | undefined;

/**
 * El templete de la cámara de frío: ocho columnas con basa y capitel, un anillo de dinteles de columna a columna y,
 * encima, una cúpula rebajada de cobre (revocada por dentro) con un óculo de latón que deja ver la semilla.
 */
export function rotunda(lb: LabBuilder, f: Frame): void {
  const s = lb.inside;
  const { radius, columns, base, shaft, column, entablature, dome, flatten, oculus } = ROTUNDA;
  const angles = columnAngles();
  for (const a of angles) {
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    lb.solid(s, P.limestone, box(), f.at([x, y, FLOOR + 0.15], [0, 0, a], [base, base, 0.3]));
    lb.solid(
      s,
      P.plaster,
      cylinder(shaft, 10),
      f.at([x, y, FLOOR + column / 2], undefined, [1, 1, column - 0.5]),
    );
    lb.view(
      s,
      P.limestone,
      box(),
      f.at([x, y, FLOOR + column - 0.13], [0, 0, a], [base, base, 0.26]),
    );
  }
  const step = (2 * Math.PI) / columns;
  const chord = 2 * radius * Math.sin(step / 2);
  for (const a of angles) {
    const m = a + step / 2;
    const r = radius * Math.cos(step / 2);
    const at: Triple = [Math.cos(m) * r, Math.sin(m) * r, FLOOR + column + entablature / 2];
    lb.solid(
      s,
      P.limestone,
      box(),
      f.at(at, [0, 0, m + Math.PI / 2], [chord + base * 0.6, 0.5, entablature]),
    );
  }
  domes ??= { outer: openDome(oculus, false), inner: openDome(oculus, true) };
  const spring = FLOOR + column + entablature;
  lb.solid(
    s,
    P.verdigris,
    domes.outer,
    f.at([0, 0, spring], undefined, [dome, dome, dome * flatten]),
  );
  const inside = dome - 0.14;
  lb.view(
    s,
    P.plaster,
    domes.inner,
    f.at([0, 0, spring], undefined, [inside, inside, inside * flatten]),
  );
  const ring = dome * Math.sin(oculus);
  const rim = spring + dome * flatten * Math.cos(oculus);
  lb.view(s, P.brass, torus(ring, 0.09, 24, 4), f.at([0, 0, rim], [Math.PI / 2, 0, 0]));
}
