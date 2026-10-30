// Reloj doble (CONTEXTO_HISTORIA.md §8): tu tiempo y el de Umbral. Discreto, abajo en el centro.
// Su separación es la lección de relatividad: en un mundo lento, Umbral avanza más rápido.
// Mientras llevas el Contrapeso (Fase 10), un tercer reloj: el suyo.
import { formatClock } from '../core/loopClock';

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
  const counterweightSeparator = separator.cloneNode(true) as HTMLSpanElement;
  const counterweight = document.createElement('span');
  counterweight.className = 'clock-hud-counterweight';
  hud.append(mine, separator, umbral, counterweightSeparator, counterweight);
  document.body.append(hud);

  let lastMine = '';
  let lastUmbral = '';
  let lastCounterweight: string | undefined = '';
  return {
    update(playerSeconds, umbralSeconds, visible, counterweightSeconds) {
      hud.hidden = !visible;
      const a = `tú ${formatClock(playerSeconds)}`;
      const b = `Umbral ${formatClock(umbralSeconds)}`;
      const c =
        counterweightSeconds === undefined
          ? undefined
          : `Contrapeso ${formatClock(counterweightSeconds)}`;
      // Solo se toca el DOM cuando cambia el segundo mostrado.
      if (a !== lastMine) mine.textContent = lastMine = a;
      if (b !== lastUmbral) umbral.textContent = lastUmbral = b;
      if (c !== lastCounterweight) {
        lastCounterweight = c;
        counterweight.textContent = c ?? '';
        counterweight.hidden = counterweightSeparator.hidden = c === undefined;
      }
    },
    dispose() {
      hud.remove();
    },
  };
}
