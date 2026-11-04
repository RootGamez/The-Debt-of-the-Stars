// Interfaz de vuelo, con el mismo aire discreto que el reloj doble: velocidad y altura abajo a la
// izquierda, el objetivo arriba con una marca sobre el mundo (o en el borde, apuntando hacia él), una
// sola sugerencia a la vez y, a pie, el aviso t("F · subir a la nave"). Todo entra como texto.
import { formatDistance, formatSpeed, type MarkerPlacement } from '../ship/hudMath';
import { t } from '../i18n';

export interface ShipHudTarget {
  name: string;
  distance: number;
  /** Positiva si te acercas. */
  closing: number;
  marker: MarkerPlacement | undefined;
}

export interface ShipHudState {
  piloting: boolean;
  /** A pie y junto a la escotilla. */
  canBoard: boolean;
  /** Velocidad respecto al mundo cercano (o al sistema en el espacio abierto). */
  speed: number;
  /** Altura sobre el suelo; `undefined` en el espacio abierto. */
  altitude: number | undefined;
  stabilize: boolean;
  landed: boolean;
  target: ShipHudTarget | undefined;
  hint: string | undefined;
}

export interface ShipHud {
  update(state: ShipHudState): void;
  dispose(): void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent: HTMLElement,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  parent.append(node);
  return node;
}

/** Cambia el texto solo si cambió (no se reescribe el DOM en cada fotograma). */
function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

export function createShipHud(): ShipHud {
  const root = element('div', 'ship-hud', document.body);
  root.hidden = true;
  const panel = element('div', 'ship-panel', root);
  const speed = element('p', 'ship-speed', panel);
  const altitude = element('p', 'ship-altitude', panel);
  const assist = element('p', 'ship-assist', panel);
  const target = element('p', 'ship-target', root);
  const marker = element('div', 'ship-marker', root);
  marker.setAttribute('aria-hidden', 'true');
  const markerLabel = element('span', 'ship-marker-label', marker);
  const hint = element('p', 'ship-hint', root);
  hint.setAttribute('role', 'status');

  const board = element('p', 'board-prompt', document.body);
  board.textContent = t('F · subir a la nave');
  board.hidden = true;

  function placeMarker(placement: MarkerPlacement | undefined, name: string): void {
    marker.hidden = placement === undefined;
    if (!placement) return;
    marker.classList.toggle('ship-marker-edge', !placement.onScreen);
    marker.style.left = `${((placement.x + 1) / 2) * 100}%`;
    marker.style.top = `${((1 - placement.y) / 2) * 100}%`;
    marker.style.setProperty('--angle', `${-placement.angle}rad`);
    setText(markerLabel, placement.onScreen ? name : '');
  }

  return {
    update(state) {
      board.hidden = state.piloting || !state.canBoard;
      root.hidden = !state.piloting;
      if (!state.piloting) return;

      setText(speed, `${t('Velocidad')} ${formatSpeed(state.speed)}`);
      setText(
        altitude,
        state.landed
          ? t('Posada')
          : state.altitude === undefined
            ? t('Espacio abierto')
            : `${t('Altura')} ${formatDistance(Math.max(0, state.altitude))}`,
      );
      setText(assist, state.stabilize ? t('Estabilizador · Z') : t('Modo libre · Z'));
      assist.classList.toggle('ship-assist-off', !state.stabilize);

      target.hidden = state.target === undefined;
      if (state.target) {
        const { name, distance, closing } = state.target;
        const motion =
          Math.abs(closing) < 0.5
            ? ''
            : ` · ${closing > 0 ? 'te acercas a' : 'te alejas a'} ${formatSpeed(closing)}`;
        setText(target, `${name} · ${formatDistance(distance)}${motion}`);
      }
      placeMarker(state.target?.marker, state.target?.name ?? '');

      hint.hidden = state.hint === undefined;
      setText(hint, state.hint ?? '');
    },
    dispose() {
      root.remove();
      board.remove();
    },
  };
}
