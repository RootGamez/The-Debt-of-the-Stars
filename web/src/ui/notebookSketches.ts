// Los dibujos del cuaderno (plan de historia y puzzles físicos, §9): lo que enseña algo físico o una figura se pega
// junto al hecho como un croquis a tinta. Aquí solo se calculan los trazos (puro y reproducible: la mano tiembla
// siempre igual); el panel (registryPanel.ts) los convierte en SVG. Solo la tinta brilla (✅ cuaderno vivo).
import { t } from '../i18n';

/** El papel del croquis. */
export const SKETCH_WIDTH = 200;
export const SKETCH_HEIGHT = 130;

export type Shape =
  | { type: 'path'; d: string; accent?: boolean; dashed?: boolean }
  | { type: 'dot'; x: number; y: number; r: number; accent?: boolean }
  | {
      type: 'label';
      x: number;
      y: number;
      text: string;
      anchor?: 'start' | 'middle' | 'end';
      accent?: boolean;
    };

export interface Sketch {
  /** El texto alternativo (ya en el idioma del juego). */
  alt: string;
  shapes: Shape[];
}

type Pt = readonly [number, number];

const round = (n: number): number => Math.round(n * 10) / 10;

/** Azar reproducible (Park–Miller), como el de los dibujos de los mundos. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/** Un croquis a medio hacer: se le van añadiendo trazos. */
class Pen {
  readonly shapes: Shape[] = [];
  private readonly rand: () => number;

  constructor(seed: number) {
    this.rand = seeded(seed);
  }

  private shake(amount: number): number {
    return (this.rand() - 0.5) * 2 * amount;
  }

  /** Curva suave por unos puntos (los puntos medios son los nudos y los puntos, los controles). */
  private smooth(points: readonly Pt[], closed: boolean): string {
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return '';
    const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const fmt = (p: Pt): string => `${String(round(p[0]))} ${String(round(p[1]))}`;
    if (!closed) {
      let d = `M ${fmt(first)}`;
      for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        const next = points[i + 1];
        if (p && next) d += ` Q ${fmt(p)} ${fmt(mid(p, next))}`;
      }
      return `${d} L ${fmt(last)}`;
    }
    const start = mid(last, first);
    let d = `M ${fmt(start)}`;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const next = points[(i + 1) % points.length];
      if (p && next) d += ` Q ${fmt(p)} ${fmt(mid(p, next))}`;
    }
    return d;
  }

  path(d: string, accent = false, dashed = false): this {
    this.shapes.push({
      type: 'path',
      d,
      ...(accent ? { accent } : {}),
      ...(dashed ? { dashed } : {}),
    });
    return this;
  }

  line(a: Pt, b: Pt, accent = false, dashed = false): this {
    const jitter = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.02 + 0.4;
    const m: Pt = [(a[0] + b[0]) / 2 + this.shake(jitter), (a[1] + b[1]) / 2 + this.shake(jitter)];
    return this.path(this.smooth([a, m, b], false), accent, dashed);
  }

  /** Una polilínea a mano por varios puntos. */
  poly(points: readonly Pt[], accent = false, dashed = false): this {
    const loose = points.map((p): Pt => [p[0] + this.shake(0.6), p[1] + this.shake(0.6)]);
    return this.path(this.smooth(loose, false), accent, dashed);
  }

  /** Un arco de círculo (grados: 0 a la derecha, 90 hacia abajo, como en el papel). */
  arc(
    cx: number,
    cy: number,
    r: number,
    from: number,
    to: number,
    accent = false,
    dashed = false,
  ): this {
    const steps = Math.max(4, Math.ceil(Math.abs(to - from) / 30));
    const points: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const angle = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
      const radius = r + this.shake(r * 0.02 + 0.3);
      points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
    return this.path(this.smooth(points, false), accent, dashed);
  }

  circle(cx: number, cy: number, r: number, accent = false, dashed = false): this {
    const points: Pt[] = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = r * (1 + this.shake(0.03));
      points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
    return this.path(this.smooth(points, true), accent, dashed);
  }

  dot(x: number, y: number, r: number, accent = false): this {
    this.shapes.push({ type: 'dot', x: round(x), y: round(y), r, ...(accent ? { accent } : {}) });
    return this;
  }

  label(
    x: number,
    y: number,
    text: string,
    anchor: 'start' | 'middle' | 'end' = 'middle',
    accent = false,
  ): this {
    this.shapes.push({ type: 'label', x, y, text, anchor, ...(accent ? { accent } : {}) });
    return this;
  }

  /** Un reloj con una aguja (grados desde las doce, en el sentido de las agujas). */
  clock(cx: number, cy: number, r: number, hand: number, accent = false): this {
    this.circle(cx, cy, r, accent);
    const angle = ((hand - 90) * Math.PI) / 180;
    this.line([cx, cy], [cx + r * 0.8 * Math.cos(angle), cy + r * 0.8 * Math.sin(angle)], accent);
    return this.dot(cx, cy, 1.4, accent);
  }

  /** Una punta de flecha en `to`, viniendo de `from`. */
  arrowhead(from: Pt, to: Pt, accent = false): this {
    const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
    const wing = (side: number): Pt => [
      to[0] - 6 * Math.cos(angle + side * 0.45),
      to[1] - 6 * Math.sin(angle + side * 0.45),
    ];
    return this.poly([wing(1), to, wing(-1)], accent);
  }
}

