// El canal de las campanas del Anfiteatro (plan de historia y puzzles físicos, P1; 🟡): un plano inclinado de piedra
// y bronce sobre el escenario, con dieciséis marcas, el estante donde cuelgan las cuatro campanas y el atril cerrado
// donde espera la canción. Las campanas, la bola y la tapa del atril se mueven: las dibuja render/bellsView.ts.
import type { Frame } from './kit';
import { box, cylinder } from './kit';
import { BELLS } from '../../puzzles/bells';
import {
  CHANNEL_INTERACT,
  CHANNEL_LENGTH,
  CHANNEL_TILT,
  INTERACT_LIFT,
  LECTERN_AT,
  RACK_AT,
  RACK_BAR,
  channelPoint,
} from './umbralBellsShape';
import type { LandmarkBuilder } from './umbralLandmarks';
import { PALETTE as P } from './umbralPalette';

/** Ancho del lecho del canal (m). */
const BED_WIDTH = 0.34;

export function bellsChannel(b: LandmarkBuilder, f: Frame): void {
  const v = b.pieces;
  const tilt: [number, number, number] = [0, CHANNEL_TILT, 0];
  // El lecho y sus dos bordes, siguiendo la pendiente.
  v.add(
    P.slateLight,
    box(),
    f.at(channelPoint(CHANNEL_LENGTH / 2 - 0.1, -0.05), tilt, [CHANNEL_LENGTH, BED_WIDTH, 0.1]),
    'metal',
  );
  for (const side of [-1, 1]) {
    v.add(
      P.slate,
      box(),
      f.at(channelPoint(CHANNEL_LENGTH / 2 - 0.1, 0.03, side * (BED_WIDTH / 2 + 0.02)), tilt, [
        CHANNEL_LENGTH,
        0.04,
        0.1,
      ]),
      'metal',
    );
  }
  // Las dieciséis marcas, todas iguales (nada marca cuáles importan).
  for (let mark = 1; mark <= BELLS.marks; mark++) {
    v.add(
      P.amber,
      box(),
      f.at(channelPoint(mark * BELLS.spacing, 0.002), tilt, [0.03, BED_WIDTH + 0.1, 0.012]),
      'metal',
      { vary: 0, solid: false },
    );
  }
  // El tope de arriba, donde se suelta la bola, y los pies de piedra.
  v.add(P.rock, box(), f.at(channelPoint(-0.05, 0.1), tilt, [0.1, BED_WIDTH + 0.1, 0.3]));
  for (const s of [0.3, 2.2, 4.2, 6.2]) {
    const [x, y, z] = channelPoint(s, -0.1);
    v.add(P.rock, box(), f.at([x, y, z / 2 - 0.01], undefined, [0.22, 0.4, z]));
  }
}

/** El estante: dos postes y un travesaño de donde cuelgan las campanas. */
export function bellsRack(b: LandmarkBuilder, f: Frame): void {
  const v = b.pieces;
  const [x, y] = RACK_AT;
  for (const side of [-1, 1]) {
    v.add(
      P.rock,
      box(),
      f.at([x, y + side * 0.85, RACK_BAR / 2 + 0.1], undefined, [0.14, 0.14, RACK_BAR + 0.2]),
    );
  }
  v.add(P.slateLight, box(), f.at([x, y, RACK_BAR + 0.1], undefined, [0.1, 1.9, 0.08]), 'metal');
  v.add(P.rockLight, box(), f.at([x, y, 0.1], undefined, [0.5, 2.0, 0.2]));
  b.mark('INT_campanas', f, [x, y, RACK_BAR - 0.3], { clue_id: 'umbral.campanas', kind: 'objeto' });
}

/** El atril: un pedestal de arenisca con la tapa cerrada (la tapa es la del `bellsView`) y su marca. */
export function bellsLectern(b: LandmarkBuilder, f: Frame): void {
  const v = b.pieces;
  const [x, y] = LECTERN_AT;
  v.add(P.sandstoneShade, box(), f.at([x, y, 0.5], undefined, [0.8, 1.0, 1.0]));
  v.add(P.sandstoneLight, cylinder(0.05, 6), f.at([x, y, 1.02], undefined, [1, 1, 0.04]), 'stone', {
    solid: false,
  });
  v.add(P.amber, box(), f.at([x - 0.41, y, 0.7], undefined, [0.03, 0.5, 0.06]), 'metal', {
    vary: 0,
    solid: false,
  });
  b.mark('INT_atril', f, [x, y, 1.3], { clue_id: 'umbral.atril', kind: 'texto' });
}

/** Las marcas de interacción a lo largo del canal (varias, para que se alcance desde cualquier punto). */
export function bellsMarks(b: LandmarkBuilder, f: Frame): void {
  CHANNEL_INTERACT.forEach((s, index) => {
    b.mark(`INT_canal_${String(index + 1)}`, f, channelPoint(s, INTERACT_LIFT), {
      clue_id: 'umbral.canal',
      kind: 'observacion',
      canal_s: s,
    });
  });
}
