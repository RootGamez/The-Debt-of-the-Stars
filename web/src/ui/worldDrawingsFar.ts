// Los dibujos de la bitácora de los mundos que se rehicieron por código (Fase 11) y de la Brasa con el Cerco: el
// Taller (gigante de gas con cinco islas), Cicatriz (hueca, mordida, con su anillo de fragmentos), el Observatorio
// (el asteroide con la cúpula y el telescopio apuntando a la Brasa) y la Brasa con sus dos anclajes, un solo dibujo
// que sale al llegar a cualquiera de los dos. Mismo estilo que los demás (worldDrawings.ts): 2D, a mano, sin fotos.
import { Paint, type Point } from './worldDrawingsPaint';

const TAU = Math.PI * 2;

/** La Brasa vista en el cielo: un disco rojo con su halo. */
function emberInSky(p: Paint, x: number, y: number, r: number): void {
  p.halo(x, y, r * 7, 'rgba(255,110,60,.45)');
  const body = p.ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  body.addColorStop(0, '#ffd2a0');
  body.addColorStop(0.55, '#ff6a32');
  body.addColorStop(1, '#c42a10');
  p.disc(x, y, r, body);
}

/** Una isla del Taller: tapa llana, cono de roca colgando y piedras que giran alrededor. */
function island(p: Paint, x: number, y: number, w: number): void {
  const { ctx, H, rand } = p;
  const top = w * 0.16;
  const drop = w * 0.95;
  // El cono que cuelga, con la cara en sombra a la izquierda (la Brasa está a la derecha).
  ctx.fillStyle = '#6e6259';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w * 0.3, y + drop * 0.45);
  ctx.lineTo(x - w * 0.05, y + drop);
  ctx.lineTo(x + w * 0.22, y + drop * 0.5);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4f463f';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w * 0.3, y + drop * 0.45);
  ctx.lineTo(x - w * 0.05, y + drop);
  ctx.lineTo(x - w * 0.12, y);
  ctx.closePath();
  ctx.fill();
  // La tapa.
  ctx.fillStyle = '#857a70';
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, top, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#a49a8c';
  ctx.lineWidth = Math.max(1, H * 0.004);
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, top, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  // Los escombros.
  for (let k = 0; k < 5; k++) {
    const a = rand() * TAU;
    const rx = x + Math.cos(a) * w * (0.6 + rand() * 0.25);
    const ry = y + drop * 0.3 + Math.sin(a) * w * 0.18;
    const s = w * (0.025 + rand() * 0.03);
    p.disc(rx, ry, s, rand() < 0.5 ? '#5d534b' : '#7a6e64');
  }
}

