// Los muebles de la casa del escéptico (plan de finales, E5; 🟡): el catre a su medida (él mide unos tres metros), la
// caja con las dos tazas (la suya y la de ella), la mesa con las páginas cosidas con hilo rojo, el fajo de cartas
// atado, el tintero y la lámpara, el taburete y una alfombra gastada. Y el anillo por el que se llega desde la Pista,
// con su signo (dos triángulos punta con punta). Todo sobre el núcleo: las patas de los extremos son más largas.
import { CylinderGeometry, IcosahedronGeometry, Matrix4, TorusGeometry } from 'three';
import type { Frame, Triple } from './kit';
import { column, grid, plain, softBox, type CentroParts } from './tallerCentroParts';
import { COT_SIZE, TABLE_SIZE, floorDrop } from './tallerCentroShape';
import { CORE_RADIUS } from './tallerShape';

const P = {
  wood: '#7a5a3e',
  woodDark: '#4e3a2a',
  canvas: '#8d8a78',
  blanket: '#5d6a7a',
  metal: '#7b766c',
  paper: '#e7ddc6',
  thread: '#b0322a',
  envelope: '#d8cdb0',
  string: '#4a3b2c',
  ink: '#1e1a22',
  cupHis: '#4b5563',
  cupHers: '#c79a52',
  gold: '#e0b45a',
  lamp: '#ffc070',
  rug: '#8a4b3a',
  rugBand: '#c08a4a',
} as const;

/** Una pata del marco `f` en (x, y), de `top` al suelo (que baja hacia los extremos). */
function leg(parts: CentroParts, f: Frame, x: number, y: number, top: number, r: number): void {
  const bottom = -floorDrop(x, y) - 0.04;
  parts.add(column(r, r * 0.85, top - bottom, 12), f.at([x, y, bottom]), P.metal, { solid: true });
}

function cot(parts: CentroParts, f: Frame): void {
  const { length, width, seat } = COT_SIZE;
  const rail = seat - 0.1;
  for (const y of [-width / 2 + 0.05, width / 2 - 0.05]) {
    parts.add(
      column(0.035, 0.035, length, 12),
      f.at([-length / 2, y, rail], [0, Math.PI / 2, 0]),
      P.metal,
    );
  }
  for (const x of [-length / 2, 0, length / 2]) {
    for (const y of [-width / 2 + 0.05, width / 2 - 0.05]) leg(parts, f, x, y, rail, 0.035);
  }
  // El colchón de lona, la manta arrugada hacia la cabecera y la almohada.
  parts.add(softBox(length - 0.1, width - 0.05, 0.12, 0.05), f.at([0, 0, seat - 0.04]), P.canvas, {
    solid: true,
  });
  parts.add(
    softBox(1.3, width - 0.02, 0.07, 0.035),
    f.at([-0.7, 0, seat + 0.05], [0, 0.02, 0.03]),
    P.blanket,
  );
  parts.add(softBox(0.55, 0.8, 0.11, 0.05), f.at([-1.3, 0, seat + 0.08], [0, -0.08, 0]), P.paper);
}

/** La caja junto a la cabecera, con las dos tazas: la suya, oscura; la de ella, ocre con un aro de oro. */
function crate(parts: CentroParts, f: Frame): void {
  const x = -2.15;
  const h = 0.62;
  parts.add(softBox(0.62, 0.55, h, 0.03), f.at([x, 0, h / 2 - floorDrop(x, 0) - 0.03]), P.wood, {
    solid: true,
  });
  for (const z of [0.2, 0.42]) {
    parts.add(softBox(0.64, 0.57, 0.03, 0.01, 1), f.at([x, 0, z - floorDrop(x, 0)]), P.woodDark);
  }
  const top = h - floorDrop(x, 0) - 0.03;
  for (const [dx, color, hers] of [
    [-0.12, P.cupHis, false],
    [0.12, P.cupHers, true],
  ] as const) {
    parts.add(column(0.05, 0.065, 0.13, 20), f.at([x + dx, 0.05, top]), color);
    parts.add(column(0.052, 0.052, 0.004, 20), f.at([x + dx, 0.05, top + 0.115]), P.ink, {
      vary: 0,
    });
    parts.add(
      plain(new TorusGeometry(0.035, 0.012, 6, 14)).rotateX(Math.PI / 2),
      f.at([x + dx + (hers ? 0.075 : -0.075), 0.05, top + 0.07]),
      color,
    );
    if (hers) {
      parts.add(
        plain(new TorusGeometry(0.062, 0.006, 6, 24)),
        f.at([x + dx, 0.05, top + 0.1]),
        P.gold,
      );
    }
  }
}

function tableTop(parts: CentroParts, f: Frame): void {
  const { length, width, height } = TABLE_SIZE;
  parts.add(softBox(length, width, 0.07, 0.025), f.at([0, 0, height]), P.wood, { solid: true });
  for (const x of [-length / 2 + 0.12, length / 2 - 0.12]) {
    for (const y of [-width / 2 + 0.12, width / 2 - 0.12]) {
      const bottom = -floorDrop(x, y) - 0.04;
      parts.add(column(0.055, 0.04, height - bottom, 10), f.at([x, y, bottom]), P.woodDark, {
        solid: true,
      });
    }
  }
  parts.add(softBox(length - 0.3, 0.05, 0.06, 0.02, 1), f.at([0, 0, 0.35]), P.woodDark);
  // El taburete, hacia la Cámara.
  const sx = -0.2;
  const sy = 0.95;
  parts.add(column(0.3, 0.3, 0.06, 28), f.at([sx, sy, 0.78]), P.wood, { solid: true });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const [lx, ly] = [sx + Math.cos(a) * 0.2, sy + Math.sin(a) * 0.2];
    parts.add(
      column(0.03, 0.03, 0.8 + floorDrop(lx, ly), 8),
      f.at([lx, ly, -floorDrop(lx, ly)]),
      P.woodDark,
    );
  }
}

