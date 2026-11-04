// El campo y la costa de Hogar (Fase 11G; ✅ Anthony 2026-11-03: hectáreas de siembra donde se vea qué comen y
// pedazos de maquinaria desechada): los huertos del suroeste con sus acequias y su noria, los frutales en terrazas al
// noreste, el embarcadero del pescador en la costa del sur (con la campana hundida para quien bucee) y el desguace de
// las pruebas, junto al Motor. Lo que se cultiva es 🟡: trigo de musgo, bulbos de luz, calabazas de agua y coles.
import { Matrix4, Quaternion, Vector3 } from 'three';
import {
  ball,
  box,
  cone,
  cylinder,
  pieceMatrix,
  torus,
  torusArc,
  type Frame,
  type Triple,
} from './kit';
import { HOGAR_PALETTE as P, type HogarBuilder } from './hogarKit';
import { SEA_LEVEL, SITES } from './hogarShape';

type Crop = 'trigo' | 'bulbos' | 'calabazas' | 'coles';

/** Una parcela de `w` × `l` m con su cultivo en hileras. */
function plot(b: HogarBuilder, f: Frame, center: Triple, w: number, l: number, crop: Crop): void {
  b.pieces.add(
    P.soilDark,
    box(),
    f.at([center[0], center[1], 0.015], undefined, [w, l, 0.03]),
    'stone',
    { solid: false },
  );
  const rows = Math.floor(w / 0.9);
  const per = Math.floor(l / 0.7);
  for (let i = 0; i < rows; i++) {
    const x = center[0] - w / 2 + (i + 0.5) * (w / rows);
    b.pieces.add(
      P.soil,
      box(),
      f.at([x, center[1], 0.05], undefined, [0.45, l - 0.3, 0.08]),
      'stone',
      { solid: false },
    );
    if (crop === 'bulbos') {
      // Espalderas: postes, un alambre y los bulbos colgando, que dan luz.
      for (const y of [center[1] - l / 2 + 0.4, center[1] + l / 2 - 0.4]) {
        b.pieces.add(
          P.woodDark,
          cylinder(0.04, 4),
          f.at([x, y, 0.8], undefined, [1, 1, 1.6]),
          'stone',
          { solid: false },
        );
      }
      b.pieces.add(
        P.wood,
        box(),
        f.at([x, center[1], 1.55], undefined, [0.02, l - 0.8, 0.02]),
        'stone',
        { solid: false },
      );
    }
    for (let j = 0; j < per; j++) {
      const y = center[1] - l / 2 + (j + 0.5) * (l / per);
      const r = b.random();
      switch (crop) {
        case 'trigo':
          b.pieces.add(
            r < 0.5 ? P.grassDry : P.ochre,
            cone(0.16, 0, 4),
            f.at([x, y, 0.4], [r * 0.2, 0, r * 6], [1, 1, 0.7 + r * 0.25]),
            'stone',
            { solid: false },
          );
          b.pieces.add(P.grassDry, ball(0.07, 0), f.at([x, y, 0.8 + r * 0.1]), 'stone', {
            solid: false,
          });
          break;
        case 'bulbos':
          b.pieces.add(P.moss, ball(0.12, 0), f.at([x, y, 1.42]), 'stone', { solid: false });
          if (j % 2 === 0)
            b.pieces.add(P.glow, ball(0.09, 0), f.at([x, y, 1.25]), 'light', {
              glow: 1.2 + r * 0.4,
              vary: 0,
            });
          break;
        case 'calabazas':
          b.pieces.add(
            P.moss,
            ball(0.25, 0),
            f.at([x, y, 0.1], undefined, [1.2, 1.2, 0.4]),
            'stone',
            { solid: false },
          );
          if (r < 0.6)
            b.pieces.add(
              r < 0.3 ? P.teal : P.ochre,
              ball(0.2, 0),
              f.at([x + 0.1, y, 0.18], undefined, [1, 1, 0.8]),
              'stone',
              { solid: false },
            );
          break;
        case 'coles':
          b.pieces.add(
            r < 0.5 ? P.sage : P.grassLight,
            ball(0.2, 0),
            f.at([x, y, 0.18], [r, r, 0], [1, 1, 0.8]),
            'stone',
            { solid: false },
          );
          break;
      }
    }
  }
}