/** El Taller: el gigante de gas en bandas, sin suelo, y las islas encima; un puente de luz entre dos. */
export function taller(p: Paint): void {
  const { ctx, W, H, rand } = p;
  p.fillSky([
    [0, '#1d1a30'],
    [0.35, '#5a3c58'],
    [0.62, '#d98a64'],
    [0.78, '#f3c79a'],
  ]);
  p.stars(40, 0.3, 0.5);
  emberInSky(p, W * 0.82, H * 0.2, H * 0.06);
  // El gigante: un círculo enorme cuyo borde es el horizonte, con bandas curvas que siguen el limbo.
  const cx = W * 0.42;
  const cy = H * 2.25;
  const R = H * 1.68;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();
  const bands = ['#f1e6d2', '#e3a35f', '#f6d9a8', '#7fb7c4', '#d9865a', '#f1e6d2', '#e3a35f'];
  const bandWidth = H * 0.07;
  for (let k = 0; k < 9; k++) {
    ctx.fillStyle = bands[k % bands.length] ?? '#f1e6d2';
    ctx.beginPath();
    const outer = R - k * bandWidth;
    const inner = outer - bandWidth;
    for (let a = 0; a <= 64; a++) {
      const t = Math.PI + (a / 64) * Math.PI;
      const wave = Math.sin(a * 0.7 + k * 1.9) * H * 0.008;
      ctx.lineTo(cx + Math.cos(t) * (outer + wave), cy + Math.sin(t) * (outer + wave));
    }
    for (let a = 64; a >= 0; a--) {
      const t = Math.PI + (a / 64) * Math.PI;
      ctx.lineTo(cx + Math.cos(t) * inner, cy + Math.sin(t) * inner);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Remolinos y sombra hacia abajo.
  for (let k = 0; k < 7; k++) {
    ctx.strokeStyle = `rgba(255,245,230,${0.25 + rand() * 0.25})`;
    ctx.lineWidth = 1.2;
    const sx = rand() * W;
    const sy = H * (0.66 + rand() * 0.3);
    ctx.beginPath();
    ctx.ellipse(sx, sy, H * (0.03 + rand() * 0.03), H * 0.012, 0, 0, Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.fillStyle = p.grad(
    [
      [0, 'rgba(20,21,34,0)'],
      [1, 'rgba(20,21,34,.55)'],
    ],
    H * 0.6,
    H,
  );
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // La bruma del limbo.
  ctx.strokeStyle = 'rgba(243,210,166,.55)';
  ctx.lineWidth = H * 0.018;
  ctx.beginPath();
  ctx.arc(cx, cy, R + H * 0.006, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  // Dos islas lejanas y el puente de luz de las 7:00 hasta la de delante.
  island(p, W * 0.14, H * 0.38, H * 0.13);
  island(p, W * 0.42, H * 0.3, H * 0.09);
  ctx.strokeStyle = 'rgba(159,230,255,.75)';
  ctx.lineWidth = Math.max(1.5, H * 0.006);
  ctx.setLineDash([H * 0.02, H * 0.012]);
  ctx.beginPath();
  ctx.moveTo(W * 0.2, H * 0.4);
  ctx.quadraticCurveTo(W * 0.38, H * 0.5, W * 0.56, H * 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  // La isla de Montaje, delante: arco, brazo de montaje y la caseta con la luz encendida.
  const ix = W * 0.7;
  const iy = H * 0.52;
  island(p, ix, iy, H * 0.42);
  ctx.strokeStyle = '#3d4248';
  ctx.lineWidth = H * 0.018;
  ctx.beginPath();
  ctx.arc(ix - H * 0.06, iy - H * 0.01, H * 0.08, Math.PI, 0);
  ctx.stroke();
  p.rect('#a49a8c', ix + H * 0.05, iy - H * 0.08, H * 0.09, H * 0.07);
  p.rect('#5c6670', ix + H * 0.04, iy - H * 0.095, H * 0.11, H * 0.02);
  p.rect('#ffcf7a', ix + H * 0.08, iy - H * 0.06, H * 0.025, H * 0.025);
  p.halo(ix + H * 0.09, iy - H * 0.05, H * 0.06, 'rgba(255,207,122,.35)');
  ctx.strokeStyle = '#7d8790';
  ctx.lineWidth = H * 0.01;
  ctx.beginPath();
  ctx.moveTo(ix - H * 0.16, iy);
  ctx.lineTo(ix - H * 0.16, iy - H * 0.13);
  ctx.lineTo(ix - H * 0.09, iy - H * 0.17);
  ctx.stroke();
}

/** Una mordida de Cicatriz vista en perspectiva: un cuenco liso con el borde iluminado; `eye` si deja ver el ojo. */
function bite(p: Paint, x: number, y: number, rx: number, eye: boolean): void {
  const { ctx } = p;
  const ry = rx * 0.32;
  const bowl = ctx.createLinearGradient(0, y - ry, 0, y + ry);
  bowl.addColorStop(0, '#1a0806');
  bowl.addColorStop(0.7, '#4a1a10');
  bowl.addColorStop(1, '#8a3a1c');
  ctx.fillStyle = bowl;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,150,90,.6)';
  ctx.lineWidth = Math.max(1, rx * 0.04);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI);
  ctx.stroke();
  if (!eye) return;
  // El ojo: el hueco que atraviesa la cáscara, con su anillo de contención y la luz de dentro.
  const ex = x + rx * 0.05;
  const ey = y + ry * 0.15;
  p.halo(ex, ey, rx * 0.6, 'rgba(255,140,60,.45)');
  p.disc(ex, ey, rx * 0.2, '#050203');
  ctx.save();
  ctx.translate(ex, ey);
  ctx.scale(1, 0.4);
  ctx.strokeStyle = '#ff9a4a';
  ctx.lineWidth = rx * 0.05;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 0.32, 0, TAU);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#050203';
  ctx.beginPath();
  ctx.ellipse(ex, ey, rx * 0.29, rx * 0.11, 0, 0, TAU);
  ctx.fill();
}

/** Cicatriz: cielo rojo, la Brasa baja, el anillo de fragmentos cruzando el cielo y el suelo mordido. */
export function cicatriz(p: Paint): void {
  const { ctx, W, H, rand } = p;
  p.fillSky([
    [0, '#12070a'],
    [0.38, '#3d1210'],
    [0.6, '#8a2e18'],
    [0.66, '#c9562a'],
  ]);
  p.stars(60, 0.35, 0.6);
  emberInSky(p, W * 0.16, H * 0.56, H * 0.11);
  // El anillo: una banda inclinada de rocas que pasa por detrás del horizonte.
  const rcx = W * 0.55;
  const rcy = H * 0.58;
  ctx.save();
  ctx.translate(rcx, rcy);
  ctx.rotate(-0.22);
  ctx.strokeStyle = 'rgba(210,140,100,.18)';
  ctx.lineWidth = H * 0.05;
  ctx.beginPath();
  ctx.ellipse(0, 0, W * 0.62, H * 0.24, 0, Math.PI, TAU);
  ctx.stroke();
  for (let k = 0; k < 220; k++) {
    const a = Math.PI + rand() * Math.PI;
    const spread = 1 + (rand() - 0.5) * 0.12;
    const s = rand() < 0.08 ? 2.4 : 1.2;
    ctx.fillStyle = `rgba(${200 + rand() * 50},${120 + rand() * 50},${90 + rand() * 30},${0.5 + rand() * 0.5})`;
    ctx.fillRect(Math.cos(a) * W * 0.62 * spread, Math.sin(a) * H * 0.24 * spread, s, s);
  }
  // El Faro: un fragmento pisable del anillo con su luz.
  const fa = Math.PI * 1.62;
  const fx = Math.cos(fa) * W * 0.62;
  const fy = Math.sin(fa) * H * 0.24;
  ctx.fillStyle = '#2a1210';
  ctx.fillRect(fx - 5, fy - 2, 10, 5);
  ctx.fillRect(fx - 1, fy - 9, 2.5, 8);
  p.disc(fx, fy - 10, 1.8, '#ffd08a');
  ctx.restore();
  // El suelo, con las mordidas que cortan el horizonte en curvas perfectas.
  const horizon = H * 0.66;
  p.facets(horizon, (t, n) => `hsl(${8 + n * 8} ${38 + n * 10}% ${22 - t * 14 + n * 5}%)`);
  ctx.fillStyle = p.grad([
    [0, '#12070a'],
    [0.38, '#3d1210'],
    [0.6, '#8a2e18'],
    [0.66, '#c9562a'],
  ]);
  for (const [x, r] of [
    [0.3, 0.05],
    [0.86, 0.07],
  ] as const) {
    ctx.beginPath();
    ctx.arc(W * x, horizon - H * 0.012, H * r, 0, Math.PI);
    ctx.fill();
  }
  // Mordidas en el suelo; la grande, delante, con su ojo encendido.
  bite(p, W * 0.12, H * 0.76, H * 0.1, false);
  bite(p, W * 0.66, H * 0.72, H * 0.07, false);
  bite(p, W * 0.47, H * 0.88, H * 0.3, true);
  // Una torre de cables y el Puesto del Escéptico con la luz encendida.
  ctx.strokeStyle = '#1b0907';
  ctx.lineWidth = H * 0.01;
  ctx.beginPath();
  ctx.moveTo(W * 0.8, H * 0.7);
  ctx.lineTo(W * 0.82, H * 0.42);
  ctx.lineTo(W * 0.84, H * 0.7);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.82, H * 0.43);
  ctx.quadraticCurveTo(W * 0.9, H * 0.55, W * 0.99, H * 0.62);
  ctx.moveTo(W * 0.82, H * 0.43);
  ctx.quadraticCurveTo(W * 0.72, H * 0.56, W * 0.66, H * 0.66);
  ctx.stroke();
  const hut: Point[] = [
    [0.25, 0.71],
    [0.25, 0.65],
    [0.28, 0.62],
    [0.31, 0.65],
    [0.31, 0.71],
  ];
  p.poly('#2e1410', hut);
  p.rect('#f0a060', W * 0.27, H * 0.66, W * 0.015, H * 0.02);
  p.halo(W * 0.278, H * 0.67, H * 0.05, 'rgba(240,160,96,.3)');
}

/** El Observatorio: el asteroide alargado flotando en el negro, con la cúpula, el telescopio hacia la Brasa y el hangar. */
export function observatorio(p: Paint): void {
  const { ctx, W, H, rand } = p;
  p.fillSky([
    [0, '#020309'],
    [0.6, '#0b1230'],
    [1, '#141a3a'],
  ]);
  // La banda de estrellas.
  ctx.save();
  ctx.translate(W * 0.5, H * 0.4);
  ctx.rotate(-0.35);
  const band = ctx.createLinearGradient(0, -H * 0.12, 0, H * 0.12);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(0.5, 'rgba(170,180,230,.2)');
  band.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = band;
  ctx.fillRect(-W, -H * 0.12, W * 2, H * 0.24);
  ctx.restore();
  p.stars(300, 1, 1);
  // La Brasa, pequeña y lejana, arriba a la derecha.
  const ex = W * 0.86;
  const ey = H * 0.14;
  emberInSky(p, ex, ey, H * 0.035);
  // El asteroide: una patata alargada en diagonal, iluminada desde la Brasa, con la terraza tallada arriba.
  const ax = W * 0.42;
  const ay = H * 0.88;
  const along = W * 0.48;
  const across = H * 0.2;
  const rot = -0.22;
  const edge: [number, number, boolean][] = [];
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * TAU;
    const r = 1 + (rand() - 0.5) * 0.08;
    const x = Math.cos(a) * along * r;
    const y = Math.sin(a) * across * r;
    edge.push([
      ax + x * Math.cos(rot) - y * Math.sin(rot),
      ay + x * Math.sin(rot) + y * Math.cos(rot),
      Math.sin(a) < 0,
    ]);
  }
  const tx = W * 0.68;
  const half = H * 0.2;
  const upper = edge.filter(([, , up]) => up);
  const nearest = upper.reduce((best, pt) =>
    Math.abs(pt[0] - tx) < Math.abs(best[0] - tx) ? pt : best,
  );
  const ty = nearest[1] + H * 0.015;
  const rock: Point[] = edge.map(([x, y, up]) => [
    x / W,
    (up && Math.abs(x - tx) < half ? Math.max(y, ty) : y) / H,
  ]);
  const lit = ctx.createLinearGradient(W * 0.8, H * 0.55, W * 0.25, H * 1.05);
  lit.addColorStop(0, '#d4c9ae');
  lit.addColorStop(0.35, '#8e8570');
  lit.addColorStop(1, '#2a2638');
  p.poly(lit, rock);
  for (let k = 0; k < 9; k++) {
    const cx = W * (0.08 + rand() * 0.55);
    const cy = H * (0.84 + rand() * 0.12);
    const r = H * (0.012 + rand() * 0.025);
    ctx.fillStyle = 'rgba(30,26,40,.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.6, r * 0.7, rot, 0, TAU);
    ctx.fill();
  }
  p.rect('#b8ad94', tx - half, ty, half * 2, H * 0.02);
  // El hangar con techo de cristal, encendido por dentro.
  p.rect('#8e8570', tx - H * 0.19, ty - H * 0.06, H * 0.16, H * 0.06);
  ctx.fillStyle = 'rgba(168,220,255,.55)';
  ctx.beginPath();
  ctx.moveTo(tx - H * 0.19, ty - H * 0.06);
  ctx.lineTo(tx - H * 0.11, ty - H * 0.1);
  ctx.lineTo(tx - H * 0.03, ty - H * 0.06);
  ctx.closePath();
  ctx.fill();
  p.halo(tx - H * 0.11, ty - H * 0.06, H * 0.08, 'rgba(255,192,112,.3)');
  // La cúpula con la ranura abierta y el telescopio saliendo hacia la Brasa.
  const dx = tx + H * 0.08;
  const dy = ty - H * 0.05;
  const R = H * 0.085;
  p.rect('#b8ad94', dx - R, dy, R * 2, H * 0.05);
  const aim = Math.atan2(ey - (dy - R * 0.4), ex - dx);
  ctx.save();
  ctx.translate(dx, dy - R * 0.4);
  ctx.rotate(aim);
  p.rect('#a88a50', 0, -R * 0.13, R * 1.5, R * 0.26);
  p.rect('#d2b36c', R * 1.4, -R * 0.17, R * 0.2, R * 0.34);
  ctx.restore();
  ctx.fillStyle = '#3b4468';
  ctx.beginPath();
  ctx.arc(dx, dy, R, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#222640';
  ctx.beginPath();
  ctx.arc(dx, dy, R, Math.PI, Math.PI * 1.45);
  ctx.lineTo(dx, dy);
  ctx.closePath();
  ctx.fill();
  p.halo(dx, dy - R * 0.4, R * 1.4, 'rgba(255,192,112,.2)');
  // Los faroles de la alineación a lo largo de la terraza.
  for (let k = 0; k < 5; k++) p.disc(tx - H * 0.18 + k * H * 0.09, ty - 1, 1.6, '#ffc070');
}

/** Un tramo del Cerco: el meridiano de radio `r` girado `phi` alrededor del eje de los polos. */
interface Meridian {
  r: number;
  phi: number;
  /** Cuánto se llegó a construir (0 a 1). */
  done: number;
  /** Dónde empiezan los huecos, en vueltas. */
  phase: number;
}

/** Dibuja el meridiano por delante (`front`) o por detrás de la Brasa: dovelas, andamio donde falta y huecos. */
function meridian(
  p: Paint,
  cx: number,
  cy: number,
  tilt: number,
  ring: Meridian,
  front: boolean,
): void {
  const { ctx, H } = p;
  const pieces = 48;
  const step = TAU / pieces;
  const at = (t: number): Point => {
    const x = ring.r * Math.sin(t) * Math.cos(ring.phi);
    const y = -ring.r * Math.cos(t);
    return [
      cx + x * Math.cos(tilt) - y * Math.sin(tilt),
      cy + x * Math.sin(tilt) + y * Math.cos(tilt),
    ];
  };
  for (let k = 0; k < pieces; k++) {
    const t0 = k * step;
    const mid = t0 + step / 2;
    const facing = Math.sin(mid) * Math.sin(ring.phi) > 0;
    if (facing !== front) continue;
    const along = (((k / pieces - ring.phase) % 1) + 1) % 1;
    const [x0, y0] = at(t0 + step * 0.06);
    const [x1, y1] = at(t0 + step * 0.94);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    if (along < ring.done) {
      // Dovela terminada.
      ctx.strokeStyle = front ? '#c27a46' : 'rgba(168,100,58,.55)';
      ctx.lineWidth = Math.max(2, H * 0.016);
      ctx.stroke();
    } else if (along < ring.done + 0.12) {
      // Andamio: solo el armazón.
      ctx.strokeStyle = front ? 'rgba(200,190,170,.75)' : 'rgba(200,190,170,.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (k % 5 === 0) {
      // Una dovela suelta, a la deriva junto al hueco.
      p.rect(front ? '#9a6038' : 'rgba(154,96,56,.5)', x1 + 3, y1 - 2, 4, 2);
    }
  }
}

/** Un anclaje en un polo: esfera de metal con el tambor del ecuador y la cara a la Brasa encendida. */
function anchor(p: Paint, x: number, y: number, r: number, sunBelow: boolean): void {
  const { ctx } = p;
  const lx = x;
  const ly = y + (sunBelow ? r * 0.5 : -r * 0.5);
  const body = ctx.createRadialGradient(lx, ly, r * 0.1, x, y, r * 1.1);
  body.addColorStop(0, '#d9b49a');
  body.addColorStop(0.45, '#8a919c');
  body.addColorStop(1, '#1e2228');
  p.disc(x, y, r, body);
  ctx.fillStyle = '#3a3f48';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.15, r * 0.24, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#7a5438';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.15, r * 0.24, 0, 0, Math.PI);
  ctx.stroke();
  // La luz de la casa, en el casquete de fuera (a oscuras).
  const outer = y + (sunBelow ? -r * 0.6 : r * 0.6);
  p.disc(x + r * 0.2, outer, Math.max(1.4, r * 0.09), '#ffcf8a');
  p.halo(x + r * 0.2, outer, r * 0.5, 'rgba(255,207,138,.35)');
}

/** Una flecha a lápiz que dice hacia dónde gira un anillo. */
function spinArrow(p: Paint, x: number, y: number, r: number, clockwise: boolean): void {
  const { ctx } = p;
  const a0 = clockwise ? -0.5 : Math.PI + 0.5;
  const a1 = clockwise ? 0.7 : Math.PI - 0.7;
  ctx.strokeStyle = 'rgba(230,222,200,.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a1, !clockwise);
  ctx.stroke();
  const tx = x + Math.cos(a1) * r;
  const ty = y + Math.sin(a1) * r;
  const head = clockwise ? a1 + Math.PI / 2 : a1 - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - Math.cos(head - 0.5) * 5, ty - Math.sin(head - 0.5) * 5);
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - Math.cos(head + 0.5) * 5, ty - Math.sin(head + 0.5) * 5);
  ctx.stroke();
}

