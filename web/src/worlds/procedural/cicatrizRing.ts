// El anillo de Cicatriz (Fase 11H; ✅ Anthony 2026-11-04: lo que perdió el planeta formó un anillo): miles de rocas
// y un velo de polvo en un disco inclinado que gira despacio (ANIM_, sin colisión) y cuatro fragmentos grandes,
// fijos, donde se puede posar la nave: el Faro, el Muro Arrancado (media casa del revés, con la mesa aún servida),
// el Andamio de Pesca y la Losa del Símbolo.
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
} from 'three';
import {
  applySkyLight,
  ball,
  box,
  cone,
  cylinder,
  latLon,
  pieceMatrix,
  torus,
  type Frame,
  type SkyLightColors,
} from './kit';
import { seededRandom } from './noise';
import { RING_AXIS, RING_INNER, RING_OUTER } from './cicatrizShape';
import { flatFrame, PALETTE, type CicatrizBuilder } from './cicatrizKit';
import { FAR_HIDDEN } from '../../render/nearDetail';

/** Cuántas rocas lleva el anillo. */
export const RING_ROCKS = 3500;
/** Una banda sin rocas en el anillo (m del centro), como un surco. */
const GAP: readonly [number, number] = [127, 131];
/** Radio (m) de los fragmentos pisables. */
export const FRAGMENT_RADIUS = 124;

export type FragmentId = 'faro' | 'muro' | 'andamio' | 'losa';

/** Los cuatro fragmentos, por su ángulo alrededor del eje del anillo (grados). */
export const FRAGMENTS: readonly {
  id: FragmentId;
  angle: number;
  size: number;
  heading: number;
}[] = [
  { id: 'faro', angle: 20, size: 9, heading: 0 },
  { id: 'muro', angle: 115, size: 10, heading: 60 },
  { id: 'andamio', angle: 205, size: 11, heading: 140 },
  { id: 'losa', angle: 290, size: 8, heading: 220 },
];

