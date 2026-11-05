// El núcleo de Cicatriz (Fase 11H; ✅ Anthony 2026-11-04: la máquina rodea el centro): el micro agujero, la Esfera
// del Motor (anillos armilares que giran despacio), el motor viejo que lo abraza y, alrededor, la Sala del Motor:
// una banda de 12 m de radio que se camina por dentro, con el micro agujero encima. En ella, la cuna, la palanca,
// la bitácora, la lista de mundos y el visor del núcleo (todo lo de la Fase 10C, recolocado). La sostienen el Eje
// (la columna desde la cara interior, con su Puerta plegada) y los Radios.
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ball, box, cone, cylinder, geometryFrom, pieceMatrix, torus, type Triple } from './kit';
import {
  ENGINE_HALF_ANGLE,
  ENGINE_RADIUS,
  engineBasis,
  enginePoint,
  INNER_SITES,
  innerGroundRadius,
  RAIL_HEIGHT,
} from './cicatrizShape';
import {
  beam,
  engineFrame,
  frameLooking,
  insideFrame,
  PALETTE,
  type CicatrizBuilder,
} from './cicatrizKit';
import type { Frame } from './kit';

export const PULSE_EVENT = 'pulso_cicatriz';
/** Del centro del Contrapeso a la base de su pie (generar_contrapeso.py). */
const COUNTERWEIGHT_LOW = 0.425;
/** Dónde está cada cosa en la banda (grados alrededor del eje; 0, hacia el Eje). */
export const ENGINE_SPOTS = {
  gate: 0,
  spawn: 140,
  lista: 156,
  motorOut: 170,
  cradle: 180,
  lever: 189,
  console: 204,
  visor: 226,
} as const;

/** El suelo de la banda: un trozo de esfera visto por dentro, con su piel de metal por fuera. */
function bandFloor(builder: CicatrizBuilder): void {
  const ring = 96;
  const across = 8;
  const walk: number[] = [];
  const skin: number[] = [];
  const skinRadius = ENGINE_RADIUS + 0.6;
  const at = (i: number, j: number, r: number): Vector3 =>
    enginePoint((360 * i) / ring, -ENGINE_HALF_ANGLE + (2 * ENGINE_HALF_ANGLE * j) / across, r);
  for (let i = 0; i < ring; i++) {
    for (let j = 0; j < across; j++) {
      const a = at(i, j, ENGINE_RADIUS);
      const b = at(i + 1, j, ENGINE_RADIUS);
      const c = at(i + 1, j + 1, ENGINE_RADIUS);
      const d = at(i, j + 1, ENGINE_RADIUS);
      // Por dentro, la cara mira al centro.
      walk.push(
        ...a.toArray(),
        ...c.toArray(),
        ...b.toArray(),
        ...a.toArray(),
        ...d.toArray(),
        ...c.toArray(),
      );
      const A = at(i, j, skinRadius);
      const B = at(i + 1, j, skinRadius);
      const C = at(i + 1, j + 1, skinRadius);
      const D = at(i, j + 1, skinRadius);
      skin.push(
        ...A.toArray(),
        ...B.toArray(),
        ...C.toArray(),
        ...A.toArray(),
        ...C.toArray(),
        ...D.toArray(),
      );
    }
  }
  const floor = geometryFrom(walk);
  builder.inside.add(PALETTE.slateLight, floor, new Matrix4(), 'metal', { vary: 0, solid: true });
  builder.inside.add(PALETTE.slate, geometryFrom(skin), new Matrix4(), 'metal', {
    vary: 0,
    solid: false,
  });
  // Losas: franjas más claras a lo largo y marcas de reloj cada 15°, como un cuadrante que da la vuelta.
  for (let k = 0; k < 24; k++) {
    const f = engineFrame(k * 15, 0);
    builder.inside.add(
      k % 6 === 0 ? PALETTE.ember : PALETTE.sand,
      box(),
      f.at([0, 0, 0.02], [0, 0, 0], [k % 6 === 0 ? 3.2 : 1.6, 0.18, 0.04]),
      k % 6 === 0 ? 'light' : 'stone',
      { glow: k % 6 === 0 ? 1.4 : 1, solid: false },
    );
  }
  for (const beta of [-12, 12]) {
    for (let k = 0; k < 48; k++) {
      const f = engineFrame(k * 7.5, beta);
      builder.inside.add(
        PALETTE.ash,
        box(),
        f.at([0, 0, 0.015], [0, 0, 0], [0.12, 1.2, 0.03]),
        'stone',
        { solid: false },
      );
    }
  }
}

