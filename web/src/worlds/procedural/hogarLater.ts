// Lo que hay en Hogar diez años después (F5, el final malo; 🟡 todo, plan-finales.md): los cables del Motor hasta el
// Instituto y la ciudad (postes con luz del Motor y guirnaldas sobre las calles), los anillos de prueba de la costa, el
// memorial al explorador perdido junto al nido vacío y, en el banco de la Maestra, su bastón, su bufanda y un libro
// cerrado (❓ si vive: no se dice). La Puerta Mayor terminada está en hogarMotor.ts; las medidas, en
// hogarLaterShape.ts. Solo lo construye `buildHogar({ era: 'despues' })`.
import { Matrix4, Quaternion, Vector3 } from 'three';
import {
  ball,
  box,
  cylinder,
  direction,
  Frame,
  headingTowards,
  latLon,
  torus,
  torusArc,
  type Triple,
} from './kit';
import { HOGAR_PALETTE as P, type HogarBuilder } from './hogarKit';
import {
  COAST_RINGS,
  coastSpots,
  GENERATOR_TOP,
  MAESTRA_BENCH,
  MEMORIAL,
  POLE_HEIGHT,
  poleBase,
  POWER_LINES,
  polesOf,
} from './hogarLaterShape';
import { motorHeading } from './hogarMotor';
import { SITES } from './hogarShape';

const DEG = Math.PI / 180;
/** El cable: grosor (m), tramos por vano y cuánto cuelga por cada metro de vano. */
const CABLE_RADIUS = 0.035;
const CABLE_SEGMENTS = 4;
const SAG_PER_METRE = 0.05;
/** Dónde se enganchan los cables en lo alto de cada poste (m, a cada lado del travesaño). */
const ARM = 0.7;

/** Un cable combado entre dos puntos del planeta: cuelga hacia el centro. */
function cable(b: HogarBuilder, from: Vector3, to: Vector3, color: string = P.iron): void {
  const span = from.distanceTo(to);
  const sag = span * SAG_PER_METRE;
  const point = (t: number): Vector3 => {
    const p = from.clone().lerp(to, t);
    const down = p.clone().normalize().negate();
    return p.addScaledVector(down, Math.sin(t * Math.PI) * sag);
  };
  let previous = from;
  for (let k = 1; k <= CABLE_SEGMENTS; k++) {
    const next = point(k / CABLE_SEGMENTS);
    const length = next.distanceTo(previous);
    const q = new Quaternion().setFromUnitVectors(
      new Vector3(0, 0, 1),
      next.clone().sub(previous).normalize(),
    );
    const m = new Matrix4().compose(
      previous.clone().add(next).multiplyScalar(0.5),
      q,
      new Vector3(CABLE_RADIUS, CABLE_RADIUS, length),
    );
    b.pieces.add(color, cylinder(1, 5), m, 'metal', { solid: false });
    previous = next;
  }
}

/** Un poste del Motor: fuste de hierro, travesaño, dos aisladores con luz y, uno sí y otro no, un farol colgado. */
function pole(b: HogarBuilder, f: Frame, lamp: boolean, stilt: number): [Vector3, Vector3] {
  const h = POLE_HEIGHT + stilt;
  if (stilt > 0) {
    // Sobre el agua: un pilote de piedra hasta la orilla.
    b.pieces.add(
      P.rockDark,
      cylinder(0.3, 7),
      f.at([0, 0, stilt / 2], undefined, [1, 1, stilt]),
      'stone',
      {
        solid: true,
      },
    );
  }
  b.pieces.add(P.iron, cylinder(0.11, 7), f.at([0, 0, h / 2], undefined, [1, 1, h]), 'metal', {
    solid: true,
  });
  b.pieces.add(
    P.brassDark,
    box(),
    f.at([0, 0, h - 0.15], undefined, [ARM * 2 + 0.3, 0.12, 0.12]),
    'metal',
    {
      solid: false,
    },
  );
  for (const side of [-1, 1]) {
    b.pieces.add(P.glow, ball(0.08, 0), f.at([side * ARM, 0, h - 0.02]), 'light', {
      glow: 1.8,
      vary: 0,
    });
  }
  if (lamp) {
    b.pieces.add(
      P.iron,
      torusArc(0.35, 0.03, 0, Math.PI / 2, 6, 3),
      f.at([0.35, 0, h - 0.7]),
      'metal',
      {
        solid: false,
      },
    );
    b.pieces.add(P.glow, ball(0.17, 1), f.at([0.7, 0, h - 1]), 'light', { glow: 2.2, vary: 0 });
  }
  return [f.point([-ARM, 0, h]), f.point([ARM, 0, h])];
}

