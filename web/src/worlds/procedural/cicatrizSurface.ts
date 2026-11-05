// La superficie de Cicatriz y lo que hay bajo ella (Fase 11H): las fuentes de siempre recolocadas (el Puesto del
// Escéptico, la Primera Puerta, el Borde y la pared del símbolo, ahora en las Galerías Cortadas) y lo nuevo: la Cripta
// de la Garganta bajo la Primera Puerta, las salas que la Gran Mordida partió por la mitad, el Pozo de Bajada que
// atraviesa la cáscara, las torres de amarre, el campamento del turno, la vía de vagonetas que acaba en el vacío y
// las bocas de túneles cortados en los cuencos.
import { Vector3 } from 'three';
import {
  angleBetween,
  ball,
  box,
  cone,
  cylinder,
  direction,
  Frame,
  pieceMatrix,
  rampMatrix,
  torus,
  torusArc,
} from './kit';
import {
  biteAxis,
  GREAT_BITE,
  INNER_RADIUS,
  OUTER_RADIUS,
  OUTER_SITES,
  outerGround,
  outerGroundRadius,
  rimAngle,
  RAIL_HEIGHT,
} from './cicatrizShape';
import {
  beam,
  frameLooking,
  insideFrame,
  outsideFrame,
  PALETTE,
  type CicatrizBuilder,
} from './cicatrizKit';
import { brazier, gate } from './cicatrizCore';

const DEG = Math.PI / 180;

/** Un punto de la superficie a `angle` grados del eje de la Gran Mordida, hacia el rumbo `bearing` (0 = norte). */
function aroundGreatBite(angle: number, bearing: number): Vector3 {
  const axis = biteAxis(GREAT_BITE);
  const north = new Vector3(0, 0, 1).addScaledVector(axis, -axis.z).normalize();
  const east = north.clone().cross(axis).normalize();
  const across = north
    .multiplyScalar(Math.cos(bearing * DEG))
    .addScaledVector(east, Math.sin(bearing * DEG));
  return axis.multiplyScalar(Math.cos(angle * DEG)).addScaledVector(across, Math.sin(angle * DEG));
}

function latLonOf(d: Vector3): [number, number] {
  return [Math.asin(Math.max(-1, Math.min(1, d.z))) / DEG, Math.atan2(d.y, d.x) / DEG];
}

/** El Puesto del Escéptico: la caseta sola en un alto, con su grabadora sobre la mesa (como en Blender). */
function puesto(builder: CicatrizBuilder): void {
  const { lat, lon } = OUTER_SITES.puesto;
  const f = outsideFrame(lat, lon, { heading: 200, footprint: 2.5, sink: 0.2 });
  const v = builder.outside;
  const high = 2.4;
  v.add(PALETTE.sandDark, cylinder(3.2, 16), f.at([0, 0, -0.3], [0, 0, 0], [1, 1, 0.8]));
  for (let k = 0; k < 7; k++) {
    const a = (-90 + k * 30) * DEG;
    v.add(
      PALETTE.ash,
      box(),
      f.at([Math.sin(a) * 2, Math.cos(a) * 2, high / 2], [0, 0, -a], [1.1, 0.2, high]),
    );
  }
  v.add(
    PALETTE.rust,
    cone(2.5, 0.2, 10),
    f.at([0, 0, high + 0.4], [0, 0, 0], [1, 1, 0.8]),
    'metal',
  );
  v.add(PALETTE.black, box(), f.at([0, 0.8, 0.75], [0, 0, 0], [1.2, 0.6, 0.08]), 'metal');
  for (const x of [-0.5, 0.5])
    v.add(PALETTE.black, box(), f.at([x, 0.8, 0.37], [0, 0, 0], [0.06, 0.5, 0.75]), 'metal');
  v.add(PALETTE.ashLight, box(), f.at([0, 0.8, 0.92], [0, 0, 0], [0.5, 0.35, 0.25]), 'metal', {
    solid: false,
  });
  for (const x of [-0.12, 0.12]) {
    v.add(
      PALETTE.black,
      cylinder(0.09, 10),
      f.at([x, 0.65, 1.05], [Math.PI / 2, 0, 0], [1, 1, 0.04]),
      'metal',
      { solid: false },
    );
  }
  v.add(PALETTE.lamp, box(), f.at([0.2, 0.62, 0.87], [0, 0, 0], [0.05, 0.02, 0.05]), 'light', {
    glow: 1.6,
  });
  // Lo que dejó: una silla tumbada, tazas, un mapa del cielo clavado en la pared con chinchetas.
  v.add(PALETTE.rust, box(), f.at([0.9, 0.1, 0.25], [1.2, 0, 0.4], [0.5, 0.5, 0.06]), 'metal', {
    solid: false,
  });
  v.add(PALETTE.paper, box(), f.at([0, 1.9, 1.5], [0, 0, 0], [1.2, 0.03, 0.8]), 'stone', {
    solid: false,
  });
  for (let k = 0; k < 7; k++) {
    v.add(
      PALETTE.lamp,
      ball(0.03, 0),
      f.at([-0.45 + k * 0.15, 1.87, 1.3 + (k % 3) * 0.15]),
      'light',
      { glow: 1.4 },
    );
  }
  brazier(builder, f, 2.8, -1.0, false);
  builder.mark('INT_grabacion_esceptico', f, [0, 0, 1.2], {
    clue_id: 'cicatriz.grabacion_esceptico',
    kind: 'grabacion',
  });
  // Una antena de anillos: desde aquí escuchaba el reloj del sitio lento.
  v.add(PALETTE.slate, cylinder(0.12, 6), f.at([-2.6, 2.2, 3], [0, 0, 0], [1, 1, 6]), 'metal');
  for (let k = 0; k < 3; k++) {
    v.add(
      PALETTE.sandDark,
      torus(0.8 - k * 0.2, 0.05, 16, 3),
      f.at([-2.6, 2.2, 4.4 + k * 0.6], [0, 0, k * 0.6]),
      'metal',
      { solid: false },
    );
  }
  v.add(PALETTE.violet, ball(0.12, 1), f.at([-2.6, 2.2, 6.1]), 'light', { glow: 1.8 });
}

