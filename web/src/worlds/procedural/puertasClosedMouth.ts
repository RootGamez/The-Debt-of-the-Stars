// La cuarta boca de casa, la tapada (semilla del final secreto, hito F6 de docs/plan-finales.md §4.5; 🟡 el aspecto):
// la losa no casa con el arco —descansa sobre dos calzos y deja abajo un resquicio con forma de sonrisa— y por él se ve
// el Laboratorio del pasado con luz de lámpara: una mesa larga partida en dos y dos figuras quietas, una a cada lado
// (la de ella, hecha de círculos; la de él, de triángulos). Es una lámina pintada al fondo de la boca, entre la losa y
// otra losa de atrás: no se cruza (sin PASO_ ni gusano) y no añade mallas ni luces (todo va en las piezas del mundo).
// La lámina está a un palmo por detrás del resquicio y más baja que él: hay que acercar la cara y mirar hacia abajo
// para ver la sala; de lejos solo asoma un hilo de luz cálida (puertas.boca_cerrada: «si apartas la cara, la losa
// vuelve a ser solo una losa»).
import { box, cylinder, torusArc, type Frame } from './kit';
import { PALETTE as P, type PuertasBuilder } from './puertasKit';

/**
 * Medidas de la boca tapada (m), en el plano de la boca: x a la derecha de quien la mira, z hacia arriba desde su
 * centro e y hacia dentro (se mira desde −y).
 */
export const CLOSED_MOUTH = {
  /** Radio de dentro del arco: el aro de una boca de casa (1,7) menos su tubo (0,2). */
  archInner: 1.5,
  /** Radio de fuera del aro: lo que la losa no puede pasar sin asomar. */
  archOuter: 1.9,
  /** La losa: su radio, cuánto la suben los calzos, su grosor y dónde queda su cara de delante. */
  slabRadius: 1.56,
  slabLift: 0.31,
  slabThickness: 0.12,
  slabFront: -0.08,
  /** La lámina con la vista (y) y la losa de atrás que la cierra. */
  view: 0.175,
  backFront: 0.18,
  backRadius: 1.66,
  /** Los calzos, a cada lado del punto más bajo (grados desde la vertical): entre ellos queda el resquicio. */
  wedgeAngle: 27,
} as const;

const DEG = Math.PI / 180;
/** La lámina va de cara a −y: su eje (el del cilindro) se tumba sobre y. */
const FACING: readonly [number, number, number] = [Math.PI / 2, 0, 0];

/** Los colores de la sala (luz de lámpara del Laboratorio, cuando aún se encendía). */
const ROOM = {
  wall: '#B06C36',
  floor: '#6E4A2C',
  halo: '#FFC070',
  core: P.light,
  shadow: '#2B1E16',
  sign: P.light,
} as const;

/**
 * Alto del resquicio (m) a `x` metros del eje de la boca: de la parte baja del arco a la de la losa; 0 donde la losa
 * toca el arco o fuera de él.
 */
export function slitOpening(x: number): number {
  const { archInner, slabRadius, slabLift } = CLOSED_MOUTH;
  if (Math.abs(x) >= archInner) return 0;
  const arch = -Math.sqrt(archInner * archInner - x * x);
  const slab = slabLift - Math.sqrt(slabRadius * slabRadius - x * x);
  return Math.max(0, slab - arch);
}

/** Distancia del centro de la boca al borde de la losa en la dirección `a` (rad, en el plano XZ desde +X hacia +Z). */
function slabEdge(a: number): number {
  const { slabRadius, slabLift } = CLOSED_MOUTH;
  const uz = Math.sin(a);
  return slabLift * uz + Math.sqrt(slabLift * slabLift * (uz * uz - 1) + slabRadius * slabRadius);
}

/** La losa levantada, su marca de «pronto», los dos calzos y la losa de atrás. */
function slabs(b: PuertasBuilder, g: Frame, centre: number): void {
  const { slabRadius, slabLift, slabThickness, slabFront, backFront, backRadius } = CLOSED_MOUTH;
  const slabZ = centre + slabLift;
  b.solid(
    P.sandstoneShade,
    cylinder(slabRadius, 24),
    g.at([0, slabFront + slabThickness / 2, slabZ], FACING, [1, 1, slabThickness]),
  );
  // La marca de «pronto»: un aro abierto, en el centro de la losa.
  b.view(
    P.slate,
    torusArc(0.5, 0.05, 0.4, 2 * Math.PI - 0.4, 14, 4),
    g.at([0, slabFront - 0.01, slabZ]),
  );
  // Detrás, otra losa que cierra la boca por su espalda (y, desde fuera, la tapa también por ese lado).
  b.solid(
    P.sandstoneShade,
    cylinder(backRadius, 24),
    g.at([0, backFront + 0.06, centre], FACING, [1, 1, 0.12]),
  );
  for (const side of [-1, 1]) {
    // Los calzos de bronce que la sostienen, a los lados del resquicio…
    wedge(b, g, centre, side * CLOSED_MOUTH.wedgeAngle, P.bronze, 0.13, 'metal');
    // …y, más allá, piedras metidas a presión: solo queda abierto el centro.
    for (let k = 1; ; k++) {
      const from = CLOSED_MOUTH.wedgeAngle + k * 7;
      const a = (-90 + side * from) * DEG;
      if (CLOSED_MOUTH.archInner - slabEdge(a) < 0.015) break;
      wedge(b, g, centre, side * from, k % 2 ? P.sandstone : P.sandstoneShade, 0.19, 'stone');
    }
  }
}

