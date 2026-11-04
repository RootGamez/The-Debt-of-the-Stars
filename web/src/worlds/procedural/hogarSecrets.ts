// Lo que Hogar guarda para los curiosos (Fase 11G; ✅ Anthony 2026-11-03: "que premie a la persona por su
// curiosidad"): en la cara de noche, lejos de casa, los restos del primer Albatros, el sitio donde cayó la primera
// piedra, la cabaña de la astrónoma que vive sola y un prado de luces. Una hilera de boyas con farol sale de la costa
// del oeste hacia allí, para quien quiera seguirla. Todo da notas de ambiente (sin peso en el grafo de pistas). 🟡.
import { Vector3 } from 'three';
import { ball, box, cone, cylinder, direction, latLon, torus, torusArc, type Triple } from './kit';
import { HOGAR_PALETTE as P, type HogarBuilder } from './hogarKit';
import { hogarGround, SEA_LEVEL, SITES } from './hogarShape';

/** Los restos del Albatros I: el casco partido y medio enterrado, la burbuja rota y el mástil sin luz. */
function albatros(b: HogarBuilder): void {
  const f = b.site('albatros', 70);
  const hull = '#d9c9a2';
  b.pieces.add(hull, ball(1, 2), f.at([0, 0, 0.6], [0.25, 0.35, 0.2], [2.2, 3.4, 1.5]), 'stone', {
    solid: true,
  });
  b.pieces.add(
    P.ochre,
    torus(2.15, 0.12, 24, 4),
    f.at([0, 0, 0.75], [Math.PI / 2 + 0.25, 0.35, 0.2], [1, 1.55, 1]),
    'stone',
    { solid: false },
  );
  b.pieces.add(hull, ball(1, 1), f.at([2.4, -3.6, 0.3], [0.8, 0.4, 0], [1, 1.4, 0.7]), 'stone', {
    solid: true,
  });
  // La burbuja delantera, rota: solo el aro y unos trozos de vidrio.
  b.pieces.add(P.brassDark, torus(0.9, 0.08, 18, 4), f.at([0.2, 3.1, 1.3], [0.6, 0, 0]), 'metal', {
    solid: false,
  });
  for (const [x, y, z] of [
    [0.6, 3.6, 0.3],
    [-0.4, 4.1, 0.1],
    [0.9, 4.6, 0.05],
  ] as const) {
    b.glass.push(
      box()
        .clone()
        .applyMatrix4(f.at([x, y, z], [0.3, 0.5, x], [0.4, 0.3, 0.03])),
    );
  }
  b.pieces.add(
    P.woodDark,
    cylinder(0.08, 6),
    f.at([-1, -0.8, 2.6], [0.5, 0.2, 0], [1, 1, 3.4]),
    'stone',
    { solid: false },
  );
  b.pieces.add(P.iron, ball(0.2, 1), f.at([-1.9, -1.6, 4]), 'metal', { solid: false });
  // Musgo y hongos de luz, que es lo único que alumbra aquí.
  for (let k = 0; k < 14; k++) {
    const a = b.random() * Math.PI * 2;
    const r = 2 + b.random() * 4;
    const p: Triple = [Math.cos(a) * r, Math.sin(a) * r, 0];
    b.pieces.add(
      P.mossDark,
      ball(0.3 + b.random() * 0.3, 0),
      f.at([p[0], p[1], 0.1], undefined, [1, 1, 0.5]),
      'stone',
      { solid: false },
    );
    if (k % 2 === 0)
      b.pieces.add(
        P.glow,
        cone(0.12, 0, 5),
        f.at([p[0] + 0.3, p[1], 0.18], undefined, [1, 1, 0.5]),
        'light',
        { glow: 1.6, vary: 0 },
      );
  }
  // El cuaderno de a bordo, en una caja junto a una hoguera vieja.
  b.pieces.add(
    P.rockDark,
    torus(0.5, 0.12, 10, 4),
    f.at([-3.2, 2.2, 0.08], [Math.PI / 2, 0, 0]),
    'stone',
    { solid: false },
  );
  b.pieces.add(P.wood, box(), f.at([-2.2, 3.2, 0.25], [0, 0, 0.4], [0.6, 0.45, 0.5]), 'stone', {
    solid: false,
  });
  b.pieces.add(
    P.woodDark,
    box(),
    f.at([-2.2, 3.2, 0.53], [0, 0, 0.6], [0.25, 0.32, 0.05]),
    'stone',
    { solid: false },
  );
  b.pieces.add(P.glowWarm, ball(0.1, 1), f.at([-2.6, 2.7, 0.15]), 'light', { glow: 1.4, vary: 0 });
  b.source('hogar.bitacora_albatros', 'texto', f, [-2.2, 3.2, 0.6]);
}