/** La Primera Puerta (en ruinas) y, bajo ella, la Cripta de la Garganta. */
function primeraPuerta(builder: CicatrizBuilder): void {
  const { lat, lon } = OUTER_SITES.primera;
  const f = outsideFrame(lat, lon, { heading: 90, footprint: 7, ground: 'mean' });
  const v = builder.outside;
  const top = 0.2;
  v.add(PALETTE.ash, cylinder(7.5, 16), f.at([0, 0, top - 1.0], [0, 0, 0], [1, 1, 2.0]));
  for (let k = 0; k < 3; k++) {
    v.add(
      PALETTE.sandDark,
      torus(7.6 - k * 2.2, 0.08, 40, 3),
      f.at([0, 0, top + 0.02], [Math.PI / 2, 0, 0]),
      'stone',
      { solid: false },
    );
  }
  const center = top + 5.4;
  const missing = new Set([3, 4, 5, 9, 10, 13]);
  for (let k = 0; k < 16; k++) {
    if (missing.has(k)) continue;
    const a = (2 * Math.PI * k) / 16 + 0.1;
    v.add(
      k % 3 ? PALETTE.rustLight : PALETTE.sand,
      box(),
      f.at(
        [Math.cos(a) * 5.0, 0, center + Math.sin(a) * 5.0],
        [0, Math.PI / 2 - a, 0],
        [0.9, 0.9, 2.1],
      ),
    );
  }
  for (const [x, y, turn] of [
    [-3.5, 3.0, 0.6],
    [2.5, 4.2, -0.4],
    [4.5, -2.0, 1.2],
  ] as const) {
    v.add(PALETTE.rustLight, box(), f.at([x, y, top + 0.45], [0.3, 0.2, turn], [0.9, 0.9, 2.0]));
  }
  // La garganta que se cerró mal: un hueco negro que no refleja nada.
  v.add(PALETTE.black, ball(0.8, 2), f.at([0, 0, center]), 'metal', { glow: 0.2, solid: false });
  builder.mark('INT_primera_puerta', f, [0, -6.8, top + 1.6], {
    clue_id: 'cicatriz.primera_puerta',
    kind: 'observacion',
  });
  crypt(builder, f, top);
}

/**
 * La Cripta de la Garganta: una zanja con escalones baja desde la explanada a una bóveda bajo la roca. Dentro, el
 * sello de la primera garganta (un tapón de anillos en el suelo), estelas con marcas de reloj y la inscripción.
 */
