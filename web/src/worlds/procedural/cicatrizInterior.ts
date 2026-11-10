// La cara interior de Cicatriz (Fase 11H): se camina con la cabeza hacia el micro agujero. Aquí vivía el turno de la
// máquina: la Fundición (donde la roca del centro se fundía en anillos de Puerta), la Sala de Partidas (andenes,
// equipaje y el tablero de salidas tachadas), el Friso de la Excavación (cómo vaciaron el planeta), los Dormideros y,
// por todas partes, farolas, columnas de estratos que cuelgan y caminos de losas.
import { buildPlate } from './benchBuilders';
import { Vector3 } from 'three';
import { angleBetween, ball, box, cone, cylinder, direction, torus, torusArc } from './kit';
import { BITES, biteAxis, eyeAngle, INNER_RADIUS, INNER_SITES } from './cicatrizShape';
import { beam, insideFrame, PALETTE, type CicatrizBuilder } from './cicatrizKit';
import type { Frame } from './kit';
import { brazier } from './cicatrizCore';

const DEG = Math.PI / 180;

/** La Fundición: tres crisoles, un anillo de Puerta a medio forjar colgado de su grúa y moldes por el suelo. */
function fundicion(builder: CicatrizBuilder): void {
  const { lat, lon } = INNER_SITES.fundicion;
  const f = insideFrame(lat, lon, { footprint: 9, heading: 40 });
  const v = builder.inside;
  // La placa que canta (P7), entre dos crisoles.
  buildPlate(
    v,
    f,
    (name, frame, at, props) => {
      builder.mark(name, frame, at, props);
    },
    {
      post: PALETTE.slate,
      base: PALETTE.black,
      accent: PALETTE.ember,
      plate: '#B08A4A',
      hole: PALETTE.black,
    },
  );
  v.add(PALETTE.ash, cylinder(10, 22), f.at([0, 0, -0.5], [0, 0, 0], [1, 1, 1.2]));
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3;
    const x = Math.cos(a) * 5.5;
    const y = Math.sin(a) * 5.5;
    v.add(PALETTE.black, cone(1.6, 2.2, 12), f.at([x, y, 1.2], [0, 0, 0], [1, 1, 2.4]), 'metal');
    v.add(PALETTE.ember, cylinder(1.9, 12), f.at([x, y, 2.42], [0, 0, 0], [1, 1, 0.05]), 'light', {
      glow: 1.8,
    });
    v.add(
      PALETTE.rust,
      box(),
      f.at([x * 0.6, y * 0.6, 0.15], [0, 0, a], [4.5, 0.6, 0.3]),
      'metal',
      { solid: false },
    );
    v.add(
      PALETTE.ember,
      box(),
      f.at([x * 0.6, y * 0.6, 0.31], [0, 0, a], [4.3, 0.3, 0.04]),
      'light',
      { glow: 1.4 },
    );
  }
  // La grúa: dos pórticos y una viga; del gancho cuelga un anillo a medias (le faltan dovelas).
  for (const x of [-7, 7]) {
    v.add(PALETTE.slate, box(), f.at([x, 0, 5], [0, 0, 0], [0.7, 0.7, 10]), 'metal');
    v.add(PALETTE.slate, box(), beam(f.point([x, -3, 0]), f.point([x, 0, 8]), 0.4), 'metal', {
      solid: false,
    });
  }
  v.add(PALETTE.slate, box(), f.at([0, 0, 10.1], [0, 0, 0], [15, 0.9, 0.9]), 'metal');
  v.add(PALETTE.black, cylinder(0.05, 4), f.at([0, 0, 9], [0, 0, 0], [1, 1, 2.2]), 'metal', {
    solid: false,
  });
  for (let k = 0; k < 20; k++) {
    if (k > 13 && k < 18) continue;
    const a = (2 * Math.PI * k) / 20;
    v.add(
      k % 2 ? PALETTE.sand : PALETTE.sandDark,
      box(),
      f.at(
        [Math.cos(a) * 3.2, 0, 4.6 + Math.sin(a) * 3.2],
        [0, Math.PI / 2 - a, 0],
        [0.7, 0.6, 1.0],
      ),
      'stone',
      { solid: false },
    );
  }
  v.add(
    PALETTE.ember,
    torusArc(2.75, 0.05, 0, Math.PI * 1.4, 24, 3),
    f.at([0, -0.35, 4.6]),
    'light',
    { glow: 1.4 },
  );
  // Moldes y dovelas apiladas.
  for (let k = 0; k < 9; k++) {
    const a = k * 0.7 + 1;
    const d = 7.5 + (k % 3);
    v.add(
      PALETTE.sandDark,
      box(),
      f.at([Math.cos(a) * d, Math.sin(a) * d, 0.35 + (k % 2) * 0.7], [0, 0, a], [1.4, 0.7, 0.7]),
      'stone',
    );
  }
  brazier(builder, f, -9, 3, true);
  brazier(builder, f, 9, -3, true);
}

