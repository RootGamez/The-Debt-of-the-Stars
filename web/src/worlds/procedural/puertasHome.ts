// Las cuatro bocas de casa (Archivo de las Puertas, Fase 11 por código): en arco, mirando a la llegada, cada una con
// su reloj tallado en una estela y la vista de un día de Hogar (una tapada: "pronto"). Delante, el atril donde se leen
// sus horas (INT_bocas, lector `bocas`), y a un lado el Banco con los planos del Contrapeso (puertas_Planos, suelto:
// el juego lo esconde al cogerlo; INT_planos). Bajo todo, un mosaico de losas en anillos. 🟡 (plan de la Fase 10D).
import { Color, Mesh, MeshBasicMaterial } from 'three';
import {
  box,
  cylinder,
  Frame,
  pieceMatrix,
  piecesToMeshes,
  PieceSet,
  torus,
  torusArc,
  type Triple,
} from './kit';
import { PALETTE as P, groundFrame, siteFrame, type PuertasBuilder } from './puertasKit';
import { SITES } from './puertasShape';

const DEG = Math.PI / 180;
const HOME_RADIUS = 1.7;

interface Silhouette {
  color: string;
  at: readonly [number, number];
  size: readonly [number, number];
}
/** Lo que se ve al otro lado de cada boca de casa; la cuarta, tapada. */
const HOME_VIEWS: readonly ({ sky: string; shapes: readonly Silhouette[] } | null)[] = [
  // La Sala de Fragmentos llena: luz de lámparas sobre vitrinas.
  {
    sky: '#E8B070',
    shapes: [
      { color: '#7A5A30', at: [-0.5, 0.2], size: [0.35, 1.1] },
      { color: '#7A5A30', at: [0.45, 0.1], size: [0.35, 0.9] },
    ],
  },
  // El Instituto más joven: el cielo de Hogar sobre la colina.
  {
    sky: '#7FB8E0',
    shapes: [
      { color: '#6E9A4A', at: [0, -0.75], size: [1.6, 0.6] },
      { color: '#F2EEE4', at: [0.25, -0.2], size: [0.3, 0.45] },
    ],
  },
  // Hogar al anochecer, con la Puerta pequeña encendida en la colina.
  {
    sky: '#C0603A',
    shapes: [
      { color: '#3A2A3A', at: [0, -0.8], size: [1.6, 0.5] },
      { color: '#FFF0B0', at: [-0.2, -0.35], size: [0.12, 0.12] },
    ],
  },
  null,
];

/** El mosaico: anillos de losas claras y oscuras alrededor del centro de la plaza, sin estorbar al andar. */
function mosaic(b: PuertasBuilder, f: Frame): void {
  for (let ring = 0; ring < 5; ring++) {
    const r = 1.4 + ring * 1.55;
    const count = 8 + ring * 6;
    for (let k = 0; k < count; k++) {
      const a = (2 * Math.PI * (k + (ring % 2) * 0.5)) / count;
      const g = groundFrame(f, Math.cos(a) * r, Math.sin(a) * r, -a / DEG);
      const width = (2 * Math.PI * r) / count - 0.12;
      b.view(
        (k + ring) % 2 ? P.sandstoneShade : P.stoneLight,
        box(),
        g.at([0, 0, 0.02], undefined, [1.35, width, 0.06]),
      );
    }
    // Un hilo de luz entre anillo y anillo: el suelo de la plaza late como un reloj.
    const seam = groundFrame(f, 0, 0);
    b.lamp(
      P.thread,
      torus(r + 0.78, 0.025, 48, 3),
      seam.at([0, 0, 0.06], [Math.PI / 2, 0, 0]),
      0.9,
    );
  }
  b.lamp(P.light, cylinder(0.6, 16), f.at([0, 0, 0.05], undefined, [1, 1, 0.04]), 1.1);
}

/** La vista de una boca de casa, en su propia malla (puertas_VistaCasa_k) y su propio color, con sus siluetas. */
function homeView(
  b: PuertasBuilder,
  g: Frame,
  k: number,
  centre: number,
  view: { sky: string; shapes: readonly Silhouette[] },
): void {
  const window = new Mesh(
    cylinder(HOME_RADIUS - 0.12, 18).clone(),
    new MeshBasicMaterial({ color: new Color(view.sky).multiplyScalar(1.1) }),
  );
  window.name = `puertas_VistaCasa_${String(k)}`;
  window.applyMatrix4(g.at([0, 0, centre], [Math.PI / 2, 0, 0], [1, 1, 0.02]));
  b.extras.push(window);
  for (const s of view.shapes) {
    b.view(
      s.color,
      box(),
      g.at([s.at[0], -0.04, centre + s.at[1]], undefined, [s.size[0], 0.02, s.size[1]]),
    );
  }
}