/** Las barandas de los dos bordes de la banda, con faroles, y los arcos que las unen por fuera cada 30°. */
function bandRails(builder: CicatrizBuilder): void {
  const steps = 72;
  for (const side of [-1, 1]) {
    const beta = side * (ENGINE_HALF_ANGLE - 0.6);
    for (let k = 0; k < steps; k++) {
      const phi = (360 * k) / steps;
      const f = engineFrame(phi, beta);
      const length = (2 * Math.PI * ENGINE_RADIUS * Math.cos((beta * Math.PI) / 180)) / steps;
      builder.inside.add(
        PALETTE.slate,
        box(),
        f.at([0, 0, RAIL_HEIGHT / 2], [0, 0, 0], [0.3, length * 1.05, RAIL_HEIGHT]),
        'metal',
      );
      builder.inside.add(
        PALETTE.rustLight,
        box(),
        f.at([0, 0, RAIL_HEIGHT + 0.08], [0, 0, 0], [0.42, length * 1.05, 0.16]),
        'metal',
        { solid: false },
      );
      if (k % 6 === 0) {
        builder.inside.add(
          PALETTE.lamp,
          ball(0.18, 1),
          f.at([-side * 0.1, 0, RAIL_HEIGHT + 0.35]),
          'light',
          { glow: 1.8 },
        );
      }
    }
  }
  // Por fuera de la piel, costillas: medio aro de un borde al otro, cada 30°.
  for (let k = 0; k < 12; k++) {
    const phi = k * 30 + 15;
    const points: Vector3[] = [];
    for (let j = 0; j <= 8; j++)
      points.push(
        enginePoint(
          phi,
          -ENGINE_HALF_ANGLE - 2 + (j * (2 * ENGINE_HALF_ANGLE + 4)) / 8,
          ENGINE_RADIUS + 1.2,
        ),
      );
    for (let j = 0; j < 8; j++) {
      const from = points[j];
      const to = points[j + 1];
      if (from && to)
        builder.inside.add(PALETTE.rust, box(), beam(from, to, 0.5, 0.8), 'metal', {
          solid: false,
        });
    }
  }
}

/** El micro agujero: un punto negro con su disco encendido y un halo que tiñe lo de detrás. */
function microHole(builder: CicatrizBuilder): Object3D[] {
  const black = new Mesh(
    new SphereGeometry(0.45, 24, 16),
    new MeshBasicMaterial({ color: 0x000000 }),
  );
  black.name = 'cicatriz_MicroAgujero';
  const halo = new Mesh(
    new SphereGeometry(1.6, 24, 16),
    new MeshBasicMaterial({
      color: new Color(PALETTE.ember).multiplyScalar(0.35),
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: BackSide,
    }),
  );
  halo.name = 'cicatriz_MicroAgujero_Halo';
  const { axis } = engineBasis();
  // El disco gira deprisa alrededor del eje de la Sala (ANIM_ gira sobre su Y local).
  builder.spinning(
    'ANIM_micro_disco',
    frameLooking(new Vector3(), axis, new Vector3(0, 0, 1)).at([0, 0, 0], [-Math.PI / 2, 0, 0]),
    { spin: 2.4 },
    'inside',
    (set) => {
      set.add(PALETTE.ember, torus(0.95, 0.07, 32, 4), pieceMatrix(), 'light', { glow: 2.4 });
      set.add(PALETTE.glass, torus(0.7, 0.04, 32, 4), pieceMatrix(), 'light', { glow: 2.2 });
      set.add(
        PALETTE.ember,
        torus(1.25, 0.03, 32, 3),
        pieceMatrix([0, 0, 0], [0, 0.4, 0]),
        'light',
        { glow: 1.6 },
      );
    },
  );
  return [black, halo];
}

