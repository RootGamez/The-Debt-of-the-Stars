// La cúpula del Observatorio (CONTEXTO_PLANETAS.md §7, 🟡 el aspecto): un tambor de arenisca con su puerta al sur,
// una cúpula de gajos con la ranura abierta al cielo y dos compuertas a medio correr, y dentro el gran telescopio
// con sus círculos graduados, el atril del libro de turnos, un planetario que gira y las cartas del cielo. En la
// alineación de las 6:30 se encienden los faroles del suelo (EVT_alineacion).
import { SphereGeometry, type BufferGeometry } from 'three';
import { ball, box, cylinder, pieceMatrix, torus, torusArc, type Frame, type Triple } from './kit';
import { ObsBuilder, PALETTE as P } from './observatorioKit';
import { TELESCOPE_ELEVATION, terraceFrame } from './observatorioShape';

export const TOP = 0.35;
export const DRUM_RADIUS = 5.5;
const DRUM_HEIGHT = 2.4;
const DRUM_SEGMENTS = 20;
const DOME_RADIUS = 5.6;
/** Cuánto se levanta el telescopio sobre el horizonte (rad): hacia +Y del lugar, por la ranura, justo a la Brasa. */
export const ELEVATION = TELESCOPE_ELEVATION;
const PIVOT: Triple = [0, 0, TOP + 1.9];
const SLIT_HALF = 0.3;
const TAU = Math.PI * 2;

/** Dónde queda el ocular, en el marco de la cúpula (de donde mira quien se asoma al telescopio). */
export const EYEPIECE: Triple = [
  0,
  -Math.cos(ELEVATION) * 1.25,
  PIVOT[2] - Math.sin(ELEVATION) * 1.25,
];

/** El marco de la cúpula: el del mapa de la terraza (todo el edificio se diseña en él y luego se dobla). */
export function domeFrame(): Frame {
  return terraceFrame();
}

/** Un gajo de la cúpula: el trozo de esfera entre dos meridianos (azimut ψ desde +X hacia +Y), sin geometría suelta. */
function gore(
  radius: number,
  from: number,
  to: number,
  from_polar = 0,
  to_polar = Math.PI / 2,
): BufferGeometry {
  // En Three el polo de la esfera es +Y y el azimut gira al revés: se endereza a Z arriba y ψ = φ + π.
  const geometry = new SphereGeometry(
    radius,
    2,
    5,
    from - Math.PI,
    to - from,
    from_polar,
    to_polar - from_polar,
  );
  geometry.rotateX(Math.PI / 2);
  geometry.deleteAttribute('uv');
  return geometry.toNonIndexed();
}

/** La distancia angular entre dos azimuts (0 a π). */
function angleGap(a: number, b: number): number {
  const d = Math.abs(((a - b) % TAU) + TAU) % TAU;
  return Math.min(d, TAU - d);
}

function drum(b: ObsBuilder, f: Frame): void {
  // El zócalo, a ras de la terraza (la roca está tallada justo debajo: nada queda en alto).
  b.solid(P.sandstoneShade, cylinder(6.0, 16), f.at([0, 0, TOP - 0.3], undefined, [1, 1, 0.6]));
  b.view(P.sandstone, cylinder(5.9, 16), f.at([0, 0, TOP - 0.04], undefined, [1, 1, 0.08]));
  const width = ((TAU * DRUM_RADIUS) / DRUM_SEGMENTS) * 1.03;
  for (let k = 0; k < DRUM_SEGMENTS; k++) {
    const a = (TAU * k) / DRUM_SEGMENTS;
    // Las tres puertas del tambor: la del sur da a la esclusa, la del este al cuarto del turno y la del oeste a la
    // Sala de las Fluctuaciones.
    if ([-Math.PI / 2, 0, Math.PI].some((door) => angleGap(a, door) < 0.05)) continue;
    const at: Triple = [
      Math.cos(a) * DRUM_RADIUS,
      Math.sin(a) * DRUM_RADIUS,
      TOP + DRUM_HEIGHT / 2,
    ];
    b.solid(
      k % 2 ? P.sandstone : P.sandstoneLight,
      box(),
      f.at(at, [0, 0, a + Math.PI / 2], [width, 0.4, DRUM_HEIGHT]),
    );
    // Ventanitas ámbar: el turno nunca deja el observatorio a oscuras.
    if (k % 4 === 1) {
      b.lamp(
        box(),
        f.at(
          [Math.cos(a) * (DRUM_RADIUS + 0.21), Math.sin(a) * (DRUM_RADIUS + 0.21), TOP + 1.3],
          [0, 0, a + Math.PI / 2],
          [0.5, 0.04, 0.7],
        ),
      );
    }
  }
  // Los dinteles de las dos puertas y el aro de latón del borde.
  b.solid(P.slate, box(), f.at([0, -DRUM_RADIUS, TOP + 2.15], undefined, [2.1, 0.5, 0.5]));
  for (const x of [-DRUM_RADIUS, DRUM_RADIUS])
    b.solid(P.slate, box(), f.at([x, 0, TOP + 2.15], [0, 0, Math.PI / 2], [2.1, 0.5, 0.5]));
  b.brass(
    torus(DRUM_RADIUS + 0.05, 0.07, 28, 4),
    f.at([0, 0, TOP + DRUM_HEIGHT], [Math.PI / 2, 0, 0]),
  );
  airlock(b, f);
}

