// Los dibujos de cada mundo para la bitácora (plan del HUD, F.2 y decisión 2): los mismos que se pintaron en la
// maqueta (docs/propuestas-hud.html), en 2D y a mano —cielo en degradado, suelo de facetas low poly, la silueta
// que distingue a cada mundo—, no fotos ni renders. Se pintan una vez en un lienzo pequeño y se guardan como
// imagen; el azar es reproducible, así cada mundo sale siempre igual.

/** Tamaño del dibujo (4:3), como en la maqueta. */
const DRAWING_WIDTH = 360;
const DRAWING_HEIGHT = 270;
const JPEG_QUALITY = 0.84;

type Point = [number, number];
type Painter = (paint: Paint) => void;

/** Azar reproducible (Park–Miller), el mismo de la maqueta. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/** Las herramientas de la maqueta, sobre un lienzo de `W` × `H`. */
class Paint {
  readonly rand: () => number;

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly W: number,
    readonly H: number,
    seed: number,
  ) {
    this.rand = seeded(seed);
  }

  grad(stops: readonly [number, string][], y0 = 0, y1 = this.H): CanvasGradient {
    const g = this.ctx.createLinearGradient(0, y0, 0, y1);
    for (const [offset, color] of stops) g.addColorStop(offset, color);
    return g;
  }

  fillSky(stops: readonly [number, string][]): void {
    this.ctx.fillStyle = this.grad(stops);
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  stars(count: number, maxY: number, alpha: number): void {
    const { ctx, W, H, rand } = this;
    for (let k = 0; k < count; k++) {
      ctx.fillStyle = `rgba(255,245,230,${rand() * alpha})`;
      const size = rand() < 0.1 ? 2 : 1.2;
      ctx.fillRect(rand() * W, rand() * H * maxY, size, size);
    }
  }

  halo(x: number, y: number, r: number, color: string): void {
    const g = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  disc(x: number, y: number, r: number, color: string | CanvasGradient): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  rect(color: string, x: number, y: number, w: number, h: number): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  /** El suelo low poly: una rejilla de 14 × 6 con las juntas movidas, coloreada por triángulo. */
  facets(yTop: number, colorAt: (t: number, n: number) => string): void {
    const { ctx, W, H, rand } = this;
    const nx = 14;
    const ny = 6;
    const pts: Point[][] = [];
    for (let j = 0; j <= ny; j++) {
      const row: Point[] = [];
      for (let i = 0; i <= nx; i++) {
        const inner = j > 0 && j < ny;
        const y = yTop + (H - yTop) * Math.pow(j / ny, 1.4) + (inner ? (rand() - 0.5) * 14 : 0);
        const x = (W * i) / nx + (i > 0 && i < nx ? (rand() - 0.5) * (W / nx) * 0.6 : 0);
        row.push([x, j === 0 ? yTop + Math.sin(i * 1.3) * 6 : y]);
      }
      pts.push(row);
    }
    const at = (j: number, i: number): Point => pts[j]?.[i] ?? [0, 0];
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = at(j, i);
        const b = at(j, i + 1);
        const c = at(j + 1, i);
        const d = at(j + 1, i + 1);
        for (const tri of [
          [a, b, d],
          [a, d, c],
        ] as const) {
          ctx.fillStyle = colorAt(j / ny, rand());
          ctx.beginPath();
          ctx.moveTo(...tri[0]);
          ctx.lineTo(...tri[1]);
          ctx.lineTo(...tri[2]);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }
}

function hogar(p: Paint): void {
  const { ctx, W, H, rand } = p;
  p.fillSky([
    [0, '#26345e'],
    [0.42, '#b9787a'],
    [0.66, '#f4c58c'],
  ]);
  p.stars(40, 0.3, 0.6);
  p.halo(W * 0.2, H * 0.66, H * 0.7, 'rgba(255,214,150,.7)');
  p.disc(W * 0.76, H * 0.2, H * 0.075, '#f1e8d4');
  p.disc(W * 0.79, H * 0.19, H * 0.018, 'rgba(140,130,150,.35)');
  p.facets(H * 0.66, (t, n) => `hsl(${105 + n * 25} ${26 + n * 12}% ${26 - t * 15 + n * 6}%)`);
  // La cúpula del Instituto, con su ventana redonda encendida.
  const ix = W * 0.46;
  const iy = H * 0.67;
  const IR = H * 0.17;
  ctx.fillStyle = '#4a3626';
  ctx.beginPath();
  ctx.ellipse(ix, iy, IR, IR * 0.9, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#ffd9a0';
  ctx.lineWidth = H * 0.012;
  ctx.beginPath();
  ctx.arc(ix, iy - IR * 0.45, IR * 0.28, 0, Math.PI * 2);
  ctx.stroke();
  p.halo(ix, iy - IR * 0.45, IR, 'rgba(255,210,140,.25)');
  // Las casas de la aldea, con sus ventanas.
  for (const [x, y, s] of [
    [0.12, 0.71, 0.07],
    [0.28, 0.75, 0.05],
    [0.66, 0.73, 0.06],
    [0.84, 0.76, 0.045],
  ] as const) {
    const cx = W * x;
    const cy = H * y;
    const R = H * s * 1.4;
    ctx.fillStyle = '#3b2a20';
    ctx.beginPath();
    ctx.ellipse(cx, cy, R, R * 0.85, 0, Math.PI, 0);
    ctx.fill();
    p.disc(cx, cy - R * 0.4, R * 0.18, '#ffd08a');
    p.halo(cx, cy - R * 0.4, R * 0.9, 'rgba(255,200,120,.22)');
  }
  // Las lucecitas de los Ool por la plaza.
  for (let k = 0; k < 14; k++)
    p.disc(rand() * W, H * (0.74 + rand() * 0.2), H * 0.006, 'rgba(170,245,205,.85)');
}

function luna(p: Paint): void {
  const { ctx, W, H } = p;
  p.fillSky([
    [0, '#05050b'],
    [0.7, '#161624'],
    [1, '#22222e'],
  ]);
  p.stars(140, 0.7, 0.9);
  // Hogar en el cielo.
  const px = W * 0.74;
  const py = H * 0.27;
  const pr = H * 0.17;
  const planet = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
  planet.addColorStop(0, '#9fd6b0');
  planet.addColorStop(0.6, '#3f7a7a');
  planet.addColorStop(1, '#16283a');
  p.disc(px, py, pr, planet);
  p.facets(H * 0.62, (t, n) => `hsl(225 ${5 + n * 6}% ${34 - t * 20 + n * 7}%)`);
  for (const [x, y, s] of [
    [0.18, 0.82, 0.05],
    [0.7, 0.88, 0.07],
    [0.88, 0.72, 0.03],
  ] as const) {
    ctx.fillStyle = 'rgba(15,15,25,.35)';
    ctx.beginPath();
    ctx.ellipse(W * x, H * y, H * s * 2, H * s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // El fragmento clavado, con su borde curvo que brilla.
  const fx = W * 0.42;
  const fy = H * 0.72;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(fx, fy + H * 0.03, H * 0.16, H * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a7f6e';
  ctx.beginPath();
  ctx.moveTo(fx - H * 0.12, fy + H * 0.03);
  ctx.lineTo(fx - H * 0.09, fy - H * 0.24);
  ctx.lineTo(fx + H * 0.05, fy - H * 0.3);
  ctx.quadraticCurveTo(fx - H * 0.02, fy - H * 0.12, fx + H * 0.1, fy + H * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,240,255,.7)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(fx + H * 0.05, fy - H * 0.3);
  ctx.quadraticCurveTo(fx - H * 0.02, fy - H * 0.12, fx + H * 0.1, fy + H * 0.04);
  ctx.stroke();
  ctx.strokeStyle = '#5d5446';
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(fx - H * 0.08, fy - H * (0.18 - k * 0.05));
    ctx.lineTo(fx - H * 0.01, fy - H * (0.2 - k * 0.05));
    ctx.stroke();
  }
}

function archivo(p: Paint): void {
  const { W, H } = p;
  p.fillSky([
    [0, '#070b18'],
    [0.45, '#1b2846'],
    [0.68, '#5d7699'],
    [0.74, '#93a9c4'],
  ]);
  p.stars(80, 0.45, 0.7);
  p.halo(W * 0.5, H * 0.7, H * 0.5, 'rgba(190,215,255,.35)');
  p.disc(W * 0.5, H * 0.67, H * 0.025, '#eef4ff');
  p.facets(H * 0.7, (t, n) => `hsl(${215 + n * 10} ${16 + n * 8}% ${24 - t * 14 + n * 5}%)`);
  // Dos filas de pilares: la de atrás más baja y clara.
  for (let row = 1; row >= 0; row--) {
    for (let k = 0; k < 9; k++) {
      const back = row === 1;
      const x = W * (0.06 + k * 0.11) + (back ? W * 0.055 : 0);
      const h = H * (back ? 0.2 : 0.32);
      const w = H * (back ? 0.035 : 0.05);
      const base = H * (back ? 0.73 : 0.82);
      p.rect(back ? '#2a3550' : '#1a2238', x - w / 2, base - h, w, h);
      p.rect(back ? '#5a6e94' : '#42557c', x - w / 2, base - h, w, H * 0.01);
    }
  }
}

function taller(p: Paint): void {
  const { ctx, W, H, rand } = p;
  p.fillSky([
    [0, '#5f9fd8'],
    [0.5, '#bfe0f0'],
    [0.7, '#f6efd8'],
  ]);
  p.halo(W * 0.18, H * 0.18, H * 0.6, 'rgba(255,250,225,.9)');
  p.disc(W * 0.18, H * 0.18, H * 0.05, '#fffbe8');
  p.facets(H * 0.68, (t, n) => `hsl(${70 + n * 30} ${30 + n * 14}% ${50 - t * 20 + n * 6}%)`);
  // Los molinos.
  for (const [k, [x, y, h]] of (
    [
      [0.62, 0.7, 0.3],
      [0.82, 0.72, 0.22],
      [0.36, 0.72, 0.18],
    ] as const
  ).entries()) {
    const bx = W * x;
    const by = H * y;
    const hh = H * h;
    ctx.strokeStyle = '#4a4038';
    ctx.lineWidth = H * 0.012;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, by - hh);
    ctx.stroke();
    ctx.lineWidth = H * 0.008;
    for (let b = 0; b < 3; b++) {
      const a = b * 2.094 + k;
      ctx.beginPath();
      ctx.moveTo(bx, by - hh);
      ctx.lineTo(bx + Math.cos(a) * hh * 0.45, by - hh + Math.sin(a) * hh * 0.45);
      ctx.stroke();
    }
    p.disc(bx, by - hh, H * 0.012, '#4a4038');
  }
  // El viento.
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 9; k++) {
    const y = H * (0.15 + rand() * 0.5);
    const x = rand() * W * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + W * 0.1, y - H * 0.03, x + W * 0.2, y + H * 0.03, x + W * 0.3, y);
    ctx.stroke();
  }
}

function observatorio(p: Paint): void {
  const { ctx, W, H } = p;
  p.fillSky([
    [0, '#020309'],
    [0.55, '#0b1230'],
    [0.74, '#28335e'],
  ]);
  // La banda de estrellas.
  ctx.save();
  ctx.translate(W * 0.5, H * 0.35);
  ctx.rotate(-0.35);
  const band = ctx.createLinearGradient(0, -H * 0.12, 0, H * 0.12);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(0.5, 'rgba(170,180,230,.2)');
  band.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = band;
  ctx.fillRect(-W, -H * 0.12, W * 2, H * 0.24);
  ctx.restore();
  p.stars(320, 0.74, 1);
  p.facets(H * 0.74, (t, n) => `hsl(${230 + n * 10} ${14 + n * 8}% ${14 - t * 8 + n * 4}%)`);
  // La cúpula con la ranura encendida.
  const ox = W * 0.66;
  const oy = H * 0.76;
  const R = H * 0.13;
  ctx.fillStyle = '#1c1f30';
  ctx.fillRect(ox - R, oy - R * 0.6, R * 2, R * 0.6);
  ctx.beginPath();
  ctx.arc(ox, oy - R * 0.6, R, Math.PI, 0);
  ctx.fill();
  p.rect('rgba(255,215,150,.85)', ox - R * 0.08, oy - R * 1.55, R * 0.16, R * 0.75);
  p.halo(ox, oy - R * 1.2, R * 1.4, 'rgba(255,210,140,.18)');
  p.disc(W * 0.26, H * 0.22, 2.6, '#ffd6a0');
}

function laboratorio(p: Paint): void {
  const { ctx, W, H } = p;
  p.fillSky([
    [0, '#0b0a10'],
    [0.6, '#16131e'],
    [1, '#221c2a'],
  ]);
  // La semilla negra con su anillo.
  const sx = W * 0.5;
  const sy = H * 0.64;
  p.halo(sx, sy, H * 0.35, 'rgba(170,140,220,.22)');
  p.disc(sx, sy, H * 0.03, '#000');
  ctx.strokeStyle = 'rgba(200,180,255,.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(sx, sy, H * 0.08, H * 0.02, 0.3, 0, Math.PI * 2);
  ctx.stroke();
  // El suelo es el techo: dentro del Nudo todo está del revés.
  ctx.save();
  ctx.translate(0, H);
  ctx.scale(1, -1);
  p.facets(H * 0.68, (t, n) => `hsl(${265 + n * 15} ${10 + n * 8}% ${22 - t * 12 + n * 5}%)`);
  ctx.restore();
  // La mesa y la lámpara que cuelgan.
  p.rect('#2e2838', W * 0.22, H * 0.33, W * 0.14, H * 0.025);
  p.rect('#2e2838', W * 0.24, H * 0.27, W * 0.01, H * 0.06);
  p.rect('#2e2838', W * 0.33, H * 0.27, W * 0.01, H * 0.06);
  p.disc(W * 0.3, H * 0.37, H * 0.012, '#ffcf8a');
  p.halo(W * 0.3, H * 0.39, H * 0.12, 'rgba(255,200,120,.3)');
  p.rect('#3a3046', W * 0.62, H * 0.31, W * 0.16, H * 0.035);
  p.rect('#3a3046', W * 0.63, H * 0.28, W * 0.01, H * 0.03);
  p.rect('#3a3046', W * 0.77, H * 0.28, W * 0.01, H * 0.03);
}

/** Umbral y Cicatriz comparten encuadre: atardecer ámbar con La Boca, o cielo rojo con el agujero y la máquina. */
function dusk(umbral: boolean): Painter {
  return (p) => {
    const { ctx, W, H, rand } = p;
    ctx.fillStyle = umbral
      ? p.grad([
          [0, '#1d1a2e'],
          [0.35, '#6a3f3a'],
          [0.62, '#e39a58'],
          [0.72, '#f3c27e'],
        ])
      : p.grad([
          [0, '#140809'],
          [0.4, '#3d1210'],
          [0.66, '#9a3a1e'],
          [0.74, '#d0602c'],
        ]);
    ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 70; k++) {
      ctx.fillStyle = `rgba(255,240,220,${rand() * 0.7})`;
      ctx.fillRect(rand() * W, rand() * H * 0.4, 1.2, 1.2);
    }
    const sx = W * (umbral ? 0.78 : 0.2);
    const sy = H * 0.66;
    const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.6);
    sun.addColorStop(0, umbral ? 'rgba(255,220,160,.9)' : 'rgba(255,140,80,.8)');
    sun.addColorStop(0.12, umbral ? 'rgba(255,190,120,.45)' : 'rgba(220,80,40,.4)');
    sun.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, W, H);
    if (!umbral) {
      const bx = W * 0.72;
      const by = H * 0.26;
      const br = H * 0.06;
      p.disc(bx, by, br, '#000');
      ctx.strokeStyle = 'rgba(255,170,110,.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(bx, by, br * 2.2, br * 0.45, -0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    p.facets(
      H * 0.7,
      umbral
        ? (t, n) => `hsl(${24 + n * 6} ${38 + n * 10}% ${30 - t * 22 + n * 6}%)`
        : (t, n) => `hsl(${6 + n * 8} ${40 + n * 10}% ${20 - t * 14 + n * 5}%)`,
    );
    if (umbral) {
      // La Boca y el banco.
      const bx = W * 0.42;
      const by = H * 0.52;
      const rx = H * 0.2;
      const ry = H * 0.24;
      ctx.lineWidth = H * 0.045;
      ctx.strokeStyle = '#2b1a14';
      ctx.beginPath();
      ctx.ellipse(bx, by, rx, ry, 0, Math.PI * 0.96, Math.PI * 2.04);
      ctx.stroke();
      ctx.lineWidth = H * 0.012;
      ctx.strokeStyle = 'rgba(255,220,170,.55)';
      ctx.beginPath();
      ctx.ellipse(bx, by, rx * 0.8, ry * 0.8, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      p.rect('#24160f', bx - rx - H * 0.03, by, H * 0.06, H * 0.2);
      p.rect('#24160f', bx + rx - H * 0.03, by, H * 0.06, H * 0.2);
      p.rect('#3a241a', W * 0.62, H * 0.66, W * 0.07, H * 0.04);
      p.rect('#3a241a', W * 0.63, H * 0.7, W * 0.01, H * 0.04);
      p.rect('#3a241a', W * 0.675, H * 0.7, W * 0.01, H * 0.04);
      return;
    }
    // Las siluetas de la maquinaria y la mesa de la grabadora.
    ctx.fillStyle = '#1b0907';
    for (const [x, y, w] of [
      [0.04, 0.3, 0.1],
      [0.16, 0.42, 0.06],
      [0.55, 0.36, 0.09],
      [0.86, 0.28, 0.12],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(W * x, H * 0.72);
      ctx.lineTo(W * x, H * y);
      ctx.lineTo(W * (x + w * 0.4), H * (y - 0.05));
      ctx.lineTo(W * (x + w), H * y + H * 0.04);
      ctx.lineTo(W * (x + w), H * 0.72);
      ctx.fill();
    }
    p.rect('#2e1410', W * 0.4, H * 0.64, W * 0.2, H * 0.03);
    p.rect('#2e1410', W * 0.42, H * 0.67, W * 0.015, H * 0.08);
    p.rect('#2e1410', W * 0.565, H * 0.67, W * 0.015, H * 0.08);
    p.rect('#4a2a20', W * 0.47, H * 0.6, W * 0.06, H * 0.04);
    p.disc(W * 0.52, H * 0.615, 2.5, '#f0a060');
  };
}

const PAINTERS: Readonly<Record<string, Painter>> = {
  hogar,
  luna,
  umbral: dusk(true),
  archivo,
  taller,
  cicatriz: dusk(false),
  observatorio,
  laboratorio,
};

/** La semilla del azar de cada dibujo (la de la maqueta). */
function seedOf(id: string): number {
  if (id === 'umbral') return 11;
  if (id === 'cicatriz') return 23;
  return 5;
}

/** ¿Hay dibujo para este mundo? */
export function hasDrawing(id: string): boolean {
  return PAINTERS[id] !== undefined;
}

/** Pinta el mundo `id` en un contexto de `width` × `height`. false si no hay dibujo para él. */
export function paintWorld(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  id: string,
): boolean {
  const painter = PAINTERS[id];
  if (!painter) return false;
  ctx.save();
  painter(new Paint(ctx, width, height, seedOf(id)));
  ctx.restore();
  return true;
}

const cache = new Map<string, string>();

/** El dibujo del mundo como imagen (se pinta la primera vez); '' si no se puede pintar. */
export function worldDrawing(id: string): string {
  const cached = cache.get(id);
  if (cached !== undefined) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = DRAWING_WIDTH;
  canvas.height = DRAWING_HEIGHT;
  const ctx = canvas.getContext('2d');
  const url =
    ctx && paintWorld(ctx, DRAWING_WIDTH, DRAWING_HEIGHT, id)
      ? canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      : '';
  cache.set(id, url);
  return url;
}