/** Dos direcciones perpendiculares en el plano del anillo. */
export function ringBasis(): { u: Vector3; v: Vector3 } {
  const helper = Math.abs(RING_AXIS.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
  const u = helper.clone().cross(RING_AXIS).normalize();
  return { u, v: RING_AXIS.clone().cross(u).normalize() };
}

/** La dirección (desde el centro del planeta) de un ángulo del anillo. */
export function ringDirection(angle: number): Vector3 {
  const { u, v } = ringBasis();
  const a = (angle * Math.PI) / 180;
  return u.multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
}

/** El marco de un fragmento: la cara de arriba, mirando hacia fuera del planeta. */
export function fragmentFrame(id: FragmentId): Frame {
  const spec = FRAGMENTS.find((f) => f.id === id);
  if (!spec) throw new Error(`No existe el fragmento "${id}"`);
  const { lat, lon } = latLon(ringDirection(spec.angle));
  return flatFrame(lat, lon, FRAGMENT_RADIUS, spec.heading);
}

/** Las rocas y el polvo del anillo, en un grupo que gira sobre el eje del anillo. */
export function ringDust(sun: Vector3, light: SkyLightColors): Group {
  const random = seededRandom(91);
  const rock = new IcosahedronGeometry(1, 0);
  const material = new MeshStandardMaterial({ flatShading: true, roughness: 0.95 });
  applySkyLight(material, sun, light);
  const mesh = new InstancedMesh(rock, material, RING_ROCKS);
  mesh.name = 'cicatriz_Anillo_Rocas';
  mesh.userData[FAR_HIDDEN] = true; // de lejos, el anillo es su velo de polvo
  const keepOut = FRAGMENTS.map((f) => ringDirection(f.angle).multiplyScalar(FRAGMENT_RADIUS));
  // Las instancias van en el marco del grupo, cuyo Y es el eje del anillo (gira sobre su Y local).
  const toGroup = new Quaternion().setFromUnitVectors(RING_AXIS, new Vector3(0, 1, 0));
  const m = new Matrix4();
  const q = new Quaternion();
  const color = new Color();
  const tints = [PALETTE.rust, PALETTE.ash, PALETTE.black, PALETTE.rustLight, PALETTE.sandDark];
  let count = 0;
  for (let attempt = 0; attempt < RING_ROCKS * 3 && count < RING_ROCKS; attempt++) {
    const t = random();
    const radius = RING_INNER + (RING_OUTER - RING_INNER) * (0.5 - 0.5 * Math.cos(Math.PI * t));
    if (radius > GAP[0] && radius < GAP[1]) continue;
    const angle = random() * 360;
    const p = ringDirection(angle).multiplyScalar(radius);
    p.addScaledVector(RING_AXIS, (random() + random() + random() - 1.5) * 1.6);
    if (keepOut.some((k) => k.distanceTo(p) < 20)) continue;
    const size = 0.15 + random() ** 4 * 2.6;
    q.set(random() - 0.5, random() - 0.5, random() - 0.5, random() - 0.5).normalize();
    m.compose(
      p.applyQuaternion(toGroup),
      q,
      new Vector3(size, size * (0.6 + random() * 0.6), size * (0.7 + random() * 0.5)),
    );
    mesh.setMatrixAt(count, m);
    mesh.setColorAt(
      count,
      color
        .set(tints[count % tints.length] ?? PALETTE.ash)
        .offsetHSL(0, 0, (random() - 0.5) * 0.08),
    );
    count++;
  }
  mesh.count = count;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  const veil = new Mesh(
    new RingGeometry(RING_INNER - 2, RING_OUTER + 4, 160, 3).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({
      // Aditivo: el polvo brilla un poco con la luz, no tapa el planeta como un disco oscuro.
      color: new Color('#c08060').multiplyScalar(0.22),
      blending: AdditiveBlending,
      transparent: true,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  veil.name = 'cicatriz_Anillo_Polvo';
  veil.renderOrder = 2;
  const group = new Group();
  group.name = 'ANIM_anillo';
  group.userData.spin = 0.012;
  group.quaternion.copy(toGroup.clone().invert());
  group.add(mesh, veil);
  return group;
}

/** La roca de un fragmento: la cara plana de arriba (con losas de los Ausentes) y el cono que cuelga. */
function rock(builder: CicatrizBuilder, f: Frame, size: number): void {
  const v = builder.outside;
  const r = builder.random;
  v.add(PALETTE.ash, cylinder(size, 14), f.at([0, 0, -0.7], [0, 0, 0], [1, 1, 1.4]));
  v.add(
    PALETTE.sandDark,
    cylinder(size * 0.7, 14),
    f.at([0, 0, 0.02], [0, 0, 0], [1, 1, 0.06]),
    'stone',
    { solid: false },
  );
  v.add(
    PALETTE.rust,
    cone(0.5, size, 9),
    f.at([0, 0, -1.4 - size * 0.7], [Math.PI, 0, r()], [1, 1, size * 1.4]),
    'stone',
    { solid: false },
  );
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + r();
    const d = size * (0.3 + r() * 0.5);
    const s = size * (0.25 + r() * 0.25);
    v.add(
      k % 2 ? PALETTE.black : PALETTE.rust,
      cone(s, 0.2, 6),
      f.at(
        [Math.cos(a) * d, Math.sin(a) * d, -1.4 - s],
        [Math.PI + r() * 0.4, r() * 0.4, 0],
        [1, 1, s * 2],
      ),
      'stone',
      { solid: false },
    );
  }
  // El corte: un filo encendido alrededor, liso como los de casa.
  v.add(
    PALETTE.ember,
    torus(size + 0.02, 0.05, 40, 3),
    f.at([0, 0, -0.05], [Math.PI / 2, 0, 0]),
    'light',
    { glow: 1.2 },
  );
}

/** El Faro: una torre con un aro de luz que gira y, al pie, la placa del anillo. */
function faro(builder: CicatrizBuilder): void {
  const f = fragmentFrame('faro');
  const v = builder.outside;
  rock(builder, f, 9);
  for (let k = 0; k < 5; k++)
    v.add(
      k % 2 ? PALETTE.sand : PALETTE.sandDark,
      cylinder(1.6 - k * 0.15, 12),
      f.at([0, 2, 0.8 + k * 1.6], [0, 0, 0], [1, 1, 1.6]),
    );
  v.add(PALETTE.slate, cylinder(0.9, 10), f.at([0, 2, 9.0], [0, 0, 0], [1, 1, 0.6]), 'metal');
  const top = f.at([0, 2, 9.8]);
  builder.spinning('ANIM_faro', top, { spin: 0.9 }, 'outside', (set) => {
    set.add(
      PALETTE.slate,
      torus(1.4, 0.12, 24, 4),
      pieceMatrix([0, 0, 0], [Math.PI / 2, 0, 0]),
      'metal',
      { solid: false },
    );
    for (const s of [-1, 1])
      set.add(
        PALETTE.ember,
        box(),
        pieceMatrix([s * 1.4, 0, 0], [0, 0, 0], [0.5, 0.5, 0.5]),
        'light',
        { glow: 2.4 },
      );
  });
  v.add(PALETTE.black, box(), f.at([2.4, -2.6, 0.6], [0, 0, 0.3], [1.4, 0.4, 1.2]), 'metal');
  v.add(
    PALETTE.bone,
    box(),
    f.at([2.4 + 0.06, -2.82, 0.9], [-0.2, 0, 0.3], [1.1, 0.03, 0.7]),
    'stone',
    { solid: false },
  );
  builder.mark('INT_anillo', f, [2.2, -3.6, 1.2], { clue_id: 'cicatriz.anillo', kind: 'texto' });
  builder.mark('SPAWN_Isla_Faro', f, [-3, -3, 0.3]);
}

/** El Muro Arrancado: arriba, el cimiento con un dintel en pie; abajo cuelga la casa del revés, con su mesa servida. */
function muro(builder: CicatrizBuilder): void {
  const f = fragmentFrame('muro');
  const v = builder.outside;
  rock(builder, f, 10);
  for (const x of [-1.2, 1.2])
    v.add(PALETTE.sand, box(), f.at([x, 0, 1.4], [0, 0, 0], [0.5, 0.6, 2.8]));
  v.add(PALETTE.sandDark, box(), f.at([0, 0, 3.0], [0, 0, 0], [3.2, 0.7, 0.5]));
  v.add(PALETTE.rust, box(), f.at([-4, 3, 0.4], [0, 0, 0.4], [3, 0.5, 0.8]));
  // La casa del revés, bajo la roca: suelo arriba, paredes colgando, la mesa pegada a su suelo.
  const under = -3.2;
  v.add(PALETTE.sandDark, box(), f.at([3, -1, under], [0, 0, 0], [6, 5, 0.4]));
  v.add(PALETTE.sand, box(), f.at([3, 1.5, under - 1.6], [0, 0, 0], [6, 0.4, 3.2]));
  v.add(PALETTE.sand, box(), f.at([6, -1, under - 1.6], [0, 0, 0], [0.4, 5, 3.2]));
  v.add(
    PALETTE.rustLight,
    box(),
    f.at([3, -1, under - 0.95], [0, 0, 0], [2.0, 1.1, 0.08]),
    'stone',
    { solid: false },
  );
  for (const [x, y] of [
    [2.1, -1.4],
    [3.9, -1.4],
    [2.1, -0.6],
    [3.9, -0.6],
  ] as const)
    v.add(
      PALETTE.black,
      box(),
      f.at([x, y, under - 0.55], [0, 0, 0], [0.08, 0.08, 0.75]),
      'stone',
      { solid: false },
    );
  for (let k = 0; k < 4; k++) {
    v.add(
      PALETTE.bone,
      cylinder(0.14, 10),
      f.at([2.4 + k * 0.4, -1, under - 1.02], [0, 0, 0], [1, 1, 0.03]),
      'stone',
      { solid: false },
    );
    v.add(
      PALETTE.paper,
      cylinder(0.05, 8),
      f.at([2.4 + k * 0.4, -0.75, under - 1.08], [0, 0, 0], [1, 1, 0.12]),
      'stone',
      { solid: false },
    );
  }
  v.add(PALETTE.lamp, ball(0.15, 1), f.at([3, -1, under - 2.9]), 'light', { glow: 1.4 });
  builder.mark('SPAWN_Isla_Muro', f, [-3, -4, 0.3]);
}

/** El Andamio de Pesca: brazos de celosía con redes tendidas hacia fuera, para coger lo que salía despedido. */
function andamio(builder: CicatrizBuilder): void {
  const f = fragmentFrame('andamio');
  const v = builder.outside;
  rock(builder, f, 11);
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3 + 0.4;
    const x = Math.cos(a);
    const y = Math.sin(a);
    v.add(PALETTE.slate, box(), f.at([x * 4, y * 4, 3], [0, 0, 0], [0.5, 0.5, 6]), 'metal');
    for (let s = 0; s < 6; s++) {
      v.add(
        PALETTE.rust,
        box(),
        f.at([x * (5 + s * 1.5), y * (5 + s * 1.5), 6 - s * 0.2], [0, 0, a], [1.6, 0.18, 0.18]),
        'metal',
        { solid: false },
      );
    }
    // La red: hilos cruzados al final del brazo.
    for (let n = 0; n < 6; n++) {
      v.add(
        PALETTE.bone,
        box(),
        f.at([x * 13, y * 13, 3.5 + n * 0.5], [0, 0, a + Math.PI / 2], [3.2, 0.03, 0.03]),
        'stone',
        { solid: false },
      );
      v.add(
        PALETTE.bone,
        box(),
        f.at(
          [
            x * 13 + Math.cos(a + Math.PI / 2) * (n - 2.5) * 0.55,
            y * 13 + Math.sin(a + Math.PI / 2) * (n - 2.5) * 0.55,
            4.7,
          ],
          [0, 0, 0],
          [0.03, 0.03, 2.8],
        ),
        'stone',
        { solid: false },
      );
    }
    v.add(PALETTE.lamp, ball(0.2, 1), f.at([x * 13.5, y * 13.5, 6.4]), 'light', { glow: 1.8 });
  }
  // Lo que se pescó: piedras talladas en una red caída.
  for (let k = 0; k < 6; k++)
    v.add(
      k % 2 ? PALETTE.sand : PALETTE.rust,
      box(),
      f.at([-2 + k * 0.8, 1.5 + (k % 2), 0.4], [0.2, 0.1, k], [0.8, 0.6, 0.6]),
      'stone',
    );
  builder.mark('SPAWN_Isla_Andamio', f, [0, -5, 0.3]);
}

/** La Losa del Símbolo: un trozo de pared tallada con un anillo entero de marcas de reloj, de pie sobre su roca. */
function losa(builder: CicatrizBuilder): void {
  const f = fragmentFrame('losa');
  const v = builder.outside;
  rock(builder, f, 8);
  v.add(PALETTE.sand, box(), f.at([0, 0, 2.6], [0.1, 0, 0], [5.5, 0.9, 5.2]));
  for (let k = 0; k < 24; k++) {
    const a = (2 * Math.PI * k) / 24;
    v.add(
      k % 6 === 0 ? PALETTE.ember : PALETTE.rust,
      box(),
      f.at(
        [Math.cos(a) * 1.7, -0.5, 2.7 + Math.sin(a) * 1.7],
        [0.1, Math.PI / 2 - a, 0],
        [0.12, 0.06, k % 2 === 0 ? 0.5 : 0.3],
      ),
      k % 6 === 0 ? 'light' : 'stone',
      { solid: false, glow: 1.4 },
    );
  }
  v.add(PALETTE.ember, box(), f.at([2.75, -0.46, 2.6], [0.1, 0, 0], [0.05, 0.05, 5.1]), 'light', {
    glow: 1.3,
  });
  builder.mark('SPAWN_Isla_Losa', f, [0, -4, 0.3]);
}

/** Los cuatro fragmentos pisables. */
export function ringFragments(builder: CicatrizBuilder): void {
  faro(builder);
  muro(builder);
  andamio(builder);
  losa(builder);
}