/** La caseta donde acaba una línea: un tambor de latón con ventanas de luz. */
function transformer(b: HogarBuilder, f: Frame): void {
  b.pieces.add(P.sandstone, box(), f.at([0, 0, 0.15], undefined, [1.6, 1.6, 0.3]), 'stone', {
    solid: true,
  });
  b.pieces.add(P.brass, cylinder(0.6, 12), f.at([0, 0, 1.1], undefined, [1, 1, 1.6]), 'metal', {
    solid: true,
  });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    b.pieces.add(
      P.glow,
      box(),
      f.at([Math.sin(a) * 0.61, Math.cos(a) * 0.61, 1.3], [0, 0, -a], [0.22, 0.02, 0.5]),
      'light',
      { glow: 1.9, vary: 0 },
    );
  }
  b.pieces.add(
    P.brassDark,
    torus(0.62, 0.05, 16, 3),
    f.at([0, 0, 1.92], [Math.PI / 2, 0, 0]),
    'metal',
    {
      solid: false,
    },
  );
}

/**
 * Las dos líneas del Motor, del generador a cada destino. La de la ciudad sigue desde su caseta hasta la guirnalda
 * más cercana (`cityPosts`, lo alto de los postes de fuera de cada calle).
 */
function powerLines(b: HogarBuilder, cityPosts: readonly Vector3[]): void {
  const motor = b.site('motor', motorHeading());
  const start = motor.point(GENERATOR_TOP);
  for (const line of POWER_LINES) {
    const poles = polesOf(line);
    let last: [Vector3, Vector3] | undefined;
    poles.forEach((d, k) => {
      const { lat, lon } = latLon(d);
      const next = poles[k + 1] ?? poles[k - 1];
      const heading = next ? headingTowards(lat, lon, next) + 90 : 0;
      const top = pole(b, b.at(lat, lon, heading, 1), k % 2 === 1, poleBase(d));
      if (last) {
        cable(b, last[0], top[0]);
        cable(b, last[1], top[1]);
      } else {
        cable(b, start, top[0]);
        cable(b, start, top[1]);
      }
      last = top;
    });
    const end = poles.at(-1);
    if (!end) continue;
    const { lat, lon } = latLon(end);
    const base = b.at(lat, lon, 0, 1.2);
    // La caseta, un paso más allá del último poste, hacia el destino.
    const toward = headingTowards(lat, lon, siteDirection(line.to)) * DEG;
    const shed = new Frame(base.at([Math.sin(toward) * 2.2, Math.cos(toward) * 2.2, 0]));
    transformer(b, shed);
    const terminal = shed.point([0, 0, 1.9]);
    if (last) cable(b, last[1], terminal);
    if (line.to !== 'ciudad') continue;
    const nearest = [...cityPosts].sort(
      (p, q) => p.distanceTo(terminal) - q.distanceTo(terminal),
    )[0];
    if (nearest) cable(b, terminal, nearest);
  }
}

function siteDirection(id: keyof typeof SITES): Vector3 {
  return direction(SITES[id].lat, SITES[id].lon);
}

/**
 * Guirnaldas del Motor sobre las cuatro calles de la ciudad: dos postes y bulbos colgando del cable. Devuelve lo alto
 * del poste de fuera de cada calle (donde llega la línea del Motor).
 */
function cityGarlands(b: HogarBuilder): Vector3[] {
  const f = b.site('ciudad');
  const outer: Vector3[] = [];
  for (const a of [0, 90, 180, 270]) {
    const r = a * DEG;
    const at = (d: number, z: number): Triple => [
      Math.sin(r) * d - Math.cos(r) * 1.7,
      Math.cos(r) * d + Math.sin(r) * 1.7,
      z,
    ];
    const tops: Vector3[] = [];
    for (const d of [9.2, 25]) {
      b.pieces.add(P.iron, cylinder(0.08, 6), f.at(at(d, 2.1), undefined, [1, 1, 4.2]), 'metal', {
        solid: true,
      });
      b.pieces.add(P.glow, ball(0.12, 0), f.at(at(d, 4.3)), 'light', { glow: 2, vary: 0 });
      tops.push(f.point(at(d, 4.2)));
    }
    const [near, far] = tops;
    if (!near || !far) continue;
    outer.push(far);
    cable(b, near, far);
    for (let k = 1; k < 8; k++) {
      const t = k / 8;
      const p = near.clone().lerp(far, t);
      const down = p.clone().normalize().negate();
      p.addScaledVector(down, Math.sin(t * Math.PI) * near.distanceTo(far) * SAG_PER_METRE + 0.35);
      b.pieces.add(
        k % 3 === 0 ? P.glowWarm : P.glow,
        ball(0.13, 0),
        new Matrix4().makeTranslation(p.x, p.y, p.z),
        'light',
        { glow: 2, vary: 0 },
      );
    }
  }
  return outer;
}

