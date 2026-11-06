// El ocular del telescopio del Observatorio (🟡, pedido de Anthony 2026-11-05): un campo redondo de cielo vivo, con
// las estrellas, la Brasa y los mundos. Se arrastra (o con las flechas) para mover el campo, se acerca la vista con
// los aumentos y se gira el índice de latón de la corrección. Durante la alineación de las 6:30 la imagen del Nudo
// se ve limpia y, donde de verdad está, las estrellas se doblan en un anillo: con el índice bien puesto, la marca
// cae sobre él y basta sostener la cruz encima para fijar el rumbo. La lógica, en game/ocular.ts (con tests).
import { imageClarity } from '../system/lens';
import {
  DIAL_MAX,
  DIAL_MIN,
  DIAL_STEP,
  HOLD_SECONDS,
  HOME_VIEW,
  RING_ZOOM,
  ZOOM_FIELDS,
  bentStar,
  dialMarker,
  imageDirection,
  nudoBearing,
  onTarget,
  patchStars,
  project,
  separation,
  starField,
  stepHold,
  viewBasis,
  type OcularSky,
  type OcularView,
  type Star,
} from '../game/ocular';
import type { PuzzleBody } from './clockPuzzles';
import { button, element } from './puzzleKit';
import { t } from '../i18n';

/** El lado del campo (px de lienzo): el CSS lo escala, así que aquí no cuenta como medida de la interfaz. */
const SIZE = 480;
const DEG = Math.PI / 180;
const BACKGROUND = starField();

export interface OcularSource {
  /** El cielo ahora, o `undefined` si el juego aún no lo tiene. */
  sky(): OcularSky | undefined;
  /** Segundos reales (el parpadeo de la imagen fuera de la alineación). */
  time(): number;
}

function clamp(x: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, x));
}

