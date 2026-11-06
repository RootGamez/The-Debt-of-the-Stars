// Un Ausente (plan de la llegada, hito E; D2 ✅ Anthony 2026-11-06): más de 2,5 m, cabeza sin rostro de vidrio
// mineral oscuro con dibujos geométricos que brillan (rombos y triángulos; nada de espirales ni hexágonos), y
// circuitos de cobre sobre una piel cerámica. Nunca se ven vivos: solo en murales tallados y en proyecciones.
// Aquí solo están las piezas (datos puros, marco de diseño Z arriba y frente +Y); quien lo pone en un mundo decide
// con qué colores (tallado en piedra, o luz).

export type AbsentMaterial = 'ceramic' | 'glass' | 'copper' | 'glow';

export type AbsentShape =
  | { kind: 'box' }
  /** Cono truncado de altura 1 (radio `bottom` en z = −0,5 y `top` en z = +0,5). */
  | { kind: 'cone'; bottom: number; top: number }
  /** Bola de radio 1. */
  | { kind: 'ball' };

export type Triple = readonly [number, number, number];

export interface AbsentPart {
  shape: AbsentShape;
  material: AbsentMaterial;
  position: Triple;
  /** Euler XYZ de Blender (radianes). */
  rotation: Triple;
  scale: Triple;
}

/** Altura total (m), de los pies a la coronilla. */
export const ABSENT_HEIGHT = 2.78;

/** Media anchura de la silueta de frente (m) a cada altura, para las proyecciones de anillos. */
const PROFILE: readonly (readonly [number, number])[] = [
  [0, 0.3],
  [0.12, 0.32],
  [0.2, 0.22],
  [0.7, 0.26],
  [1.3, 0.34],
  [1.45, 0.3],
  [1.6, 0.5],
  [2.1, 0.54],
  [2.2, 0.2],
  [2.32, 0.09],
  [2.36, 0.17],
  [2.5, 0.21],
  [2.66, 0.17],
  [ABSENT_HEIGHT, 0],
];

/** Media anchura de la silueta a la altura `z` (0 fuera del cuerpo). */
export function absentProfile(z: number): number {
  if (z < 0 || z > ABSENT_HEIGHT) return 0;
  for (let k = 1; k < PROFILE.length; k++) {
    const [z1, w1] = PROFILE[k] ?? [0, 0];
    const [z0, w0] = PROFILE[k - 1] ?? [0, 0];
    if (z <= z1) return w0 + ((w1 - w0) * (z - z0)) / Math.max(1e-6, z1 - z0);
  }
  return 0;
}

const part = (
  shape: AbsentShape,
  material: AbsentMaterial,
  position: Triple,
  scale: Triple,
  rotation: Triple = [0, 0, 0],
): AbsentPart => ({ shape, material, position, rotation, scale });

const BOX: AbsentShape = { kind: 'box' };
const BALL: AbsentShape = { kind: 'ball' };

