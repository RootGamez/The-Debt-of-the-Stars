// Tus filamentos (Fase 9C, 🟡): los Ool brillan al leer (CONTEXTO_HISTORIA.md §7). En primera persona no te ves,
// así que se ven como un resplandor verde azulado suave en el borde de arriba de la pantalla mientras lees, y un
// latido cuando el Registro anota algo. Con "reducir movimiento", sin latido.

export interface Filaments {
  /** Una vez por fotograma: si hay una lectura abierta y cuántos hechos hay ya anotados. */
  update(reading: boolean, facts: number): void;
  /** Para depurar y las pruebas: si brillan y cuántas veces han latido. */
  snapshot(): { glowing: boolean; beats: number };
  dispose(): void;
}

export function createFilaments(): Filaments {
  const glow = document.createElement('div');
  glow.className = 'filamentos';
  glow.setAttribute('aria-hidden', 'true');
  document.body.append(glow);
  let known: number | undefined;
  let glowing = false;
  let beats = 0;

  return {
    update(reading, facts) {
      if (reading !== glowing) {
        glowing = reading;
        glow.classList.toggle('leyendo', reading);
      }
      if (known !== undefined && facts > known) {
        beats += 1;
        // Reinicia la animación del latido aunque ya estuviera puesta (se vuelve a poner en el fotograma siguiente).
        glow.classList.remove('late');
        requestAnimationFrame(() => {
          glow.classList.add('late');
        });
      }
      known = facts;
    },
    snapshot() {
      return { glowing, beats };
    },
    dispose() {
      glow.remove();
    },
  };
}