function crypt(builder: CicatrizBuilder, f: Frame, top: number): void {
  const v = builder.outside;
  // Honda de verdad: a 25 m de la explanada la esfera ya ha caído 4 m, y la bóveda tiene que quedar bajo la roca.
  const depth = 12;
  const start = 3;
  const end = 17;
  const width = 3;
  // El hueco en la roca a lo largo de la zanja (la bóveda queda bajo tierra, con su techo).
  builder.carve(
    f.at(
      [0, (start + end) / 2, -depth / 2 + 1.5],
      [0, 0, 0],
      [width + 0.6, end - start + 0.4, depth + 4],
    ),
  );
  // Escalones de piedra.
  const steps = 24;
  for (let k = 0; k < steps; k++) {
    const y = start + ((end - start) * (k + 0.5)) / steps;
    const z = top - (depth * (k + 1)) / steps;
    v.add(
      k % 2 ? PALETTE.sand : PALETTE.sandDark,
      box(),
      f.at([0, y, z - 0.4], [0, 0, 0], [width, (end - start) / steps + 0.02, 0.8]),
      'stone',
      { solid: false },
    );
  }
  // Se pisa una rampa invisible bajo los escalones (el personaje no sube peldaños sueltos).
  v.addCollider(
    box()
      .clone()
      .applyMatrix4(
        f.base.clone().multiply(rampMatrix([0, start - 0.5, top], [0, end, top - depth], width)),
      ),
  );
  // Las paredes de la zanja, en estratos, y un dintel de anillo en la entrada.
  // Por tramos: cada uno llega de su peldaño al suelo de encima (la esfera cae al alejarse de la explanada).
  const segments = 7;
  for (const side of [-1, 1]) {
    const x = side * (width / 2 + 0.3);
    for (let k = 0; k < segments; k++) {
      const y = start + ((end - start) * (k + 0.5)) / segments;
      const above = f.point([x, y, 0]);
      const ground = outerGroundRadius(above.clone().normalize()) - above.length() - 0.15;
      const bottom = top - (depth * (y - start)) / (end - start) - 1.2;
      const length = (end - start) / segments + 0.02;
      v.add(
        k % 2 ? PALETTE.rust : PALETTE.ash,
        box(),
        f.at([x, y, (ground + bottom) / 2], [0, 0, 0], [0.6, length, ground - bottom]),
      );
      v.add(
        PALETTE.ember,
        box(),
        f.at([x - side * 0.31, y, bottom + 1.6], [0, 0, 0], [0.04, length, 0.05]),
        'light',
        { glow: 0.8 },
      );
    }
  }
  v.add(PALETTE.slate, torusArc(2.2, 0.25, 0, Math.PI, 16, 5), f.at([0, start, top]), 'metal', {
    solid: false,
  });
  v.add(
    PALETTE.lamp,
    torusArc(2.45, 0.05, 0.1, Math.PI - 0.1, 16, 3),
    f.at([0, start - 0.1, top]),
    'light',
    { glow: 1.6 },
  );
  // La bóveda.
  const floor = top - depth;
  const room: [number, number] = [end, end + 10];
  const middle = (room[0] + room[1]) / 2;
  v.add(PALETTE.ash, box(), f.at([0, middle, floor - 0.4], [0, 0, 0], [12, 11, 0.8]));
  v.add(PALETTE.black, box(), f.at([0, middle, floor + 5.4], [0, 0, 0], [12.4, 11.4, 0.8]));
  for (const side of [-1, 1]) {
    v.add(PALETTE.rust, box(), f.at([side * 6, middle, floor + 2.5], [0, 0, 0], [0.8, 11, 5.4]));
  }
  v.add(PALETTE.rust, box(), f.at([0, room[1], floor + 2.5], [0, 0, 0], [12, 0.8, 5.4]));
  for (const side of [-1, 1]) {
    v.add(
      PALETTE.rust,
      box(),
      f.at([side * 3.75, room[0], floor + 2.5], [0, 0, 0], [4.5, 0.8, 5.4]),
    );
  }
  v.add(PALETTE.rust, box(), f.at([0, room[0], floor + 4.3], [0, 0, 0], [3, 0.8, 1.8]));
  // Arcos de bóveda (anillos partidos) y estratos encendidos en las paredes.
  for (let k = 0; k < 4; k++) {
    v.add(
      PALETTE.sandDark,
      torusArc(5.6, 0.3, 0, Math.PI, 20, 5),
      f.at([0, room[0] + 1.5 + k * 2.6, floor + 0.2]),
      'stone',
      { solid: false },
    );
  }
  for (const side of [-1, 1]) {
    v.add(
      PALETTE.ember,
      box(),
      f.at([side * 5.55, middle, floor + 3.2], [0, 0, 0], [0.05, 10, 0.06]),
      'light',
      { glow: 1.3 },
    );
  }
  // El sello: un tapón de anillos concéntricos, con abrazaderas, sobre una garganta que ya no se ve.
  for (let k = 0; k < 4; k++) {
    v.add(
      k % 2 ? PALETTE.slate : PALETTE.slateLight,
      cylinder(3.2 - k * 0.7, 24),
      f.at([0, middle, floor + 0.1 + k * 0.12], [0, 0, 0], [1, 1, 0.12]),
      'metal',
      { solid: false },
    ); // se pisa por encima: un canto de 16 cm ya frena al personaje
  }
  v.add(
    PALETTE.black,
    cylinder(0.5, 16),
    f.at([0, middle, floor + 0.62], [0, 0, 0], [1, 1, 0.04]),
    'metal',
    { solid: false },
  );
  for (let k = 0; k < 8; k++) {
    const a = (2 * Math.PI * k) / 8;
    v.add(
      PALETTE.rust,
      box(),
      f.at(
        [Math.cos(a) * 3.3, middle + Math.sin(a) * 3.3, floor + 0.35],
        [0, 0, a],
        [0.9, 0.35, 0.5],
      ),
      'metal',
      { solid: false },
    );
  }
  v.add(
    PALETTE.violet,
    torus(1.0, 0.04, 28, 3),
    f.at([0, middle, floor + 0.68], [Math.PI / 2, 0, 0]),
    'light',
    { glow: 1.2 },
  );
  // Estelas alrededor del sello y la inscripción al fondo.
  for (let k = 0; k < 6; k++) {
    // Cada 60° desde el este: ninguna cae en el paso de la puerta (al sur del sello).
    const a = (2 * Math.PI * k) / 6;
    v.add(
      PALETTE.sand,
      box(),
      f.at(
        [Math.cos(a) * 4.6, middle + Math.sin(a) * 4.2, floor + 1.1],
        [0, 0, a + Math.PI / 2],
        [0.9, 0.3, 2.2],
      ),
    );
    v.add(
      PALETTE.lamp,
      ball(0.1, 1),
      f.at([Math.cos(a) * 4.6, middle + Math.sin(a) * 4.2, floor + 2.35]),
      'light',
      { glow: 1.6 },
    );
  }
  const back = room[1] - 0.6;
  v.add(PALETTE.bone, box(), f.at([0, back, floor + 2.1], [0, 0, 0], [3.6, 0.15, 2.4]), 'stone', {
    solid: false,
  });
  for (let row = 0; row < 5; row++) {
    v.add(
      PALETTE.rust,
      box(),
      f.at(
        [0, back - 0.1, floor + 1.2 + row * 0.42],
        [0, 0, 0],
        [2.8 - (row % 2) * 0.6, 0.03, 0.1],
      ),
      'stone',
      { solid: false },
    );
  }
  builder.mark('INT_cripta', f, [0, back - 1.4, floor + 1.4], {
    clue_id: 'cicatriz.cripta',
    kind: 'texto',
  });
}

