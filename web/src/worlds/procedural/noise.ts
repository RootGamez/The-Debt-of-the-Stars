// Azar sembrado y ruido simplex 3D para modelar por código: el mismo número de semilla da siempre el mismo
// mundo, en el navegador y en los tests.

export type Random = () => number;
export type Noise3 = (x: number, y: number, z: number) => number;

/** Generador mulberry32: rápido, reproducible y suficiente para colocar piedras. Devuelve [0, 1). */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const F3 = 1 / 3;
const G3 = 1 / 6;

/** Producto del gradiente `h` (uno de los 12 de las aristas del cubo) por (x, y, z). */
function gradient(h: number, x: number, y: number, z: number): number {
  switch (h % 12) {
    case 0:
      return x + y;
    case 1:
      return -x + y;
    case 2:
      return x - y;
    case 3:
      return -x - y;
    case 4:
      return x + z;
    case 5:
      return -x + z;
    case 6:
      return x - z;
    case 7:
      return -x - z;
    case 8:
      return y + z;
    case 9:
      return -y + z;
    case 10:
      return y - z;
    default:
      return -y - z;
  }
}

function corner(x: number, y: number, z: number, h: number): number {
  let t = 0.6 - x * x - y * y - z * z;
  if (t < 0) return 0;
  t *= t;
  return t * t * gradient(h, x, y, z);
}

/** Ruido simplex 3D (Gustavson) con una permutación sembrada. Devuelve aproximadamente [-1, 1]. */
export function createNoise(seed: number): Noise3 {
  const random = seededRandom(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = p[i] ?? 0;
    p[i] = p[j] ?? 0;
    p[j] = swap;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255] ?? 0;
  const at = (i: number): number => perm[i] ?? 0;

  return (x, y, z) => {
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const z0 = z - (k - t);
    // Esquinas del símplex en que cae el punto.
    let i1 = 0;
    let j1 = 0;
    let k1 = 0;
    let i2 = 0;
    let j2 = 0;
    let k2 = 0;
    if (x0 >= y0) {
      if (y0 >= z0) [i1, i2, j2] = [1, 1, 1];
      else if (x0 >= z0) [i1, i2, k2] = [1, 1, 1];
      else [k1, i2, k2] = [1, 1, 1];
    } else if (y0 < z0) [k1, j2, k2] = [1, 1, 1];
    else if (x0 < z0) [j1, j2, k2] = [1, 1, 1];
    else [j1, i2, j2] = [1, 1, 1];
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    return (
      32 *
      (corner(x0, y0, z0, at(ii + at(jj + at(kk)))) +
        corner(x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3, at(ii + i1 + at(jj + j1 + at(kk + k1)))) +
        corner(
          x0 - i2 + 2 * G3,
          y0 - j2 + 2 * G3,
          z0 - k2 + 2 * G3,
          at(ii + i2 + at(jj + j2 + at(kk + k2))),
        ) +
        corner(
          x0 - 1 + 3 * G3,
          y0 - 1 + 3 * G3,
          z0 - 1 + 3 * G3,
          at(ii + 1 + at(jj + 1 + at(kk + 1))),
        ))
    );
  };
}

/** Ruido fractal (fbm), normalizado a aproximadamente [-1, 1]. */
export function fbm(noise: Noise3, x: number, y: number, z: number, octaves = 4): number {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amplitude * noise(x * frequency, y * frequency, z * frequency);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return sum / norm;
}

/** Ruido de crestas: picos donde el ruido cruza el cero. Aproximadamente [0, 1]. */
export function ridged(noise: Noise3, x: number, y: number, z: number): number {
  let sum = 0;
  let amplitude = 0.6;
  let frequency = 1;
  for (let o = 0; o < 3; o++) {
    const n = 1 - Math.abs(noise(x * frequency, y * frequency, z * frequency));
    sum += amplitude * n * n;
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return sum / 1.05;
}