/** Medidas de la esclusa: un vestíbulo cerrado entre la puerta del tambor y la de fuera (en la vida real, sin aire fuera). */
export const LOCK = {
  width: 3.4,
  near: DRUM_RADIUS + 0.2,
  depth: 3.0,
  height: 2.6,
  door: 1.7,
} as const;

/** La esclusa: un cuarto cerrado y con techo delante de la puerta del sur; la rampa sube hasta su puerta de fuera. */
function airlock(b: ObsBuilder, f: Frame): void {
  const { width, near, depth, height, door } = LOCK;
  const far = near + depth;
  const centre = -(near + far) / 2;
  const wall = 0.3;
  b.solid(
    P.sandstoneShade,
    box(),
    f.at([0, centre, TOP - 0.3], undefined, [width, depth + 0.2, 0.6]),
  );
  for (const side of [-1, 1]) {
    b.solid(
      P.sandstone,
      box(),
      f.at([side * (width / 2 - wall / 2), centre, TOP + height / 2], undefined, [
        wall,
        depth,
        height,
      ]),
    );
    // Las dos hojas de la puerta de fuera, a cada lado del hueco.
    const jamb = (width - door) / 2;
    b.solid(
      P.sandstoneLight,
      box(),
      f.at([side * (door / 2 + jamb / 2), -far, TOP + height / 2], undefined, [jamb, wall, height]),
    );
    b.brass(box(), f.at([side * (door / 2), -far - 0.16, TOP + 0.95], undefined, [0.08, 0.1, 1.9]));
  }
  b.solid(P.slate, box(), f.at([0, -far, TOP + 2.3], undefined, [door + 0.2, wall, 0.6]));
  b.solid(
    P.slate,
    box(),
    f.at([0, centre, TOP + height + 0.12], undefined, [width + 0.2, depth + 0.2, 0.24]),
  );
  // La luz de dentro y los avisos de la puerta de fuera (verde: se puede abrir) y de la de dentro.
  b.lamp(ball(0.1, 1), f.at([0, centre, TOP + height - 0.1]));
  b.lamp(box(), f.at([0, -far - 0.17, TOP + 2.0], undefined, [0.3, 0.04, 0.1]), '#8fffb8');
  b.lamp(box(), f.at([0, -near - 0.02, TOP + 2.0], undefined, [0.3, 0.04, 0.1]), P.amber);
}