/** Los dos medios símbolos: anillo doble partido por la mitad con tres marcas a cada lado. */
function halfSymbol(pen: Pen, side: 'left' | 'right', accent: boolean): void {
  const cx = 100;
  const cy = 65;
  const [from, to] = side === 'left' ? [90, 270] : [-90, 90];
  pen.arc(cx, cy, 44, from, to, accent);
  pen.arc(cx, cy, 24, from, to, accent);
  const sign = side === 'left' ? -1 : 1;
  for (const tilt of [-1, 0, 1]) {
    const angle = ((side === 'left' ? 180 : 0) + tilt * 38) * (Math.PI / 180);
    pen.line(
      [cx + 26 * Math.cos(angle), cy + 26 * Math.sin(angle)],
      [cx + 42 * Math.cos(angle), cy + 42 * Math.sin(angle)],
      accent,
    );
  }
  pen.dot(cx + sign * 10, cy, 2, accent);
}

/** El borde roto por el que el símbolo se partió (el mismo en las dos mitades). */
function brokenEdge(pen: Pen, accent: boolean, dashed: boolean): void {
  pen.poly(
    [
      [100, 18],
      [104, 30],
      [97, 42],
      [105, 54],
      [96, 66],
      [104, 78],
      [97, 90],
      [103, 102],
      [100, 112],
    ],
    accent,
    dashed,
  );
}