/** La Sala de Partidas: dos andenes con bancos y equipaje, un anillo de salida apagado y el tablero de salidas. */
function partidas(builder: CicatrizBuilder): void {
  const { lat, lon } = INNER_SITES.partidas;
  const f = insideFrame(lat, lon, { footprint: 9, heading: 0 });
  const v = builder.inside;
  v.add(PALETTE.sandDark, box(), f.at([0, 0, -0.4], [0, 0, 0], [18, 14, 1.0]));
  for (const x of [-5, 5]) {
    v.add(PALETTE.sand, box(), f.at([x, 0, 0.35], [0, 0, 0], [4, 12, 0.5]));
    for (let k = 0; k < 4; k++) {
      v.add(
        PALETTE.rust,
        box(),
        f.at([x, -4.5 + k * 3, 0.95], [0, 0, 0], [2.4, 0.5, 0.12]),
        'stone',
        { solid: false },
      );
      v.add(
        PALETTE.rust,
        box(),
        f.at([x, -4.3 + k * 3, 1.3], [0, 0, 0], [2.4, 0.1, 0.6]),
        'stone',
        { solid: false },
      );
    }
    // Equipaje que nadie recogió.
    for (let k = 0; k < 6; k++) {
      v.add(
        k % 2 ? PALETTE.bone : PALETTE.rustLight,
        box(),
        f.at(
          [x + (k % 2 ? 1.2 : -1.1), -5 + k * 1.9, 0.85],
          [0, 0, k * 0.5],
          [0.6, 0.35, 0.5 + (k % 3) * 0.15],
        ),
        'stone',
        { solid: false },
      );
    }
  }
  // El anillo de salida, apagado, entre los andenes.
  for (const x of [-2.2, 2.2])
    v.add(PALETTE.black, box(), f.at([x, 6, 2], [0, 0, 0], [0.5, 0.5, 4]), 'metal');
  v.add(PALETTE.slate, torus(2.1, 0.25, 32, 6), f.at([0, 6, 2.3]), 'metal', { solid: false });
  for (let k = 0; k < 12; k++) {
    const a = (2 * Math.PI * k) / 12;
    v.add(
      PALETTE.ash,
      box(),
      f.at([Math.cos(a) * 2.45, 6, 2.3 + Math.sin(a) * 2.45], [0, -a, 0], [0.1, 0.1, 0.3]),
      'metal',
      { solid: false },
    );
  }
  // El tablero: filas de salidas, casi todas tachadas en rojo; la última, aún encendida.
  v.add(PALETTE.black, box(), f.at([0, -6.6, 3], [0, 0, 0], [7, 0.4, 3.6]), 'metal');
  for (let row = 0; row < 7; row++) {
    const y = -6.38;
    v.add(
      PALETTE.paper,
      box(),
      f.at([-1.2, y, 4.4 - row * 0.45], [0, 0, 0], [3.6, 0.04, 0.22]),
      'stone',
      { solid: false },
    );
    v.add(
      PALETTE.sand,
      box(),
      f.at([2.2, y, 4.4 - row * 0.45], [0, 0, 0], [1.6, 0.04, 0.22]),
      'stone',
      { solid: false },
    );
    if (row < 6) {
      v.add(
        PALETTE.ember,
        box(),
        f.at([0, y - 0.03, 4.4 - row * 0.45], [0, 0.08, 0], [6.2, 0.02, 0.05]),
        'light',
        { glow: 1.4 },
      );
    } else {
      v.add(
        PALETTE.lamp,
        box(),
        f.at([3.3, y - 0.03, 4.4 - row * 0.45], [0, 0, 0], [0.18, 0.02, 0.18]),
        'light',
        { glow: 2 },
      );
    }
  }
  for (const x of [-3.2, 3.2])
    v.add(PALETTE.slate, box(), f.at([x, -6.6, 1.1], [0, 0, 0], [0.35, 0.35, 2.2]), 'metal');
  builder.mark('INT_partidas', f, [0, -5.2, 1.4], { clue_id: 'cicatriz.partidas', kind: 'texto' });
  for (const [x, y] of [
    [-8, 6],
    [8, 6],
    [-8, -6],
    [8, -6],
  ] as const)
    lamp(builder, f, x, y);
}

