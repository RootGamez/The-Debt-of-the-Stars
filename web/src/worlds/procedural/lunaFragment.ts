// El fragmento de los Ausentes clavado en la Luna (CONTEXTO_PLANETAS.md §9, 🟡 el aspecto): una losa de arenisca
// de canto con el borde de arriba cortado en una curva perfecta, sus estratos y una fecha tallada con marcas de
// reloj; alrededor, las esquirlas que soltó al llegar. En el fondo de la mordida, un hilo de luz: ahí se abre el
// gusano. Todo va aparte del suelo (luna_Fragmento, luna_Fragmento_Luz y su COL_ hijo) porque en el Hogar de antes
// (Fase 10E) aún no ha llegado y el juego lo quita entero.
import { BoxGeometry, Vector3, type BufferGeometry } from 'three';
import { PieceSet, ball, box, cylinder, pieceMatrix, torus, type Frame, type Triple } from './kit';
import { seededRandom } from './noise';

export const FRAGMENT_COLORS = {
  sandstone: '#d8c49a',
  sandstoneShade: '#b8a27a',
  slate: '#3a3a48',
  dust: '#4e5666',
  light: '#ffd890',
} as const;

/** Medidas de la losa (m): ancho X, fondo Y, alto Z; su cara grande mira a −Y. */
export const SLAB = { width: 2.6, depth: 0.95, height: 3.8 } as const;
/** Una mordida esférica: centro (en el marco de la losa) y radio (m). */
export interface Bite {
  center: Triple;
  radius: number;
}
/** La mordida grande (arriba, en la arista de delante, donde se abre el gusano) y una pequeña. */
export const BITES: readonly Bite[] = [
  { center: [0.45, -0.7, 1.75], radius: 1.05 },
  { center: [-1.45, -0.15, 0.35], radius: 0.5 },
];
/** Cuánto sube la losa sobre el marco del sitio y cómo se inclina (rad). */
const SLAB_AT: Triple = [0, 0, 1.55];
const SLAB_TILT: Triple = [0.22, 0.06, 0];
/** Densidad de la malla de la losa (m por celda): lo bastante fina para que la curva se lea redonda. */
const CELL = 0.17;

const SHARDS = 16;
const DUST_PILES = 8;
const SEED = 7;

/**
 * Caja de `size` metros con mordidas esféricas: los vértices que quedan dentro de una esfera se llevan a su
 * superficie (radialmente desde su centro), así que el corte es una curva perfecta y no un elipsoide.
 */