/** La Esfera del Motor: tres anillos armilares con marcas de reloj, cada uno girando sobre otro eje. */
function armillary(builder: CicatrizBuilder): void {
  const rings: [number, Triple, number][] = [
    [6.2, [0.3, 0, 0], 0.05],
    [7.6, [1.2, 0.7, 0], -0.035],
    [9.0, [2.1, 1.9, 0.6], 0.025],
  ];
  rings.forEach(([radius, tilt, spin], i) => {
    const matrix = pieceMatrix([0, 0, 0], tilt);
    builder.spinning(`ANIM_esfera_${String(i)}`, matrix, { spin }, 'inside', (set) => {
      // El toro de pie en XZ tiene su eje en Y, el del giro: se tumba en XY para que, al girar, voltee.
      const lying = pieceMatrix([0, 0, 0], [0, 0, 0]).multiply(
        new Matrix4().makeRotationX(Math.PI / 2),
      );
      set.add(PALETTE.slate, torus(radius, 0.22, 64, 6), lying, 'metal', { solid: false });
      set.add(PALETTE.ember, torus(radius - 0.24, 0.04, 64, 3), lying, 'light', { glow: 1.5 });
      for (let k = 0; k < 24; k++) {
        const a = (2 * Math.PI * k) / 24;
        set.add(
          k % 6 === 0 ? PALETTE.lamp : PALETTE.sand,
          box(),
          pieceMatrix(
            [Math.cos(a) * radius, Math.sin(a) * radius, 0],
            [0, 0, a],
            [k % 6 === 0 ? 0.9 : 0.5, 0.12, 0.5],
          ),
          k % 6 === 0 ? 'light' : 'metal',
          { glow: 1.4, solid: false },
        );
      }
    });
  });
}

/** Una geometría con un color por vértice (para las mallas sueltas). */
function tinted(geometry: BufferGeometry, color: string): BufferGeometry {
  const c = new Color(color);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

/** El motor viejo, en el centro, abrazando al micro agujero; con la palanca sale a la banda (MotorFuera). */
function oldMotor(builder: CicatrizBuilder): Object3D[] {
  const { axis } = engineBasis();
  const motorParts: { color: string; geometry: BufferGeometry; matrix: Matrix4 }[] = [
    {
      color: PALETTE.ash,
      geometry: cylinder(0.9, 12),
      matrix: pieceMatrix([0, 0, 0], [0, 0, 0], [1, 1, 2.6]),
    },
    {
      color: PALETTE.rust,
      geometry: torus(0.95, 0.08, 18, 4),
      matrix: pieceMatrix([0, 0, -0.8], [Math.PI / 2, 0, 0]),
    },
    {
      color: PALETTE.rust,
      geometry: torus(0.95, 0.08, 18, 4),
      matrix: pieceMatrix([0, 0, 0.8], [Math.PI / 2, 0, 0]),
    },
    {
      color: PALETTE.black,
      geometry: cylinder(0.62, 12),
      matrix: pieceMatrix([0, 0, -1.33], [0, 0, 0], [1, 1, 0.1]),
    },
    {
      color: PALETTE.black,
      geometry: cylinder(0.62, 12),
      matrix: pieceMatrix([0, 0, 1.33], [0, 0, 0], [1, 1, 0.1]),
    },
  ];
  for (let k = 0; k < 6; k++) {
    const a = (2 * Math.PI * k) / 6;
    motorParts.push({
      color: PALETTE.ashLight,
      geometry: box(),
      matrix: pieceMatrix(
        [Math.cos(a) * 0.92, Math.sin(a) * 0.92, 0],
        [0, 0, a],
        [0.12, 0.14, 2.2],
      ),
    });
  }
  const geometries = motorParts.map(({ color, geometry, matrix }) =>
    tinted(geometry.clone().applyMatrix4(matrix), color),
  );
  const motor = new Mesh(mergeGeometries(geometries), builder.materials.inside.metal);
  motor.name = 'cicatriz_MotorViejo';
  // Su eje (el Z de las piezas) a lo largo del eje de la Sala; el centro, en el del planeta.
  motor.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), axis);
  const out = new Object3D();
  out.name = 'cicatriz_MotorFuera';
  const rest = engineFrame(ENGINE_SPOTS.motorOut, -9, 90);
  rest.at([0, 0, 0.95]).decompose(out.position, out.quaternion, out.scale);
  out.scale.set(1, 1, 1);
  return [motor, out];
}

