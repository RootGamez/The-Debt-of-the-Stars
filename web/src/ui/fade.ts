// Fundidos a pantalla completa: a blanco cálido al morir y desde negro al despertar.
import type { Fade } from '../core/loopDirector';

const COLORS = { white: '#fff3e2', black: '#000000', none: 'transparent' } as const;

export interface FadeLayer {
  set(fade: Fade): void;
  dispose(): void;
}

export function createFadeLayer(): FadeLayer {
  const layer = document.createElement('div');
  layer.className = 'fade';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  let last = '';
  return {
    set({ color, amount }) {
      const key = `${color}:${amount.toFixed(3)}`;
      if (key === last) return;
      last = key;
      layer.style.backgroundColor = COLORS[color];
      layer.style.opacity = String(color === 'none' ? 0 : amount);
    },
    dispose() {
      layer.remove();
    },
  };
}