/**
 * La Brasa con el Cerco (los dos anclajes comparten este dibujo): la enana roja en el centro, con manchas, y los dos
 * anillos que giran en sentidos opuestos, a medio hacer, unidos solo en los polos, donde están los anclajes.
 */
export function anclaje(p: Paint): void {
  const { ctx, W, H, rand } = p;
  p.fillSky([
    [0, '#05040a'],
    [0.5, '#0d0710'],
    [1, '#05040a'],
  ]);
  p.stars(160, 1, 0.8);
  const cx = W * 0.5;
  const cy = H * 0.5;
  const tilt = 0.18;
  const rings: Meridian[] = [
    { r: H * 0.38, phi: 0.55, done: 0.7, phase: 0.06 },
    { r: H * 0.4, phi: -0.95, done: 0.45, phase: 0.37 },
  ];
  // Lo que queda por detrás de la estrella.
  for (const ring of rings) meridian(p, cx, cy, tilt, ring, false);
  // La Brasa.
  const R = H * 0.17;
  p.halo(cx, cy, R * 3.2, 'rgba(255,80,30,.4)');
  const body = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.1, cx, cy, R);
  body.addColorStop(0, '#ffd0a0');
  body.addColorStop(0.5, '#ff6a32');
  body.addColorStop(1, '#b8260c');
  p.disc(cx, cy, R, body);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();
  for (let k = 0; k < 7; k++) {
    const a = rand() * TAU;
    const d = R * (0.3 + rand() * 0.55);
    p.disc(
      cx + Math.cos(a) * d,
      cy + Math.sin(a) * d,
      R * (0.05 + rand() * 0.07),
      `rgba(130,24,8,${0.3 + rand() * 0.25})`,
    );
  }
  ctx.restore();
  // Una protuberancia en el borde.
  ctx.strokeStyle = 'rgba(255,140,80,.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx + R * 0.95, cy + R * 0.2, R * 0.22, Math.PI * 0.6, Math.PI * 1.6, true);
  ctx.stroke();
  // Lo que pasa por delante y los anclajes en los polos.
  for (const ring of rings) meridian(p, cx, cy, tilt, ring, true);
  const pole = H * 0.39;
  const ar = H * 0.06;
  anchor(p, cx + Math.sin(tilt) * pole, cy - Math.cos(tilt) * pole, ar, true);
  anchor(p, cx - Math.sin(tilt) * pole, cy + Math.cos(tilt) * pole, ar, false);
  // Giran en sentidos opuestos.
  spinArrow(p, W * 0.17, H * 0.5, H * 0.07, true);
  spinArrow(p, W * 0.83, H * 0.5, H * 0.07, false);
}
