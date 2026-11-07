// Las salas del Archivo por dentro (plan de historia y puzzles físicos, §7.2; 🟡): los mamparos que cortan el tubo y
// lo que da carácter a cada sala (charcos, mesas, cajoneras, escaleras de ruedas, columnas, relojes de pared, pasillo
// de cajones…). Los datos y las paredes puras están en archivoRoomsShape.ts; esto solo las dibuja.
import type { Matrix4 } from 'three';
import { box, cylinder, pieceMatrix, type Frame, type PieceSet, type Triple } from './kit';
import type { ARCHIVO_PALETTE } from './archivoGallery';
import { floorHalfLat, floorRadius, TUBE_MAJOR, TUBE_MINOR } from './archivoShape';
import {
  BULKHEAD_LONS,
  BULKHEAD_THICK,
  CORRIDOR_HALF,
  DOOR,
  bulkheadStrips,
  inCorridor,
  nearBulkhead,
} from './archivoRoomsShape';

/** Lo que los salones necesitan de la galería. */
export interface RoomsContext {
  pieces: PieceSet;
  palette: typeof ARCHIVO_PALETTE;
  at: (lat: number, lon: number, heading?: number) => Frame;
  /** La sección del tubo en una longitud (X hacia fuera, Y al este, Z al norte). */
  section: (lon: number) => Matrix4;
  random: () => number;
}

export class RoomsBuilder {
  constructor(private readonly ctx: RoomsContext) {}

  build(): void {
    for (const lon of BULKHEAD_LONS) this.bulkhead(lon);
    this.vestibule();
    this.slotRoom();
    this.archivist();
    this.indexRoom();
    this.hall();
    this.clocks();
    this.depths();
    this.drawers();
  }

  /** Un mamparo: una pared de piedra que cierra el tubo, con su puerta de oro al ras del suelo. */
  private bulkhead(lon: number): void {
    const { pieces: v, palette: P, section } = this.ctx;
    const floor = floorRadius(lon) - TUBE_MAJOR;
    const base = section(lon);
    for (const s of bulkheadStrips(floor)) {
      v.add(
        P.pearlShade,
        box(),
        base
          .clone()
          .multiply(pieceMatrix([s.x, 0, s.z], undefined, [s.height, BULKHEAD_THICK, s.width])),
      );
    }
    // El marco de la puerta: dos jambas y un dintel de oro apagado.
    for (const side of [-1, 1]) {
      v.add(
        P.gold,
        box(),
        base
          .clone()
          .multiply(
            pieceMatrix([floor + DOOR.height / 2, 0, side * (DOOR.half + 0.06)], undefined, [
              DOOR.height,
              BULKHEAD_THICK + 0.12,
              0.12,
            ]),
          ),
        'metal',
        { solid: false },
      );
    }
    v.add(
      P.gold,
      box(),
      base
        .clone()
        .multiply(
          pieceMatrix([floor + DOOR.height + 0.06, 0, 0], undefined, [
            0.12,
            BULKHEAD_THICK + 0.12,
            DOOR.half * 2 + 0.24,
          ]),
        ),
      'metal',
      { solid: false },
    );
  }

