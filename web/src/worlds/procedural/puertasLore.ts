// Lo que cuenta el Archivo de las Puertas además de las bocas de casa (Fase 11 por código, 🟡):
// - El muro curvo de los rastros (INT_rastros): filas de signos de quienes llegaron antes, cada una en otra
//   escritura; la última, lisa, en blanco: esperando.
// - Las ofrendas (INT_ofrendas, ambiente): lo que dejaron otros viajeros en el sendero del muro a casa (un casco que no es de
//   Ool, una herramienta, piedras apiladas, un cuaderno y velas apagadas).
// - La primera Puerta (INT_primera, ambiente): la de los Ausentes, partida, con su fecha tallada en el zócalo.
import { ball, box, cone, cylinder, headingTowards, torus, torusArc, type Frame } from './kit';
import { PALETTE as P, groundFrame, siteFrame, type PuertasBuilder } from './puertasKit';
import { SITES, siteDirection } from './puertasShape';

const WALL_SECTIONS = 7;
const WALL_RADIUS = 7;
const WALL_HEIGHT = 2.8;

/** Una fila de signos en una de las seis escrituras (puntos, rayas, cuñas, aros, ganchos y rombos). */
function glyphRow(b: PuertasBuilder, g: Frame, row: number, z: number): void {
  for (let n = 0; n < 4; n++) {
    const x = -0.6 + n * 0.4;
    const color = row % 2 ? P.sandstone : P.bone;
    const at: [number, number, number] = [x, -0.23, z];
    if (row === 0) b.view(color, ball(0.06, 1), g.at(at));
    else if (row === 1) b.view(color, box(), g.at(at, undefined, [0.22, 0.04, 0.05]));
    else if (row === 2)
      b.view(color, cone(0.08, 0, 3), g.at(at, [Math.PI / 2, 0, 0], [1, 1, 0.16]));
    else if (row === 3) b.view(color, torus(0.07, 0.018, 8, 3), g.at(at));
    else if (row === 4) b.view(color, box(), g.at(at, undefined, [0.05, 0.04, 0.2]));
    else b.view(color, box(), g.at(at, [0, Math.PI / 4, 0], [0.1, 0.04, 0.1]));
  }
}

function wall(b: PuertasBuilder, f: Frame): void {
  for (let k = 0; k < WALL_SECTIONS; k++) {
    const a = ((-45 + (90 * k) / (WALL_SECTIONS - 1)) * Math.PI) / 180;
    const x = Math.sin(a) * WALL_RADIUS;
    const y = Math.cos(a) * WALL_RADIUS - WALL_RADIUS;
    // Cada tramo, de pie sobre su trozo de suelo y de cara al centro de la curva, del lado de la llegada (−Y).
    const g = groundFrame(f, x, y, (a * 180) / Math.PI);
    b.solid(
      P.stone,
      box(),
      g.at([0, 0, WALL_HEIGHT / 2 - 0.3], undefined, [1.75, 0.4, WALL_HEIGHT + 0.6]),
    );
    b.view(P.stoneLight, box(), g.at([0, 0, WALL_HEIGHT + 0.05], undefined, [1.85, 0.5, 0.1]));
    for (let row = 0; row < 6; row++) glyphRow(b, g, row, WALL_HEIGHT - 0.4 - row * 0.36);
    // La última fila, lisa y más clara, con un hilo de luz debajo: en blanco, esperando.
    b.view(P.stoneLight, box(), g.at([0, -0.22, 0.42], undefined, [1.6, 0.04, 0.28]));
    b.lamp(P.thread, box(), g.at([0, -0.23, 0.25], undefined, [1.6, 0.02, 0.02]), 0.8);
  }
  b.mark('INT_rastros', f, [0, -1.4, 1.5], { clue_id: 'puertas.rastros', kind: 'texto' });
}