/** Los anillos pequeños de prueba de la costa, de pie mirando al mar, cada uno con su chispa de luz. */
function coastRings(b: HogarBuilder): void {
  const { radius, tube } = COAST_RINGS;
  for (const spot of coastSpots()) {
    const f = b.at(spot.lat, spot.lon, spot.heading, 2.2);
    const z = radius + 0.55;
    b.pieces.add(P.brass, torus(radius, tube, 20, 5), f.at([0, 0, z]), 'metal', { solid: true });
    b.pieces.add(P.glow, torus(radius - tube - 0.03, 0.035, 20, 3), f.at([0, 0, z]), 'light', {
      glow: 1.7,
      vary: 0,
    });
    for (const x of [-0.75, 0.75]) {
      b.pieces.add(P.sandstone, box(), f.at([x, 0, 0.3], undefined, [0.55, 0.7, 0.6]), 'stone', {
        solid: true,
      });
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      b.pieces.add(
        P.brassDark,
        box(),
        f.at([Math.cos(a) * radius, 0.15, z + Math.sin(a) * radius], [0, -a, 0], [0.3, 0.05, 0.06]),
        'metal',
        { solid: false },
      );
    }
  }
}

/** El memorial del explorador: una estela con su casco de burbuja encima, la placa y luces dejadas delante. */
function memorial(b: HogarBuilder): void {
  const site = b.site('instituto');
  const [x, y] = MEMORIAL.at;
  const t = MEMORIAL.turn * DEG;
  const f = new Frame(site.at([x, y, 0], [0, 0, -t]));
  b.pieces.add(P.sandstone, box(), f.at([0, 0, 0.25], undefined, [1.5, 1, 0.5]), 'stone', {
    solid: true,
  });
  b.pieces.add(P.paving, box(), f.at([0, 0, 1.25], undefined, [0.8, 0.36, 1.5]), 'stone', {
    solid: true,
  });
  b.pieces.add(
    P.brass,
    torus(0.36, 0.05, 20, 4),
    f.at([0, 0, 2.06], [Math.PI / 2, 0, 0]),
    'metal',
    {
      solid: false,
    },
  );
  b.glass.push(
    ball(1, 2)
      .clone()
      .applyMatrix4(f.at([0, 0, 2.38], undefined, [0.37, 0.37, 0.37])),
  );
  b.pieces.add(P.glowWarm, ball(0.08, 1), f.at([0, 0, 2.36]), 'light', { glow: 1.4, vary: 0 });
  // La placa, en la cara que mira al nido, y el símbolo de las Puertas grabado (un aro con rayas).
  b.pieces.add(P.brassDark, box(), f.at([0, 0.19, 1.45], undefined, [0.56, 0.02, 0.36]), 'metal', {
    solid: false,
  });
  b.pieces.add(P.cream, torus(0.13, 0.015, 16, 3), f.at([0, 0.205, 1.45]), 'stone', {
    solid: false,
  });
  // Lo que han ido dejando: bulbos de luz en media luna y flores.
  for (let k = 0; k < 9; k++) {
    const a = ((k - 4) / 9) * Math.PI;
    const at: Triple = [Math.sin(a) * 1.15, 0.55 + Math.cos(a) * 0.55, 0.06];
    b.pieces.add(k % 2 === 0 ? P.glow : P.glowWarm, ball(0.07, 0), f.at(at), 'light', {
      glow: 1.6,
      vary: 0,
    });
    b.pieces.add(
      k % 3 === 0 ? P.plum : k % 3 === 1 ? P.ochre : P.cream,
      ball(0.06, 0),
      f.at([at[0] * 0.8, at[1] * 0.8 + 0.1, 0.05]),
      'stone',
      { solid: false },
    );
  }
}

/** En el banco de la Maestra: el bastón apoyado, la bufanda doblada y un libro cerrado. Nadie sentado. */
function maestraBench(b: HogarBuilder): void {
  const site = b.site('instituto');
  const [x, y] = MAESTRA_BENCH.at;
  const f = new Frame(site.at([x, y, 0], [0, 0, MAESTRA_BENCH.yaw]));
  b.pieces.add(
    P.woodDark,
    cylinder(0.025, 5),
    f.at([0.98, 0.1, 0.45], [0, -0.25, 0], [1, 1, 0.92]),
    'stone',
    {
      solid: false,
    },
  );
  b.pieces.add(
    P.woodDark,
    torusArc(0.07, 0.022, 0, Math.PI, 6, 3),
    f.at([0.87, 0.1, 0.9], [0, 0, 0]),
    'stone',
    { solid: false },
  );
  b.pieces.add(P.sage, box(), f.at([-0.45, 0, 0.5], [0, 0, 0.1], [0.42, 0.3, 0.07]), 'stone', {
    solid: false,
  });
  b.pieces.add(P.teal, box(), f.at([-0.45, 0, 0.545], [0, 0, 0.1], [0.42, 0.06, 0.02]), 'stone', {
    solid: false,
  });
  b.pieces.add(
    P.leather,
    box(),
    f.at([0.25, -0.02, 0.49], [0, 0, -0.3], [0.26, 0.2, 0.06]),
    'stone',
    {
      solid: false,
    },
  );
}

/** Todo lo que el Hogar de diez años después tiene y el de antes no. */
export function buildLater(b: HogarBuilder): void {
  powerLines(b, cityGarlands(b));
  coastRings(b);
  memorial(b);
  maestraBench(b);
}