/** El Friso de la Excavación: un muro largo y curvo con relieves en bandas que cuentan cómo vaciaron el planeta. */
function friso(builder: CicatrizBuilder): void {
  const { lat, lon } = INNER_SITES.friso;
  const f = insideFrame(lat, lon, { footprint: 6, heading: 0 });
  const v = builder.inside;
  const panels = 9;
  for (let k = 0; k < panels; k++) {
    const a = ((k - (panels - 1) / 2) * 12 * Math.PI) / 180;
    const x = Math.sin(a) * 9;
    const y = 4 - Math.cos(a) * 9 + 9;
    v.add(PALETTE.sand, box(), f.at([x, y, 2.2], [0, 0, -a], [2.2, 0.6, 4.4]));
    // Cinco bandas: la esfera llena, el pozo, la roca subiendo, los anillos saliendo, la esfera hueca.
    for (let band = 0; band < 4; band++) {
      v.add(
        band % 2 ? PALETTE.rust : PALETTE.sandDark,
        box(),
        f.at([x - Math.cos(a) * 0, y - 0.33, 0.8 + band * 1.0], [0, 0, -a], [2.0, 0.06, 0.12]),
        'stone',
        { solid: false },
      );
    }
    const hollow = k / (panels - 1);
    v.add(
      PALETTE.black,
      cylinder(0.55, 14),
      f.at([x, y - 0.34, 3.3], [Math.PI / 2, 0, -a], [1, 1, 0.04]),
      'stone',
      { solid: false },
    );
    v.add(
      PALETTE.ember,
      cylinder(Math.max(0.05, 0.5 * hollow), 14),
      f.at([x, y - 0.37, 3.3], [Math.PI / 2, 0, -a], [1, 1, 0.04]),
      'light',
      { glow: 1.3 },
    );
  }
  v.add(PALETTE.ash, box(), f.at([0, 4, -0.3], [0, 0, 0], [12, 9, 0.6]));
  builder.mark('INT_friso', f, [0, 2, 1.5], { clue_id: 'cicatriz.friso', kind: 'texto' });
  lamp(builder, f, -5, 0);
  lamp(builder, f, 5, 0);
}

/** Los Dormideros: nichos excavados en un murete curvo, con catres, mantas y una lámpara cada uno. */
function dormideros(builder: CicatrizBuilder): void {
  const { lat, lon } = INNER_SITES.dormideros;
  const f = insideFrame(lat, lon, { footprint: 6, heading: 120 });
  const v = builder.inside;
  const niches = 7;
  for (let k = 0; k < niches; k++) {
    const a = ((k - (niches - 1) / 2) * 20 * Math.PI) / 180;
    const x = Math.sin(a) * 7;
    const y = 7 - Math.cos(a) * 7;
    v.add(PALETTE.rust, box(), f.at([x, y + 0.9, 1.4], [0, 0, -a], [2.4, 0.4, 2.8]));
    v.add(PALETTE.black, box(), f.at([x, y, 2.9], [0, 0, -a], [2.6, 2.2, 0.3]));
    v.add(PALETTE.sandDark, box(), f.at([x, y, 0.35], [0, 0, -a], [1.9, 0.9, 0.3]), 'stone');
    v.add(
      k % 3 ? PALETTE.bone : PALETTE.violet,
      box(),
      f.at([x + 0.2, y, 0.55], [0, 0, -a + 0.1], [1.2, 0.85, 0.08]),
      'stone',
      { solid: false, glow: k % 3 ? 1 : 0.5 },
    );
    v.add(PALETTE.lamp, ball(0.1, 1), f.at([x, y + 0.6, 2.3]), 'light', {
      glow: k === 4 ? 0.4 : 1.6,
    });
  }
  v.add(PALETTE.ash, cylinder(8, 20), f.at([0, 4, -0.5], [0, 0, 0], [1, 1, 1.0]));
  brazier(builder, f, 0, 2, true);
}