function shell(b: ObsBuilder, f: Frame): void {
  const base = TOP + DRUM_HEIGHT;
  const step = TAU / DRUM_SEGMENTS;
  const slit: number[] = [];
  for (let k = 0; k < DRUM_SEGMENTS; k++) {
    const from = k * step;
    const centre = from + step / 2;
    const toSlit = angleGap(centre, Math.PI / 2);
    if (toSlit < SLIT_HALF) {
      slit.push(from, from + step);
      continue; // la ranura: de cristal, que deja ver el cielo y guarda el aire
    }
    const m = f.at([0, 0, base]);
    b.solid(k % 2 ? P.sandstone : P.sandstoneLight, gore(DOME_RADIUS, from, from + step), m);
    // Meridianos de latón en los bordes de los gajos (menos junto a la ranura).
    if (angleGap(from, Math.PI / 2) > SLIT_HALF) {
      b.brass(
        torusArc(DOME_RADIUS + 0.04, 0.06, 0, Math.PI / 2, 14, 4),
        f.at([0, 0, base], [0, 0, from]),
      );
    }
    // Un aro de refuerzo a media altura.
  }
  for (const polar of [0.55, 1.0]) {
    const r = DOME_RADIUS * Math.cos(polar);
    b.view(
      P.slate,
      torus(r + 0.03, 0.08, 28, 4),
      f.at([0, 0, base + DOME_RADIUS * Math.sin(polar)], [Math.PI / 2, 0, 0]),
    );
  }
  // El cristal de la ranura: se ve el cielo a través de él y dentro hay aire.
  b.pane(gore(DOME_RADIUS + 0.02, Math.min(...slit), Math.max(...slit)), f.at([0, 0, base]));
  // Las compuertas, a medio correr a los lados de la ranura, y el remate de latón.
  for (const side of [-1, 1]) {
    const centre = Math.PI / 2 + side * (SLIT_HALF + step * 0.55);
    b.solid(
      P.sandstoneShade,
      gore(DOME_RADIUS + 0.14, centre - step / 2, centre + step / 2, 0.15, (Math.PI / 2) * 0.62),
      f.at([0, 0, base]),
    );
  }
  b.brass(ball(0.3, 1), f.at([0, 0, base + DOME_RADIUS + 0.04]));
}

function floorInlay(b: ObsBuilder, f: Frame): void {
  // 24 marcas de reloj alrededor del suelo: la cuarta parte, en ámbar (el último cuarto de hora).
  for (let k = 0; k < 24; k++) {
    const a = (TAU * k) / 24;
    const at: Triple = [Math.cos(a) * 5.0, Math.sin(a) * 5.0, TOP + 0.02];
    const rot: Triple = [0, 0, a];
    if (k < 6) b.lamp(box(), f.at(at, rot, [0.45, 0.12, 0.04]));
    else b.view(P.slate, box(), f.at(at, rot, [0.45, 0.12, 0.04]));
  }
  // La carta del cielo en el suelo: aros de pizarra y una cruz de latón (norte–sur y este–oeste).
  for (const r of [1.9, 3.4])
    b.view(P.slate, torus(r, 0.04, 40, 4), f.at([0, 0, TOP + 0.02], [Math.PI / 2, 0, 0]));
  for (const rot of [0, Math.PI / 2])
    b.brass(box(), f.at([0, 0, TOP + 0.025], [0, 0, rot], [6.6, 0.07, 0.03]));
}

