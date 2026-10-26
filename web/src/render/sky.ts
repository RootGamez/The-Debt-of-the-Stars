// Cielo de estrellas: puntos fijos muy lejanos. Al caminar sobre un planeta pequeño el cielo "gira",
// lo que ayuda a sentir la curvatura. Coste: un solo draw call.
import { BufferAttribute, BufferGeometry, Points, PointsMaterial, Vector3 } from 'three';

const STAR_COUNT = 1800;
const SKY_RADIUS = 3000;
const STAR_COLOR = 0xfff2dd;

/** Generador pseudoaleatorio con semilla: el cielo es siempre el mismo. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStarfield(seed = 7): Points {
  const random = mulberry32(seed);
  const positions = new Float32Array(STAR_COUNT * 3);
  const direction = new Vector3();
  for (let i = 0; i < STAR_COUNT; i++) {
    direction.set(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1);
    if (direction.lengthSq() < 1e-6) direction.set(0, 1, 0);
    direction.setLength(SKY_RADIUS);
    positions.set([direction.x, direction.y, direction.z], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  // Sin prueba de profundidad y dibujadas primero: el cielo queda siempre detrás, aunque un mundo
  // lejano esté más allá de su radio.
  const material = new PointsMaterial({
    color: STAR_COLOR,
    size: 1.6,
    sizeAttenuation: false,
    depthTest: false,
    depthWrite: false,
  });
  const stars = new Points(geometry, material);
  stars.name = 'Estrellas';
  stars.frustumCulled = false;
  stars.renderOrder = -1;
  return stars;
}