export function carvedSlab(size: Triple, bites: readonly Bite[], cell = CELL): BufferGeometry {
  const [w, d, h] = size;
  const cells = (length: number): number => Math.max(1, Math.round(length / cell));
  const geometry = new BoxGeometry(w, d, h, cells(w), cells(d), cells(h)).toNonIndexed();
  geometry.deleteAttribute('uv');
  const position = geometry.getAttribute('position');
  const p = new Vector3();
  const centre = new Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    for (const bite of bites) {
      centre.set(...bite.center);
      const away = p.clone().sub(centre);
      if (away.length() < bite.radius) {
        // Un vértice justo en el centro no tiene dirección: se saca hacia −Y, la cara de delante.
        if (away.lengthSq() < 1e-12) away.set(0, -1, 0);
        p.copy(centre).addScaledVector(away.normalize(), bite.radius);
      }
    }
    position.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Las piezas del fragmento y sus esquirlas en el marco `site` de su sitio (Z arriba, Y hacia el rumbo). */
export function buildFragment(site: Frame): PieceSet {
  const set = new PieceSet(SEED);
  const random = seededRandom(SEED);
  const { sandstone, sandstoneShade, slate, dust, light } = FRAGMENT_COLORS;
  const at = (position: Triple, rotation?: Triple, scale?: Triple) =>
    site.base
      .clone()
      .multiply(pieceMatrix(SLAB_AT, SLAB_TILT))
      .multiply(pieceMatrix(position, rotation, scale));

  const { width, depth, height } = SLAB;
  const face = -depth / 2;
  set.add(sandstone, carvedSlab([width, depth, height], BITES), at([0, 0, 0]), 'stone', {
    solid: true,
  });
  // Estratos: franjas más oscuras de lado a lado (los Ausentes tallaban en capas).
  for (const z of [-1.35, -0.85, 0.15]) {
    set.add(
      sandstoneShade,
      box(),
      at([0, face - 0.012, z], undefined, [width * 0.97, 0.03, 0.1]),
      'stone',
      {
        solid: false,
      },
    );
  }
  // La fecha: un aro de doce marcas de reloj (las de los cuartos, más largas) con su aguja y tres muescas debajo.
  const [cx, cz, r] = [-0.55, -0.15, 0.42];
  set.add(slate, torus(r, 0.025, 28, 4), at([cx, face - 0.015, cz]), 'stone', { solid: false });
  for (let k = 0; k < 12; k++) {
    const a = (2 * Math.PI * k) / 12;
    const long = k % 3 === 0 ? 0.16 : 0.08;
    set.add(
      slate,
      box(),
      at(
        [cx + Math.cos(a) * (r - 0.1), face - 0.015, cz + Math.sin(a) * (r - 0.1)],
        [0, Math.PI / 2 - a, 0],
        [0.035, 0.03, long],
      ),
      'stone',
      { solid: false },
    );
  }
  set.add(
    slate,
    box(),
    at([cx + 0.1, face - 0.02, cz + 0.08], [0, -0.9, 0], [0.03, 0.03, 0.3]),
    'stone',
    {
      solid: false,
    },
  );
  for (let k = 0; k < 3; k++) {
    set.add(
      slate,
      cylinder(0.04, 6),
      at([cx - 0.15 + k * 0.15, face - 0.015, cz - r - 0.18], [Math.PI / 2, 0, 0], [1, 1, 0.03]),
      'stone',
      { solid: false },
    );
  }
  // El hilo de luz en el fondo de la mordida grande.
  const [bite] = BITES;
  if (bite) {
    const [mx, my, mz] = bite.center;
    set.add(
      light,
      box(),
      at([mx - 0.1, my + bite.radius - 0.04, mz - 0.25], [0, 0.35, 0], [0.025, 0.02, 0.9]),
      'light',
      { glow: 1.5 },
    );
  }

  // Esquirlas alrededor (cada una con su mordida) y la tierra removida donde se clavó.
  const onGround = (position: Triple, rotation: Triple, scale?: Triple) =>
    site.base.clone().multiply(pieceMatrix(position, rotation, scale));
  for (let k = 0; k < SHARDS; k++) {
    const a = random() * 2 * Math.PI;
    const distance = 1.9 + random() * 2.9;
    const s = 0.18 + random() * 0.24;
    const cut: Bite = { center: [(random() - 0.5) * 0.6 * s, -0.5 * s, 0.45 * s], radius: 0.6 * s };
    const tilt: Triple = [(random() - 0.5) * 0.8, (random() - 0.5) * 0.8, a];
    set.add(
      random() < 0.5 ? sandstone : sandstoneShade,
      carvedSlab([1.6 * s, s, 0.9 * s], [cut], s / 3),
      onGround([Math.cos(a) * distance, Math.sin(a) * distance, s * 0.25], tilt),
      'stone',
      { solid: true },
    );
  }
  for (let k = 0; k < DUST_PILES; k++) {
    const a = (2 * Math.PI * k) / DUST_PILES + (random() - 0.5) * 0.4;
    const size = 0.5 + random() * 0.3;
    set.add(
      dust,
      ball(size, 1),
      onGround([Math.cos(a) * 1.9, Math.sin(a) * 1.3, 0.05], [0, 0, a], [1.4, 0.6, 0.25]),
      'stone',
      {
        solid: false,
      },
    );
  }
  return set;
}
