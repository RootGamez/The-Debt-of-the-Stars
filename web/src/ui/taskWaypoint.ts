// El indicador de la tarea actual en la pantalla: un rombo con el nombre y la distancia sobre lo que hay que
// alcanzar y, si no se ve, una flecha en el borde hacia donde girar. Solo pinta lo que calcula game/waypoint.ts.
import { distanceLabel, type WaypointPlacement } from '../game/waypoint';

export interface WaypointView {
  /** `undefined` esconde el indicador. */
  update(shown: { placement: WaypointPlacement; label: string; meters: number } | undefined): void;
  /** Para depurar y las pruebas: lo que se ve ahora. */
  readonly shown: { label: string; onScreen: boolean } | undefined;
  dispose(): void;
}

export function createWaypointView(): WaypointView {
  const root = document.createElement('div');
  root.className = 'meta-tarea';
  root.setAttribute('aria-hidden', 'true');
  const arrow = document.createElement('span');
  arrow.className = 'meta-flecha';
  arrow.textContent = '➤';
  const diamond = document.createElement('span');
  diamond.className = 'meta-rombo';
  const text = document.createElement('span');
  text.className = 'meta-texto';
  root.append(arrow, diamond, text);
  document.body.append(root);
  let current: { label: string; onScreen: boolean } | undefined;

  return {
    update(shown) {
      if (!shown) {
        if (current) root.classList.remove('meta-visible');
        current = undefined;
        return;
      }
      const { placement, label, meters } = shown;
      root.style.left = `${(placement.x * 100).toFixed(2)}%`;
      root.style.top = `${(placement.y * 100).toFixed(2)}%`;
      root.classList.toggle('meta-borde', !placement.onScreen);
      arrow.style.transform = `rotate(${(placement.angle - Math.PI / 2).toFixed(3)}rad)`;
      text.textContent = `${label} · ${distanceLabel(meters)}`;
      root.classList.add('meta-visible');
      current = { label, onScreen: placement.onScreen };
    },
    get shown() {
      return current;
    },
    dispose() {
      root.remove();
    },
  };
}