/** El Borde: un mirador de losas en voladizo sobre el filo norte de la Gran Mordida, con su baranda. */
function borde(builder: CicatrizBuilder): void {
  const at = aroundGreatBite(rimAngle(GREAT_BITE) / DEG + 2.5, 0);
  const [lat, lon] = latLonOf(at);
  const f = outsideFrame(lat, lon, { heading: 180, footprint: 2.5, ground: 'mean' });
  const v = builder.outside;
  v.add(PALETTE.black, box(), f.at([0, -1.0, -0.4], [0, 0, 0], [5.0, 6.5, 1.2]));
  for (let k = -4; k <= 4; k++)
    v.add(PALETTE.rust, box(), f.at([k * 0.6, -4.1, 0.6], [0, 0, 0], [0.08, 0.08, 1.2]), 'metal', {
      solid: false,
    });
  v.add(PALETTE.rust, box(), f.at([0, -4.1, 1.2], [0, 0, 0], [5.2, 0.1, 0.08]), 'metal');
  v.add(PALETTE.slate, box(), f.at([0, -4.1, 0.6], [0, 0, 0], [5.2, 0.12, 1.2]), 'metal', {
    solid: true,
    glow: 0.9,
  });
  for (const side of [-1, 1])
    v.add(PALETTE.rust, box(), f.at([side * 2.5, -1.4, 0.6], [0, 0, 0], [0.12, 5.5, 1.2]), 'metal');
  brazier(builder, f, -2.0, 1.4, false);
  builder.mark('INT_borde', f, [0, -2.8, 1.8], { clue_id: 'cicatriz.borde', kind: 'observacion' });
  builder.mark('SPAWN_Borde', f, [0, 2.6, 0.4]);
}

