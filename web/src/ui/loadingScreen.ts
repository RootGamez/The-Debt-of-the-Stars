// La pantalla de carga: tres fotos dibujadas (los Ool del Instituto juntos, el Albatros II antes del primer vuelo y
// la Brasa con sus mundos) que se turnan, el título, la barra y el paso en que va la carga. El marcado y el estilo
// están en línea en index.html, para que se vea desde el primer instante (antes de que llegue el código); este
// módulo pone los textos traducidos, mueve la barra y la quita cuando el juego está listo. Mientras carga suena el
// tema principal, que los navegadores solo dejan sonar tras un gesto: hasta entonces se invita a hacerlo.
import { t } from '../i18n';
import { loadingFraction, remainingDisplay, type LoadingStage } from './loadingSteps';

export interface LoadingScreenOptions {
  /** Cuánto tiempo debe verse como mínimo (ms) aunque la carga acabe antes. */
  minDisplayMs: number;
  /** Sin menú detrás (pruebas, `?mundo`): no tapa los clics del juego. */
  passthrough: boolean;
  /** Si el audio ya suena: entonces se quita la invitación a tocar la pantalla. */
  audioRunning: () => boolean;
}

export interface LoadingScreen {
  /** Se llama a menudo mientras carga (tras cada paso): mueve la barra y mira si ya suena la música. */
  show(stage: Readonly<LoadingStage>): void;
  /** El juego no pudo cargarse: se dice aquí y la pantalla se queda. */
  fail(message: string): void;
  /** Quita la pantalla con un fundido (respetando el tiempo mínimo); termina cuando ya no está. */
  finish(): Promise<void>;
}

/** El pie de cada foto, en el orden de index.html. */
const captions = (): readonly string[] => [
  t('El Instituto, la víspera del primer vuelo.'),
  t('El Albatros II, listo para ir a la Luna.'),
  t('La Brasa y sus mundos, dibujados de memoria.'),
];

/** Lo que dura el fundido de salida (como la transición de `.loading` en index.html). */
const FADE_MS = 900;
/** Cada cuánto se mira si el audio ya arrancó (tras el primer gesto). */
const AUDIO_POLL_MS = 250;

function stepLabel(stage: Readonly<LoadingStage>): string {
  switch (stage.kind) {
    case 'start':
      return t('Preparando el viaje…');
    case 'worlds':
      return t('Dando forma a los mundos ({n} de {total})…', {
        n: stage.built,
        total: stage.total,
      });
    case 'light':
      return t('Encendiendo las luces…');
    case 'ready':
      return t('Listo.');
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Sin `#loading` en la página (ya se quitó, o una página sin él) todo sigue funcionando. */
function noScreen(): LoadingScreen {
  return {
    show: () => undefined,
    fail: () => undefined,
    finish: () => Promise.resolve(),
  };
}

export function createLoadingScreen(options: LoadingScreenOptions): LoadingScreen {
  const root = document.getElementById('loading');
  if (!root) return noScreen();
  const shownAt = performance.now();
  const title = root.querySelector('.loading-title');
  const bar = root.querySelector<HTMLElement>('.loading-bar span');
  const step = root.querySelector('.loading-step');
  const music = root.querySelector<HTMLElement>('.loading-music');

  if (title) title.textContent = t('La deuda de las estrellas');
  const texts = captions();
  root.querySelectorAll('.loading-photo figcaption').forEach((caption, k) => {
    caption.textContent = texts[k] ?? '';
  });
  root.classList.add('loading-live');
  root.classList.toggle('loading-passthrough', options.passthrough);

  const checkAudio = (): void => {
    if (!music) return;
    music.hidden = options.audioRunning();
  };
  if (music) music.textContent = t('♪ Toca la pantalla o pulsa una tecla para oír la música');
  checkAudio();
  const audioTimer = window.setInterval(checkAudio, AUDIO_POLL_MS);

  const show = (stage: Readonly<LoadingStage>): void => {
    if (bar) bar.style.width = `${Math.round(loadingFraction(stage) * 100)}%`;
    if (step) step.textContent = stepLabel(stage);
    checkAudio();
  };
  show({ kind: 'start' });

  return {
    show,
    fail(message) {
      window.clearInterval(audioTimer);
      root.classList.add('loading-failed');
      root.classList.remove('loading-passthrough');
      root.setAttribute('aria-busy', 'false');
      if (step) step.textContent = message;
    },
    async finish() {
      show({ kind: 'ready' });
      await wait(remainingDisplay(shownAt, performance.now(), options.minDisplayMs));
      window.clearInterval(audioTimer);
      root.setAttribute('aria-busy', 'false');
      root.classList.add('loading-done');
      await wait(FADE_MS);
      root.remove();
    },
  };
}
