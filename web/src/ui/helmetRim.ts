// El borde del casco de burbuja en primera persona (✅ Anthony 2026-11-03: sutil): un aro de latón que apenas asoma
// por las esquinas y el reflejo curvo del cristal. Es solo CSS (ver .casco en style.css) y no recibe clics.

export interface HelmetRim {
  /** Se ve a pie y en primera persona; no pilotando ni con la cámara exterior de depuración. */
  update(visible: boolean): void;
  dispose(): void;
}

export function createHelmetRim(): HelmetRim {
  const rim = document.createElement('div');
  rim.className = 'casco';
  rim.setAttribute('aria-hidden', 'true');
  rim.append(document.createElement('span'));
  document.body.append(rim);
  let shown: boolean | undefined;
  return {
    update(visible) {
      if (visible === shown) return;
      shown = visible;
      rim.classList.toggle('visible', visible);
    },
    dispose() {
      rim.remove();
    },
  };
}