/** La coraza del núcleo (gira en el pulso) y el fuego del pulso (EVT_). */
function pulseParts(builder: CicatrizBuilder): void {
  const { axis } = engineBasis();
  const center = frameLooking(new Vector3(), axis, new Vector3(0, 0, 1));
  builder.spinning(
    'ANIM_nucleo_coraza',
    center.at([0, 0, 0], [-Math.PI / 2, 0, 0]),
    { spin: 2.5, event: PULSE_EVENT },
    'inside',
    (set) => {
      for (const side of [-1, 1]) {
        set.add(
          PALETTE.rust,
          box(),
          pieceMatrix([side * 1.55, 0, 0], [0, 0, 0], [0.25, 3.4, 2.2]),
          'metal',
          { solid: false },
        );
        set.add(
          PALETTE.black,
          box(),
          pieceMatrix([side * 1.72, 0, 0], [0, 0, 0], [0.08, 2.6, 1.6]),
          'metal',
          { solid: false },
        );
      }
    },
  );
  const fire = new Mesh(
    mergeGeometries([
      ball(1.1, 2).clone(),
      ...Array.from({ length: 10 }, (_, k) => {
        const a = (2 * Math.PI * k) / 10;
        return box()
          .clone()
          .applyMatrix4(
            beam(
              new Vector3(),
              new Vector3(Math.cos(a), Math.sin(a), (k % 2) - 0.5).multiplyScalar(6),
              0.14,
            ),
          );
      }),
    ]),
    new MeshBasicMaterial({ color: new Color(PALETTE.ember).multiplyScalar(1.4) }),
  );
  fire.name = `EVT_${PULSE_EVENT}_Nucleo`;
  fire.userData.event = PULSE_EVENT;
  fire.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), axis);
  builder.extras.push(fire);
}

/** Un brasero: poste, cuenco y su luz. */
export function brazier(
  builder: CicatrizBuilder,
  f: Frame,
  x: number,
  y: number,
  inside = true,
): void {
  const set = inside ? builder.inside : builder.outside;
  set.add(PALETTE.black, cylinder(0.08, 6), f.at([x, y, 1.1], [0, 0, 0], [1, 1, 2.2]), 'metal');
  set.add(PALETTE.rust, cone(0.3, 0.18, 6), f.at([x, y, 2.25], [0, 0, 0], [1, 1, 0.3]), 'metal', {
    solid: false,
  });
  set.add(PALETTE.lamp, ball(0.16, 1), f.at([x, y, 2.45]), 'light', { glow: 1.8 });
}

