// El cartel de llegada (plan del HUD, D.4): al despertar y al aterrizar, el nombre del mundo (el tuyo, si ya lo
// nombraste) se escribe a mano arriba, con una línea pequeña debajo, y se desvanece solo. No tapa nada ni coge clics.
const VISIBLE_MS = 3600;

export interface PlaceCard {
  show(name: string, sub?: string): void;
  dispose(): void;
}

export function createPlaceCard(): PlaceCard {
  const card = document.createElement('div');
  card.className = 'place';
  card.setAttribute('role', 'status');
  const main = document.createElement('span');
  main.className = 'place-main';
  const ink = document.createElement('span');
  main.append(ink);
  const sub = document.createElement('span');
  sub.className = 'place-sub';
  card.append(main, sub);
  document.body.append(card);
  let timer: number | undefined;

  return {
    show(name, line) {
      ink.textContent = name;
      sub.textContent = line ?? '';
      card.classList.remove('is-on');
      card.getBoundingClientRect(); // reinicia la animación si llega otro nombre
      card.classList.add('is-on');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        card.classList.remove('is-on');
      }, VISIBLE_MS);
    },
    dispose() {
      window.clearTimeout(timer);
      card.remove();
    },
  };
}
