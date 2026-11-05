// La cáscara de Cicatriz (Fase 11H): la roca de fuera con sus cuencos, la cara interior y, en cada mordida, el ojo
// que da a la cavidad. Las dos caras se recortan en el círculo del ojo (los vértices que caen en él se llevan al
// borde) y un anillo de los Ausentes tapa la costura. Se puede caer por el ojo (physics/cavityThroat.ts posa al
// personaje en la cara interior): un pretil en el cuenco dejaba atrapado a quien resbalaba hasta él.
// Los cortes dejan ver los estratos de la roca, en bandas.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { angleBetween, box, clamp, pieceMatrix, torus } from './kit';
import { createNoise, seededRandom } from './noise';
import {
  BITES,
  biteAxis,
  eyeAngle,
  INNER_RADIUS,
  innerGroundRadius,
  OUTER_RADIUS,
  outerGround,
  type Bite,
} from './cicatrizShape';
import { frameLooking, insideCarve, PALETTE, type CicatrizBuilder } from './cicatrizKit';

/** Subdivisión de las dos caras (icosfera): unos 105 mil triángulos fuera y 60 mil dentro. */
const OUTER_DETAIL = 54;
const INNER_DETAIL = 42;
/** Grosor de cada estrato que dejan ver los cortes (m). */
const STRATUM = 2.2;

const grain = createNoise(83);

/** Lleva una dirección al borde del ojo de una mordida (al ángulo del ojo desde su eje). */
function toEyeEdge(d: Vector3, b: Bite): Vector3 {
  const axis = biteAxis(b);
  const across = d.clone().addScaledVector(axis, -d.dot(axis));
  if (across.lengthSq() < 1e-10) across.set(1, 0, 0).addScaledVector(axis, -axis.x);
  across.normalize();
  const e = eyeAngle(b);
  return axis.multiplyScalar(Math.cos(e)).addScaledVector(across, Math.sin(e));
}