/** La cuna (Fase 10C): la peana donde se pone el Contrapeso, con sus dos ruedas en la cara de delante. */
function cradle(builder: CicatrizBuilder): void {
  const f = engineFrame(ENGINE_SPOTS.cradle, 0);
  const v = builder.inside;
  v.add(PALETTE.rust, box(), f.at([0, 0, 0.45], [0, 0, 0], [1.4, 1.0, 0.9]), 'metal');
  v.add(PALETTE.black, box(), f.at([0, 0, 0.9], [0, 0, 0], [1.5, 1.1, 0.04]), 'metal', {
    solid: false,
  });
  v.add(PALETTE.sand, cylinder(0.32, 12), f.at([0, 0, 0.93], [0, 0, 0], [1, 1, 0.03]), 'stone', {
    solid: false,
  });
  for (const dx of [-0.62, 0.62]) {
    v.add(PALETTE.rustLight, box(), f.at([dx, 0, 1.1], [0, 0, 0], [0.08, 0.5, 0.36]), 'metal', {
      solid: false,
    });
  }
  for (const x of [-0.32, 0.32]) {
    const front = -0.52;
    v.add(PALETTE.black, torus(0.17, 0.03, 16, 4), f.at([x, front, 0.5]), 'metal', {
      solid: false,
    });
    for (let k = 0; k < 4; k++) {
      v.add(
        PALETTE.ashLight,
        box(),
        f.at([x, front, 0.5], [0, (Math.PI / 4) * k, 0], [0.3, 0.03, 0.025]),
        'metal',
        { solid: false },
      );
    }
    v.add(
      PALETTE.ember,
      cylinder(0.045, 8),
      f.at([x, front - 0.01, 0.5], [Math.PI / 2, 0, 0], [1, 1, 0.05]),
      'light',
      { glow: 1.6 },
    );
  }
  v.add(PALETTE.sand, box(), f.at([0, -0.51, 0.78], [0, 0, 0], [0.5, 0.02, 0.12]), 'stone', {
    solid: false,
  });
  // Un haz tenue de la cuna al núcleo: por ahí sube el Contrapeso con el pulso.
  v.add(
    PALETTE.ember,
    cylinder(0.05, 6),
    beam(f.point([0, 0, 1.4]), new Vector3(), 0.05),
    'light',
    { glow: 0.9, solid: false },
  );
  builder.mark(
    'INT_cuna',
    engineFrame(ENGINE_SPOTS.cradle, 0, 180),
    [0, 0, 0.93 + COUNTERWEIGHT_LOW],
    {
      clue_id: 'cicatriz.cuna',
      kind: 'objeto',
    },
  );
  builder.mark('INT_sala_motor', f, [1.4, -1.6, 1.4], {
    clue_id: 'cicatriz.sala_motor',
    kind: 'objeto',
  });
  // La placa de la Sala: una losa inclinada con el anillo de la máquina grabado.
  v.add(PALETTE.black, box(), f.at([1.4, -1.6, 0.55], [0, 0, 0], [0.9, 0.5, 1.1]), 'metal');
  v.add(PALETTE.sand, box(), f.at([1.4, -1.86, 1.05], [-0.5, 0, 0], [0.8, 0.04, 0.5]), 'stone', {
    solid: false,
  });
  v.add(PALETTE.ember, torus(0.16, 0.025, 20, 3), f.at([1.4, -1.9, 1.07], [-0.5, 0, 0]), 'light', {
    glow: 1.6,
  });
}

/** La palanca que saca el motor viejo, en su consola. */
function lever(builder: CicatrizBuilder): void {
  const f = engineFrame(ENGINE_SPOTS.lever, 0);
  const v = builder.inside;
  v.add(PALETTE.black, box(), f.at([0, 0, 0.5], [0, 0, 0], [0.9, 0.6, 1.0]), 'metal');
  v.add(PALETTE.rust, box(), f.at([0, 0, 1.02], [0, 0, 0], [0.7, 0.4, 0.04]), 'metal', {
    solid: false,
  });
  v.add(
    PALETTE.ashLight,
    cylinder(0.04, 6),
    f.at([0, -0.15, 1.3], [0.45, 0, 0], [1, 1, 0.6]),
    'metal',
    { solid: false },
  );
  v.add(PALETTE.ember, ball(0.07, 1), f.at([0, -0.29, 1.58]), 'light', { glow: 1.8 });
  builder.mark('INT_palanca', f, [0, -0.7, 1.25], { clue_id: 'cicatriz.palanca', kind: 'objeto' });
}