/** Lo que dejaron los otros, camino de casa: nadie se lo llevó. */
function offerings(b: PuertasBuilder): void {
  const s = SITES.ofrendas;
  const f = siteFrame(s.lat, s.lon, headingTowards(s.lat, s.lon, siteDirection('rastros')));
  // Una losa baja donde se dejan las cosas.
  b.solid(P.stoneLight, cylinder(1.5, 14), f.at([0, 0, -0.2], undefined, [1, 1, 0.5]));
  // Un casco de otra forma: alargado, con tres visores.
  b.view(P.verdigris, ball(0.32, 1), f.at([-0.6, 0.2, 0.35], undefined, [1, 1.5, 0.9]));
  for (const x of [-0.14, 0, 0.14])
    b.lamp('#7ADCE0', ball(0.05, 0), f.at([-0.6 + x, -0.23, 0.42]), 0.9);
  // Una herramienta de mango largo que no sabemos para qué servía.
  b.view(P.bronze, box(), f.at([0.4, -0.3, 0.06], [0, 0, 0.7], [1.3, 0.05, 0.05]));
  b.view(
    P.rust,
    torusArc(0.14, 0.03, 0, Math.PI, 8, 3),
    f.at([0.82, -0.66, 0.06], [Math.PI / 2, 0, 0.7]),
  );
  // Piedras apiladas: alguien contó algo con ellas.
  for (let k = 0; k < 5; k++) {
    const r = 0.16 - k * 0.025;
    b.view(
      k % 2 ? P.bone : P.slate,
      ball(r, 0),
      f.at([0.6, 0.6, 0.06 + r + k * 0.2], [0, 0, k], [1, 1, 0.6]),
    );
  }
  // Un cuaderno abierto y tres velas apagadas.
  b.view(P.paper, box(), f.at([-0.1, -0.7, 0.07], [0, 0, -0.3], [0.5, 0.36, 0.03]));
  b.view(P.slate, box(), f.at([-0.1, -0.7, 0.085], [0, 0, -0.3], [0.02, 0.36, 0.01]));
  for (let k = 0; k < 3; k++) {
    b.view(
      P.bone,
      cylinder(0.04, 6),
      f.at([-1.0 + k * 0.18, -0.4 + k * 0.12, 0.12 + k * 0.02], undefined, [1, 1, 0.2 + k * 0.05]),
    );
  }
  b.mark('INT_ofrendas', f, [0, -1.6, 1.2], { clue_id: 'puertas.ofrendas', kind: 'objeto' });
}

/** La primera Puerta de los Ausentes: grande, partida, apagada; su fecha tallada en el zócalo. */
function firstGate(b: PuertasBuilder): void {
  const s = SITES.primera;
  const f = siteFrame(s.lat, s.lon, headingTowards(s.lat, s.lon, siteDirection('llegada')) + 180);
  const radius = 3.2;
  const centre = radius + 0.7;
  b.solid(P.sandstoneShade, box(), f.at([0, 0, -0.1], undefined, [radius * 1.5, 1.4, 1.2]));
  // El aro, roto en dos: un trozo de pie y el otro caído a su lado.
  b.solid(P.sandstone, torusArc(radius, 0.28, -0.5, Math.PI + 0.9, 28, 5), f.at([0, 0, centre]));
  const fallen = groundFrame(f, 2.6, -2.2, 35);
  b.solid(
    P.sandstone,
    torusArc(radius, 0.28, 0, 1.6, 10, 5),
    fallen.at([-1.2, 0, 0.25], [Math.PI / 2, 0, 0]),
  );
  // Sus marcas de reloj, las primeras: doce, y una más fuera de sitio.
  for (let k = 0; k < 13; k++) {
    const a = (2 * Math.PI * k) / 12 + (k === 12 ? 0.27 : 0);
    if (a > Math.PI + 0.9 && a < 2 * Math.PI - 0.5) continue;
    b.view(
      k === 12 ? P.light : P.bronze,
      box(),
      f.at(
        [Math.cos(a) * (radius + 0.4), -0.05, centre + Math.sin(a) * (radius + 0.4)],
        [0, Math.PI / 2 - a, 0],
        [0.09, 0.1, 0.4],
      ),
    );
  }
  // Por la grieta todavía se escapa un hilo de su lado.
  b.lamp(
    '#F0D070',
    box(),
    f.at(
      [radius * Math.cos(-0.5), 0, centre + radius * Math.sin(-0.5)],
      [0, 0.5, 0],
      [0.05, 0.05, 0.9],
    ),
    1.4,
  );
  // La fecha tallada: tres filas de muescas en el frente del zócalo.
  for (let row = 0; row < 3; row++) {
    for (let n = 0; n < 3 + row * 2; n++) {
      b.view(
        P.slate,
        box(),
        f.at([-1.6 + n * 0.32, -0.71, 0.05 + row * 0.15], undefined, [0.06, 0.02, 0.1]),
      );
    }
  }
  b.mark('INT_primera', f, [0, -2.2, 1.3], { clue_id: 'puertas.primera', kind: 'texto' });
}

export function buildLore(b: PuertasBuilder): void {
  const s = SITES.rastros;
  // +Y del sitio, alejándose de la llegada: el muro queda detrás de su centro y mira a quien llega.
  wall(b, siteFrame(s.lat, s.lon, headingTowards(s.lat, s.lon, siteDirection('llegada')) + 180));
  offerings(b);
  firstGate(b);
}