/** Lo que hay encima de la mesa: las páginas cosidas, las cartas atadas, el tintero y la lámpara. */
function tableThings(parts: CentroParts, f: Frame): void {
  const top = TABLE_SIZE.height + 0.035;
  for (let k = 0; k < 7; k++) {
    const turn = (k - 3) * 0.03;
    parts.add(
      softBox(0.42, 0.56, 0.006, 0.002, 1),
      f.at([-0.42, 0, top + 0.004 + k * 0.007], [0, 0, turn]),
      P.paper,
      {
        vary: 0.06,
      },
    );
  }
  parts.add(softBox(0.012, 0.5, 0.06, 0.004, 1), f.at([-0.63, 0, top + 0.025]), P.thread, {
    vary: 0,
  });
  for (let k = 0; k < 6; k++) {
    parts.add(
      softBox(0.3, 0.19, 0.012, 0.004, 1),
      f.at([0.18, -0.12, top + 0.007 + k * 0.013], [0, 0, (k % 2) * 0.04]),
      P.envelope,
    );
  }
  parts.add(softBox(0.31, 0.012, 0.09, 0.004, 1), f.at([0.18, -0.12, top + 0.04]), P.string, {
    vary: 0,
  });
  parts.add(softBox(0.012, 0.2, 0.09, 0.004, 1), f.at([0.18, -0.12, top + 0.04]), P.string, {
    vary: 0,
  });
  parts.add(column(0.05, 0.035, 0.07, 16), f.at([0.05, 0.22, top]), P.ink);
  // La lámpara: pie de metal y un globo que brilla (su luz va cocida en lo de alrededor).
  parts.add(column(0.09, 0.05, 0.05, 20), f.at([0.55, 0.12, top]), P.metal);
  parts.add(column(0.018, 0.018, 0.25, 8), f.at([0.55, 0.12, top + 0.05]), P.metal);
  parts.add(plain(new IcosahedronGeometry(0.09, 3)), f.at([0.55, 0.12, top + 0.35]), P.lamp, {
    emissive: true,
    glow: 1.5,
  });
}

/** Una alfombra gastada bajo el catre, pegada a la curva del suelo. */
function rug(parts: CentroParts, f: Frame): void {
  const [w, d] = [3.6, 2.2];
  const geometry = grid(
    24,
    14,
    (u, v) => {
      const local = f.point([(u - 0.5) * w, (v - 0.5) * d + 0.45, 0]);
      return local.setLength(CORE_RADIUS + 0.012);
    },
    (p) => p.clone().normalize(),
  );
  parts.add(geometry, new Matrix4(), P.rug, {
    tint: (p) => {
      const local = p.clone().applyMatrix4(f.base.clone().invert());
      const band = Math.abs(local.x) > w / 2 - 0.35 || Math.abs(local.y - 0.45) > d / 2 - 0.3;
      return band ? 1.35 : 0.95 + 0.1 * Math.sin(local.x * 9);
    },
  });
}

export function buildFurniture(parts: CentroParts, cotFrame: Frame, tableFrame: Frame): void {
  rug(parts, cotFrame);
  cot(parts, cotFrame);
  crate(parts, cotFrame);
  tableTop(parts, tableFrame);
  tableThings(parts, tableFrame);
}

/** Un triángulo plano de cara a ±Y (prisma fino de tres lados), con la punta hacia arriba o hacia abajo. */
function triangle(parts: CentroParts, f: Frame, at: Triple, down: boolean): void {
  const prism = plain(new CylinderGeometry(0.22, 0.22, 0.05, 3));
  if (down) prism.rotateY(Math.PI);
  parts.add(prism, f.at(at), P.gold, { emissive: true, glow: 0.9 });
}

/** El anillo por el que se llega: dos postes, el aro y, encima, su signo de dos triángulos punta con punta. */
export function buildGateRing(parts: CentroParts, f: Frame): void {
  for (const x of [-2.1, 2.1]) {
    parts.add(softBox(0.42, 0.42, 3.8, 0.06), f.at([x, 0, 1.6]), '#4a464c', { solid: true });
    parts.add(softBox(0.56, 0.56, 0.3, 0.05), f.at([x, 0, 0]), '#4a464c');
  }
  parts.add(
    plain(new TorusGeometry(1.6, 0.17, 14, 96)).rotateX(Math.PI / 2),
    f.at([0, 0, 1.75]),
    P.metal,
  );
  parts.add(softBox(4.6, 0.3, 0.3, 0.06), f.at([0, 0, 3.55]), '#4a464c', { solid: true });
  // Dos triángulos punta con punta, como un reloj de arena: arriba el que mira abajo.
  triangle(parts, f, [0, 0, 4.36], true);
  triangle(parts, f, [0, 0, 3.92], false);
}