/** La estela con el reloj de una boca: la hora de casa al otro lado, y tantas muescas como su orden. */
function stele(b: PuertasBuilder, g: Frame, k: number): void {
  const x = HOME_RADIUS + 0.55;
  b.solid(P.stoneLight, box(), g.at([x, -0.1, 0.55], undefined, [0.5, 0.25, 1.9]));
  b.view(P.slate, torus(0.18, 0.02, 16, 3), g.at([x, -0.24, 1.15]));
  const hand = 0.6 + k * 1.3;
  b.lamp(
    P.light,
    box(),
    g.at(
      [x + Math.sin(hand) * 0.07, -0.25, 1.15 + Math.cos(hand) * 0.07],
      [0, hand, 0],
      [0.025, 0.02, 0.15],
    ),
  );
  for (let n = 0; n <= k; n++) {
    b.view(
      P.slate,
      cylinder(0.03, 6),
      g.at([x - 0.15 + n * 0.1, -0.24, 0.7], [Math.PI / 2, 0, 0], [1, 1, 0.03]),
    );
  }
}

function homeMouths(b: PuertasBuilder, f: Frame): void {
  HOME_VIEWS.forEach((view, k) => {
    const x = -6 + k * 4;
    const g = groundFrame(f, x, 2.2 + Math.abs(x) * 0.25, (-x * 0.06) / DEG);
    const centre = b.mouth(g, { radius: HOME_RADIUS, material: P.sandstone, base: 0.1 });
    if (view) homeView(b, g, k, centre, view);
    else {
      // Tapada con una losa; en ella, la marca de "pronto": un aro abierto.
      b.solid(
        P.sandstoneShade,
        cylinder(HOME_RADIUS - 0.05, 18),
        g.at([0, 0, centre], [Math.PI / 2, 0, 0], [1, 1, 0.12]),
      );
      b.view(P.slate, torusArc(0.5, 0.05, 0.4, 2 * Math.PI - 0.4, 14, 4), g.at([0, -0.08, centre]));
    }
    stele(b, g, k);
  });
}

function lectern(b: PuertasBuilder, f: Frame): void {
  const g = groundFrame(f, 0, -3.2);
  b.solid(P.stoneLight, box(), g.at([0, 0, 0.35], undefined, [0.55, 0.45, 1.3]));
  b.solid(P.sandstone, box(), g.at([0, -0.05, 1.05], [-0.45, 0, 0], [0.75, 0.55, 0.06]));
  b.lamp(P.light, box(), g.at([0, -0.1, 1.09], [-0.45, 0, 0], [0.5, 0.3, 0.01]));
  b.mark('INT_bocas', g, [0, -0.5, 1.3], { clue_id: 'puertas.bocas', kind: 'objeto' });
}

/** Los planos enrollados, aparte (en coordenadas de su origen, el tablero del Banco `top`). */
function plans(b: PuertasBuilder, top: Frame): void {
  const set = new PieceSet(17);
  const opts = { solid: false } as const;
  const rolls: readonly Triple[] = [
    [-0.35, 0.05, 0.08],
    [0, -0.1, 0.08],
    [0.35, 0.08, 0.08],
  ];
  rolls.forEach((at, n) => {
    set.add(
      P.paper,
      cylinder(0.07 + 0.01 * n, 8),
      pieceMatrix(at, [0, Math.PI / 2, 0.2 * n], [1, 1, 0.75]),
      'stone',
      opts,
    );
  });
  set.add(
    P.paper,
    box(),
    pieceMatrix([0.1, -0.2, 0.01], [0, 0, -0.15], [0.6, 0.42, 0.01]),
    'stone',
    opts,
  );
  set.add(
    P.slate,
    torus(0.12, 0.012, 12, 3),
    pieceMatrix([0.1, -0.2, 0.02], [Math.PI / 2, 0, 0]),
    'stone',
    opts,
  );
  const [mesh] = piecesToMeshes(set, b.materials, 'puertas_Planos');
  if (!mesh) return;
  mesh.name = 'puertas_Planos';
  mesh.applyMatrix4(top.base);
  b.extras.push(mesh);
}

function bench(b: PuertasBuilder, f: Frame): void {
  const g = groundFrame(f, 5.2, -3.4, 0.5 / DEG);
  b.solid(P.obsidian, box(), g.at([0, 0, 0.85], undefined, [2.2, 0.8, 0.12]));
  for (const x of [-0.8, 0.8])
    b.solid(P.stoneLight, box(), g.at([x, 0, 0.3], undefined, [0.2, 0.7, 1.1]));
  // El mismo Banco que en el Laboratorio: marcas de reloj en el canto.
  for (let k = 0; k < 9; k++) {
    b.lamp(
      P.light,
      box(),
      g.at([-0.9 + k * 0.225, -0.41, 0.85], undefined, [0.03, 0.01, 0.06]),
      0.9,
    );
  }
  plans(b, new Frame(g.at([0, 0, 0.91])));
  b.mark('INT_planos', g, [0, -0.15, 1.1], { clue_id: 'puertas.planos', kind: 'objeto' });
}

export function buildHome(b: PuertasBuilder): void {
  const s = SITES.casa;
  const f = siteFrame(s.lat, s.lon, 180);
  mosaic(b, f);
  homeMouths(b, f);
  lectern(b, f);
  bench(b, f);
}