/** Los huertos: nueve parcelas entre acequias, la noria que sube el agua, el silo y el tablón de los turnos. */
function huertos(b: HogarBuilder): void {
  const f = b.site('huertos');
  const crops: Crop[] = [
    'trigo',
    'bulbos',
    'calabazas',
    'coles',
    'trigo',
    'trigo',
    'calabazas',
    'bulbos',
    'coles',
  ];
  const size = 6.4;
  const gap = 1.4;
  crops.forEach((crop, k) => {
    const i = (k % 3) - 1;
    const j = Math.floor(k / 3) - 1;
    plot(b, f, [i * (size + gap), j * (size + gap), 0], size, size, crop);
  });
  // Las acequias entre parcelas: agua quieta de adorno.
  for (const d of [-0.5, 0.5]) {
    const c = d * (size + gap);
    b.stillWater(f, [c, 0, 0.03], 0.55, 3 * size + 2 * gap);
    b.stillWater(f, [0, c, 0.03], 3 * size + 2 * gap, 0.55);
  }
  b.stillWater(f, [-12.6, 0, 0.03], 0.7, 3 * size + 2 * gap);
  // La noria al oeste, sobre la acequia de cabeza (ANIM_: gira sobre su eje, de este a oeste).
  const wheelAt: Triple = [-12.6, 0, 1.8];
  for (const side of [-1, 1]) {
    b.pieces.add(
      P.woodDark,
      box(),
      f.at([-12.6 + side * 0.9, 0, 1.1], undefined, [0.2, 0.2, 2.2]),
      'stone',
      { solid: true },
    );
  }
  const axis = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -Math.PI / 2);
  const wheel = b.spinner('ANIM_Huertos_Noria', f, wheelAt, axis, 0.35);
  wheel.add(P.wood, torus(1.6, 0.08, 20, 4), pieceMatrix(), 'stone', { solid: false });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    wheel.add(
      P.wood,
      box(),
      pieceMatrix([Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8], [0, -a, 0], [1.6, 0.06, 0.06]),
      'stone',
      { solid: false },
    );
    wheel.add(
      P.woodDark,
      box(),
      pieceMatrix([Math.cos(a) * 1.65, 0, Math.sin(a) * 1.65], [0, -a, 0], [0.12, 0.7, 0.4]),
      'stone',
      { solid: false },
    );
  }
  // El silo y el cobertizo.
  b.pieces.add(P.cream, cylinder(1.6, 14), f.at([14, 8, 2.4], undefined, [1, 1, 4.8]), 'stone', {
    solid: true,
  });
  b.pieces.add(P.ochre, ball(1, 1), f.at([14, 8, 4.8], undefined, [1.7, 1.7, 1.1]), 'stone', {
    solid: false,
  });
  for (let k = 0; k < 6; k++) {
    b.pieces.add(
      P.rib,
      torus(1.63, 0.04, 16, 3),
      f.at([14, 8, 0.6 + k * 0.8], [Math.PI / 2, 0, 0]),
      'stone',
      { solid: false },
    );
  }
  b.house(f, [14, -4, 0], { radius: 2.4, height: 2.4, fabrics: [P.sage, P.cream], door: 270 });
  // Cestas de la cosecha y el tablón de los turnos de riego.
  for (let k = 0; k < 4; k++) {
    b.pieces.add(
      P.straw,
      cylinder(0.3, 10),
      f.at([11.4, -0.6 + k * 0.7, 0.2], undefined, [1, 1, 0.4]),
      'stone',
      { solid: false },
    );
    b.pieces.add(
      k % 2 ? P.ochre : P.grassDry,
      ball(0.25, 0),
      f.at([11.4, -0.6 + k * 0.7, 0.38], undefined, [1, 1, 0.5]),
      'stone',
      { solid: false },
    );
  }
  b.sign(f, [11.8, 3.2, 0], 270);
  b.source('hogar.turnos_riego', 'texto', f, [11.8, 3.2, 1.2]);
  b.ool(
    { id: 'campesina', age: 0.45, outfit: 'campesino', holding: 'cesta', seed: 71 },
    f,
    [3.6, -7.2, 0],
    180,
  );
  b.ool({ id: 'campesino', age: 0.62, outfit: 'campesino', seed: 72 }, f, [-7, 3.6, 0], 90);
  b.bulbLamp(f, [11, 6, 0], 2.4);
  b.bulbLamp(f, [-11, -11, 0], 2.4);
}

