// Los aros de oro viejo de los Ausentes vivos (plan de finales, E3; 🟡 Anthony 2026-11-14: «tenían una especie de
// aros dorados», que no estaba escrito): en el cuello, las muñecas y los tobillos, y uno o dos flotando alrededor de la
// cabeza como una órbita inclinada (por delante pasan bajo el óvalo, sin tapar el vidrio; nunca horizontales sobre
// ella: no es un halo). Ella, muchos y finos; él, pocos y gruesos (absentShape.ts). El metal, un poco gastado.
import { Color, Matrix4, Vector3 } from 'three';
import { gridGeometry, sectionAt, spread } from './absentLoft';
import {
  ABSENT_RINGS,
  HEAD_RINGS,
  type GoldRings,
  type RingPlace,
  type Section,
} from './absentShape';
import type { AbsentContext, AbsentSegment } from './absentParts';

/** La forma de la sección: lo que mide hacia fuera y lo que mide de alto, por cada `tube` (1, 1: un hilo redondo). */
type RingProfile = readonly [outward: number, tall: number];
const WIRE: RingProfile = [1, 1];
/** Los gruesos de él son bandas: más altas que gruesas (un torques, unos brazaletes). */
const BAND: RingProfile = [0.65, 1.7];

interface RingOptions {
  width: number;
  depth: number;
  tube: number;
  profile?: RingProfile;
  /** Más segmentos alrededor (los de la cabeza se ven de cerca y solos). */
  smooth?: boolean;
}

/** Un aro elíptico (semiejes `width` en X y `depth` en Y de su plano) de sección `tube` (m), con su marco. */
function goldRing(s: AbsentSegment, c: AbsentContext, frame: Matrix4, options: RingOptions): void {
  const { width, depth, tube } = options;
  const [outward, tall] = options.profile ?? WIRE;
  // Lo justo para que se vean redondos con el sombreado suave (son muchos y el presupuesto es corto).
  const thin = tube < 0.006;
  const size = Math.max(width, depth);
  const around = Math.round(
    options.smooth ? 16 + 80 * size : thin ? 12 + 60 * size : 12 + 30 * size,
  );
  const section = thin ? 3 : options.profile === BAND ? 5 : 4;
  const gold = new Color(c.look.gold);
  const worn = new Color(c.look.goldDark);
  const seed = s.next() * 6;
  const geometry = gridGeometry({
    us: spread(0, Math.PI * 2, around, true),
    vs: spread(0, Math.PI * 2, section + 1),
    closed: true,
    point: (u, v) => {
      const sin = Math.sin(u);
      const cos = Math.cos(u);
      // La normal de la elipse en su plano, y el tubo alrededor de ella.
      const n = new Vector3(sin / width, cos / depth, 0).normalize();
      return new Vector3(width * sin, depth * cos, 0)
        .addScaledVector(n, tube * outward * Math.cos(v))
        .add(new Vector3(0, 0, tube * tall * Math.sin(v)))
        .applyMatrix4(frame);
    },
    // Gastado a trozos, más por dentro (donde roza).
    color: (u, v) =>
      gold
        .clone()
        .lerp(worn, 0.22 * (0.5 + 0.5 * Math.sin(3 * u + seed)) + 0.25 * Math.max(0, -Math.cos(v))),
  });
  s.addWoven('metal', geometry);
}

const ringsAt = (c: AbsentContext, place: RingPlace): GoldRings | undefined =>
  ABSENT_RINGS[c.who].find((r) => r.place === place);

/** Unos aros apretados alrededor de unas secciones (cuello, muñeca, tobillo), a esas alturas. */
function hugging(
  s: AbsentSegment,
  c: AbsentContext,
  sections: readonly Section[],
  heights: readonly number[],
  tube: number,
  tilt = 0,
): void {
  const profile = tube >= 0.012 ? BAND : WIRE;
  for (const z of heights) {
    const p = sectionAt(sections, z);
    const gap = tube * profile[0] + 0.003;
    const frame = new Matrix4()
      .makeTranslation(p.x, p.y + (p.front - p.back) / 2, z)
      .multiply(new Matrix4().makeRotationX(-tilt));
    goldRing(s, c, frame, {
      width: p.rx + gap,
      depth: (p.front + p.back) / 2 + gap,
      tube,
      profile,
    });
  }
}

/** Alturas repartidas entre `from` y `to`, `count` de ellas (una sola, en medio). */
const between = (from: number, to: number, count: number): number[] =>
  count === 1 ? [(from + to) / 2] : spread(from, to, count);

/** Los del cuello: ella, una columna de aros finos entre las juntas; él, un torques grueso en la base. */
export function neckRings(s: AbsentSegment, c: AbsentContext): void {
  const spec = ringsAt(c, 'neck');
  if (!spec) return;
  const neck = c.shape.neck;
  const from = neck[0]?.z ?? 0;
  const to = neck[neck.length - 1]?.z ?? 0;
  const span = to - from;
  if (c.who === 'cientifica') {
    hugging(s, c, neck, between(from + span * 0.3, from + span * 0.74, spec.count), spec.tube);
  } else {
    hugging(s, c, neck, [from + span * 0.2], spec.tube, 0.14);
  }
}

/** Los de una muñeca, sobre el final del antebrazo. */
export function wristRings(s: AbsentSegment, c: AbsentContext, sections: readonly Section[]): void {
  const spec = ringsAt(c, 'wrist');
  if (!spec) return;
  const [, , elbowZ] = c.joints.elbow;
  const [, , wristZ] = c.joints.wrist;
  const at = (t: number): number => elbowZ + (wristZ - elbowZ) * t;
  hugging(
    s,
    c,
    sections,
    spec.count === 1 ? [at(0.88)] : between(at(0.8), at(0.95), spec.count),
    spec.tube,
  );
}

/** Los de un tobillo, sobre el final de la espinilla. */
export function ankleRings(s: AbsentSegment, c: AbsentContext, sections: readonly Section[]): void {
  const spec = ringsAt(c, 'ankle');
  if (!spec) return;
  const ankle = c.joints.ankle[2];
  hugging(
    s,
    c,
    sections,
    spec.count === 1 ? [ankle + 0.075] : between(ankle + 0.035, ankle + 0.075, spec.count),
    spec.tube,
  );
}

/** Los que flotan alrededor de la cabeza (en su hueso: siguen sus giros). */
export function headRings(s: AbsentSegment, c: AbsentContext): void {
  const spec = ringsAt(c, 'head');
  if (!spec) return;
  for (const ring of HEAD_RINGS[c.who].slice(0, spec.count)) {
    const [x, y, z] = ring.center;
    const frame = new Matrix4()
      .makeTranslation(x, y, z)
      .multiply(new Matrix4().makeRotationZ(ring.yaw))
      .multiply(new Matrix4().makeRotationX(-ring.tilt));
    goldRing(s, c, frame, { width: ring.width, depth: ring.depth, tube: spec.tube, smooth: true });
  }
}