/**
 * Una piedra (o un calzo) encajada entre la losa y el arco, a `angle` grados de la parte más baja (positivo, hacia
 * la derecha de quien mira): ocupa todo el hueco y un poco más.
 */
function wedge(
  b: PuertasBuilder,
  g: Frame,
  centre: number,
  angle: number,
  color: string,
  width: number,
  kind: 'stone' | 'metal',
): void {
  const { archInner, slabFront, slabThickness } = CLOSED_MOUTH;
  const a = (angle - 90) * DEG;
  const inner = slabEdge(a);
  const r = (inner + archInner) / 2;
  b.view(
    color,
    box(),
    g.at(
      [
        Math.cos(a) * r,
        slabFront + slabThickness / 2 + Math.cos(angle * 0.9) * 0.012,
        centre + Math.sin(a) * r,
      ],
      // Cada una, un poco torcida: se metieron a mano.
      [0, -a + Math.sin(angle * 1.7) * 0.1, 0],
      [archInner - inner + 0.06, slabThickness + 0.04, width],
    ),
    kind,
  );
}

/** Una pieza plana de la lámina, de cara a quien mira, a `layer` capas por delante del fondo. */
function paint(
  b: PuertasBuilder,
  g: Frame,
  color: string,
  geometry: ReturnType<typeof box>,
  at: readonly [number, number],
  size: readonly [number, number],
  layer: number,
  glow = 1,
  tilt = 0,
): void {
  const y = CLOSED_MOUTH.view - 0.004 * layer;
  b.lamp(
    color,
    geometry,
    g.at([at[0], y, at[1]], [Math.PI / 2, tilt, 0], [size[0], size[1], 0.003]),
    glow,
  );
}

/**
 * La vista: la pared cálida de la sala, el halo de la lámpara sobre la mesa, la mesa partida en dos (la mitad de él,
 * un pelo más baja) con una taza en pie en cada lado, y las dos figuras detrás, inclinadas apenas la una hacia la otra.
 * Todo por debajo del resquicio: así solo se ve acercándose y mirando hacia abajo.
 */
function pastLaboratory(b: PuertasBuilder, g: Frame, centre: number): void {
  const z = (dz: number): number => centre + dz;
  const disc = cylinder(1, 16);
  const tri = cylinder(1, 3);
  // El fondo: la pared (que entra en el aro, sin rendijas al borde), el suelo y el halo de la lámpara.
  const { backRadius } = CLOSED_MOUTH;
  paint(b, g, ROOM.wall, cylinder(1, 24), [0, z(0)], [backRadius, backRadius], 0);
  paint(b, g, ROOM.floor, box(), [0, z(-1.6)], [1.2, 0.1], 1);
  paint(b, g, ROOM.halo, disc, [0, z(-1.36)], [0.5, 0.22], 1, 1.1);
  paint(b, g, ROOM.core, disc, [0, z(-1.33)], [0.2, 0.09], 2, 1.2);
  // Ella, de círculos: cabeza, cuerpo y su signo encendido en el pecho.
  const her = -0.36;
  paint(b, g, ROOM.shadow, disc, [her, z(-1.42)], [0.062, 0.088], 3, 1, 0.06);
  paint(b, g, ROOM.shadow, disc, [her + 0.006, z(-1.312)], [0.036, 0.036], 3);
  paint(b, g, ROOM.sign, cylinder(1, 4), [her + 0.002, z(-1.395)], [0.009, 0.013], 4, 1.3);
  // Él, de triángulos con la punta hacia abajo: el cuerpo y la cabeza.
  const him = 0.36;
  paint(b, g, ROOM.shadow, tri, [him, z(-1.41)], [0.085, 0.1], 3, 1, -0.05);
  paint(b, g, ROOM.shadow, tri, [him - 0.004, z(-1.305)], [0.042, 0.042], 3);
  // La mesa partida, por delante de las dos figuras; las patas y las dos tazas en pie.
  paint(b, g, ROOM.shadow, box(), [-0.305, z(-1.47)], [0.59, 0.022], 5);
  paint(b, g, ROOM.shadow, box(), [0.305, z(-1.474)], [0.59, 0.022], 5);
  for (const x of [-0.58, -0.035, 0.035, 0.58]) {
    paint(b, g, ROOM.shadow, box(), [x, z(-1.535)], [0.012, 0.11], 5);
  }
  for (const x of [-0.19, 0.21]) {
    paint(b, g, ROOM.shadow, box(), [x, z(-1.449)], [0.018, 0.02], 5);
  }
}

/** La cuarta boca: tapada, con su resquicio y la vista; devuelve dónde va su marca (en el marco de la boca). */
export function closedMouth(
  b: PuertasBuilder,
  g: Frame,
  centre: number,
): readonly [number, number, number] {
  slabs(b, g, centre);
  pastLaboratory(b, g, centre);
  // La marca, delante del resquicio: se lee mirándolo de cerca.
  return [0, -0.4, centre - 1.3];
}
