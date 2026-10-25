// Reloj doble (CONTEXTO_HISTORIA.md §8): tu tiempo y el de Umbral. Discreto, abajo en el centro.
// Su separación es la lección de relatividad: en un mundo lento, Umbral avanza más rápido.
import { formatClock } from '../core/loopClock';

export interface ClockHud {
  update(playerSeconds: number, umbralSeconds: number, visible: boolean): void;
  dispose(): void;
}

export function createClockHud(): ClockHud {
  // role="timer": los lectores de pantalla lo anuncian como reloj sin leer cada segundo.
  const hud = document.createElement('div');
  hud.className = 'clock-hud';
  hud.setAttribute('role', 'timer');
  hud.setAttribute('aria-label', 'Reloj doble: tu tiempo y el de Umbral');
  const mine = document.createElement('span');
  const separator = document.createElement('span');
  separator.className = 'clock-hud-sep';
  separator.setAttribute('aria-hidden', 'true');
  separator.textContent = '·';
  const umbral = document.createElement('span');
  hud.append(mine, separator, umbral);
  document.body.append(hud);

  let lastMine = '';
  let lastUmbral = '';
  return {
    update(playerSeconds, umbralSeconds, visible) {
      hud.hidden = !visible;
      const a = `tú ${formatClock(playerSeconds)}`;
      const b = `Umbral ${formatClock(umbralSeconds)}`;
      // Solo se toca el DOM cuando cambia el segundo mostrado.
      if (a !== lastMine) mine.textContent = lastMine = a;
      if (b !== lastUmbral) umbral.textContent = lastUmbral = b;
    },
    dispose() {
      hud.remove();
    },
  };
}