/** Las Galerías Cortadas: salas de bajo tierra que la Gran Mordida partió, abiertas en la pared del cuenco. */
function galerias(builder: CicatrizBuilder): void {
  const v = builder.outside;
  const rim = rimAngle(GREAT_BITE) / DEG;
  const at = aroundGreatBite(rim - 5.5, 180);
  const [lat, lon] = latLonOf(at);
  // Mira al norte, hacia el ojo: las salas se meten en la ladera, al sur.
  const f = outsideFrame(lat, lon, { heading: 0, footprint: 3 });
  const rooms = [-5.4, 0, 5.4];
  const deep = 6;
  const high = 3.4;
  for (const level of [0, -4.2]) {
    const frame = new Frame(
      f.base.clone().multiply(pieceMatrix([0, level === 0 ? 0 : 3.2, level])),
    );
    builder.carve(
      frame.at(
        [0, -deep / 2 + 0.4, high / 2],
        [0, 0, 0],
        [rooms.length * 5.4 + 1, deep + 1.6, high + 1.2],
      ),
    );
    for (const x of rooms) {
      v.add(PALETTE.ash, box(), frame.at([x, -deep / 2, -0.3], [0, 0, 0], [5.2, deep + 1, 0.6]));
      v.add(
        PALETTE.black,
        box(),
        frame.at([x, -deep / 2, high + 0.35], [0, 0, 0], [5.4, deep + 1, 0.7]),
      );
      v.add(PALETTE.rust, box(), frame.at([x, -deep - 0.2, high / 2], [0, 0, 0], [5.2, 0.5, high]));
      v.add(
        PALETTE.rustLight,
        box(),
        frame.at([x + 2.7, -deep / 2, high / 2], [0, 0, 0], [0.35, deep, high]),
      );
      // El corte limpio: el borde de delante brilla un poco, liso como el de los fragmentos de casa.
      v.add(
        PALETTE.ember,
        box(),
        frame.at([x, 0.45, high + 0.02], [0, 0, 0], [5.2, 0.06, 0.06]),
        'light',
        { glow: 1.1 },
      );
      v.add(
        PALETTE.ember,
        box(),
        frame.at([x, 0.45, -0.02], [0, 0, 0], [5.2, 0.06, 0.06]),
        'light',
        { glow: 0.9 },
      );
      // Lo que había dentro: mesas, estantes, una lámpara.
      v.add(
        PALETTE.sandDark,
        box(),
        frame.at([x - 1, -deep + 1.2, 0.4], [0, 0, 0], [1.6, 0.8, 0.08]),
        'stone',
        { solid: false },
      );
      v.add(
        PALETTE.sandDark,
        box(),
        frame.at([x + 1.4, -deep + 0.6, 1.2], [0, 0, 0], [1.6, 0.4, 2.2]),
        'stone',
      );
      for (let s = 0; s < 3; s++)
        v.add(
          PALETTE.paper,
          box(),
          frame.at([x + 1.4, -deep + 0.85, 0.5 + s * 0.7], [0, 0, 0], [1.4, 0.1, 0.04]),
          'stone',
          { solid: false },
        );
      v.add(PALETTE.lamp, ball(0.14, 1), frame.at([x, -deep / 2, high - 0.3]), 'light', {
        glow: 1.6,
      });
    }
    v.add(
      PALETTE.rustLight,
      box(),
      frame.at([-8.15, -deep / 2, high / 2], [0, 0, 0], [0.35, deep, high]),
    );
    // Una cornisa delante, por la que se pasa de sala en sala.
    v.add(
      PALETTE.slate,
      box(),
      frame.at([0, 1.4, -0.25], [0, 0, 0], [rooms.length * 5.4 + 2, 2.4, 0.5]),
      'metal',
    );
    v.add(
      PALETTE.rust,
      box(),
      frame.at([0, 2.5, 0.55], [0, 0, 0], [rooms.length * 5.4 + 2, 0.12, 1.1]),
      'metal',
    );
  }
  // Una escalera que baja de la cornisa alta a la de abajo, por el lado oeste.
  // Los peldaños se ven; se pisa una rampa invisible debajo (34°, por debajo de la pendiente máxima).
  const stairFrom: [number, number, number] = [-9.9, -0.6, 0];
  const stairTo: [number, number, number] = [-9.9, 5.6, -4.2];
  const stairSteps = 14;
  for (let k = 0; k < stairSteps; k++) {
    const t = (k + 0.5) / stairSteps;
    const y = stairFrom[1] + t * (stairTo[1] - stairFrom[1]);
    const z = stairFrom[2] + ((k + 1) / stairSteps) * (stairTo[2] - stairFrom[2]);
    v.add(PALETTE.sandDark, box(), f.at([-9.9, y, z - 0.2], [0, 0, 0], [1.6, 0.46, 0.4]), 'stone', {
      solid: false,
    });
  }
  v.addCollider(
    box()
      .clone()
      .applyMatrix4(f.base.clone().multiply(rampMatrix(stairFrom, stairTo, 1.6))),
  );
  // La pared del símbolo, al fondo de la sala del centro de arriba: medio anillo con marcas, cortado limpio.
  const w = f.at.bind(f);
  v.add(PALETTE.sand, box(), w([0, -deep + 0.3, high / 2], [0, 0, 0], [4.0, 0.3, high - 0.2]));
  for (let k = 0; k < 9; k++) {
    const a = (Math.PI * k) / 8;
    v.add(
      PALETTE.rust,
      box(),
      w(
        [Math.cos(a) * 1.1, -deep + 0.5, 1.5 + Math.sin(a) * 1.1],
        [0, Math.PI / 2 - a, 0],
        [0.12, 0.06, k % 2 === 0 ? 0.45 : 0.25],
      ),
      'stone',
      { solid: false },
    );
  }
  v.add(PALETTE.black, box(), w([0, -deep + 0.5, 1.5], [0, 0, 0], [2.6, 0.04, 0.06]), 'stone', {
    solid: false,
  });
  v.add(PALETTE.ember, box(), w([2.0, -deep + 0.52, 1.6], [0, 0, 0], [0.04, 0.05, 2.6]), 'light', {
    glow: 1.4,
  });
  builder.mark('INT_mordidas', f, [0, -deep + 1.6, 1.4], {
    clue_id: 'cicatriz.mordidas',
    kind: 'observacion',
  });
}

