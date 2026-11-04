// El Instituto de Hogar (Fase 11G; 🟡 el diseño, sobre lo ✅ de CONTEXTO_PLANETAS.md §9): en la cima llana de su
// colina, la plaza donde se despierta, la Sala de Fragmentos (una rotonda con vitrinas), la Torre de Lectura de la
// Maestra (✅ una estructura solo suya, Anthony 2026-11-03: tambores apilados como libros, con su aula al aire libre y
// una rampa en espiral hasta el balcón) y, al este, el Taller de Hogar con el hangar del Albatros II (✅ también único:
// un nido de costillas abierto al cielo, para que la nave suba recta). La Directora ya no está aquí: espera en el
// Motor (hogarMotor.ts). Marco del lugar: +Y al norte, +X al este, el suelo de la cima a z = 0.
import {
  ball,
  box,
  cone,
  cylinder,
  rampMatrix,
  torus,
  torusArc,
  type Frame,
  type Triple,
} from './kit';
import { HOGAR_PALETTE as P, type HogarBuilder } from './hogarKit';

const DEG = Math.PI / 180;

/** Dónde está cada parte, en metros desde el centro de la plaza. */
export const INSTITUTO_LAYOUT = {
  spawn: [0, -5] as const,
  rotunda: [0, 14] as const,
  tower: [-19, 3] as const,
  hangar: [17, -3] as const,
  workshop: [9, -15] as const,
} as const;

const ROTUNDA_RADIUS = 6.5;
const ROTUNDA_HEIGHT = 4.2;
/** La puerta de la rotonda, mirando a la plaza (sur): su anchura en grados de pared. */
const ROTUNDA_DOOR = 26;
const TOWER_RADIUS = 4;
const TOWER_BASE = 3.2;
const RAMP_RADIUS = 4.65;
const RAMP_WIDTH = 1.3;
/** La rampa de la torre: de qué ángulo a qué ángulo sube (grados desde +Y hacia +X) y hasta qué altura. */
export const TOWER_RAMP = { radius: RAMP_RADIUS, from: 140, to: 410, top: TOWER_BASE } as const;

/**
 * Una pared redonda de paneles con un hueco (la puerta) hacia `gap` grados (desde +Y hacia +X). Cada panel choca:
 * se puede entrar por el hueco, no atravesar la pared.
 */
function roundWall(
  b: HogarBuilder,
  f: Frame,
  center: Triple,
  radius: number,
  height: number,
  colors: readonly string[],
  gap: number,
  gapWidth: number,
): void {
  const panels = Math.round((2 * Math.PI * radius) / 1.3);
  const width = (2 * Math.PI * radius) / panels + 0.04;
  for (let k = 0; k < panels; k++) {
    const a = (k + 0.5) * (360 / panels);
    const off = Math.abs(((a - gap + 540) % 360) - 180);
    if (off < gapWidth / 2) continue;
    const r = a * DEG;
    const p: Triple = [
      center[0] + Math.sin(r) * radius,
      center[1] + Math.cos(r) * radius,
      center[2] + height / 2,
    ];
    b.pieces.add(
      colors[k % colors.length] ?? P.cream,
      box(),
      f.at(p, [0, 0, -r], [width, 0.25, height]),
      'stone',
      { solid: true },
    );
    b.pieces.add(
      P.rib,
      cylinder(0.07, 5),
      f.at(
        [
          center[0] + Math.sin(r + Math.PI / panels) * (radius + 0.14),
          center[1] + Math.cos(r + Math.PI / panels) * (radius + 0.14),
          center[2] + height / 2,
        ],
        undefined,
        [1, 1, height],
      ),
      'stone',
      { solid: false },
    );
  }
}

function dome(
  b: HogarBuilder,
  f: Frame,
  at: Triple,
  radius: number,
  rise: number,
  color: string,
): void {
  b.pieces.add(color, ball(1, 2), f.at(at, undefined, [radius, radius, rise]), 'stone', {
    solid: false,
  });
  for (let k = 0; k < 4; k++) {
    b.pieces.add(
      P.rib,
      torusArc(1, 0.03, 0, Math.PI, 14, 4),
      f.at(at, [0, 0, (k / 4) * Math.PI], [radius * 1.01, 1, rise * 1.01]),
      'stone',
      { solid: false },
    );
  }
  b.pieces.add(
    P.rib,
    torus(radius * 1.01, 0.08, 28, 4),
    f.at([at[0], at[1], at[2] + 0.04], [Math.PI / 2, 0, 0]),
    'stone',
    { solid: false },
  );
}