/** Pone a cada cara su color (por su centro, radio y pendiente) y quita las que sobran. */
function paint(
  geometry: BufferGeometry,
  keep: (a: number, b: number, c: number) => boolean,
  color: (center: Vector3, radius: number, slope: number, out: Color) => void,
  inward: boolean,
): BufferGeometry {
  const flat = geometry.toNonIndexed();
  const source = flat.getAttribute('position');
  const positions: number[] = [];
  const colors: number[] = [];
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const center = new Vector3();
  const normal = new Vector3();
  const edge = new Vector3();
  const tint = new Color();
  for (let f = 0; f < source.count; f += 3) {
    if (!keep(f, f + 1, f + 2)) continue;
    a.fromBufferAttribute(source, f);
    b.fromBufferAttribute(source, f + 1);
    c.fromBufferAttribute(source, f + 2);
    center.copy(a).add(b).add(c).divideScalar(3);
    const r = center.length();
    normal.subVectors(c, b).cross(edge.subVectors(a, b)).normalize();
    const slope = 1 - Math.abs(normal.dot(center.clone().divideScalar(r)));
    color(center, r, slope, tint);
    const corners = inward ? [a, c, b] : [a, b, c];
    for (const p of corners) {
      positions.push(p.x, p.y, p.z);
      colors.push(tint.r, tint.g, tint.b);
    }
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  out.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  out.computeVertexNormals();
  return out;
}

/** Una icosfera con sus vértices en una dirección cada uno (indexada). */
function sphereDirections(detail: number): BufferGeometry {
  const base = new IcosahedronGeometry(1, detail);
  base.deleteAttribute('normal');
  base.deleteAttribute('uv');
  return mergeVertices(base, 1e-6);
}

/** La roca de fuera: lomas, cuencos con estratos que se calientan hacia el ojo, y los huecos de bajo tierra. */
export function outerShell(builder: CicatrizBuilder): BufferGeometry {
  const sphere = sphereDirections(OUTER_DETAIL);
  const position = sphere.getAttribute('position');
  const hole = new Uint8Array(position.count);
  const d = new Vector3();
  for (let i = 0; i < position.count; i++) {
    d.fromBufferAttribute(position, i).normalize();
    const ground = outerGround(d);
    const point =
      ground.hole && ground.bite
        ? toEyeEdge(d, ground.bite).multiplyScalar(INNER_RADIUS)
        : d.clone().multiplyScalar(ground.radius);
    hole[i] = ground.hole ? 1 : 0;
    position.setXYZ(i, point.x, point.y, point.z);
  }
  // Por cara, qué vértices eran del ojo: se guardan en el orden de la geometría sin índices.
  const index = sphere.getIndex();
  const faceHole = (k: number): number => (index ? (hole[index.getX(k)] ?? 0) : 0);
  const random = seededRandom(84);
  const surface = new Color(PALETTE.ash);
  const rust = new Color(PALETTE.rust);
  // El estrato oscuro, no negro del todo: con negro puro las caras largas de las paredes parecían dientes.
  const dark = new Color(PALETTE.black).lerp(rust, 0.45);
  const ember = new Color(PALETTE.ember);
  const sand = new Color(PALETTE.sandDark);
  const tmp = new Vector3();
  return paint(
    sphere,
    (a, b, c) => {
      if (faceHole(a) + faceHole(b) + faceHole(c) === 3) return false;
      if (builder.carves.length === 0) return true;
      tmp
        .fromBufferAttribute(position, index ? index.getX(a) : a)
        .add(new Vector3().fromBufferAttribute(position, index ? index.getX(b) : b))
        .add(new Vector3().fromBufferAttribute(position, index ? index.getX(c) : c))
        .divideScalar(3);
      return !insideCarve(tmp, builder.carves);
    },
    (center, r, slope, out) => {
      const n = grain(center.x * 0.08, center.y * 0.08, center.z * 0.08);
      if (r > OUTER_RADIUS - 2.5 && slope < 0.45) {
        // La superficie: ceniza y óxido a manchas, con arena de los Ausentes en las lomas.
        out.copy(surface).lerp(rust, clamp(0.5 + n * 0.9, 0, 1));
        if (n > 0.35) out.lerp(sand, 0.35);
      } else {
        // Un corte: estratos alternos, más oscuros y calientes cuanto más hondo.
        const band = Math.floor(r / STRATUM) % 3;
        out.copy(band === 0 ? dark : band === 1 ? rust : surface);
        const heat = clamp((70 - r) / 10, 0, 1);
        out.lerp(ember, heat * heat * 0.55);
      }
      out.offsetHSL(0, 0, (random() - 0.5) * 0.05);
    },
    false,
  );
}

/** La cara interior: obsidiana con vetas, que se calienta junto a los ojos. Mira hacia el centro. */
export function innerShell(builder: CicatrizBuilder): BufferGeometry {
  const sphere = sphereDirections(INNER_DETAIL);
  const position = sphere.getAttribute('position');
  const hole = new Uint8Array(position.count);
  const d = new Vector3();
  for (let i = 0; i < position.count; i++) {
    d.fromBufferAttribute(position, i).normalize();
    const eye = BITES.find((b) => angleBetween(d, biteAxis(b)) < eyeAngle(b));
    const point = eye
      ? toEyeEdge(d, eye).multiplyScalar(INNER_RADIUS)
      : d.clone().multiplyScalar(innerGroundRadius(d));
    hole[i] = eye ? 1 : 0;
    position.setXYZ(i, point.x, point.y, point.z);
  }
  const index = sphere.getIndex();
  const faceHole = (k: number): number => (index ? (hole[index.getX(k)] ?? 0) : 0);
  const random = seededRandom(85);
  const stone = new Color('#2a2226');
  const vein = new Color(PALETTE.rust);
  const ember = new Color(PALETTE.ember);
  return paint(
    sphere,
    (a, b, c) => {
      if (faceHole(a) + faceHole(b) + faceHole(c) === 3) return false;
      if (builder.carves.length === 0) return true;
      const centroid = new Vector3()
        .fromBufferAttribute(position, index ? index.getX(a) : a)
        .add(new Vector3().fromBufferAttribute(position, index ? index.getX(b) : b))
        .add(new Vector3().fromBufferAttribute(position, index ? index.getX(c) : c))
        .divideScalar(3);
      return !insideCarve(centroid, builder.carves);
    },
    (center, r, _slope, out) => {
      const unit = center.clone().divideScalar(r);
      const n = grain(unit.x * 9, unit.y * 9, unit.z * 9);
      out.copy(stone).lerp(vein, clamp(n * 1.6, 0, 0.7));
      // Junto a un ojo la roca está caliente (por ahí sangra la luz de fuera y el calor de los cortes).
      const nearEye = Math.min(...BITES.map((b) => angleBetween(unit, biteAxis(b)) - eyeAngle(b)));
      out.lerp(ember, clamp(1 - nearEye / 0.06, 0, 1) * 0.35);
      out.offsetHSL(0, 0, (random() - 0.5) * 0.06 + (INNER_RADIUS - r) * 0.04);
    },
    true,
  );
}

/** Un marco en un círculo de una mordida: a `radius` del centro del planeta y `angle` desde su eje. */
function onCircle(b: Bite, radius: number, angle: number, around: number): Vector3 {
  const axis = biteAxis(b);
  const helper = Math.abs(axis.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
  const u = helper.clone().cross(axis).normalize();
  const v = axis.clone().cross(u).normalize();
  const across = u.multiplyScalar(Math.cos(around)).addScaledVector(v, Math.sin(around));
  return axis
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(across, Math.sin(angle))
    .multiplyScalar(radius);
}

/**
 * El anillo de contención de un ojo (tapa la costura entre las dos caras, con marcas de reloj que lucen hacia
 * dentro). No choca: entre él y la pared del cuenco quedaba una ranura donde atascarse.
 */
export function eyeTrim(builder: CicatrizBuilder, b: Bite): void {
  const axis = biteAxis(b);
  const e = eyeAngle(b);
  const ringRadius = INNER_RADIUS * Math.sin(e);
  const ringCenter = axis.clone().multiplyScalar(INNER_RADIUS * Math.cos(e));
  // El toro del kit está de pie en XZ (eje Y): su Y va al eje de la mordida.
  const toAxis = frameLooking(ringCenter, axis, new Vector3(0, 0, 1)).at(
    [0, 0, 0],
    [Math.PI / 2, 0, 0],
  );
  const segments = Math.max(28, Math.round(ringRadius * 4));
  // Solo se ve: si fuera sólido, entre la pared del cuenco y el anillo quedaba una ranura donde atascarse.
  builder.outside.add(PALETTE.slate, torus(ringRadius, 1.25, segments, 7), toAxis, 'metal', {
    solid: false,
  });
  builder.inside.add(
    PALETTE.lamp,
    torus(ringRadius - 1.05, 0.14, segments, 4),
    toAxis.clone().multiply(pieceMatrix([0, -0.9, 0])),
    'light',
    { glow: 1.6 },
  );
  const marks = 24;
  for (let k = 0; k < marks; k++) {
    const around = (2 * Math.PI * k) / marks;
    const p = onCircle(b, INNER_RADIUS - 1.3, e * 0.985, around);
    const f = frameLooking(p, p.clone().negate(), axis);
    builder.inside.add(
      k % 6 === 0 ? PALETTE.ember : PALETTE.sand,
      box(),
      f.at([0, 0, 0], [0, 0, 0], [0.25, 0.5, k % 6 === 0 ? 1.4 : 0.8]),
      k % 6 === 0 ? 'light' : 'stone',
      { glow: k % 6 === 0 ? 1.5 : 1, solid: false },
    );
  }
}

/** Los haces de la Brasa que entran por los ojos del lado de día y cruzan la cavidad. */
export function lightShafts(sun: Vector3): Mesh[] {
  const material = new MeshBasicMaterial({
    color: new Color(PALETTE.glass).multiplyScalar(0.08),
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const shafts: Mesh[] = [];
  for (const b of BITES) {
    const axis = biteAxis(b);
    if (axis.dot(sun) < 0.3) continue;
    const e = eyeAngle(b);
    const radius = INNER_RADIUS * Math.sin(e) * 0.9;
    const length = 85;
    // Un tubo de luz de eje Y que se estrecha: arriba, en el ojo; abajo, ya en la cavidad, lejos de la Brasa.
    const geometry = new CylinderGeometry(radius, radius * 0.55, length, 20, 1, true);
    geometry.translate(0, -length / 2, 0);
    const mesh = new Mesh(geometry, material);
    mesh.name = `cicatriz_Haz_${b.id}`;
    const start = axis.clone().multiplyScalar(INNER_RADIUS * Math.cos(e));
    mesh.position.copy(start);
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), sun.clone().normalize());
    mesh.renderOrder = 4;
    shafts.push(mesh);
  }
  return shafts;
}
