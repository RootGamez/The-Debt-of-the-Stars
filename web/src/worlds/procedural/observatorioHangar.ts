// El hangar del Observatorio (🟡, pedido de Anthony 2026-11-05): una nave de 9 m aterriza por la abertura redonda
// del techo, cubierta por un cristal de presión (la sala es un recinto cerrado: fuera no hay aire), y quien baja de
// ella entra por la esclusa a la cúpula y al cuarto del turno. Es una sala grande, de paredes de arenisca, con su
// pista pintada en el suelo, luces, cajas, bidones y un banco de trabajo. Pegado al sur del tambor, sobre el casquete
// del polo, que es casi plano; el suelo está a la altura del de la cúpula (sin escalones ni rampas al aire).
import { ball, box, cylinder, torus, type Frame, type Triple } from './kit';
import { LOCK, TOP } from './observatorioDome';
import { ObsBuilder, PALETTE as P } from './observatorioKit';

const WALL = 0.3;
/** El interior: ancho (X), fondo (Y, hacia el sur desde la pared de la esclusa) y alto. */
export const HANGAR = {
  width: 13.6,
  depth: 13.4,
  height: 6.5,
  /** La abertura del techo por donde baja la nave, y la pista pintada. */
  hatch: 12,
  pad: 5.6,
  /** El zócalo bajo el suelo: la terraza está tallada justo debajo, así que basta con medio metro. */
  footing: 0.6,
} as const;

/** Dónde está (en el marco de la cúpula) la pared de la esclusa, el fondo del hangar y su centro. */
const NEAR = -(LOCK.near + LOCK.depth);
const FAR = NEAR - HANGAR.depth;
const CENTRE = (NEAR + FAR) / 2;
/** El centro de la pista, donde se posa la nave. */
export const PAD_CENTRE: Triple = [0, CENTRE, TOP];