/** La bitácora (una consola con tiras de papel) y la lista de mundos (un panel con huecos). */
function logs(builder: CicatrizBuilder): void {
  const v = builder.inside;
  const log = engineFrame(ENGINE_SPOTS.console, 4);
  v.add(PALETTE.black, box(), log.at([0, 0, 0.5], [0, 0, 0], [1.6, 0.7, 1.0]), 'metal');
  v.add(PALETTE.ember, box(), log.at([0, -0.2, 1.05], [-0.5, 0, 0], [1.2, 0.3, 0.04]), 'light', {
    glow: 1.3,
  });
  for (let k = 0; k < 6; k++) {
    v.add(
      PALETTE.paper,
      box(),
      log.at([-0.5 + k * 0.2, -0.25, 1.08 + 0.05 * (k % 3)], [-0.5, 0, 0], [0.06, 0.2, 0.02]),
      'stone',
      { solid: false },
    );
  }
  // La tira de la bitácora cae al suelo en rollos: los picos de cada uso, cada vez más altos.
  for (let k = 0; k < 9; k++) {
    v.add(
      PALETTE.paper,
      box(),
      log.at(
        [0.9 + k * 0.05, -0.8 - k * 0.22, 0.02 + (k % 2) * 0.03],
        [0, 0, k * 0.2],
        [0.2, 0.24, 0.02],
      ),
      'stone',
      { solid: false },
    );
  }
  builder.mark('INT_bitacora', log, [0, -1.0, 1.3], {
    clue_id: 'cicatriz.bitacora',
    kind: 'texto',
  });
  const list = engineFrame(ENGINE_SPOTS.lista, 3);
  v.add(PALETTE.ash, box(), list.at([0, 0.3, 1.6], [0, 0, 0], [3.0, 0.3, 3.2]), 'metal');
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) {
      const gap = [
        [1, 3],
        [3, 1],
        [4, 4],
        [5, 2],
      ].some(([r, c]) => r === row && c === col);
      v.add(
        gap ? PALETTE.black : PALETTE.sand,
        box(),
        list.at([-1.1 + col * 0.55, 0.12, 0.6 + row * 0.42], [0, 0, 0], [0.45, 0.04, 0.3]),
        'stone',
        { solid: false },
      );
    }
  }
  // Un hueco lleva un símbolo distinto, encendido: el del sistema de casa (🟡 decisión 7 de las pistas).
  v.add(
    PALETTE.violet,
    torus(0.09, 0.02, 14, 3),
    list.at([-1.1 + 2 * 0.55, 0.09, 0.6 + 5 * 0.42]),
    'light',
    { glow: 1.6 },
  );
  builder.mark('INT_lista_mundos', list, [0, -1.0, 1.6], {
    clue_id: 'cicatriz.lista_mundos',
    kind: 'texto',
  });
  brazier(builder, engineFrame(ENGINE_SPOTS.lista - 9, -12), 0, 0);
  brazier(builder, engineFrame(ENGINE_SPOTS.console + 9, -12), 0, 0);
}