/** El telescopio: pilar, horquilla con sus círculos graduados, el tubo con su buscador y los contrapesos. */
function telescope(b: ObsBuilder, f: Frame): void {
  const dir: Triple = [0, Math.cos(ELEVATION), Math.sin(ELEVATION)];
  const at = (t: number, side = 0, lift = 0): Triple => [
    side,
    PIVOT[1] + dir[1] * t - dir[2] * lift,
    PIVOT[2] + dir[2] * t + dir[1] * lift,
  ];
  const tilt: Triple = [-(Math.PI / 2 - ELEVATION), 0, 0];
  b.solid(P.slate, cylinder(0.55, 10), f.at([0, 0, TOP + 0.7], undefined, [1, 1, 1.4]));
  b.view(P.sandstone, cylinder(0.75, 10), f.at([0, 0, TOP + 0.12], undefined, [1, 1, 0.24]));
  for (const x of [-0.6, 0.6])
    b.view(P.slate, box(), f.at([x, 0, TOP + 1.55], undefined, [0.14, 0.4, 1.0]));
  // El eje de declinación con los contrapesos de un lado.
  b.brass(cylinder(0.07, 8), f.at(PIVOT, [0, Math.PI / 2, 0], [1, 1, 1.8]));
  for (const x of [0.95, 1.2])
    b.brass(cylinder(0.3, 10), f.at([x, 0, PIVOT[2]], [0, Math.PI / 2, 0], [1, 1, 0.16]));
  // Círculos graduados en las dos mejillas, con sus marcas de luz.
  for (const x of [-0.72, 0.72]) {
    b.brass(torus(0.5, 0.03, 28, 4), f.at([x, 0, PIVOT[2]], [0, 0, Math.PI / 2]), P.brassLight);
    for (let k = 0; k < 12; k++) {
      const a = (TAU * k) / 12;
      b.lamp(
        ball(0.025, 0),
        f.at([x, Math.cos(a) * 0.5, PIVOT[2] + Math.sin(a) * 0.5]),
        P.amberSoft,
        1.2,
      );
    }
  }
  // El tubo: arenisca con tres bandas de latón, el parasol de pizarra, el buscador y el ocular con su cola.
  b.view(P.sandstone, cylinder(0.42, 10), f.at(at(1.3), tilt, [1, 1, 4.6]));
  b.view(P.slateDark, cylinder(0.5, 10), f.at(at(3.35), tilt, [1, 1, 0.9]));
  for (const t of [-0.6, 1.0, 2.6]) b.brass(cylinder(0.46, 10), f.at(at(t), tilt, [1, 1, 0.1]));
  b.brass(cylinder(0.1, 8), f.at(at(1.6, 0, 0.65), tilt, [1, 1, 1.5]), P.brassLight);
  b.lamp(ball(0.05, 0), f.at(at(2.35, 0, 0.65)), P.amber, 1.2);
  b.view(P.slateDark, cylinder(0.13, 6), f.at(at(-1.25), tilt, [1, 1, 0.55]));
  b.brass(ball(0.3, 1), f.at(at(-1.0, 0, -0.1)));
  // Un taburete para asomarse al ocular y dos peldaños.
  b.solid(P.slateDark, cylinder(0.32, 8), f.at([0.55, -1.55, TOP + 0.3], undefined, [1, 1, 0.6]));
  b.solid(P.sandstoneShade, box(), f.at([0, -2.1, TOP + 0.1], undefined, [1.3, 0.6, 0.2]));
}

/** El atril del libro de turnos, contra las costillas, con su lámpara. */
function lectern(b: ObsBuilder, f: Frame): void {
  const [x, y] = [-3.1, -2.6];
  b.solid(P.slate, box(), f.at([x, y, TOP + 0.5], [0, 0, 0.5], [0.7, 0.5, 1.0]));
  b.view(P.sandstone, box(), f.at([x, y, TOP + 1.05], [0.35, 0, 0.5], [0.9, 0.7, 0.07]));
  b.view(P.paper, box(), f.at([x, y + 0.02, TOP + 1.1], [0.35, 0, 0.5], [0.7, 0.5, 0.06]));
  b.view(
    P.slateDark,
    box(),
    f.at([x + 0.01, y + 0.02, TOP + 1.07], [0.35, 0, 0.5], [0.74, 0.54, 0.03]),
  );
  b.lamp(ball(0.07, 1), f.at([x - 0.5, y + 0.25, TOP + 1.15]));
  b.mark('INT_libro', f, [x + 0.5, y - 0.6, TOP + 1.35], {
    clue_id: 'observatorio.libro',
    kind: 'texto',
  });
}

/** El planetario: una mesa con la Brasa en el centro y tres aros con sus mundos, cada uno a su paso. */
function orrery(b: ObsBuilder, f: Frame): void {
  const centre: Triple = [3.2, -1.6, TOP];
  b.solid(
    P.slate,
    cylinder(0.32, 8),
    f.at([centre[0], centre[1], TOP + 0.55], undefined, [1, 1, 1.1]),
  );
  b.view(
    P.sandstone,
    cylinder(0.85, 14),
    f.at([centre[0], centre[1], TOP + 1.12], undefined, [1, 1, 0.08]),
  );
  b.lamp(ball(0.1, 1), f.at([centre[0], centre[1], TOP + 1.3]));
  const rings: readonly [number, number, number][] = [
    [0.3, 0.45, 0.13],
    [0.5, 0.28, 0.08],
    [0.72, 0.17, 0.05],
  ];
  rings.forEach(([radius, spin], k) => {
    b.spinning(
      `ANIM_planetario_${String(k)}`,
      f,
      [centre[0], centre[1], TOP + 1.3],
      { spin },
      (set) => {
        set.add(P.brass, torus(radius, 0.012, 24, 4), pieceMatrix(), 'metal', { solid: false });
        set.add(P.brassLight, ball(0.045, 1), pieceMatrix([radius, 0, 0]), 'metal', {
          solid: false,
        });
      },
    );
  });
}