/** Los frutales en terrazas: arbolitos de musgo cargados de fruta de luz, la prensa y el granero. */
function terrazas(b: HogarBuilder): void {
  const f = b.site('terrazas', 45);
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      if (i === 0 && j === 0) continue;
      b.mossTree(f, [i * 4.2 + (j % 2) * 1, j * 4.2, 0], 0.5, 6);
    }
  }
  b.pieces.add(P.wood, cylinder(0.8, 10), f.at([0, 0, 0.45], undefined, [1, 1, 0.9]), 'stone', {
    solid: true,
  });
  b.pieces.add(P.woodDark, box(), f.at([0, 0, 1.6], undefined, [0.25, 0.25, 1.4]), 'stone', {
    solid: false,
  });
  b.pieces.add(P.woodDark, box(), f.at([0, 0, 2.3], undefined, [1.6, 0.2, 0.2]), 'stone', {
    solid: false,
  });
  b.ool(
    { id: 'recolectora', age: 0.25, outfit: 'campesino', holding: 'cesta', seed: 73 },
    f,
    [2.2, -1.6, 0],
    220,
  );
  b.house(f, [11, 6, 0], { radius: 2.6, height: 3, fabrics: [P.ochre, P.rust], door: 230 });
}

/** El embarcadero: un muelle de tablas sobre el agua, barcas redondas, redes y un farol al final. */
function embarcadero(b: HogarBuilder): void {
  const f = b.site('embarcadero', 180);
  const ground = f.point([0, 0, 0]).length();
  const deck = SEA_LEVEL + 0.75 - ground; // altura de las tablas sobre el suelo de la orilla
  // La rampa de bajada desde la orilla y el muelle recto mar adentro (+Y, hacia el sur).
  b.pieces.add(P.wood, box(), rampFrame(f, [0, -1.5, -0.05], [0, 2.5, deck], 2.2), 'stone', {
    solid: true,
  });
  b.pieces.add(P.wood, box(), f.at([0, 9, deck - 0.08], undefined, [2.2, 13.4, 0.16]), 'stone', {
    solid: true,
  });
  for (let k = 0; k < 7; k++) {
    for (const side of [-1, 1]) {
      const y = 3 + k * 2;
      b.pieces.add(
        P.woodDark,
        cylinder(0.12, 6),
        f.at([side * 1.15, y, deck - 4], undefined, [1, 1, 8.2]),
        'stone',
        { solid: true },
      );
    }
    b.pieces.add(
      P.woodDark,
      box(),
      f.at([0, 3 + k * 2, deck + 0.01], undefined, [2.2, 0.08, 0.02]),
      'stone',
      { solid: false },
    );
  }
  // Barcas redondas amarradas.
  for (const [x, y, c] of [
    [-2.4, 7, P.ochre],
    [2.5, 10.5, P.teal],
    [-2.6, 13.4, P.rust],
  ] as const) {
    b.pieces.add(c, ball(1, 1), f.at([x, y, deck - 0.75], undefined, [0.95, 1.3, 0.45]), 'stone', {
      solid: false,
    });
    b.pieces.add(
      P.wood,
      torus(0.92, 0.06, 16, 3),
      f.at([x, y, deck - 0.55], [Math.PI / 2, 0, 0], [1, 1.36, 1]),
      'stone',
      { solid: false },
    );
  }
  b.pieces.add(
    P.woodDark,
    cylinder(0.06, 5),
    f.at([0.9, 15.4, deck + 1], undefined, [1, 1, 2]),
    'stone',
    { solid: false },
  );
  b.pieces.add(P.glowWarm, ball(0.16, 1), f.at([0.9, 15.4, deck + 2.1]), 'light', {
    glow: 1.7,
    vary: 0,
  });
  b.ool(
    { id: 'pescador', age: 0.9, outfit: 'pescador', holding: 'cana', seed: 81 },
    f,
    [0, 15, deck],
    0,
  );
  b.source('aldea.pescador', 'charla', f, [0, 15, deck + 1.2]);
  // En la orilla: redes tendidas, un secadero y una caseta.
  for (let k = 0; k < 3; k++) {
    b.pieces.add(
      P.woodDark,
      cylinder(0.05, 4),
      f.at([-4 + k * 1.6, -3, 0.9], undefined, [1, 1, 1.8]),
      'stone',
      { solid: false },
    );
  }
  b.pieces.add(P.sand, box(), f.at([-2.4, -3, 1.2], undefined, [3.2, 0.02, 1.2]), 'stone', {
    solid: false,
  });
  b.house(f, [5, -5, 0], { radius: 2, height: 2.4, fabrics: [P.sky, P.cream], door: 180 });
  b.bulbLamp(f, [-1.6, -0.5, 0], 2.4, true);
  campana(b);
}