/** El visor del núcleo: un catalejo de los Ausentes apuntado al micro agujero, con su asiento. */
function visor(builder: CicatrizBuilder): void {
  const f = engineFrame(ENGINE_SPOTS.visor, 0);
  const v = builder.inside;
  v.add(PALETTE.slate, cylinder(0.35, 10), f.at([0, 0, 0.5], [0, 0, 0], [1, 1, 1.0]), 'metal');
  v.add(PALETTE.ash, cylinder(0.18, 10), f.at([0, 0.3, 1.45], [-0.9, 0, 0], [1, 1, 1.4]), 'metal', {
    solid: false,
  });
  v.add(
    PALETTE.glass,
    cylinder(0.2, 12),
    f.at([0, 0.85, 1.85], [-0.9, 0, 0], [1, 1, 0.05]),
    'light',
    { glow: 1.6 },
  );
  for (let k = 0; k < 8; k++) {
    const a = (2 * Math.PI * k) / 8;
    v.add(
      PALETTE.sand,
      box(),
      f.at([Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.03], [0, 0, a], [0.3, 0.08, 0.04]),
      'stone',
      { solid: false },
    );
  }
  v.add(PALETTE.rust, box(), f.at([0, -1.1, 0.25], [0, 0, 0], [0.9, 0.6, 0.5]), 'stone');
  builder.mark('INT_nucleo', f, [0, -0.6, 1.4], {
    clue_id: 'cicatriz.nucleo',
    kind: 'observacion',
  });
}

/** El Eje: la columna de la cara interior a la banda, con anillos y luces, y su Puerta plegada abajo y arriba. */
function axle(builder: CicatrizBuilder): void {
  const { u } = engineBasis();
  const foot = u.clone().multiplyScalar(innerGroundRadius(u) + 0.5);
  const top = u.clone().multiplyScalar(ENGINE_RADIUS + 0.6);
  builder.inside.add(PALETTE.slate, cylinder(2.2, 16), beam(foot, top, 1), 'metal');
  const length = foot.distanceTo(top);
  for (let k = 1; k < length / 4; k++) {
    const p = foot.clone().lerp(top, (k * 4) / length);
    const f = frameLooking(p, u, new Vector3(0, 0, 1));
    builder.inside.add(
      PALETTE.rust,
      torus(2.45, 0.22, 20, 5),
      f.at([0, 0, 0], [Math.PI / 2, 0, 0]),
      'metal',
      { solid: false },
    );
    if (k % 2 === 0)
      builder.inside.add(
        PALETTE.lamp,
        torus(2.5, 0.06, 20, 3),
        f.at([0, 0, 0.3], [Math.PI / 2, 0, 0]),
        'light',
        { glow: 1.6 },
      );
  }
  // El pie: un zócalo de estratos con cuatro contrafuertes.
  const base = insideFrame(INNER_SITES.eje.lat, INNER_SITES.eje.lon, { footprint: 7 });
  for (let k = 0; k < 3; k++) {
    builder.inside.add(
      k % 2 ? PALETTE.sand : PALETTE.sandDark,
      cylinder(6 - k * 1.3, 18),
      base.at([0, 0, -0.4 + k * 0.6], [0, 0, 0], [1, 1, 0.9]),
      'stone',
    );
  }
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    builder.inside.add(
      PALETTE.rust,
      box(),
      base
        .at([Math.cos(a) * 3.2, Math.sin(a) * 3.2, 3], [0, 0, a], [3.6, 0.8, 6])
        .multiply(new Matrix4().makeShear(0, 0, 0, 0, -0.25, 0)),
      'metal',
    );
  }
  gate(
    builder,
    insideFrame(INNER_SITES.eje.lat + 9, INNER_SITES.eje.lon, { heading: 0, footprint: 3 }),
    'PASO_Eje',
    'PASO_Sala',
    'inside',
  );
  gate(builder, engineFrame(ENGINE_SPOTS.gate + 8, 0, 0), 'PASO_Sala', 'PASO_Eje', 'inside');
}

