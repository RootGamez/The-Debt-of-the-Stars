// Lo que se ve encima de una cinemática (F3): franjas de cine, el negro de los fundidos, una viñeta, los subtítulos
// con el signo de quien habla, un aviso (teclas, pausa, «Esc otra vez», sonido) y tres mandos para quien no tiene
// teclado: pausa, plano siguiente y saltar. Lo que pinta cada fotograma lo decide el reproductor
// (game/cinematicRunner.ts); aquí solo hay DOM.
import './cinematic.css';
import { button, element } from './puzzleKit';
import { t } from '../i18n';

const SVG = 'http://www.w3.org/2000/svg';

/** El signo del pecho de cada uno (🟡 D13): ella, un rombo con un punto dentro; él, dos triángulos punta con punta. */
const SIGNS: Readonly<Record<string, string>> = {
  cientifica:
    'M10 1.5 L18 10 L10 18.5 L2 10 Z M10 4.4 L15.3 10 L10 15.6 L4.7 10 Z ' +
    'M7.8 10 A2.2 2.2 0 1 0 12.2 10 A2.2 2.2 0 1 0 7.8 10 Z',
  esceptico: 'M3.5 3 H16.5 L10 10 Z M3.5 17 H16.5 L10 10 Z',
};
const ICONS = {
  pause: 'M5 3 H8 V17 H5 Z M12 3 H15 V17 H12 Z',
  play: 'M5 3 L16 10 L5 17 Z',
  next: 'M3 3 L11 10 L3 17 Z M11 3 L19 10 L11 17 Z',
  skip: 'M4 4 L16 16 M16 4 L4 16',
} as const;

function icon(path: string, className: string, stroke = false): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', className);
  const shape = document.createElementNS(SVG, 'path');
  shape.setAttribute('d', path);
  shape.setAttribute('fill', stroke ? 'none' : 'currentColor');
  shape.setAttribute('fill-rule', 'evenodd');
  if (stroke) {
    shape.setAttribute('stroke', 'currentColor');
    shape.setAttribute('stroke-width', '2');
    shape.setAttribute('stroke-linecap', 'round');
  }
  svg.append(shape);
  return svg;
}

export interface LayerSubtitle {
  /** Quién habla (su signo): `cientifica`, `esceptico`… */
  speaker: string;
  /** Su nombre, para quien lee la pantalla con voz. */
  name: string;
  text: string;
  /** Letras que ya se ven. */
  shown: number;
  /** 0–1. */
  alpha: number;
}

export interface LayerFrame {
  /** 0–1: las franjas de cine. */
  bars: number;
  /** 0–1: negro encima. */
  fade: number;
  /** 0–1: la viñeta se cierra (planos cortos). */
  haze: number;
  subtitle: LayerSubtitle | undefined;
  /** El aviso de arriba (o nada). */
  hint: string | undefined;
  paused: boolean;
}

export interface CinematicLayerOptions {
  label: string;
  /** Los textos son borradores (se marca arriba). */
  draft: boolean;
  onPause: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export interface CinematicLayer {
  render(frame: LayerFrame): void;
  /** Acabada: sin mandos ni avisos (las franjas y el negro siguen a lo que diga la escena). */
  end(): void;
  dispose(): void;
}

export function createCinematicLayer(options: CinematicLayerOptions): CinematicLayer {
  const root = element('div', 'cine');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', options.label);
  const veil = element('div', 'cine-veil');
  const focus = element('div', 'cine-focus');
  const vignette = element('div', 'cine-vignette');
  // Las franjas se recogen (escala); lo que va encima de ellas, en su propia banda, para no aplastarse con ellas.
  const bars = [
    element('div', 'cine-bar cine-bar--top'),
    element('div', 'cine-bar cine-bar--bottom'),
  ];
  const top = element('div', 'cine-band cine-band--top');
  const bottom = element('div', 'cine-band cine-band--bottom');
  if (options.draft) top.append(element('p', 'cine-tag', t('Texto provisional')));

  const controls = element('div', 'cine-controls');
  const pause = button('', 'cine-button', t('Pausar escena'));
  const pauseIcon = icon(ICONS.pause, '');
  const playIcon = icon(ICONS.play, '');
  pause.append(pauseIcon);
  const next = button('', 'cine-button', t('Plano siguiente'));
  next.append(icon(ICONS.next, ''));
  const skip = button('', 'cine-button', t('Saltar la escena'));
  skip.append(icon(ICONS.skip, '', true));
  pause.addEventListener('click', options.onPause);
  next.addEventListener('click', options.onNext);
  skip.addEventListener('click', options.onSkip);
  controls.append(pause, next, skip);
  top.append(controls);

  const subtitle = element('p', 'cine-subtitle');
  subtitle.setAttribute('aria-hidden', 'true');
  const words = element('span', 'cine-words');
  const said = element('span', 'cine-said');
  const unsaid = element('span', 'cine-unsaid');
  words.append(said, unsaid);
  subtitle.append(words);
  bottom.append(subtitle);

  const hint = element('p', 'cine-hint');
  hint.setAttribute('role', 'status');
  const spoken = element('p', 'sr-only');
  spoken.setAttribute('aria-live', 'polite');
  root.append(focus, vignette, veil, ...bars, top, bottom, hint, spoken);
  document.body.append(root);

  let speaker: string | undefined;
  let line: string | undefined;
  let shownLetters = -1;
  let hintText: string | undefined;
  let paused = false;
  let sign: SVGSVGElement | undefined;

  function setSpeaker(who: string): void {
    if (who === speaker) return;
    speaker = who;
    sign?.remove();
    const path = SIGNS[who];
    sign = path ? icon(path, `cine-sign cine-sign--${who}`) : undefined;
    if (sign) subtitle.prepend(sign);
  }

  function setLine(next: LayerSubtitle | undefined): void {
    subtitle.style.opacity = String(next?.alpha ?? 0);
    if (!next) return;
    setSpeaker(next.speaker);
    if (next.text !== line) {
      line = next.text;
      shownLetters = -1;
      spoken.textContent = `${next.name}: ${next.text}`;
    }
    if (next.shown === shownLetters) return;
    shownLetters = next.shown;
    const letters = Array.from(next.text);
    said.textContent = letters.slice(0, next.shown).join('');
    unsaid.textContent = letters.slice(next.shown).join('');
  }

  return {
    render(frame) {
      veil.style.opacity = String(frame.fade);
      root.style.setProperty('--cine-bars', String(frame.bars));
      root.style.setProperty('--cine-haze', String(frame.haze));
      setLine(frame.subtitle);
      if (frame.hint !== hintText) {
        hintText = frame.hint;
        if (frame.hint) hint.textContent = frame.hint;
        hint.classList.toggle('cine-hint--shown', frame.hint !== undefined);
      }
      if (frame.paused !== paused) {
        paused = frame.paused;
        pause.replaceChildren(paused ? playIcon : pauseIcon);
        pause.setAttribute('aria-label', paused ? t('Seguir con la escena') : t('Pausar escena'));
      }
    },
    end() {
      root.classList.add('cine--ended');
      spoken.textContent = '';
    },
    dispose() {
      root.remove();
    },
  };
}