function paint(
  ctx: CanvasRenderingContext2D,
  sky: OcularSky,
  view: OcularView,
  held: number,
  time: number,
): void {
  const half = SIZE / 2;
  const basis = viewBasis(view, sky);
  const fieldRad = ((ZOOM_FIELDS[view.zoom] ?? 48) * DEG) / 2;
  const at = (p: [number, number]): [number, number] => [half + p[0] * half, half - p[1] * half];
  const place = (dir: Parameters<typeof project>[2]): [number, number] | undefined => {
    const p = project(basis, view, dir);
    return p ? at(p) : undefined;
  };

  ctx.save();
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.beginPath();
  ctx.arc(half, half, half - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#05060d';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Las estrellas: las del fondo y, si la alineación las deja ver, las del parche del Nudo, dobladas por su lente.
  const bend = sky.aligned ? sky.nudo : undefined;
  const drawStar = (star: Star): void => {
    const dir = bend ? bentStar(star.dir, bend) : star.dir;
    const p = place(dir);
    if (!p) return;
    ctx.fillStyle = `rgba(226, 232, 255, ${String(0.25 + star.light * 0.7)})`;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 0.6 + star.light * 1.5, 0, Math.PI * 2);
    ctx.fill();
  };
  BACKGROUND.forEach(drawStar);
  if (bend) patchStars(bend.dir).forEach(drawStar);

  // Los mundos.
  for (const body of sky.bodies) {
    const p = place(body.dir);
    if (!p) continue;
    const radius = Math.max(2, (body.radius / fieldRad) * half);
    ctx.fillStyle = '#8f98c0';
    ctx.beginPath();
    ctx.arc(p[0], p[1], radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230, 222, 200, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // La Brasa: un disco ámbar con su resplandor.
  const brasa = place(sky.brasa);
  if (brasa) {
    const glow = ctx.createRadialGradient(brasa[0], brasa[1], 2, brasa[0], brasa[1], 46);
    glow.addColorStop(0, 'rgba(255, 220, 150, 1)');
    glow.addColorStop(0.25, 'rgba(255, 170, 80, 0.55)');
    glow.addColorStop(1, 'rgba(255, 160, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(brasa[0] - 46, brasa[1] - 46, 92, 92);
  }

  // La imagen del Nudo, torcida hacia la Brasa: limpia en la alineación, un parpadeo fuera de ella.
  const image = imageDirection(sky);
  if (image && sky.nudo) {
    const p = place(image);
    if (p) {
      const clarity = imageClarity({
        aligned: sky.aligned,
        inObservatory: true,
        distance: sky.nudo.distance,
        time,
      });
      const radius = Math.max(5, ((0.7 * DEG) / fieldRad) * half);
      const glow = ctx.createRadialGradient(p[0], p[1], 1, p[0], p[1], radius * 2.2);
      glow.addColorStop(0, `rgba(216, 240, 224, ${String(clarity)})`);
      glow.addColorStop(1, 'rgba(216, 240, 224, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p[0], p[1], radius * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // La marca del índice de corrección: un aro de latón donde el índice cree que está el Nudo de verdad.
  const marker = dialMarker(sky, view.dial);
  const markerAt = marker ? place(marker) : undefined;
  if (markerAt) {
    ctx.strokeStyle = '#d2b36c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(markerAt[0], markerAt[1], 11, 0, Math.PI * 2);
    ctx.stroke();
  }

  // La cruz de la mira, con marcas cada cierto ángulo, y el avance de la fijación.
  ctx.strokeStyle = 'rgba(255, 192, 112, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(half - 22, half);
  ctx.lineTo(half - 5, half);
  ctx.moveTo(half + 5, half);
  ctx.lineTo(half + 22, half);
  ctx.moveTo(half, half - 22);
  ctx.lineTo(half, half - 5);
  ctx.moveTo(half, half + 5);
  ctx.lineTo(half, half + 22);
  ctx.stroke();
  const tick = view.zoom >= RING_ZOOM ? 0.5 : view.zoom === 1 ? 2 : 10;
  ctx.fillStyle = 'rgba(255, 192, 112, 0.55)';
  for (let a = tick; a * DEG < fieldRad; a += tick) {
    const d = (Math.tan(a * DEG) / Math.tan(fieldRad)) * half;
    for (const [x, y] of [
      [half + d, half],
      [half - d, half],
      [half, half + d],
      [half, half - d],
    ] as const) {
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }
  if (held > 0) {
    ctx.strokeStyle = '#ffd890';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(half, half, 34, -Math.PI / 2, -Math.PI / 2 + (held / HOLD_SECONDS) * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#a88a50';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(half, half, half - 2, 0, Math.PI * 2);
  ctx.stroke();
}

export function ocularBody(
  source: OcularSource,
  status: HTMLElement,
  solvedBefore: boolean,
  solve: () => void,
): PuzzleBody {
  const hint = element(
    'p',
    'puzzle-hint',
    t(
      'Mueve el campo (arrastra o con las flechas), acerca la vista y gira el índice de latón. Con la alineación, lo que ves del Nudo está torcido: busca dónde está de verdad.',
    ),
  );
  const canvas = element('canvas', 'ocular-field');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', t('El campo del ocular'));
  const readout = element('p', 'ocular-readout');
  readout.setAttribute('aria-live', 'off');

  let view: OcularView = HOME_VIEW;
  let held = 0;
  let done = solvedBefore;
  let last: number | undefined;
  let frame = 0;
  let dragging: { x: number; y: number } | undefined;
  let shownAligned: boolean | undefined;

  const fieldDegrees = (): number => ZOOM_FIELDS[view.zoom] ?? 48;
  const slew = (dxDegrees: number, dyDegrees: number): void => {
    view = {
      ...view,
      yaw: clamp(view.yaw + dxDegrees * DEG, -Math.PI * 0.95, Math.PI * 0.95),
      pitch: clamp(view.pitch + dyDegrees * DEG, -Math.PI * 0.45, Math.PI * 0.45),
    };
  };
  const zoom = (by: number): void => {
    view = { ...view, zoom: clamp(view.zoom + by, 0, ZOOM_FIELDS.length - 1) };
  };
  const turnDial = (by: number): void => {
    view = { ...view, dial: clamp(view.dial + by * DIAL_STEP, DIAL_MIN, DIAL_MAX) };
  };

  canvas.addEventListener('pointerdown', (event) => {
    dragging = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const scale = fieldDegrees() / canvas.getBoundingClientRect().height;
    slew(-(event.clientX - dragging.x) * scale, (event.clientY - dragging.y) * scale);
    dragging = { x: event.clientX, y: event.clientY };
  });
  const release = (): void => {
    dragging = undefined;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  const onKey = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const step = fieldDegrees() * 0.06;
    const moves: Record<string, () => void> = {
      ArrowLeft: () => {
        slew(-step, 0);
      },
      ArrowRight: () => {
        slew(step, 0);
      },
      ArrowUp: () => {
        slew(0, step);
      },
      ArrowDown: () => {
        slew(0, -step);
      },
      '+': () => {
        zoom(1);
      },
      '=': () => {
        zoom(1);
      },
      '-': () => {
        zoom(-1);
      },
      '[': () => {
        turnDial(-1);
      },
      ']': () => {
        turnDial(1);
      },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  };
  window.addEventListener('keydown', onKey);

  const controls = element('div', 'ocular-controls');
  const make = (text: string, label: string, act: () => void): HTMLButtonElement => {
    const b = button(text, 'puzzle-wheel', label);
    b.addEventListener('click', act);
    return b;
  };
  controls.append(
    make('−', t('Alejar la vista'), () => {
      zoom(-1);
    }),
    element('span', 'puzzle-wheel-name', t('Aumento')),
    make('+', t('Acercar la vista'), () => {
      zoom(1);
    }),
    make('−', t('Índice: restar un grado'), () => {
      turnDial(-1);
    }),
    element('span', 'puzzle-wheel-name', t('Índice')),
    make('+', t('Índice: sumar un grado'), () => {
      turnDial(1);
    }),
  );

  const ctx = canvas.getContext('2d');
  const tick = (now: number): void => {
    frame = requestAnimationFrame(tick);
    const dt = last === undefined ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    const sky = source.sky();
    if (!sky) {
      readout.textContent = t('El cielo no se deja ver.');
      return;
    }
    if (!done && sky.aligned !== shownAligned) {
      shownAligned = sky.aligned;
      status.textContent = sky.aligned
        ? t('La alineación: la imagen junto a la Brasa se ve limpia.')
        : t(
            'Fuera de la alineación, lo que hay junto a la Brasa tiembla y se pierde. Vuelve hacia las 6:30.',
          );
    }
    const wasHeld = held;
    held = stepHold(held, onTarget(view, sky), dt);
    if (ctx) paint(ctx, sky, view, held, source.time());
    const basis = viewBasis(view, sky);
    readout.textContent = t('Cruz: a {n}° de la Brasa · Aumento ×{z} · Índice: {d}°', {
      n: separation(basis.forward, sky.brasa).toFixed(1),
      z: view.zoom + 1,
      d: view.dial,
    });
    if (!done && held >= HOLD_SECONDS && wasHeld < HOLD_SECONDS) {
      done = true;
      const bearing = nudoBearing(sky);
      status.textContent = t('Rumbo fijado: el Nudo de verdad está a {n}° de la Brasa.', {
        n: bearing === undefined ? '?' : bearing.toFixed(1),
      });
      solve();
    }
  };
  frame = requestAnimationFrame(tick);

  const body = element('div', 'puzzle-body');
  body.append(hint, canvas, readout, controls);
  return {
    body,
    stop: () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
    },
  };
}
