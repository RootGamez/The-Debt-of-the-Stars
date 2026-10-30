// Cuánto aire hay a cierta altura sobre un mundo con atmósfera (Fase 9), como lógica pura: abajo, todo cielo; al
// subir con la nave, el cielo se apaga y vuelven las estrellas. render/atmosphereView.ts lo dibuja.

function smoothstep(from: number, to: number, value: number): number {
  const x = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return x * x * (3 - 2 * x);
}

/** Lo que se ve del cielo (0 = el espacio, 1 = todo cielo) a `altitude` metros sobre el suelo. */
export function airDensity(altitude: number, height: number): number {
  if (!Number.isFinite(altitude) || !(height > 0)) return 0;
  return 1 - smoothstep(height * 0.2, height, altitude);
}