/** Cartas del cielo en la pared del noroeste: puntos de luz, y la del Nudo con su anillo y la marca desplazada. */
function charts(b: ObsBuilder, f: Frame): void {
  const radius = DRUM_RADIUS - 0.3;
  [2.0, 2.4, 2.8].forEach((a, k) => {
    const place = (r: number, z: number): Triple => [Math.cos(a) * r, Math.sin(a) * r, TOP + z];
    const rot: Triple = [0, 0, a + Math.PI / 2];
    b.view(P.slate, box(), f.at(place(radius, 1.35), rot, [1.3, 0.06, 1.0]));
    b.brass(
      torus(0.5, 0.02, 24, 4),
      f.at(place(radius - 0.05, 1.35), [Math.PI / 2, 0, a + Math.PI / 2]),
    );
    const tangent: Triple = [-Math.sin(a), Math.cos(a), 0];
    const dot = (u: number, v: number, size = 0.025): void => {
      b.lamp(
        ball(size, 0),
        f.at([
          Math.cos(a) * (radius - 0.06) + tangent[0] * u,
          Math.sin(a) * (radius - 0.06) + tangent[1] * u,
          TOP + 1.35 + v,
        ]),
        P.amber,
        1.0,
      );
    };
    for (let s = 0; s < 14; s++) dot(Math.sin(s * 2.3 + k) * 0.5, Math.cos(s * 1.7 + k * 3) * 0.38);
    if (k === 1) {
      // El Nudo: un anillo de puntos alrededor de un hueco oscuro, y la marca de donde se ve, girada 18°.
      for (let s = 0; s < 12; s++)
        dot(Math.cos((TAU * s) / 12) * 0.2, Math.sin((TAU * s) / 12) * 0.2, 0.018);
      b.brass(
        ball(0.03, 1),
        f.at([
          Math.cos(a) * (radius - 0.06) + tangent[0] * 0.38,
          Math.sin(a) * (radius - 0.06) + tangent[1] * 0.38,
          TOP + 1.35 + 0.18,
        ]),
        P.brassLight,
      );
    }
  });
}

/** Los faroles del suelo que solo se encienden en la alineación (EVT_alineacion). */
function alignmentLamps(b: ObsBuilder, f: Frame): void {
  for (let k = 0; k < 16; k++) {
    const a = (TAU * k) / 16;
    b.alignment.add(
      P.amber,
      ball(0.1, 1),
      f.at([Math.cos(a) * 2.65, Math.sin(a) * 2.65, TOP + 0.08]),
      'light',
      { glow: 1.8, vary: 0, solid: false },
    );
  }
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const polar = 0.25 + k * 0.28;
      const azimuth = Math.PI / 2 + side * (SLIT_HALF + 0.02);
      const r = DOME_RADIUS * Math.cos(polar);
      b.alignment.add(
        P.amber,
        ball(0.09, 1),
        f.at([
          Math.cos(azimuth) * r,
          Math.sin(azimuth) * r,
          TOP + DRUM_HEIGHT + DOME_RADIUS * Math.sin(polar),
        ]),
        'light',
        { glow: 1.8, vary: 0, solid: false },
      );
    }
  }
}

/** La cúpula entera con su telescopio y lo que hay dentro. */
export function buildDome(b: ObsBuilder): Frame {
  const f = domeFrame();
  drum(b, f);
  shell(b, f);
  floorInlay(b, f);
  telescope(b, f);
  lectern(b, f);
  orrery(b, f);
  charts(b, f);
  alignmentLamps(b, f);
  b.mark('INT_telescopio', f, [0, -1.4, TOP + 1.25], {
    clue_id: 'observatorio.telescopio',
    kind: 'observacion',
  });
  return f;
}