/** Donde cayó la primera piedra: un corro de piedras de musgo alrededor de un hoyo de borde liso, y su placa. */
function primeraPiedra(b: HogarBuilder): void {
  const f = b.site('primera_piedra');
  // El hoyo: un cuenco de borde curvo perfecto, como el de los fragmentos (lo que se llevaron al Instituto).
  b.pieces.add(
    P.sandstone,
    torus(1.6, 0.16, 32, 5),
    f.at([0, 0, 0.04], [Math.PI / 2, 0, 0], [1, 1, 0.4]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.rockDark,
    cylinder(1.5, 24),
    f.at([0, 0, 0.012], undefined, [1, 1, 0.02]),
    'stone',
    { solid: false },
  );
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const h = 1.2 + b.random() * 0.8;
    b.pieces.add(
      P.rock,
      box(),
      f.at(
        [Math.sin(a) * 5, Math.cos(a) * 5, h / 2],
        [0, 0, -a + b.random() * 0.2],
        [0.7, 0.45, h],
      ),
      'stone',
      { solid: true },
    );
    b.pieces.add(
      P.moss,
      ball(0.35, 0),
      f.at([Math.sin(a) * 5, Math.cos(a) * 5, h + 0.05], undefined, [1, 0.7, 0.5]),
      'stone',
      { solid: false },
    );
    b.pieces.add(
      P.glow,
      ball(0.07, 1),
      f.at([Math.sin(a) * 4.5, Math.cos(a) * 4.5, 0.1]),
      'light',
      { glow: 1.5, vary: 0 },
    );
  }
  b.pieces.add(P.slate, box(), f.at([0, -3, 0.45], [-0.3, 0, 0], [1, 0.12, 0.7]), 'stone', {
    solid: false,
  });
  b.pieces.add(P.slate, box(), f.at([0, -3.1, 0.15], undefined, [0.9, 0.3, 0.3]), 'stone', {
    solid: true,
  });
  b.source('hogar.placa_primera_piedra', 'objeto', f, [0, -3, 0.7]);
}

/** La cabaña de la astrónoma: una casita en un alto, un telescopio largo, cartas del cielo y ella. */
function astronoma(b: HogarBuilder): void {
  const f = b.site('astronoma', 200);
  b.house(f, [0, 3, 0], { radius: 2.4, height: 2.6, fabrics: [P.plum, P.cream], door: 180 });
  // El telescopio, sobre un trípode, mirando arriba.
  const t: Triple = [2.8, -1.2, 0];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    b.pieces.add(
      P.woodDark,
      cylinder(0.04, 4),
      f.at(
        [t[0] + Math.cos(a) * 0.35, t[1] + Math.sin(a) * 0.35, 0.65],
        [Math.sin(a) * 0.25, -Math.cos(a) * 0.25, 0],
        [1, 1, 1.35],
      ),
      'stone',
      { solid: false },
    );
  }
  b.pieces.add(
    P.brass,
    cylinder(0.14, 10),
    f.at([t[0], t[1] + 0.3, 1.9], [-0.7, 0, 0], [1, 1, 2.4]),
    'metal',
    { solid: false },
  );
  b.pieces.add(
    P.brassDark,
    torus(0.16, 0.03, 10, 3),
    f.at([t[0], t[1] + 1.1, 2.75], [0.85, 0, 0]),
    'metal',
    { solid: false },
  );
  // Una mesa con cartas del cielo y una vela.
  b.pieces.add(P.wood, box(), f.at([-2.2, -1, 0.75], undefined, [1.2, 0.8, 0.06]), 'stone', {
    solid: false,
  });
  b.pieces.add(P.woodDark, box(), f.at([-2.2, -1, 0.36], undefined, [1, 0.6, 0.72]), 'stone', {
    solid: true,
  });
  b.pieces.add(P.slate, box(), f.at([-2.3, -1, 0.79], [0, 0, 0.2], [0.6, 0.5, 0.01]), 'stone', {
    solid: false,
  });
  for (let k = 0; k < 7; k++) {
    b.pieces.add(
      P.glowWarm,
      ball(0.012, 0),
      f.at([-2.5 + b.random() * 0.4, -1.2 + b.random() * 0.4, 0.8]),
      'light',
      { glow: 1.5, vary: 0 },
    );
  }
  b.pieces.add(P.glowWarm, ball(0.06, 1), f.at([-1.75, -0.75, 0.95]), 'light', {
    glow: 1.8,
    vary: 0,
  });
  b.source('hogar.cartas_cielo', 'texto', f, [-2.2, -1, 0.85]);
  // Ella: muy mayor, casi sin luz, con un abrigo de dibujos como el de la Maestra.
  b.ool({ id: 'astronoma', age: 1, outfit: 'maestra', seed: 91 }, f, [0.8, -1.8, 0], 160);
  b.source('hogar.astronoma', 'charla', f, [0.8, -1.8, 1.1]);
  b.bulbLamp(f, [-1.4, 0.4, 0], 2, true);
}