/** Una rampa (caja inclinada) entre dos puntos del marco. */
function rampFrame(f: Frame, from: Triple, to: Triple, width: number): Matrix4 {
  const a = new Vector3(...from);
  const d = new Vector3(...to).sub(a);
  const pitch = Math.atan2(d.z, Math.hypot(d.x, d.y));
  const yaw = Math.atan2(-d.x, d.y);
  const mid = a.addScaledVector(d, 0.5);
  return f
    .at([mid.x, mid.y, mid.z], [pitch, 0, yaw])
    .multiply(pieceMatrix([0, 0, -0.08], undefined, [width, d.length() + 0.4, 0.16]));
}

/** La campana del faro viejo, en el fondo, a unos metros del muelle: solo la encuentra quien bucea. */
function campana(b: HogarBuilder): void {
  const s = SITES.embarcadero;
  const f = b.at(s.lat - 11, s.lon - 3.2, 30, 2);
  b.pieces.add(
    P.brassDark,
    cone(0.9, 0.45, 12),
    f.at([0, 0, 0.7], [0.5, 0.2, 0], [1, 1, 1.2]),
    'metal',
    { solid: true },
  );
  b.pieces.add(
    P.brassDark,
    torus(0.9, 0.08, 16, 4),
    f.at([0, -0.3, 0.2], [Math.PI / 2 + 0.5, 0, 0]),
    'metal',
    { solid: false },
  );
  b.pieces.add(P.rockDark, box(), f.at([1.4, 0.3, 0.3], [0, 0.3, 0.6], [1.6, 0.4, 0.6]), 'stone', {
    solid: true,
  });
  b.pieces.add(P.moss, ball(0.3, 0), f.at([0.2, 0.3, 1.25]), 'stone', { solid: false });
  b.source('hogar.campana', 'objeto', f, [0, 0, 1]);
}

