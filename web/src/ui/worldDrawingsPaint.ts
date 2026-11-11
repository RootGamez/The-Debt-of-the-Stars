// Las herramientas de los dibujos de la bitácora (worldDrawings.ts): cielo en degradado, estrellas, halos, discos y
// el suelo de facetas low poly de la maqueta (docs/propuestas-hud.html). El azar es reproducible: cada mundo sale
// siempre igual.

export type Point = [number, number];
export type Painter = (paint: Paint) => void;

/** Azar reproducible (Park–Miller), el mismo de la maqueta. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/** Las herramientas de la maqueta, sobre un lienzo de `W` × `H`. */
export class Paint {
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

  /** Un polígono relleno, con los puntos en fracciones del lienzo (x de W, y de H). */
  poly(color: string | CanvasGradient, points: readonly Point[]): void {
    const { ctx, W, H } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], k) => {
      if (k === 0) ctx.moveTo(x * W, y * H);
      else ctx.lineTo(x * W, y * H);
    });
    ctx.closePath();
    ctx.fill();
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
