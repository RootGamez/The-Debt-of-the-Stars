// Los iconos de los controles táctiles: un solo estilo (cuadrícula de 24, trazo de 2 con puntas redondas, sin
// relleno) para que se vean de la misma mano que el cuaderno. Son texto SVG fijo, nunca emoji ni letras.
// El trazo, el color y el tamaño los pone touch.css (`.touch-btn-icon`).

const ICONS = {
  jump: '<path d="M12 17V5M6 11l6-6 6 6M6 21h12"/>',
  up: '<path d="M6 14l6-6 6 6M6 20l6-6 6 6"/>',
  down: '<path d="M6 10l6 6 6-6M6 4l6 6 6-6"/>',
  seat: '<path d="M8 4v10h9M8 14v6M17 14v6M8 9h5"/>',
  stand: '<circle cx="12" cy="5" r="2"/><path d="M12 9v6M8 21l4-6 4 6M7 12l5-3 5 3"/>',
  read: '<path d="M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3zM21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z"/>',
  grab: '<path d="M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L8 14"/>',
  drop: '<path d="M12 4v10M7 10l5 5 5-5M5 20h14"/>',
  book: '<rect x="6" y="3" width="13" height="18" rx="2"/><path d="M10 3v18M13 8h3"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>',
  target:
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  stabilize: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M9 16h6"/>',
  camera:
    '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
  brake: '<circle cx="12" cy="12" r="9"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  land: '<path d="M12 3v12M7 11l5 5 5-5M4 21h16M6 21v-2M18 21v-2"/>',
  rollLeft: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>',
  rollRight: '<path d="M20 12a8 8 0 1 1-3-6.2M20 4v4h-4"/>',
  light:
    '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  sight: '<circle cx="12" cy="12" r="6"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  close: '<path d="M5 5l14 14M19 5L5 19"/>',
} as const;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/** Los trazos del icono (para meter dentro de un `<svg viewBox="0 0 24 24">`). */
export function iconMarkup(name: IconName): string {
  return ICONS[name];
}