/** El prado de las luces: plantas que brillan solas, un banco y una frase grabada en él. */
function pradoLuces(b: HogarBuilder): void {
  const f = b.site('prado_luces');
  for (let k = 0; k < 90; k++) {
    const a = b.random() * Math.PI * 2;
    const r = Math.sqrt(b.random()) * 13;
    const h = 0.3 + b.random() * 0.6;
    const p: Triple = [Math.cos(a) * r, Math.sin(a) * r, 0];
    b.pieces.add(
      P.mossDark,
      cylinder(0.025, 3),
      f.at([p[0], p[1], h / 2], undefined, [1, 1, h]),
      'stone',
      { solid: false },
    );
    b.pieces.add(
      k % 3 === 0 ? P.glowWarm : P.glow,
      ball(0.06 + b.random() * 0.05, 0),
      f.at([p[0], p[1], h]),
      'light',
      { glow: 1.3 + b.random() * 0.6, vary: 0 },
    );
  }
  b.pieces.add(P.wood, box(), f.at([0, 0, 0.42], undefined, [1.8, 0.45, 0.08]), 'stone', {
    solid: false,
  });
  b.pieces.add(P.woodDark, box(), f.at([0, 0, 0.2], undefined, [1.6, 0.35, 0.4]), 'stone', {
    solid: true,
  });
  b.pieces.add(P.wood, box(), f.at([0, -0.25, 0.75], [-0.2, 0, 0], [1.8, 0.06, 0.5]), 'stone', {
    solid: false,
  });
  b.source('hogar.banco_prado', 'objeto', f, [0, 0, 0.7]);
}

/**
 * Las boyas con farol: de la costa del oeste del continente de casa hacia los restos del Albatros, una cada tantos
 * metros, sobre el agua. Se ven de noche desde lejos.
 */
function buoys(b: HogarBuilder): void {
  const start = direction(10, -12);
  const end = direction(SITES.albatros.lat, SITES.albatros.lon);
  const steps = 18;
  for (let k = 1; k < steps; k++) {
    const d = new Vector3()
      .copy(start)
      .lerp(end, k / steps)
      .normalize();
    if (hogarGround(d) > SEA_LEVEL - 0.5) continue; // sobre tierra, no
    const { lat, lon } = latLon(d);
    const f = b.at(lat, lon);
    const lift = SEA_LEVEL - f.point([0, 0, 0]).length();
    b.pieces.add(P.rust, ball(0.45, 1), f.at([0, 0, lift], undefined, [1, 1, 0.7]), 'stone', {
      solid: false,
    });
    b.pieces.add(
      P.woodDark,
      cylinder(0.05, 4),
      f.at([0, 0, lift + 0.8], undefined, [1, 1, 1.4]),
      'stone',
      { solid: false },
    );
    b.pieces.add(P.glowWarm, ball(0.14, 1), f.at([0, 0, lift + 1.55]), 'light', {
      glow: 1.9,
      vary: 0,
    });
    b.pieces.add(
      P.woodDark,
      torusArc(0.2, 0.025, 0, Math.PI, 8, 3),
      f.at([0, 0, lift + 1.6]),
      'stone',
      { solid: false },
    );
  }
}

export function buildSecrets(b: HogarBuilder): void {
  albatros(b);
  primeraPiedra(b);
  astronoma(b);
  pradoLuces(b);
  buoys(b);
}