/** Un miembro de `a` a `b` en el plano XZ (cono que se estrecha de `ra` a `rb`). */
function limb(a: Triple, b: Triple, ra: number, rb: number, material: AbsentMaterial): AbsentPart {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const length = Math.hypot(dx, dz);
  return part(
    { kind: 'cone', bottom: ra, top: rb },
    material,
    [(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2],
    [1, 1, length],
    [0, Math.atan2(dx, dz), 0],
  );
}

/** Una línea de circuito de cobre de `a` a `b` (en el plano XZ, pegada por delante en `y`). */
function trace(a: Triple, b: Triple, width = 0.025): AbsentPart {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  return part(
    BOX,
    'copper',
    [(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2],
    [width, 0.02, Math.hypot(dx, dz)],
    [0, Math.atan2(dx, dz), 0],
  );
}

/** Un rombo de luz mirando al frente, de lado `size`. */
function diamond(at: Triple, size: number): AbsentPart {
  return part(BOX, 'glow', at, [size, 0.02, size], [0, Math.PI / 4, 0]);
}

/** Las piezas de un Ausente de pie, con los brazos caídos y un poco abiertos. */
export function absentParts(): readonly AbsentPart[] {
  const parts: AbsentPart[] = [];
  for (const side of [-1, 1]) {
    const x = side * 0.17;
    // Pies largos y estrechos, piernas finas de cerámica.
    parts.push(part(BOX, 'ceramic', [x, 0.06, 0.06], [0.2, 0.46, 0.12]));
    parts.push(limb([x, 0, 0.12], [x * 1.05, 0, 0.74], 0.1, 0.12, 'ceramic'));
    parts.push(part(BALL, 'copper', [x * 1.05, 0.02, 0.76], [0.1, 0.1, 0.1]));
    parts.push(limb([x * 1.05, 0, 0.78], [x * 1.1, 0, 1.34], 0.13, 0.16, 'ceramic'));
    parts.push(trace([x * 1.05 + side * 0.04, 0.11, 0.2], [x * 1.1 + side * 0.04, 0.15, 1.3]));
    // Hombros, brazos largos y manos de tres dedos.
    const shoulder: Triple = [side * 0.38, 0, 2.08];
    const elbow: Triple = [side * 0.46, 0, 1.6];
    const wrist: Triple = [side * 0.5, 0, 1.12];
    parts.push(part(BALL, 'ceramic', shoulder, [0.13, 0.12, 0.11]));
    parts.push(limb(shoulder, elbow, 0.085, 0.07, 'ceramic'));
    parts.push(part(BALL, 'copper', elbow, [0.075, 0.075, 0.075]));
    parts.push(limb(elbow, wrist, 0.07, 0.055, 'ceramic'));
    parts.push(trace([elbow[0], 0.07, elbow[2] - 0.05], [wrist[0], 0.06, wrist[2] + 0.05], 0.02));
    for (const finger of [-1, 0, 1]) {
      parts.push(
        limb(
          [wrist[0] + finger * 0.03, 0, wrist[2]],
          [wrist[0] + finger * 0.05 + side * 0.01, 0, wrist[2] - 0.2],
          0.022,
          0.012,
          'ceramic',
        ),
      );
    }
  }
  // Cadera, torso ancho arriba y el cuello.
  parts.push(part(BOX, 'ceramic', [0, 0, 1.4], [0.5, 0.28, 0.22]));
  parts.push(
    part({ kind: 'cone', bottom: 0.2, top: 0.33 }, 'ceramic', [0, 0, 1.8], [1.15, 0.7, 0.62]),
  );
  parts.push(part(BOX, 'ceramic', [0, 0, 2.12], [0.78, 0.26, 0.1]));
  parts.push(
    part({ kind: 'cone', bottom: 0.08, top: 0.065 }, 'copper', [0, 0, 2.27], [1, 1, 0.16]),
  );
  // Circuitos del pecho: un tronco que baja y ramas a los hombros.
  parts.push(trace([0, 0.24, 1.5], [0, 0.26, 2.08], 0.03));
  for (const side of [-1, 1]) {
    parts.push(trace([0, 0.25, 1.95], [side * 0.3, 0.2, 2.1]));
    parts.push(trace([0, 0.24, 1.7], [side * 0.22, 0.22, 1.58]));
  }
  // Dibujos que brillan en el pecho: tres rombos en triángulo.
  parts.push(diamond([0, 0.27, 1.88], 0.09));
  parts.push(diamond([-0.11, 0.25, 1.75], 0.06));
  parts.push(diamond([0.11, 0.25, 1.75], 0.06));
  // La cabeza: un óvalo alto de vidrio oscuro, sin rostro, con una hilera de rombos de luz donde iría la cara.
  parts.push(part(BALL, 'glass', [0, 0.02, 2.52], [0.19, 0.22, 0.26]));
  for (const [x, z, s] of [
    [0, 2.6, 0.05],
    [-0.07, 2.52, 0.035],
    [0.07, 2.52, 0.035],
    [0, 2.44, 0.03],
  ] as const) {
    parts.push(diamond([x, 0.22, z], s));
  }
  return parts;
}