/** La plaza: un círculo empedrado con farolas, bancos y dos árboles de musgo; aquí se despierta. */
function plaza(b: HogarBuilder, f: Frame): void {
  b.pieces.add(P.paving, cylinder(7.5, 28), f.at([0, 0, 0.012], undefined, [1, 1, 0.02]), 'stone', {
    solid: false,
  });
  b.pieces.add(
    P.sandstone,
    torus(7.5, 0.12, 40, 4),
    f.at([0, 0, 0.02], [Math.PI / 2, 0, 0], [1, 1, 0.3]),
    'stone',
    { solid: false },
  );
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    b.bulbLamp(f, [Math.sin(a) * 7.9, Math.cos(a) * 7.9, 0], 2.6);
  }
  for (const [x, y, t] of [
    [-5, 3.5, -60],
    [5, 3.5, 60],
  ] as const) {
    b.pieces.add(P.wood, box(), f.at([x, y, 0.42], [0, 0, t * DEG], [1.8, 0.45, 0.08]), 'stone', {
      solid: false,
    });
    b.pieces.add(P.woodDark, box(), f.at([x, y, 0.2], [0, 0, t * DEG], [1.6, 0.35, 0.4]), 'stone', {
      solid: true,
    });
  }
  b.mossTree(f, [-9, -10, 0], 1.1, 5);
  b.mossTree(f, [9.5, 8, 0], 0.9, 3);
  b.mossTree(f, [-10.5, 12, 0], 1, 4);
  b.mark('SPAWN_Instituto', f, [INSTITUTO_LAYOUT.spawn[0], INSTITUTO_LAYOUT.spawn[1], 0.3]);
}