/** El desguace: aros rotos y oxidados, tambores de generador volcados, engranajes y el soporte que se fundió. */
function chatarra(b: HogarBuilder): void {
  const f = b.site('chatarra', 200);
  const rusty = [P.ironRust, P.iron, P.brassDark] as const;
  // Trozos de aros de pruebas viejas, medio hundidos.
  for (const [x, y, r, from, to, tilt] of [
    [-4, 2, 2.4, 0.3, 2.6, 0.4],
    [3, 4, 1.6, 0.0, 3.5, -0.3],
    [5, -3, 3.2, 1.2, 2.8, 0.9],
    [-2, -5, 1.1, 0, 5.5, 0.2],
  ] as const) {
    b.pieces.add(
      rusty[Math.floor(b.random() * 3)] ?? P.ironRust,
      torusArc(r, 0.18, from, to, 16, 5),
      f.at([x, y, r * 0.55], [tilt, 0, b.random() * 3]),
      'metal',
      { solid: true },
    );
  }
  // Tambores de generador, tumbados y comidos por el musgo.
  for (const [x, y, yaw] of [
    [0, -1, 0.4],
    [-6, -2, 1.9],
  ] as const) {
    b.pieces.add(
      P.ironRust,
      cylinder(1.1, 12),
      f.at([x, y, 0.9], [Math.PI / 2, 0, yaw], [1, 1, 2.8]),
      'metal',
      { solid: true },
    );
    b.pieces.add(
      P.mossDark,
      ball(0.6, 0),
      f.at([x + 0.3, y, 1.8], undefined, [1.4, 1, 0.5]),
      'stone',
      { solid: false },
    );
    b.pieces.add(P.brassDark, torus(1.15, 0.08, 16, 4), f.at([x, y, 0.9], [0, 0, yaw]), 'metal', {
      solid: false,
    });
  }
  // Engranajes sueltos.
  for (let k = 0; k < 5; k++) {
    const x = -7 + k * 3.2;
    const y = 6 + (b.random() - 0.5) * 3;
    const r = 0.5 + b.random() * 0.6;
    const g = f.at([x, y, 0.12], [b.random() * 0.3, b.random() * 0.3, 0]);
    b.pieces.add(
      P.iron,
      cylinder(r, 12),
      g.clone().multiply(pieceMatrix(undefined, undefined, [1, 1, 0.2])),
      'metal',
      { solid: false },
    );
    for (let t = 0; t < 10; t++) {
      const a = (t / 10) * Math.PI * 2;
      b.pieces.add(
        P.iron,
        box(),
        g
          .clone()
          .multiply(
            pieceMatrix(
              [Math.cos(a) * (r + 0.08), Math.sin(a) * (r + 0.08), 0],
              [0, 0, a],
              [0.16, 0.12, 0.2],
            ),
          ),
        'metal',
        { solid: false },
      );
    }
  }
  // El soporte que se fundió en la prueba menor 1: retorcido, con su etiqueta.
  b.pieces.add(P.iron, box(), f.at([2.2, 0.8, 0.5], [0.3, 0.6, 0.2], [0.25, 0.25, 1.2]), 'metal', {
    solid: false,
  });
  b.pieces.add(
    P.ironRust,
    ball(0.4, 0),
    f.at([2.4, 1, 1.1], [0.4, 0.2, 0.1], [1.2, 0.7, 0.5]),
    'metal',
    { solid: false },
  );
  b.pieces.add(P.cream, box(), f.at([2.5, 0.4, 0.75], [0, 0.4, 0.3], [0.2, 0.02, 0.14]), 'stone', {
    solid: false,
  });
  b.source('hogar.chatarra', 'texto', f, [2.5, 0.4, 0.9]);
  // Una grúa vieja, caída, y cajas.
  b.pieces.add(P.ironRust, box(), f.at([-8, 4, 0.3], [0, 0.1, 0.5], [7, 0.3, 0.3]), 'metal', {
    solid: true,
  });
  for (const [x, y, s] of [
    [6, 5, 0.8],
    [7, 6, 0.6],
    [-9, -5, 0.9],
  ] as const) {
    b.pieces.add(P.wood, box(), f.at([x, y, s / 2], [0, 0.1, s], [s, s, s]), 'stone', {
      solid: true,
    });
  }
  for (let k = 0; k < 10; k++) {
    const a = b.random() * Math.PI * 2;
    const r = 3 + b.random() * 7;
    b.pieces.add(
      b.random() < 0.5 ? P.grassLight : P.moss,
      cone(0.25, 0, 4),
      f.at([Math.cos(a) * r, Math.sin(a) * r, 0.2], undefined, [1, 1, 0.5]),
      'stone',
      { solid: false },
    );
  }
}

export function buildFields(b: HogarBuilder): void {
  huertos(b);
  terrazas(b);
  embarcadero(b);
  chatarra(b);
}