/** Una Puerta plegada de los Ausentes: dos postes, el aro con marcas y su velo tenue. */
export function gate(
  builder: CicatrizBuilder,
  f: Frame,
  name: string,
  target: string,
  side: 'inside' | 'outside',
): void {
  const set = builder.sets[side];
  for (const x of [-2.1, 2.1])
    set.add(PALETTE.black, box(), f.at([x, 0, 1.75], [0, 0, 0], [0.5, 0.5, 3.6]), 'metal');
  set.add(PALETTE.sandDark, torus(1.65, 0.2, 32, 6), f.at([0, 0, 1.8]), 'metal', { solid: false });
  set.add(PALETTE.violet, torus(1.42, 0.05, 32, 4), f.at([0, 0, 1.8]), 'light', { glow: 1.7 });
  for (let k = 0; k < 12; k++) {
    const a = (2 * Math.PI * k) / 12;
    set.add(
      PALETTE.lamp,
      box(),
      f.at([Math.cos(a) * 1.9, 0, 1.8 + Math.sin(a) * 1.9], [0, -a, 0], [0.1, 0.1, 0.32]),
      'light',
      { glow: 1.4 },
    );
  }
  const veil = new Mesh(
    cylinder(1.4, 24)
      .clone()
      .applyMatrix4(pieceMatrix([0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 0.02])),
    new MeshBasicMaterial({
      color: new Color(PALETTE.violet).multiplyScalar(0.6),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: 2,
    }),
  );
  veil.name = `cicatriz_Velo_${name}`;
  veil.applyMatrix4(f.at([0, 0, 1.8]));
  builder.extras.push(veil);
  builder.mark(name, f, [0, 0, 0], { destino: target });
}

/** Los Radios: seis pares de cables de la cara interior a los bordes de la banda, con su anclaje. */
function spokes(builder: CicatrizBuilder): void {
  for (let k = 0; k < 6; k++) {
    const phi = 30 + k * 60;
    const out = enginePoint(phi, 0).normalize();
    const radius = innerGroundRadius(out);
    const anchor = out.clone().multiplyScalar(radius + 0.4);
    for (const side of [-1, 1]) {
      const to = enginePoint(phi, side * (ENGINE_HALF_ANGLE + 1), ENGINE_RADIUS + 1.0);
      builder.inside.add(PALETTE.ash, cylinder(0.22, 6), beam(anchor, to, 1), 'metal', {
        solid: false,
      });
    }
    const f = frameLooking(anchor, out.clone().negate(), new Vector3(0, 0, 1));
    builder.inside.add(
      PALETTE.rust,
      cone(2.4, 1.2, 8),
      f.at([0, 0, 0.6], [0, 0, 0], [1, 1, 1.6]),
      'metal',
    );
    builder.inside.add(PALETTE.lamp, ball(0.3, 1), f.at([0, 0, 1.6]), 'light', { glow: 1.8 });
  }
}

/** Todo el núcleo y la Sala del Motor. Devuelve lo que va suelto (micro agujero, motor). */
export function engineRoom(builder: CicatrizBuilder): Object3D[] {
  // Por dónde llega la nave al núcleo: sobre el eje de la Gran Mordida, por el polo abierto de la banda.
  const access = new Object3D();
  access.name = 'cicatriz_Acceso';
  access.position.copy(engineBasis().axis.multiplyScalar(ENGINE_RADIUS + 8));
  builder.extras.push(access);
  bandFloor(builder);
  bandRails(builder);
  armillary(builder);
  pulseParts(builder);
  cradle(builder);
  lever(builder);
  logs(builder);
  visor(builder);
  axle(builder);
  spokes(builder);
  builder.mark('SPAWN_Motor', engineFrame(ENGINE_SPOTS.spawn, 0, 180), [0, 0, 0.3]);
  // Unas cajas de herramientas y piezas de repuesto por la banda.
  for (let k = 0; k < 14; k++) {
    const phi = 40 + k * 7.3;
    const f = engineFrame(phi, k % 2 ? 15 : -15, k * 23);
    builder.inside.add(
      k % 3 ? PALETTE.rust : PALETTE.slate,
      box(),
      f.at([0, 0, 0.3], [0, 0, 0], [0.8, 0.6, 0.6]),
      'metal',
    );
    if (k % 3 === 0)
      builder.inside.add(PALETTE.sandDark, torus(0.35, 0.08, 14, 4), f.at([0, 0, 0.9]), 'metal', {
        solid: false,
      });
  }
  return [...microHole(builder), ...oldMotor(builder)];
}