/** Bocas de túneles cortados en la pared de los cuencos: aros oscuros que no llevan a ningún sitio. */
function cutTunnels(builder: CicatrizBuilder): void {
  const random = builder.random;
  for (let k = 0; k < 26; k++) {
    const bearing = random() * 360;
    if (Math.abs(((bearing + 180) % 360) - 180) < 30) continue; // el Borde, al norte
    if (Math.abs(bearing - 180) < 25) continue; // las Galerías, al sur
    const angle = rimAngle(GREAT_BITE) / DEG - 3 - random() * 9;
    const at = aroundGreatBite(angle, bearing);
    const r = outerGroundRadius(at);
    if (r < INNER_RADIUS + 6) continue;
    const p = at.clone().multiplyScalar(r - 0.4);
    const toAxis = biteAxis(GREAT_BITE)
      .multiplyScalar(r * Math.cos(angle * DEG))
      .sub(p);
    const f = frameLooking(p, toAxis, at);
    const size = 0.9 + random() * 1.1;
    builder.outside.add(
      PALETTE.black,
      cylinder(size, 12),
      f.at([0, 0, 0], [0, 0, 0], [1, 1, 0.3]),
      'stone',
      { solid: false },
    );
    builder.outside.add(
      PALETTE.slate,
      torus(size + 0.15, 0.14, 16, 4),
      f.at([0, 0, 0.1], [Math.PI / 2, 0, 0]),
      'metal',
      { solid: false },
    );
  }
}

/** El Pozo de Bajada: un tiro de anillos que atraviesa la cáscara, con su pretil y la Puerta plegada al lado. */
function pozo(builder: CicatrizBuilder): void {
  const { lat, lon } = OUTER_SITES.pozo;
  const axis = direction(lat, lon);
  const top = outerGroundRadius(axis);
  const radius = 3.2;
  // El hueco en las dos caras (la de fuera y la de dentro) y las paredes del tiro.
  const shaft = frameLooking(
    axis.clone().multiplyScalar((top + INNER_RADIUS) / 2),
    axis,
    new Vector3(0, 0, 1),
  );
  builder.carve(
    shaft.at([0, 0, 0], [0, 0, 0], [radius * 2 + 0.4, radius * 2 + 0.4, top - INNER_RADIUS + 6]),
  );
  const sides = 18;
  for (let k = 0; k < sides; k++) {
    const a = (2 * Math.PI * k) / sides;
    const x = Math.cos(a) * (radius + 0.2);
    const y = Math.sin(a) * (radius + 0.2);
    builder.outside.add(
      k % 2 ? PALETTE.ash : PALETTE.rust,
      box(),
      shaft.at([x, y, 0], [0, 0, a], [0.4, 1.25, top - INNER_RADIUS + 2]),
      'stone',
    );
  }
  const length = top - INNER_RADIUS;
  for (let z = -length / 2 + 1.5; z < length / 2; z += 3) {
    builder.outside.add(
      PALETTE.slate,
      torus(radius, 0.12, 24, 4),
      shaft.at([0, 0, z], [Math.PI / 2, 0, 0]),
      'metal',
      { solid: false },
    );
    builder.outside.add(
      PALETTE.lamp,
      torus(radius - 0.1, 0.04, 24, 3),
      shaft.at([0, 0, z + 0.2], [Math.PI / 2, 0, 0]),
      'light',
      { glow: 1.6 },
    );
  }
  // El brocal: pretil alto y cuatro postes con faroles.
  const mouth = outsideFrame(lat, lon, { footprint: radius + 1, ground: 'mean' });
  for (let k = 0; k < 20; k++) {
    const a = (2 * Math.PI * k) / 20;
    builder.outside.add(
      PALETTE.slateLight,
      box(),
      mouth.at(
        [Math.cos(a) * (radius + 0.6), Math.sin(a) * (radius + 0.6), RAIL_HEIGHT / 2 - 0.5],
        [0, 0, a],
        [0.4, 1.2, RAIL_HEIGHT + 1],
      ),
      'metal',
    );
  }
  for (let k = 0; k < 4; k++) {
    const a = (Math.PI / 2) * k + Math.PI / 4;
    builder.outside.add(
      PALETTE.black,
      cylinder(0.12, 6),
      mouth.at(
        [Math.cos(a) * (radius + 1.4), Math.sin(a) * (radius + 1.4), 1.6],
        [0, 0, 0],
        [1, 1, 3.2],
      ),
      'metal',
    );
    builder.outside.add(
      PALETTE.lamp,
      ball(0.2, 1),
      mouth.at([Math.cos(a) * (radius + 1.4), Math.sin(a) * (radius + 1.4), 3.3]),
      'light',
      { glow: 1.8 },
    );
  }
  // La Puerta plegada junto al brocal (fuera) y su gemela bajo el tiro (dentro): por ahí se baja.
  gate(
    builder,
    outsideFrame(lat, lon - 7.5 / Math.cos(lat * DEG), {
      heading: 270,
      footprint: 3,
      ground: 'mean',
    }),
    'PASO_Pozo',
    'PASO_Fondo',
    'outside',
  );
  gate(
    builder,
    insideFrame(lat, lon + 7.5 / Math.cos(lat * DEG), { heading: 90, footprint: 3 }),
    'PASO_Fondo',
    'PASO_Pozo',
    'inside',
  );
}

