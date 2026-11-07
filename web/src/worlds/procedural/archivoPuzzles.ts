// La Gran Nave y la Ranura del Archivo, con sus puzzles físicos (plan de historia y puzzles físicos, T6; 🟡): la mesa
// del Planetario con sus seis rieles (el quinto, vacío y negro), los pedestales de las cinco esferas, el soporte del
// prisma y las marcas de interacción. Las esferas, el prisma y el abanico de luz se mueven: los dibuja
// render/archivoPuzzlesView.ts a partir de esas marcas.
import type { ARCHIVO_PALETTE, MarkerSpec } from './archivoGallery';
import { ORRERY } from '../../puzzles/orrery';
import {
  ORRERY_AT,
  ORRERY_TOP,
  PRISM_HOME,
  RAIL_MARK_LIFT,
  RAIL_RADII,
  SPHERE_HOMES,
  STAND_AT,
  railAngle,
} from './archivoPuzzlesShape';
import { box, cylinder, torus, type Frame, type PieceSet } from './kit';
import { sphereSource, ARCHIVO_PLAY } from '../../game/archivoPlay';

export interface PuzzlesContext {
  pieces: PieceSet;
  palette: typeof ARCHIVO_PALETTE;
  markers: MarkerSpec[];
  at: (lat: number, lon: number, heading?: number) => Frame;
}

const DEG = Math.PI / 180;

export function buildArchivoPuzzles(ctx: PuzzlesContext): void {
  orrery(ctx);
  spherePedestals(ctx);
  prism(ctx);
}

/** La mesa del Planetario: un pie, la tapa, el sol del centro, seis rieles y sus ranuras (la quinta, negra). */
function orrery({ pieces: v, palette: P, markers, at }: PuzzlesContext): void {
  const f = at(ORRERY_AT.lat, ORRERY_AT.lon);
  const outer = RAIL_RADII[RAIL_RADII.length - 1] ?? 2.4;
  v.add(P.pearlShade, cylinder(0.7, 10), f.at([0, 0, 0.4], undefined, [1, 1, 0.8]));
  v.add(
    P.ivoryShade,
    cylinder(outer + 0.25, 28),
    f.at([0, 0, ORRERY_TOP - 0.06], undefined, [1, 1, 0.12]),
  );
  v.add(
    P.light,
    cylinder(0.22, 12),
    f.at([0, 0, ORRERY_TOP + 0.04], undefined, [1, 1, 0.08]),
    'light',
    {
      glow: 2.2,
      vary: 0,
      solid: false,
    },
  );
  for (const [index, radius] of RAIL_RADII.entries()) {
    const rail = index + 1;
    v.add(P.gold, torus(radius, 0.025, 36, 4), f.at([0, 0, ORRERY_TOP + 0.01]), 'metal', {
      solid: false,
    });
    const a = railAngle(rail) * DEG;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    const empty = rail === ORRERY.emptyRail;
    v.add(
      empty ? P.ink : P.goldLight,
      cylinder(0.11, 10),
      f.at([x, y, ORRERY_TOP + 0.02], undefined, [1, 1, 0.04]),
      'metal',
      { solid: false, vary: 0 },
    );
    markers.push({
      name: `INT_planetario_${String(rail)}`,
      frame: f,
      at: [x, y, ORRERY_TOP + RAIL_MARK_LIFT],
      props: { clue_id: ARCHIVO_PLAY.orrery, kind: 'observacion', riel: rail },
    });
  }
  // La línea de la alineación: una raya de oro del centro al borde, en el ángulo 0.
  v.add(
    P.gold,
    box(),
    f.at([outer / 2, 0, ORRERY_TOP + 0.005], undefined, [outer, 0.03, 0.008]),
    'metal',
    {
      solid: false,
      vary: 0,
    },
  );
}

/** Los cinco pedestales de las esferas, cada uno con su marca. */
function spherePedestals({ pieces: v, palette: P, markers, at }: PuzzlesContext): void {
  for (const id of ORRERY.spheres) {
    const home = SPHERE_HOMES[id];
    const f = at(home.lat, home.lon);
    v.add(P.pearlShade, cylinder(0.3, 8), f.at([0, 0, 0.45], undefined, [1, 1, 0.9]));
    v.add(P.gold, torus(0.3, 0.025, 14, 4), f.at([0, 0, 0.9], [Math.PI / 2, 0, 0]), 'metal', {
      solid: false,
    });
    markers.push({
      name: `INT_esfera_${id}`,
      frame: f,
      at: [0, 0, 1.25],
      props: { clue_id: sphereSource(id), kind: 'objeto' },
    });
  }
}

/** El prisma, tirado por el suelo de la Ranura, y su soporte junto a la tablilla. */
function prism({ pieces: v, palette: P, markers, at }: PuzzlesContext): void {
  const home = at(PRISM_HOME.lat, PRISM_HOME.lon);
  markers.push({
    name: 'INT_prisma',
    frame: home,
    at: [0, 0, 0.5],
    props: { clue_id: ARCHIVO_PLAY.prism, kind: 'objeto' },
  });
  const f = at(STAND_AT.lat, STAND_AT.lon);
  v.add(P.steelDark, cylinder(0.12, 6), f.at([0, 0, 0.45], undefined, [1, 1, 0.9]), 'metal');
  v.add(P.gold, torus(0.2, 0.03, 12, 4), f.at([0, 0, 0.92], [Math.PI / 2, 0, 0]), 'metal', {
    solid: false,
  });
  markers.push({
    name: 'INT_soporte',
    frame: f,
    at: [0, 0, 1.2],
    props: { clue_id: ARCHIVO_PLAY.stand, kind: 'objeto' },
  });
}