const BUILDERS: Readonly<Record<string, () => Sketch>> = {
  /** `lab.imagen_desplazada`: la estrella se ve más allá de donde está. */
  mapa_cielo() {
    const pen = new Pen(11);
    for (const [x, y] of [
      [28, 24],
      [172, 96],
      [48, 100],
      [128, 14],
      [180, 40],
      [20, 70],
    ] as const)
      pen.dot(x, y, 1.2);
    pen.circle(100, 72, 12);
    pen.dot(100, 72, 6);
    pen.circle(56, 36, 5, false, true);
    pen.label(56, 56, t('donde está'));
    pen.circle(150, 34, 5, true);
    pen.dot(150, 34, 2, true);
    pen.label(150, 22, t('donde parece'), 'middle', true);
    pen.arc(103, 72, 56, -88, -30, true, true);
    pen.arrowhead([138, 28], [147, 33], true);
    pen.label(100, 118, '18°', 'middle', true);
    return {
      alt: t(
        'Dibujo: una estrella se ve dieciocho grados más allá de donde está, junto a un punto oscuro que dobla la luz',
      ),
      shapes: pen.shapes,
    };
  },

  /** `deuda.es_de_tiempo`: dos relojes que, juntos, no marcan lo mismo. */
  relojes_separan() {
    const pen = new Pen(23);
    pen.clock(52, 56, 30, 100);
    pen.label(52, 104, t('Umbral'));
    pen.clock(148, 56, 30, 70, true);
    pen.label(148, 104, t('Archivo'), 'middle', true);
    pen.line([90, 52], [110, 52]);
    pen.line([90, 62], [110, 62]);
    pen.line([92, 70], [108, 46], true);
    return {
      alt: t(
        'Dibujo: dos relojes lado a lado; el de un mundo va por delante y el del otro se queda atrás',
      ),
      shapes: pen.shapes,
    };
  },

  /** `contrapeso.metodo_sincronia`: el que viaja envejece menos que el que espera. */
  gemelos() {
    const pen = new Pen(37);
    pen.line([30, 112], [170, 112]);
    pen.line([55, 112], [55, 112 - 18]);
    pen.line([145, 112], [145, 112 - 90]);
    for (let day = 0; day <= 100; day += 10)
      pen.line([141, 112 - 0.9 * day], [149, 112 - 0.9 * day]);
    for (let day = 0; day <= 20; day += 10) pen.line([51, 112 - 0.9 * day], [59, 112 - 0.9 * day]);
    pen.circle(55, 112 - 24, 6, true);
    pen.circle(145, 112 - 96, 6);
    pen.line([61, 112 - 24], [139, 112 - 96], false, true);
    pen.label(55, 124, '20', 'middle', true);
    pen.label(145, 124, '100');
    pen.label(100, 18, t('el mismo viaje, dos relojes'));
    return {
      alt: t(
        'Dibujo: dos columnas de días; el gemelo que viajó cuenta veinte y el que esperó cuenta cien',
      ),
      shapes: pen.shapes,
    };
  },

  /** `archivo.hora_ranura`: a las cuatro la luz entra por la ranura. */
  ranura() {
    const pen = new Pen(41);
    pen.circle(30, 14, 9, true);
    // El rayo baja con la misma inclinación antes y después de la ranura del muro.
    pen.line([40, 20], [156, 108], true, true);
    pen.line([60, 24], [171, 108], true, true);
    pen.line([20, 56], [88, 56]);
    pen.line([112, 56], [180, 56]);
    pen.line([20, 62], [88, 62]);
    pen.line([112, 62], [180, 62]);
    pen.line([30, 108], [190, 108]);
    pen.poly(
      [
        [156, 108],
        [171, 108],
        [166, 115],
        [151, 115],
      ],
      true,
    );
    pen.clock(165, 22, 13, 120);
    pen.label(165, 46, '4:00', 'middle', true);
    return {
      alt: t(
        'Dibujo: a las cuatro, un rayo de luz de la Brasa atraviesa la ranura de un muro y cae sobre el suelo',
      ),
      shapes: pen.shapes,
    };
  },

  /** `contrapeso.ventana_pulso`: los quince minutos y el instante del pulso. */
  pulso() {
    const pen = new Pen(53);
    const at = (minute: number): number => 15 + (170 * minute) / 15;
    pen.line([15, 84], [185, 84]);
    for (let minute = 0; minute <= 15; minute++)
      pen.line([at(minute), 84], [at(minute), minute % 5 === 0 ? 92 : 88]);
    pen.poly(
      [
        [at(9) - 8, 84],
        [at(9) - 3, 40],
        [at(9), 70],
        [at(9) + 3, 22],
        [at(9) + 8, 84],
      ],
      true,
    );
    pen.poly(
      [
        [at(9) - 9, 100],
        [at(9) - 9, 106],
        [at(9) + 9, 106],
        [at(9) + 9, 100],
      ],
      true,
    );
    pen.label(at(9), 120, t('el núcleo se abre'), 'middle', true);
    pen.label(at(9), 14, '9:00', 'middle', true);
    pen.line([at(13.5), 76], [at(13.5), 94], false, true);
    pen.label(at(13.5), 70, '13:30');
    pen.label(at(0) + 4, 76, '0');
    return {
      alt: t(
        'Dibujo: una línea de quince minutos; a las nueve en punto hay un pico y el núcleo se abre un instante, antes de las trece y media',
      ),
      shapes: pen.shapes,
    };
  },

  /** `casa.simbolo_partido`: la mitad de un símbolo, con el borde roto. */
  medio_simbolo() {
    const pen = new Pen(67);
    halfSymbol(pen, 'left', false);
    brokenEdge(pen, false, false);
    pen.label(100, 124, '?', 'middle', true);
    return {
      alt: t('Dibujo: la mitad izquierda de un símbolo de dos anillos, con el borde roto'),
      shapes: pen.shapes,
    };
  },

  /** `casa.simbolo_encaja`: las dos mitades, la de casa y la de la pared de Cicatriz. */
  simbolo_entero() {
    const pen = new Pen(67);
    halfSymbol(pen, 'left', false);
    halfSymbol(pen, 'right', true);
    brokenEdge(pen, true, true);
    pen.label(52, 124, t('mi fragmento'), 'middle');
    pen.label(150, 124, t('la pared'), 'middle', true);
    return {
      alt: t(
        'Dibujo: las dos mitades de un símbolo de dos anillos juntas: la de mi fragmento y la de la pared',
      ),
      shapes: pen.shapes,
    };
  },

  /** `mundos.compas`: el canal inclinado con las campanas en las marcas 1, 4, 9 y 16. */
  campanas() {
    const pen = new Pen(97);
    const at = (mark: number): Pt => [20 + mark * 10.5, 28 + mark * 4.4];
    pen.line([20, 28], [190, 100]);
    for (let mark = 1; mark <= 16; mark++) {
      const [x, y] = at(mark);
      pen.line([x, y - 3], [x, y + 3]);
    }
    for (const mark of [1, 4, 9, 16]) {
      const [x, y] = at(mark);
      pen.arc(x, y - 8, 7, 180, 360, true);
      pen.line([x - 7, y - 8], [x + 7, y - 8], true);
      pen.dot(x, y - 12, 1.3, true);
      pen.label(x, y + 14, String(mark), 'middle', true);
    }
    pen.circle(26, 24, 3);
    pen.label(100, 14, t('cada vez más lejos'));
    return {
      alt: t(
        'Dibujo: un canal inclinado con dieciséis marcas y cuatro campanas puestas en las marcas 1, 4, 9 y 16',
      ),
      shapes: pen.shapes,
    };
  },

  /** `mundos.cancion`: la fila de mundos desde la Brasa, con un hueco entre Umbral y el Observatorio. */
  cancion() {
    const pen = new Pen(101);
    pen.circle(14, 66, 9, true);
    pen.dot(14, 66, 3, true);
    pen.label(14, 92, t('la Brasa'), 'middle', true);
    const worlds = [t('Taller'), t('Cicatriz'), t('Archivo'), t('Umbral'), '', t('Observatorio')];
    worlds.forEach((name, index) => {
      const x = 50 + index * 28;
      if (name === '') {
        pen.circle(x, 66, 6, true, true);
        pen.label(x, 52, '?', 'middle', true);
        return;
      }
      pen.circle(x, 66, 6);
      pen.dot(x, 66, 1.6);
      pen.label(x, index % 2 === 0 ? 44 : 92, name);
    });
    pen.line([28, 66], [40, 66], false, true);
    pen.label(100, 18, t('un verso que nadie canta'), 'middle', true);
    return {
      alt: t(
        'Dibujo: una fila de mundos desde la Brasa: Taller, Cicatriz, Archivo, Umbral, un hueco punteado y el Observatorio',
      ),
      shapes: pen.shapes,
    };
  },

  /** `bocas.relojes_distintos`: tres bocas de Puerta, cada una con su hora. */
  bocas() {
    const pen = new Pen(79);
    const hands = [40, 205, 110] as const;
    hands.forEach((hand, index) => {
      const cx = 36 + index * 64;
      pen.arc(cx, 96, 24, 180, 360, index === 1);
      pen.line([cx - 24, 96], [cx - 24, 116], index === 1);
      pen.line([cx + 24, 96], [cx + 24, 116], index === 1);
      pen.clock(cx, 40, 14, hand, index === 1);
    });
    pen.line([50, 40], [72, 40], false, true);
    pen.line([114, 40], [136, 40], false, true);
    return {
      alt: t('Dibujo: tres bocas de una Puerta, cada una con un reloj que marca una hora distinta'),
      shapes: pen.shapes,
    };
  },
};

export const SKETCH_IDS: readonly string[] = Object.keys(BUILDERS);

/** El croquis de un id, o nada si no existe. */
export function sketchOf(id: string): Sketch | undefined {
  return BUILDERS[id]?.();
}