/** Las torres de amarre: tres torres de celosía con cables tendidos hacia anclajes, para sujetar lo que se soltaba. */
function torres(builder: CicatrizBuilder): void {
  const { lat, lon } = OUTER_SITES.torres;
  const v = builder.outside;
  const spots: [number, number][] = [
    [0, 0],
    [3.5, 4],
    [-3, 5],
  ];
  for (const [dlat, dlon] of spots) {
    const f = outsideFrame(lat + dlat, lon + dlon, { footprint: 2 });
    const high = 13 + dlat;
    for (const [x, y] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      v.add(
        PALETTE.slate,
        box(),
        beam(f.point([x * 1.4, y * 1.4, 0]), f.point([x * 0.5, y * 0.5, high]), 0.22),
        'metal',
      );
    }
    for (let z = 2; z < high; z += 2.5) {
      v.add(
        PALETTE.rust,
        box(),
        f.at([0, 0, z], [0, 0, 0], [2.4 - z * 0.08, 0.12, 0.12]),
        'metal',
        { solid: false },
      );
      v.add(
        PALETTE.rust,
        box(),
        f.at([0, 0, z + 1.2], [0, 0, 0], [0.12, 2.3 - z * 0.08, 0.12]),
        'metal',
        { solid: false },
      );
    }
    v.add(PALETTE.sandDark, torus(1.2, 0.18, 18, 4), f.at([0, 0, high + 0.6]), 'metal', {
      solid: false,
    });
    v.add(PALETTE.ember, ball(0.25, 1), f.at([0, 0, high + 1.6]), 'light', { glow: 2 });
    // Cables en catenaria hacia un anclaje en el suelo, a 14 m.
    const from = f.point([0, 0, high]);
    const anchorDir = direction(lat + dlat - 9, lon + dlon + 4);
    const anchor = anchorDir.clone().multiplyScalar(outerGroundRadius(anchorDir) + 0.3);
    let last = from;
    for (let s = 1; s <= 10; s++) {
      const t = s / 10;
      const p = from.clone().lerp(anchor, t);
      p.addScaledVector(p.clone().normalize(), -Math.sin(Math.PI * t) * 3);
      v.add(PALETTE.black, cylinder(0.06, 5), beam(last, p, 1), 'metal', { solid: false });
      last = p;
    }
    const a = frameLooking(anchor, anchorDir, new Vector3(0, 0, 1));
    v.add(PALETTE.rust, box(), a.at([0, 0, 0.3], [0, 0, 0], [1.4, 1.4, 1.2]), 'metal');
  }
}

