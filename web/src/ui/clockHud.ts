// Reloj doble (CONTEXTO_HISTORIA.md §8; plan del HUD, D.1): tu tiempo y el de Umbral, como anillos de luz trazados
// a mano, abajo en el centro. El de dentro es el tuyo (verde de filamento) y el de fuera el de Umbral (ámbar); las
// marcas son las horas grandes del ciclo (9:00, 13:30). Su separación es la lección de relatividad: en un mundo
// lento, Umbral avanza más rápido. Mientras llevas el Contrapeso (Fase 10), un tercer anillo: el suyo.
// Los minutos se leen a los lados, en letra a mano ("tú 07:12", "Umbral 07:40").
import { ringDashOffset, ringPoint } from '../core/clockRings';
import { formatClock } from '../core/loopClock';
import { t } from '../i18n';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW = 100;
const CENTER = VIEW / 2;
/** Radios de los anillos: el tuyo, el de Umbral y el del Contrapeso (por fuera de todo). */
const MINE_RADIUS = 26;
const UMBRAL_RADIUS = 36;
const COUNTERWEIGHT_RADIUS = 45;

export interface ClockHud {
  /** `counterweightSeconds`: lo que marca el Contrapeso si lo llevas; si no, undefined (no se ve). */
  update(
    playerSeconds: number,
    umbralSeconds: number,
    visible: boolean,
    counterweightSeconds?: number,
  ): void;
  dispose(): void;
}

function svgNode(tag: string, attributes: Record<string, string | number>): SVGElement {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  return element;
}

/** Un anillo: la pista apagada y el arco vivido encima (empieza arriba), en un grupo que se puede apagar entero. */
function ring(svg: SVGSVGElement, radius: number, className: string): SVGElement {
  const group = svgNode('g', { class: 'ring' });
  group.append(svgNode('circle', { class: 'ring-track', cx: CENTER, cy: CENTER, r: radius }));
  const arc = svgNode('circle', {
    class: `ring-arc ${className}`,
    cx: CENTER,
    cy: CENTER,
    r: radius,
    'stroke-dasharray': (2 * Math.PI * radius).toFixed(2),
    transform: `rotate(-90 ${CENTER} ${CENTER})`,
  });
  group.append(arc);
  svg.append(group);
  return arc;
}

/**
 * @param duration lo que dura el ciclo (s).
 * @param marks las horas que se marcan en los anillos (s).
 */
export function createClockHud(duration: number, marks: readonly number[] = []): ClockHud {
  // role="timer": los lectores de pantalla lo anuncian como reloj sin leer cada segundo.
  const hud = document.createElement('div');
  hud.className = 'clock-hud';
  hud.setAttribute('role', 'timer');
  hud.setAttribute('aria-label', t('Reloj doble: tu tiempo y el de Umbral'));
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW} ${VIEW}`);
  svg.setAttribute('class', 'clock-rings');
  svg.setAttribute('aria-hidden', 'true');
  const counterweightArc = ring(svg, COUNTERWEIGHT_RADIUS, 'ring-counterweight');
  const umbralArc = ring(svg, UMBRAL_RADIUS, 'ring-umbral');
  const mineArc = ring(svg, MINE_RADIUS, 'ring-mine');
  for (const mark of marks) {
    for (const radius of [MINE_RADIUS, UMBRAL_RADIUS]) {
      const { x, y } = ringPoint(mark, duration, radius);
      svg.append(svgNode('circle', { class: 'ring-mark', cx: CENTER + x, cy: CENTER + y, r: 1.8 }));
    }
  }
  const mine = document.createElement('span');
  mine.className = 'clock-hud-mine';
  const umbral = document.createElement('span');
  umbral.className = 'clock-hud-umbral';
  const separator = document.createElement('span');
  separator.className = 'clock-hud-sep';
  separator.setAttribute('aria-hidden', 'true');
  separator.textContent = '·';
  const counterweightSeparator = separator.cloneNode(true) as HTMLSpanElement;
  const counterweight = document.createElement('span');
  counterweight.className = 'clock-hud-counterweight';
  hud.append(mine, svg, separator, umbral, counterweightSeparator, counterweight);
  document.body.append(hud);

  let lastMine = '';
  let lastUmbral = '';
  let lastCounterweight: string | undefined = '';
  let lastVisible: boolean | undefined;
  return {
    update(playerSeconds, umbralSeconds, visible, counterweightSeconds) {
      if (visible !== lastVisible) hud.hidden = !(lastVisible = visible);
      if (!visible) return;
      const a = t('tú {time}', { time: formatClock(playerSeconds) });
      const b = `Umbral ${formatClock(umbralSeconds)}`;
      const c =
        counterweightSeconds === undefined
          ? undefined
          : `Contrapeso ${formatClock(counterweightSeconds)}`;
      // Solo se toca el DOM cuando cambia el segundo mostrado.
      if (a !== lastMine) {
        mine.textContent = lastMine = a;
        mineArc.setAttribute(
          'stroke-dashoffset',
          ringDashOffset(playerSeconds, duration, MINE_RADIUS).toFixed(2),
        );
      }
      if (b !== lastUmbral) {
        umbral.textContent = lastUmbral = b;
        umbralArc.setAttribute(
          'stroke-dashoffset',
          ringDashOffset(umbralSeconds, duration, UMBRAL_RADIUS).toFixed(2),
        );
      }
      if (c !== lastCounterweight) {
        lastCounterweight = c;
        counterweight.textContent = c ?? '';
        counterweight.hidden = counterweightSeparator.hidden = c === undefined;
        counterweightArc.parentElement?.classList.toggle('is-off', c === undefined);
        if (counterweightSeconds !== undefined) {
          counterweightArc.setAttribute(
            'stroke-dashoffset',
            ringDashOffset(counterweightSeconds, duration, COUNTERWEIGHT_RADIUS).toFixed(2),
          );
        }
      }
    },
    dispose() {
      hud.remove();
    },
  };
}