/** El hangar entero, pegado a la esclusa. */
export function buildHangar(b: ObsBuilder, f: Frame): void {
  const { width, depth, height, hatch, pad, footing } = HANGAR;
  const half = width / 2;
  // El suelo, sobre su zócalo (la terraza tallada está justo debajo).
  b.solid(
    P.sandstoneShade,
    box(),
    f.at([0, CENTRE, TOP - footing / 2], undefined, [width + 0.6, depth + 0.4, footing]),
  );
  // Costillas de pizarra por fuera y por dentro de las paredes largas, con una galería de ventanas altas entre ellas:
  // las paredes no son un bloque liso, y desde fuera se ve que dentro hay luz.
  for (let k = 0; k < 5; k++) {
    const y = NEAR - 0.6 - k * ((depth - 1.2) / 4);
    for (const side of [-1, 1]) {
      for (const offset of [-0.2, WALL + 0.2]) {
        b.solid(
          P.slate,
          box(),
          f.at([side * (half + offset), y, TOP + height / 2], undefined, [
            0.4,
            0.45,
            height + 0.15,
          ]),
        );
      }
      if (k < 4) {
        const mid = y - (depth - 1.2) / 8;
        b.lamp(
          box(),
          f.at([side * (half + WALL + 0.02), mid, TOP + height - 1.2], undefined, [0.04, 1.8, 0.5]),
        );
        b.lamp(
          box(),
          f.at([side * (half - 0.02), mid, TOP + height - 1.2], undefined, [0.04, 1.8, 0.5]),
        );
      }
    }
  }
  // Un friso de anillos sobre los portones: la marca de los Ausentes.
  for (let k = 0; k < 7; k++) {
    b.brass(
      torus(0.32, 0.04, 16, 4),
      f.at([-3.6 + k * 1.2, FAR + 0.1, TOP + height - 0.8], [Math.PI / 2, 0, 0]),
    );
  }
  b.view(P.sandstone, box(), f.at([0, CENTRE, TOP - 0.02], undefined, [width, depth, 0.04]));
  // Las paredes: oeste y este, el fondo (con dos portones cerrados) y, detrás, la de la esclusa a los lados de su puerta.
  for (const side of [-1, 1]) {
    b.solid(
      P.sandstone,
      box(),
      f.at([side * (half + WALL / 2), CENTRE, TOP + height / 2], undefined, [
        WALL,
        depth + 0.4,
        height,
      ]),
    );
    const jamb = half - LOCK.width / 2;
    b.solid(
      P.sandstoneLight,
      box(),
      f.at([side * (LOCK.width / 2 + jamb / 2), NEAR, TOP + height / 2], undefined, [
        jamb,
        WALL,
        height,
      ]),
    );
  }
  b.solid(
    P.sandstone,
    box(),
    f.at([0, FAR - WALL / 2, TOP + height / 2], undefined, [width + 0.6, WALL, height]),
  );
  for (const x of [-2.6, 2.6]) {
    // Los portones de carga del fondo, cerrados: hojas de pizarra con su banda de latón y su luz.
    b.view(P.slate, box(), f.at([x, FAR + 0.04, TOP + 2.1], undefined, [4.8, 0.12, 4.2]));
    b.brass(box(), f.at([x, FAR + 0.02, TOP + 2.1], undefined, [4.9, 0.08, 0.12]));
    b.lamp(box(), f.at([x, FAR + 0.06, TOP + 4.4], undefined, [0.5, 0.04, 0.12]));
  }
  // El techo: un marco que deja la abertura de la nave, y el cristal de presión que la cubre.
  const strip = (width - hatch) / 2;
  const row = (depth - hatch) / 2;
  const roof = TOP + height;
  for (const side of [-1, 1]) {
    b.solid(
      P.slate,
      box(),
      f.at([side * (hatch / 2 + strip / 2), CENTRE, roof + 0.15], undefined, [
        strip + 0.6,
        depth + 0.4,
        0.3,
      ]),
    );
    b.solid(
      P.slate,
      box(),
      f.at([0, CENTRE + side * (hatch / 2 + row / 2), roof + 0.15], undefined, [hatch, row, 0.3]),
    );
  }
  b.pane(box(), f.at([0, CENTRE, roof + 0.3], undefined, [hatch, hatch, 0.05]));
  b.brass(torus(hatch / 2, 0.08, 36, 4), f.at([0, CENTRE, roof + 0.32], [Math.PI / 2, 0, 0]));
  // La pista pintada: dos aros y una cruz de latón, y una corona de luces ámbar que se ve desde el aire.
  const ring = (radius: number, tube: number): void => {
    b.view(
      P.slate,
      torus(radius, tube, 40, 4),
      f.at([PAD_CENTRE[0], PAD_CENTRE[1], TOP + 0.03], [Math.PI / 2, 0, 0]),
    );
  };
  ring(pad, 0.06);
  ring(pad - 1.2, 0.04);
  for (const rot of [0, Math.PI / 2]) {
    b.brass(
      box(),
      f.at([PAD_CENTRE[0], PAD_CENTRE[1], TOP + 0.035], [0, 0, rot], [pad * 2 - 0.6, 0.12, 0.03]),
    );
  }
  for (let k = 0; k < 16; k++) {
    const a = (2 * Math.PI * k) / 16;
    b.lamp(
      ball(0.1, 1),
      f.at([Math.cos(a) * (pad + 0.5), CENTRE + Math.sin(a) * (pad + 0.5), TOP + 0.08]),
    );
  }
  // Luces en las paredes y en el techo, y un camino señalado hasta la esclusa.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      b.lamp(ball(0.16, 1), f.at([side * (half - 0.2), NEAR - 2.2 - k * 3.0, TOP + 4.6]));
      b.lamp(
        box(),
        f.at([side * (half - 0.16), NEAR - 2.2 - k * 3.0, TOP + 2.3], undefined, [0.05, 0.8, 0.6]),
      );
    }
  }
  for (let k = 0; k < 4; k++) {
    b.lamp(box(), f.at([0, NEAR - 0.5 - k * 0.7, TOP + 0.04], undefined, [0.5, 0.12, 0.03]));
  }
  // Para que parezca un lugar de trabajo: cajas, bidones y un banco con su lámpara.
  const crate = (x: number, y: number, z: number, turn: number, size: number): void => {
    b.solid(
      P.sandstoneShade,
      box(),
      f.at([x, y, TOP + z + size / 2], [0, 0, turn], [size, size, size]),
    );
    b.brass(
      box(),
      f.at([x, y, TOP + z + size / 2], [0, 0, turn], [size + 0.04, 0.08, size + 0.04]),
    );
  };
  crate(-half + 1.0, NEAR - 2.4, 0, 0.2, 0.9);
  crate(-half + 1.1, NEAR - 3.5, 0, -0.1, 0.8);
  crate(-half + 1.0, NEAR - 2.5, 0.9, 0.5, 0.7);
  for (let k = 0; k < 4; k++) {
    const x = -half + 0.9 + (k % 2) * 0.7;
    const y = FAR + 1.0 + Math.floor(k / 2) * 0.7;
    b.solid(P.slateDark, cylinder(0.32, 10), f.at([x, y, TOP + 0.45], undefined, [1, 1, 0.9]));
    b.brass(cylinder(0.33, 10), f.at([x, y, TOP + 0.6], undefined, [1, 1, 0.06]));
  }
  b.solid(P.slate, box(), f.at([half - 0.95, NEAR - 3.0, TOP + 0.8], undefined, [0.9, 2.4, 0.08]));
  for (const y of [NEAR - 2.0, NEAR - 4.0]) {
    b.solid(P.slateDark, box(), f.at([half - 0.95, y, TOP + 0.4], undefined, [0.7, 0.1, 0.8]));
  }
  b.lamp(ball(0.1, 1), f.at([half - 0.95, NEAR - 3.3, TOP + 1.05]));
  b.view(
    P.paper,
    box(),
    f.at([half - 0.85, NEAR - 2.7, TOP + 0.86], [0, 0, 0.4], [0.4, 0.3, 0.03]),
  );
  // El registro de llegadas, colgado junto al banco: naves de relevo cada diez días, hasta que dejan de venir.
  b.view(P.slate, box(), f.at([half - 0.03, NEAR - 5.2, TOP + 1.5], undefined, [0.05, 0.9, 1.1]));
  for (let k = 0; k < 6; k++) {
    b.view(
      P.paper,
      box(),
      f.at(
        [half - 0.07, NEAR - 5.5 + (k % 3) * 0.3, TOP + 1.75 - Math.floor(k / 3) * 0.45],
        undefined,
        [0.02, 0.24, 0.32],
      ),
    );
  }
  b.mark('INT_relevo', f, [half - 1.4, NEAR - 4.6, TOP + 1.2], {
    clue_id: 'observatorio.relevo',
    kind: 'texto',
  });
  // Por fuera: los faroles de las esquinas y una luz verde que avisa de que el hangar está listo.
  for (const side of [-1, 1]) b.lantern(f, side * (half + 0.9), FAR - 0.8, TOP - 0.1, 3.4);
  b.lamp(ball(0.22, 1), f.at([0, FAR - 0.5, roof + 0.4]), '#8fffb8', 1.5);
}