/** El campamento del turno: casetas de lona sobre aros, mesa, cajas, y la vía de vagonetas hacia el vacío. */
function campamento(builder: CicatrizBuilder): void {
  const { lat, lon } = OUTER_SITES.campamento;
  const f = outsideFrame(lat, lon, { heading: 30, footprint: 6, ground: 'mean' });
  const v = builder.outside;
  v.add(PALETTE.ash, cylinder(7, 18), f.at([0, 0, -0.5], [0, 0, 0], [1, 1, 1.0]));
  for (const [x, y, turn] of [
    [-3.5, 2, 0.3],
    [3.2, 2.6, -0.4],
    [0, -3.5, 1.6],
  ] as const) {
    for (let k = 0; k < 4; k++) {
      v.add(
        PALETTE.slate,
        torusArc(1.6, 0.06, 0, Math.PI, 12, 3),
        f.at(
          [x + Math.cos(turn) * (k - 1.5) * 0.9, y + Math.sin(turn) * (k - 1.5) * 0.9, 0],
          [0, 0, turn],
        ),
        'metal',
        { solid: false },
      );
    }
    v.add(PALETTE.rustLight, box(), f.at([x, y, 1.0], [0, 0, turn], [3.4, 2.6, 2.0]), 'stone');
  }
  v.add(PALETTE.sandDark, box(), f.at([0, 0, 0.75], [0, 0, 0], [2.2, 1.0, 0.1]), 'stone');
  for (const [x, y] of [
    [-0.9, -0.35],
    [0.9, -0.35],
    [-0.9, 0.35],
    [0.9, 0.35],
  ] as const)
    v.add(PALETTE.black, box(), f.at([x, y, 0.37], [0, 0, 0], [0.08, 0.08, 0.75]), 'metal', {
      solid: false,
    });
  for (let k = 0; k < 3; k++)
    v.add(
      PALETTE.bone,
      cylinder(0.08, 8),
      f.at([-0.6 + k * 0.6, 0.1, 0.85], [0, 0, 0], [1, 1, 0.14]),
      'stone',
      { solid: false },
    );
  for (let k = 0; k < 5; k++)
    v.add(
      k % 2 ? PALETTE.rust : PALETTE.slate,
      box(),
      f.at([4.5, -2 + k * 0.9, 0.35 + (k % 2) * 0.7], [0, 0, k * 0.2], [0.8, 0.8, 0.7]),
      'metal',
    );
  brazier(builder, f, -2.2, -1.4, false);
  brazier(builder, f, 2.4, -1.2, false);
  rails(builder, direction(lat, lon));
}

/** La vía de vagonetas: del campamento al filo de la Gran Mordida, donde se corta en el aire con una vagoneta volcada. */
function rails(builder: CicatrizBuilder, from: Vector3): void {
  const v = builder.outside;
  const axis = biteAxis(GREAT_BITE);
  const rim = rimAngle(GREAT_BITE);
  const total = angleBetween(from, axis) - rim + 1.5 * DEG;
  const step = 1.2 / OUTER_RADIUS;
  const turn = from.clone().cross(axis).normalize();
  let previous: Vector3 | undefined;
  for (let a = 9 / OUTER_RADIUS; a < total; a += step) {
    const d = from.clone().applyAxisAngle(turn, a);
    const ground = outerGround(d);
    const beyond = ground.bite !== undefined && angleBetween(d, axis) < rim;
    const r = beyond ? (previous?.length() ?? OUTER_RADIUS) : ground.radius + 0.15;
    const p = d.clone().multiplyScalar(r);
    if (previous) {
      const f = frameLooking(p, d, p.clone().sub(previous));
      v.add(PALETTE.sandDark, box(), f.at([0, 0, 0], [0, 0, 0], [1.8, 0.3, 0.16]), 'stone', {
        solid: false,
      });
      for (const x of [-0.55, 0.55])
        v.add(
          PALETTE.slateLight,
          box(),
          beam(previous.clone().add(f.point([x, 0, 0.14]).sub(p)), f.point([x, 0, 0.14]), 0.08),
          'metal',
          { solid: false },
        );
    }
    previous = p;
  }
  if (previous) {
    const d = previous.clone().normalize();
    const f = frameLooking(previous, d, axis.clone().sub(d));
    v.add(PALETTE.rust, box(), f.at([0.6, 1.5, 0.3], [0.4, 0.9, 0.3], [1.4, 2.0, 1.1]), 'metal', {
      solid: false,
    });
    for (let k = 0; k < 4; k++)
      v.add(
        PALETTE.black,
        cylinder(0.3, 8),
        f.at([(k % 2 ? 1 : -1) * 0.9, 1 + (k > 1 ? 1 : 0), 0], [0, Math.PI / 2, 0], [1, 1, 0.15]),
        'metal',
        { solid: false },
      );
  }
}

/** Toda la superficie y lo que tiene debajo. */
export function surface(builder: CicatrizBuilder): void {
  puesto(builder);
  primeraPuerta(builder);
  borde(builder);
  galerias(builder);
  cutTunnels(builder);
  pozo(builder);
  torres(builder);
  campamento(builder);
}