  /** El Vestíbulo de la Esclusa: bajo y húmedo, con charcos y bancos; el plano del Archivo, tallado en su mamparo. */
  private vestibule(): void {
    const { pieces: v, palette: P, at, random, section } = this.ctx;
    for (let k = 0; k < 9; k++) {
      const lon = 79.5 + random() * 11;
      const lat = (random() - 0.5) * 8;
      // Ni sobre el hueco de la esclusa ni en la puerta.
      if (Math.abs(lat) < 2.2 && lon > 80.5 && lon < 89.5) continue;
      const radius = 0.5 + random() * 0.9;
      v.add(
        '#6A93B0',
        cylinder(radius, 10),
        at(lat, lon).at([0, 0, 0.012], undefined, [1, 1, 0.02]),
        'stone',
        {
          solid: false,
          vary: 0.05,
        },
      );
    }
    for (const lat of [-4.6, 4.6]) {
      const f = at(lat, 84, 90);
      v.add(P.pearlShade, box(), f.at([0, 0, 0.3], undefined, [2.2, 0.5, 0.6]));
    }
    // El plano del Archivo en el mamparo del este: el anillo del tubo, seis torres y un punto: la esclusa.
    const floor = floorRadius(92) - TUBE_MAJOR;
    const base = section(92);
    const relief = (at3: Triple, size: Triple, tone: string): void => {
      v.add(tone, box(), base.clone().multiply(pieceMatrix(at3, undefined, size)), 'metal', {
        solid: false,
        vary: 0,
      });
    };
    const centerX = floor + 2.2;
    const centerZ = 3.6;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      relief(
        [centerX + Math.sin(a) * 1.1, -BULKHEAD_THICK / 2 - 0.03, centerZ + Math.cos(a) * 1.1],
        [0.18, 0.04, 0.18],
        P.goldLight,
      );
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      relief(
        [centerX + Math.sin(a) * 1.35, -BULKHEAD_THICK / 2 - 0.05, centerZ + Math.cos(a) * 1.35],
        [0.3, 0.06, 0.12],
        P.gold,
      );
    }
    relief([centerX + 1.1, -BULKHEAD_THICK / 2 - 0.05, centerZ], [0.22, 0.08, 0.22], P.lightCold);
  }

  /** La Sala de la Ranura: oscura, con dos bancos mirando hacia la ranura y rollos de papel por el suelo. */
  private slotRoom(): void {
    const { pieces: v, palette: P, at, random } = this.ctx;
    for (const lon of [96, 103]) {
      for (const lat of [-3.2, 3.2]) {
        v.add(P.rockLight, box(), at(lat, lon, 90).at([0, 0, 0.28], undefined, [1.8, 0.5, 0.56]));
      }
    }
    for (let k = 0; k < 7; k++) {
      const lon = 94 + random() * 14;
      const lat = (random() - 0.5) * 7;
      if (Math.abs(lat) < 1.4 && Math.abs(lon - 99.5) < 2) continue;
      v.add(
        P.paper,
        cylinder(0.07, 6),
        at(lat, lon, random() * 180).at([0, 0, 0.07], [Math.PI / 2, 0, 0], [1, 1, 0.5]),
        'stone',
        { solid: false },
      );
    }
  }

  /** La Sala del Archivista: mesas con su lámpara cálida y cajoneras contra las paredes. */
  private archivist(): void {
    const { pieces: v, palette: P, at } = this.ctx;
    for (const [lat, lon] of [
      [2.6, 33],
      [-2.6, 52],
      [2.6, 58],
      [-2.6, 64],
      [2.6, 70],
    ] as const) {
      const f = at(lat, lon, 90);
      v.add(P.ivoryShade, box(), f.at([0, 0, 0.8], undefined, [1.5, 0.85, 0.08]));
      for (const [x, y] of [
        [-0.65, -0.35],
        [0.65, -0.35],
        [-0.65, 0.35],
        [0.65, 0.35],
      ] as const) {
        v.add(P.pearlShade, box(), f.at([x, y, 0.38], undefined, [0.1, 0.1, 0.76]));
      }
      v.add(P.paper, box(), f.at([0.1, 0, 0.85], [0, 0, 0.3], [0.4, 0.3, 0.01]), 'stone', {
        solid: false,
      });
      v.add(
        P.light,
        cylinder(0.07, 6),
        f.at([-0.45, 0.3, 1.0], undefined, [1, 0.6, 0.02]),
        'light',
        {
          glow: 2,
          vary: 0,
        },
      );
    }
    for (const lon of [36, 48, 54, 62, 74]) {
      const half = floorHalfLat(floorRadius(lon));
      this.chest(at(half - 1.4, lon, 180));
    }
  }

  /** Una cajonera: un cuerpo de piedra con tres filas de cajones de marfil. */
  private chest(f: Frame): void {
    const { pieces: v, palette: P } = this.ctx;
    v.add(P.pearlShade, box(), f.at([0, 0, 0.85], undefined, [1.6, 0.6, 1.7]));
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        v.add(
          (row + col) % 2 ? P.ivory : P.ivoryShade,
          box(),
          f.at([-0.5 + col * 0.5, 0.31, 0.35 + row * 0.55], undefined, [0.44, 0.03, 0.46]),
          'stone',
          { solid: false },
        );
      }
    }
  }

  /** El Índice: escaleras con ruedas contra su muro. */
  private indexRoom(): void {
    const { at } = this.ctx;
    for (const lon of [11, 26]) {
      const half = floorHalfLat(floorRadius(lon));
      this.ladder(at(half - 2.4, lon, 180));
    }
  }

  private ladder(f: Frame): void {
    const { pieces: v, palette: P } = this.ctx;
    for (const x of [-0.3, 0.3]) {
      v.add(P.steelDark, box(), f.at([x, -0.5, 1.6], [0.2, 0, 0], [0.06, 0.06, 3.3]), 'metal', {
        solid: false,
      });
      v.add(
        P.steelDark,
        cylinder(0.1, 8),
        f.at([x, -0.1, 0.1], [0, Math.PI / 2, 0], [1, 1, 0.08]),
        'metal',
        {
          solid: false,
        },
      );
    }
    for (let k = 0; k < 8; k++) {
      v.add(
        P.gold,
        box(),
        f.at([0, -0.45 + k * -0.0 - 0.07 * k, 0.4 + k * 0.38], undefined, [0.6, 0.05, 0.05]),
        'metal',
        { solid: false },
      );
    }
    v.add(P.steelDark, box(), f.at([0, -0.3, 0.9], undefined, [0.7, 0.5, 0.06]), 'metal');
  }

  /** La Gran Nave: columnas altas y lucernarios de luz fría en lo alto del vidrio. */
  private hall(): void {
    const { pieces: v, palette: P, at, section } = this.ctx;
    for (const lon of [-22, -16, -6, -1, 2]) {
      for (const lat of [-4, 4]) {
        v.add(
          P.pearl,
          cylinder(0.4, 10),
          at(lat, lon).at([0, 0, 3.4], undefined, [1, 1, 6.8]),
          'stone',
        );
        v.add(
          P.gold,
          cylinder(0.46, 10),
          at(lat, lon).at([0, 0, 0.12], undefined, [1, 1, 0.24]),
          'metal',
          {
            solid: false,
          },
        );
      }
    }
    for (const lon of [-21, -14, -8, -2]) {
      for (const z of [-2.2, 2.2]) {
        v.add(
          P.lightCold,
          box(),
          section(lon)
            .clone()
            .multiply(pieceMatrix([TUBE_MINOR - 0.9, 0, z], undefined, [0.05, 1.4, 1.4])),
          'light',
          { glow: 1.8, vary: 0, solid: false },
        );
      }
    }
  }

  /** La Sala de Relojes: relojes de pared sobre las estanterías, cada uno a su hora. */
  private clocks(): void {
    const { pieces: v, palette: P, at } = this.ctx;
    let k = 0;
    for (let lon = -58; lon < -27; lon += 2.4) {
      const half = floorHalfLat(floorRadius(lon));
      for (const side of [1, -1]) {
        k += 1;
        const f = at(side * (half - 0.4), lon, side > 0 ? 180 : 0);
        const face = f.at([0, 0, 2.9], [Math.PI / 2, 0, 0], [1, 1, 0.05]);
        v.add(P.ivory, cylinder(0.26, 14), face, 'stone', { solid: false });
        v.add(P.ink, box(), f.at([0, 0.04, 2.9], [0, k * 0.8, 0], [0.025, 0.012, 0.2]), 'metal', {
          solid: false,
        });
      }
    }
  }

  /** El Fondo del Cañón: columnas caídas, en lo oscuro. */
  private depths(): void {
    const { pieces: v, palette: P, at, random } = this.ctx;
    for (let k = 0; k < 6; k++) {
      const lon = -92 + random() * 28;
      const lat = (random() - 0.5) * 8;
      v.add(
        P.rockLight,
        cylinder(0.45, 9),
        at(lat, lon, random() * 180).at([0, 0, 0.42], [0, Math.PI / 2, 0], [1, 1, 3.4]),
        'stone',
      );
    }
    for (const lon of [-112, -111]) {
      v.add(P.rockDark, box(), at(2.6, lon, 90).at([0, 0, 0.5], [0, 0, 0.3], [1.2, 1.6, 1.0]));
    }
  }

  /** El Pasillo de los Cajones: dos paredes de cajones numerados, algunos abiertos, que lo estrechan. */
  private drawers(): void {
    const { pieces: v, palette: P, at, random } = this.ctx;
    for (let lon = 112; lon < 245; lon += 2.2) {
      const real = ((lon + 180) % 360) - 180;
      if (!inCorridor(real) || nearBulkhead(real, 1.2)) continue;
      for (const side of [1, -1]) {
        const f = at(side * (CORRIDOR_HALF + 0.35), real, side > 0 ? 180 : 0);
        v.add(P.pearlShade, box(), f.at([0, 0, 1.5], undefined, [2.25, 0.7, 3.0]));
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 3; col++) {
            const open = random() < 0.08;
            v.add(
              (row + col) % 2 ? P.ivory : P.ivoryShade,
              box(),
              f.at([-0.7 + col * 0.7, 0.36 + (open ? 0.18 : 0), 0.35 + row * 0.55], undefined, [
                0.62,
                open ? 0.36 : 0.03,
                0.48,
              ]),
              'stone',
              { solid: false },
            );
          }
        }
      }
    }
  }
}