/** Una farola de los Ausentes: poste de estratos y un aro con su luz. */
function lamp(builder: CicatrizBuilder, f: Frame, x: number, y: number): void {
  const v = builder.inside;
  v.add(PALETTE.slate, cylinder(0.12, 6), f.at([x, y, 1.6], [0, 0, 0], [1, 1, 3.2]), 'metal');
  v.add(PALETTE.sandDark, torus(0.35, 0.05, 16, 3), f.at([x, y, 3.2]), 'metal', { solid: false });
  v.add(PALETTE.lamp, ball(0.18, 1), f.at([x, y, 3.2]), 'light', { glow: 1.8 });
}

/** Rocas de estratos que cuelgan hacia el centro (vistas desde abajo, agujas) y farolas por la cara interior. */
function scenery(builder: CicatrizBuilder): void {
  const random = builder.random;
  const sites = Object.values(INNER_SITES).map((s) => direction(s.lat, s.lon));
  const v = builder.inside;
  let placed = 0;
  for (let attempt = 0; attempt < 900 && placed < 140; attempt++) {
    const d = new Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1);
    if (d.lengthSq() > 1 || d.lengthSq() < 1e-3) continue;
    d.normalize();
    if (BITES.some((b) => angleBetween(d, biteAxis(b)) < eyeAngle(b) + 4 * DEG)) continue;
    if (sites.some((s) => angleBetween(d, s) < 16 * DEG)) continue;
    const f = insideFrame(Math.asin(d.z) / DEG, Math.atan2(d.y, d.x) / DEG, {
      heading: random() * 360,
    });
    const high = 1.5 + random() * 6;
    const wide = 0.6 + random() * 1.4;
    v.add(
      placed % 3 ? '#2e2428' : PALETTE.rust,
      cone(wide, 0.05, 6),
      f.at([0, 0, high / 2 - 0.3], [random() * 0.2, random() * 0.2, 0], [1, 1, high]),
      'stone',
      { solid: high > 3 },
    );
    if (placed % 9 === 0) lamp(builder, f, wide + 1.2, 0);
    if (placed % 5 === 0)
      v.add(
        PALETTE.ember,
        box(),
        f.at([0, 0, 0.03], [0, 0, random() * 3], [2.4 + random() * 3, 0.08, 0.04]),
        'light',
        { glow: 1.1 },
      );
    placed++;
  }
  // Caminos de losas entre los sitios y el pie del Eje.
  const hub = direction(INNER_SITES.eje.lat, INNER_SITES.eje.lon);
  for (const site of [
    INNER_SITES.fundicion,
    INNER_SITES.partidas,
    INNER_SITES.friso,
    INNER_SITES.dormideros,
    INNER_SITES.fondo,
  ]) {
    const to = direction(site.lat, site.lon);
    const axis = hub.clone().cross(to).normalize();
    const total = angleBetween(hub, to);
    for (let a = 8 / INNER_RADIUS; a < total - 8 / INNER_RADIUS; a += 2.2 / INNER_RADIUS) {
      const d = hub.clone().applyAxisAngle(axis, a);
      if (BITES.some((b) => angleBetween(d, biteAxis(b)) < eyeAngle(b) + 2 * DEG)) continue;
      const g = insideFrame(Math.asin(d.z) / DEG, Math.atan2(d.y, d.x) / DEG);
      v.add(PALETTE.sandDark, box(), g.at([0, 0, 0.04], [0, 0, a * 7], [1.6, 1.6, 0.12]), 'stone', {
        solid: false,
      });
    }
  }
}

/** Toda la cara interior. */
export function interior(builder: CicatrizBuilder): void {
  fundicion(builder);
  partidas(builder);
  friso(builder);
  dormideros(builder);
  scenery(builder);
}