/** La Sala de Fragmentos: una rotonda de lona clara con vitrinas por dentro y una luz de cenit. */
function rotunda(b: HogarBuilder, f: Frame): void {
  const [cx, cy] = INSTITUTO_LAYOUT.rotunda;
  const c: Triple = [cx, cy, 0];
  roundWall(b, f, c, ROTUNDA_RADIUS, ROTUNDA_HEIGHT, [P.cream, P.sandstone], 180, ROTUNDA_DOOR);
  dome(b, f, [cx, cy, ROTUNDA_HEIGHT], ROTUNDA_RADIUS + 0.15, 3.2, P.cream);
  b.pieces.add(
    P.glow,
    torus(1.2, 0.08, 20, 4),
    f.at([cx, cy, ROTUNDA_HEIGHT + 3.1], [Math.PI / 2, 0, 0]),
    'light',
    { glow: 1.4, vary: 0 },
  );
  b.pieces.add(
    P.paving,
    cylinder(ROTUNDA_RADIUS, 28),
    f.at([cx, cy, 0.015], undefined, [1, 1, 0.02]),
    'stone',
    { solid: false },
  );
  // El arco de la puerta.
  const door = 180 * DEG;
  b.pieces.add(
    P.rib,
    torusArc(1, 0.12, 0, Math.PI, 14, 4),
    f.at(
      [cx + Math.sin(door) * ROTUNDA_RADIUS, cy + Math.cos(door) * ROTUNDA_RADIUS, 0],
      [0, 0, -door],
      [1.5, 1, 3],
    ),
    'stone',
    { solid: false },
  );
  // Seis vitrinas contra la pared; la de los bordes curvos es una fuente y se queda en el Hogar de antes.
  const cases = [-120, -75, -30, 30, 75, 120];
  cases.forEach((angle, k) => {
    const a = (angle + 180) * DEG; // desde la puerta, alrededor
    const r = ROTUNDA_RADIUS - 1;
    const p: Triple = [cx + Math.sin(a) * r, cy + Math.cos(a) * r, 0];
    b.pieces.add(P.woodDark, box(), f.at([p[0], p[1], 0.5], [0, 0, -a], [1, 0.7, 1]), 'stone', {
      solid: true,
    });
    b.glass.push(
      box()
        .clone()
        .applyMatrix4(f.at([p[0], p[1], 1.4], [0, 0, -a], [0.95, 0.65, 0.8])),
    );
    const set = k === 2 ? b.pieces : b.showcase;
    // Piedras de arenisca con un borde liso y curvo.
    set.add(
      P.sandstone,
      ball(1, 1),
      f.at([p[0], p[1], 1.25], [0.3, 0.2, k], [0.28, 0.2, 0.18]),
      'stone',
      { solid: false },
    );
    set.add(
      P.slate,
      ball(1, 0),
      f.at([p[0] + 0.15, p[1], 1.2], [0, 0.4, k], [0.14, 0.12, 0.1]),
      'stone',
      { solid: false },
    );
    if (k === 2) {
      b.source('instituto.vitrina_bordes', 'objeto', f, [p[0], p[1], 1.35]);
    }
  });
  // El símbolo partido, en su atril al fondo, frente a la puerta.
  const back: Triple = [cx, cy + ROTUNDA_RADIUS - 1.4, 0];
  b.pieces.add(
    P.woodDark,
    box(),
    f.at([back[0], back[1], 0.45], undefined, [1.4, 0.5, 0.9]),
    'stone',
    { solid: true },
  );
  b.pieces.add(
    P.sandstone,
    box(),
    f.at([back[0], back[1] + 0.05, 1.45], [-0.15, 0, 0], [1.1, 0.12, 0.9]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.slate,
    torusArc(0.32, 0.03, Math.PI, 2 * Math.PI, 12, 3),
    f.at([back[0], back[1] - 0.02, 1.45], [-0.15, 0, 0]),
    'stone',
    { solid: false },
  );
  b.source('instituto.simbolo_partido', 'objeto', f, [back[0], back[1], 1.45]);
  // En medio, la vitrina redonda con la primera piedra que llegó.
  b.pieces.add(
    P.woodDark,
    cylinder(0.7, 12),
    f.at([cx, cy, 0.45], undefined, [1, 1, 0.9]),
    'stone',
    { solid: true },
  );
  b.glass.push(
    cylinder(0.65, 12)
      .clone()
      .applyMatrix4(f.at([cx, cy, 1.35], undefined, [1, 1, 0.9])),
  );
  b.showcase.add(
    P.sandstone,
    ball(1, 1),
    f.at([cx, cy, 1.25], [0.2, 0.5, 0], [0.4, 0.3, 0.26]),
    'stone',
    { solid: false },
  );
}

/**
 * La Torre de Lectura de la Maestra: tres tambores apilados como un montón de libros (lomo de color, cantos de papel),
 * con su aula al aire libre delante, una rampa en espiral hasta el balcón y una linterna de filamentos en lo alto.
 */
function tower(b: HogarBuilder, f: Frame): void {
  const [tx, ty] = INSTITUTO_LAYOUT.tower;
  const drums: { r: number; h: number; spine: string }[] = [
    { r: TOWER_RADIUS, h: TOWER_BASE, spine: P.rust },
    { r: 2.6, h: 2.8, spine: P.teal },
    { r: 2.1, h: 2.2, spine: P.ochre },
  ];
  let z = 0;
  drums.forEach(({ r, h, spine }, k) => {
    const twist = k * 0.35;
    b.pieces.add(
      spine,
      cylinder(1, 16),
      f.at([tx, ty, z + h / 2], [0, 0, twist], [r, r, h]),
      'stone',
      { solid: true },
    );
    // Los cantos de papel: dos franjas claras, arriba y abajo de cada tambor.
    for (const edge of [0.12, h - 0.12]) {
      b.pieces.add(
        P.cream,
        cylinder(1, 16),
        f.at([tx, ty, z + edge], [0, 0, twist], [r + 0.03, r + 0.03, 0.16]),
        'stone',
        { solid: false },
      );
    }
    // Ventanas redondas.
    for (let w = 0; w < 4; w++) {
      const a = (w / 4) * Math.PI * 2 + k;
      b.pieces.add(
        P.glowWarm,
        cylinder(0.32, 10),
        f.at(
          [tx + Math.sin(a) * (r + 0.02), ty + Math.cos(a) * (r + 0.02), z + h * 0.55],
          [Math.PI / 2, 0, -a],
          [1, 1, 0.04],
        ),
        'light',
        { glow: 1.1, vary: 0 },
      );
    }
    z += h;
  });
  // La linterna de lo alto: filamentos que brillan, como los de una Ool que lee.
  b.pieces.add(P.rib, cone(1.6, 0.4, 10), f.at([tx, ty, z + 0.5], undefined, [1, 1, 1]), 'stone', {
    solid: false,
  });
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    b.pieces.add(
      P.mossDark,
      cylinder(0.05, 4),
      f.at(
        [tx + Math.sin(a) * 0.4, ty + Math.cos(a) * 0.4, z + 1.6],
        [Math.cos(a) * 0.3, -Math.sin(a) * 0.3, 0],
        [1, 1, 1.4],
      ),
      'stone',
      { solid: false },
    );
    b.pieces.add(
      P.glowWarm,
      ball(0.16, 1),
      f.at([tx + Math.sin(a) * 0.62, ty + Math.cos(a) * 0.62, z + 2.3]),
      'light',
      { glow: 1.8, vary: 0 },
    );
  }
  // El balcón sobre el primer tambor (su tapa ya choca) con barandilla.
  b.pieces.add(
    P.wood,
    cylinder(TOWER_RADIUS + 0.05, 20),
    f.at([tx, ty, TOWER_BASE + 0.03], undefined, [1, 1, 0.06]),
    'stone',
    { solid: false },
  );
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    if (Math.sin(a) > 0.2 && Math.cos(a) > 0.3) continue; // donde llega la rampa
    b.pieces.add(
      P.woodDark,
      cylinder(0.04, 4),
      f.at(
        [tx + Math.sin(a) * 3.85, ty + Math.cos(a) * 3.85, TOWER_BASE + 0.5],
        undefined,
        [1, 1, 1],
      ),
      'stone',
      { solid: false },
    );
  }
  b.pieces.add(
    P.woodDark,
    torus(3.85, 0.04, 28, 3),
    f.at([tx, ty, TOWER_BASE + 1], [Math.PI / 2, 0, 0]),
    'stone',
    { solid: false },
  );
  // La rampa en espiral: tres cuartos de vuelta, de la entrada del aula (al sureste) al balcón (al noreste).
  const start = TOWER_RAMP.from;
  const end = TOWER_RAMP.to;
  const steps = 14;
  for (let k = 0; k < steps; k++) {
    const a0 = (start + ((end - start) * k) / steps) * DEG;
    const a1 = (start + ((end - start) * (k + 1)) / steps) * DEG;
    const z0 = (TOWER_BASE * k) / steps;
    const z1 = (TOWER_BASE * (k + 1)) / steps;
    const from: Triple = [tx + Math.sin(a0) * RAMP_RADIUS, ty + Math.cos(a0) * RAMP_RADIUS, z0];
    const to: Triple = [tx + Math.sin(a1) * RAMP_RADIUS, ty + Math.cos(a1) * RAMP_RADIUS, z1];
    b.pieces.add(
      P.wood,
      box(),
      f.base.clone().multiply(rampMatrix(from, to, RAMP_WIDTH, 0.2, 0.15)),
      'stone',
      { solid: true },
    );
    b.pieces.add(
      P.woodDark,
      cylinder(0.04, 4),
      f.at(
        [
          tx + Math.sin(a0) * (RAMP_RADIUS + 0.6),
          ty + Math.cos(a0) * (RAMP_RADIUS + 0.6),
          z0 + 0.5,
        ],
        undefined,
        [1, 1, 1],
      ),
      'stone',
      { solid: false },
    );
  }
  // Arriba, un catalejo hacia la Luna (al suroeste) y el diario de la Maestra.
  b.pieces.add(
    P.brass,
    cylinder(0.07, 8),
    f.at([tx - 2.2, ty - 2.2, TOWER_BASE + 1.3], [0.9, 0, 0.8], [1, 1, 1.1]),
    'metal',
    { solid: false },
  );
  b.pieces.add(
    P.woodDark,
    cylinder(0.04, 4),
    f.at([tx - 2.2, ty - 2.2, TOWER_BASE + 0.6], undefined, [1, 1, 1.2]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.woodDark,
    box(),
    f.at([tx + 2.6, ty + 2.2, TOWER_BASE + 0.45], undefined, [0.7, 0.5, 0.8]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.cream,
    box(),
    f.at([tx + 2.6, ty + 2.2, TOWER_BASE + 0.87], [0, 0, 0.4], [0.4, 0.3, 0.04]),
    'stone',
    { solid: false },
  );
  b.source('hogar.diario_maestra', 'texto', f, [tx + 2.6, ty + 2.2, TOWER_BASE + 0.95]);
  aula(b, f, tx, ty);
}

/** El aula al aire libre, al este de la torre: un toldo, la pizarra, los bancos y el atril con la ficha. */
function aula(b: HogarBuilder, f: Frame, tx: number, ty: number): void {
  const x = tx + TOWER_RADIUS;
  // El toldo a rayas, sobre dos postes.
  for (const y of [ty - 2.2, ty + 2.2]) {
    b.pieces.add(
      P.woodDark,
      cylinder(0.07, 6),
      f.at([x + 3, y, 1.4], undefined, [1, 1, 2.8]),
      'stone',
      { solid: true },
    );
  }
  for (let k = 0; k < 5; k++) {
    b.pieces.add(
      k % 2 === 0 ? P.cream : P.rust,
      box(),
      f.at([x + 1.5, ty - 2 + k, 2.75], [0, -0.18, 0], [3.2, 1, 0.04]),
      'stone',
      { solid: false },
    );
  }
  // La pizarra contra el tambor.
  b.pieces.add(P.slate, box(), f.at([x + 0.1, ty, 1.5], undefined, [0.08, 2.2, 1.2]), 'stone', {
    solid: false,
  });
  b.pieces.add(
    P.cream,
    box(),
    f.at([x + 0.15, ty - 0.4, 1.6], undefined, [0.01, 0.9, 0.04]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.cream,
    box(),
    f.at([x + 0.15, ty + 0.3, 1.35], undefined, [0.01, 0.6, 0.04]),
    'stone',
    { solid: false },
  );
  // Tres bancos bajos para los alumnos nuevos.
  for (const [dx, dy] of [
    [3.4, -1.3],
    [3.4, 1.3],
    [4.8, 0],
  ] as const) {
    b.pieces.add(
      P.wood,
      box(),
      f.at([x + dx, ty + dy, 0.25], undefined, [0.5, 1.4, 0.5]),
      'stone',
      { solid: true },
    );
  }
  // El atril con la ficha de riego, de barro cocido.
  const desk: Triple = [x + 1.4, ty - 1.4, 0];
  b.pieces.add(
    P.woodDark,
    cylinder(0.08, 6),
    f.at([desk[0], desk[1], 0.5], undefined, [1, 1, 1]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.wood,
    box(),
    f.at([desk[0], desk[1], 1.02], [0, 0.35, 0], [0.55, 0.45, 0.05]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.soil,
    box(),
    f.at([desk[0], desk[1], 1.07], [0, 0.35, 0], [0.32, 0.24, 0.04]),
    'stone',
    { solid: false },
  );
  b.source('instituto.ficha', 'texto', f, [desk[0], desk[1], 1.1]);
  // La Maestra, junto al atril, leyendo.
  b.ool(
    { id: 'maestra', age: 0.85, outfit: 'maestra', holding: 'libro', seed: 11 },
    f,
    [x + 1.6, ty + 0.6, 0],
    -100,
  );
  b.source('instituto.maestra', 'charla', f, [x + 1.6, ty + 0.6, 1.2]);
}

/** El Taller de Hogar y el hangar: el nido del Albatros II y, al lado, el taller de la Puerta pequeña. */
function hangar(b: HogarBuilder, f: Frame): void {
  const [hx, hy] = INSTITUTO_LAYOUT.hangar;
  // La plataforma, con su anillo de luces.
  b.pieces.add(
    P.sandstone,
    cylinder(5.6, 28),
    f.at([hx, hy, 0.015], undefined, [1, 1, 0.03]),
    'stone',
    { solid: false },
  );
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    b.pieces.add(
      P.glow,
      ball(0.09, 0),
      f.at([hx + Math.sin(a) * 5.3, hy + Math.cos(a) * 5.3, 0.06]),
      'light',
      { glow: 1.5, vary: 0 },
    );
  }
  b.mark('PARK_Hangar', f, [hx, hy, 0.03]);
  // El nido: media corona de postes con lona entre ellos, abierta hacia la plaza (al oeste), y en cada poste una
  // costilla que se curva hacia la nave sin cerrarse por arriba: la nave sube recta.
  const wall = 6.4;
  const posts = 10;
  const top = 3;
  const angle = (k: number): number => (k / posts) * Math.PI;
  const around = (a: number, r: number, z: number): Triple => [
    hx + Math.sin(a) * r,
    hy + Math.cos(a) * r,
    z,
  ];
  for (let k = 0; k <= posts; k++) {
    const a = angle(k);
    b.pieces.add(
      P.rib,
      cylinder(0.14, 8),
      f.at(around(a, wall, top / 2), undefined, [1, 1, top]),
      'stone',
      {
        solid: true,
      },
    );
    b.pieces.add(P.brass, ball(0.2, 1), f.at(around(a, wall, top)), 'metal', { solid: false });
    // La costilla: sube del poste y se dobla hacia dentro, 1,2 m más allá, 1,8 m más arriba.
    b.pieces.add(
      P.rib,
      torusArc(1, 0.09, 0, Math.PI / 2, 10, 5),
      f.at(around(a, wall - 1.2, top), [0, 0, Math.PI / 2 - a], [1.2, 1, 1.8]),
      'stone',
      { solid: false },
    );
    b.pieces.add(P.glowWarm, ball(0.13, 1), f.at(around(a, wall - 1.2, top + 1.85)), 'light', {
      glow: 1.6,
      vary: 0,
    });
    if (k === posts) continue;
    // La viga de arriba y la lona, de poste a poste.
    const m = (angle(k) + angle(k + 1)) / 2;
    const span = 2 * wall * Math.sin(Math.PI / posts / 2);
    b.pieces.add(
      P.rib,
      box(),
      f.at(around(m, wall * Math.cos(Math.PI / posts / 2), top), [0, 0, -m], [span, 0.16, 0.16]),
      'stone',
      {
        solid: false,
      },
    );
    b.pieces.add(
      k % 2 === 0 ? P.cream : P.ochre,
      box(),
      f.at(
        around(m, wall * Math.cos(Math.PI / posts / 2) - 0.05, 0.25 + (top - 0.6) / 2),
        [0, 0, -m],
        [span - 0.2, 0.05, top - 0.6],
      ),
      'stone',
      { solid: true },
    );
  }
  // Cajas, toneles de combustible y una grúa pequeña.
  for (const [x, y, s] of [
    [hx - 3.5, hy + 5.5, 0.8],
    [hx - 2.6, hy + 6.3, 0.6],
    [hx - 4.6, hy + 4.7, 0.7],
  ] as const) {
    b.pieces.add(P.wood, box(), f.at([x, y, s / 2], [0, 0, s], [s, s, s]), 'stone', {
      solid: true,
    });
  }
  for (const [x, y] of [
    [hx + 1, hy - 6.4],
    [hx + 1.8, hy - 6.1],
  ] as const) {
    b.pieces.add(P.ironRust, cylinder(0.35, 10), f.at([x, y, 0.5], undefined, [1, 1, 1]), 'metal', {
      solid: true,
    });
  }
  b.pieces.add(
    P.iron,
    box(),
    f.at([hx - 4.8, hy - 4.8, 2.2], undefined, [0.25, 0.25, 4.4]),
    'metal',
    { solid: true },
  );
  b.pieces.add(
    P.iron,
    box(),
    f.at([hx - 3.6, hy - 3.9, 4.3], [0, 0, 0.7], [0.18, 3, 0.18]),
    'metal',
    { solid: false },
  );
  b.pieces.add(
    P.iron,
    cylinder(0.015, 4),
    f.at([hx - 2.6, hy - 3, 3.4], undefined, [1, 1, 1.8]),
    'metal',
    { solid: false },
  );
  // La mecánica, junto a la nave.
  b.ool(
    { id: 'mecanica', age: 0.35, outfit: 'mecanica', holding: 'herramienta', seed: 21 },
    f,
    [hx - 4.4, hy + 1.2, 0],
    110,
  );
  b.source('instituto.mecanica', 'charla', f, [hx - 4.4, hy + 1.2, 1.2]);
  workshop(b, f);
}

/** El taller de la Puerta pequeña: abierto hacia la plaza, con la mesa del anillo, la pizarra y el traje de repuesto. */
function workshop(b: HogarBuilder, f: Frame): void {
  const [wx, wy] = INSTITUTO_LAYOUT.workshop;
  const c: Triple = [wx, wy, 0];
  const radius = 4.6;
  // La entrada mira al noroeste, hacia la plaza.
  roundWall(b, f, c, radius, 3.4, [P.ochre, P.cream, P.sage], -40, 60);
  dome(b, f, [wx, wy, 3.4], radius + 0.15, 2.4, P.ochre);
  b.pieces.add(
    P.woodDark,
    cylinder(radius, 24),
    f.at([wx, wy, 0.012], undefined, [1, 1, 0.02]),
    'stone',
    { solid: false },
  );
  b.pieces.add(P.glowWarm, ball(0.25, 1), f.at([wx, wy, 3.9]), 'light', { glow: 1.6, vary: 0 });
  // La mesa: un anillo de latón del tamaño de una mano, en sus pinzas y lleno de cables; las hojas de las pruebas.
  const table: Triple = [wx + 0.6, wy - 0.8, 0];
  b.pieces.add(
    P.wood,
    box(),
    f.at([table[0], table[1], 0.85], undefined, [2, 1.1, 0.08]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.woodDark,
    box(),
    f.at([table[0], table[1], 0.42], undefined, [1.8, 0.9, 0.84]),
    'stone',
    { solid: true },
  );
  b.pieces.add(
    P.brass,
    torus(0.13, 0.025, 18, 5),
    f.at([table[0], table[1], 1.08], [0, 0, 0.3]),
    'metal',
    { solid: false },
  );
  for (const side of [-1, 1]) {
    b.pieces.add(
      P.iron,
      box(),
      f.at([table[0] + side * 0.17, table[1], 0.97], [0, 0, 0.3], [0.04, 0.06, 0.18]),
      'metal',
      { solid: false },
    );
    b.pieces.add(
      P.rust,
      cylinder(0.012, 4),
      f.at([table[0] + side * 0.4, table[1] + 0.2, 0.9], [Math.PI / 2, 0, side], [1, 1, 0.6]),
      'stone',
      { solid: false },
    );
  }
  for (let k = 0; k < 4; k++) {
    b.pieces.add(
      P.cream,
      box(),
      f.at([table[0] - 0.6, table[1] + 0.1, 0.9 + k * 0.012], [0, 0, k * 0.2], [0.3, 0.4, 0.01]),
      'stone',
      { solid: false },
    );
  }
  b.source('instituto.mesa_puerta', 'objeto', f, [table[0], table[1], 1.05]);
  // La pizarra: «Prueba mayor, dentro de cuarenta días», rodeado tres veces.
  const board = 150 * DEG;
  const bp: Triple = [
    wx + Math.sin(board) * (radius - 0.3),
    wy + Math.cos(board) * (radius - 0.3),
    1.6,
  ];
  b.pieces.add(P.slate, box(), f.at(bp, [0, 0, -board], [2, 0.06, 1.2]), 'stone', { solid: false });
  for (let k = 0; k < 3; k++) {
    b.pieces.add(
      P.cream,
      torus(0.32 + k * 0.03, 0.01, 16, 3),
      f.at(
        [bp[0] - Math.sin(board) * 0.05, bp[1] - Math.cos(board) * 0.05, bp[2]],
        [0, 0, -board],
        [1.4, 1, 1],
      ),
      'stone',
      { solid: false },
    );
  }
  // El técnico, al otro lado de la mesa.
  b.ool(
    { id: 'tecnico', age: 0.4, outfit: 'tecnico', holding: 'herramienta', seed: 31 },
    f,
    [table[0] + 0.2, table[1] - 1.2, 0],
    0,
  );
  b.source('instituto.tecnico', 'charla', f, [table[0] + 0.2, table[1] - 1.2, 1.2]);
  spareSuit(b, f, wx, wy, radius);
  // En la pared, el plano del primer Albatros, con una nota a lápiz.
  const plan = 230 * DEG;
  const pp: Triple = [
    wx + Math.sin(plan) * (radius - 0.25),
    wy + Math.cos(plan) * (radius - 0.25),
    1.7,
  ];
  b.pieces.add(P.sky, box(), f.at(pp, [0, 0, -plan], [1.4, 0.03, 1]), 'stone', { solid: false });
  b.pieces.add(
    P.cream,
    ball(1, 1),
    f.at(
      [pp[0] - Math.sin(plan) * 0.03, pp[1] - Math.cos(plan) * 0.03, pp[2]],
      [0, 0, -plan],
      [0.45, 0.02, 0.22],
    ),
    'stone',
    { solid: false },
  );
  b.source('hogar.plano_albatros', 'objeto', f, pp);
}

/**
 * El traje de repuesto del explorador, en su percha (✅ el de la lámina, Anthony 2026-11-03: acolchado, remendado,
 * con correas, bolsas y el cuaderno), y el casco de burbuja en un estante.
 */
function spareSuit(b: HogarBuilder, f: Frame, wx: number, wy: number, radius: number): void {
  const a = 100 * DEG;
  const x = wx + Math.sin(a) * (radius - 0.8);
  const y = wy + Math.cos(a) * (radius - 0.8);
  const olive = '#7a8048';
  const patch = '#a8763e';
  b.pieces.add(P.woodDark, cylinder(0.04, 5), f.at([x, y, 0.8], undefined, [1, 1, 1.6]), 'stone', {
    solid: false,
  });
  b.pieces.add(
    P.woodDark,
    cylinder(0.25, 8),
    f.at([x, y, 0.02], undefined, [1, 1, 0.04]),
    'stone',
    { solid: false },
  );
  // El cuerpo acolchado: bultos cosidos, con un remiendo en el codo.
  for (const [dx, dz, s] of [
    [0, 1.05, 0.3],
    [0, 0.8, 0.27],
    [-0.27, 1.0, 0.13],
    [0.27, 1.0, 0.13],
    [-0.32, 0.78, 0.11],
    [0.32, 0.78, 0.11],
    [-0.1, 0.5, 0.12],
    [0.1, 0.5, 0.12],
  ] as const) {
    b.pieces.add(olive, ball(1, 1), f.at([x + dx, y, dz], undefined, [s, s * 0.85, s]), 'stone', {
      solid: false,
    });
  }
  b.pieces.add(
    patch,
    box(),
    f.at([x - 0.33, y - 0.09, 0.85], [0, 0, 0.3], [0.1, 0.02, 0.1]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.leather,
    torus(0.31, 0.025, 16, 3),
    f.at([x, y, 0.92], [0.4, 0.5, 0], [1, 0.8, 1]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.leather,
    box(),
    f.at([x + 0.18, y - 0.22, 0.7], undefined, [0.12, 0.06, 0.14]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.cream,
    box(),
    f.at([x - 0.15, y - 0.24, 0.72], [0, 0, 0.2], [0.12, 0.03, 0.16]),
    'stone',
    { solid: false },
  );
  // El depósito de aire.
  b.pieces.add(
    P.brassDark,
    cylinder(0.09, 8),
    f.at([x, y + 0.27, 0.95], undefined, [1, 1, 0.42]),
    'metal',
    { solid: false },
  );
  // El casco de burbuja, en el estante de al lado.
  const s = 70 * DEG;
  const sx = wx + Math.sin(s) * (radius - 0.5);
  const sy = wy + Math.cos(s) * (radius - 0.5);
  b.pieces.add(P.wood, box(), f.at([sx, sy, 1.3], [0, 0, -s], [1, 0.45, 0.05]), 'stone', {
    solid: false,
  });
  b.pieces.add(
    P.brass,
    torus(0.21, 0.035, 16, 4),
    f.at([sx, sy, 1.36], [Math.PI / 2, 0, 0]),
    'metal',
    { solid: false },
  );
  b.glass.push(
    ball(0.26, 2)
      .clone()
      .applyMatrix4(f.at([sx, sy, 1.6])),
  );
}

/** Los pasillos de aros y lona que unen la plaza con la torre, el taller y el hangar. */
function arcades(b: HogarBuilder, f: Frame): void {
  b.arcade(f, [-7.8, -1.6, 0], [-11.4, -2, 0]);
  b.arcade(f, [4.4, -6.4, 0], [5.8, -10.4, 0]);
  b.arcade(f, [7.8, -1.6, 0], [11, -2.4, 0], 3.2, 3.2);
}

/** Alrededor de la cima: matas, flores y un banco mirando hacia el Motor. */
function edges(b: HogarBuilder, f: Frame): void {
  b.mossTree(f, [-20, -10, 0], 1.2, 4);
  b.mossTree(f, [4, 22, 0], 1, 3);
  b.mossTree(f, [-21, 13, 0], 0.9, 3);
  b.pieces.add(P.wood, box(), f.at([22, 8, 0.42], [0, 0, 0.4], [1.8, 0.45, 0.08]), 'stone', {
    solid: false,
  });
  b.pieces.add(P.woodDark, box(), f.at([22, 8, 0.2], [0, 0, 0.4], [1.6, 0.35, 0.4]), 'stone', {
    solid: true,
  });
  b.bulbLamp(f, [20.5, 9.4, 0], 2.2);
}

export function buildInstituto(b: HogarBuilder): void {
  const f = b.site('instituto');
  plaza(b, f);
  rotunda(b, f);
  tower(b, f);
  hangar(b, f);
  arcades(b, f);
  edges(b, f);
}
