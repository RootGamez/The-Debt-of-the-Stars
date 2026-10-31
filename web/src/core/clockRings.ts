// La geometría del reloj doble en anillos de luz (plan del HUD, D.1): cuánto de cada anillo se ha vivido y dónde
// van las marcas de las 9:00 y las 13:30. Los anillos empiezan arriba y se llenan en el sentido de las agujas.

/** Lo vivido del ciclo, de 0 (las 0:00) a 1 (el final). */
export function ringFraction(seconds: number, duration: number): number {
  if (!(duration > 0) || !Number.isFinite(seconds)) return 0;
  return Math.min(1, Math.max(0, seconds / duration));
}

/** El `stroke-dashoffset` de un círculo de radio `radius`: oculta lo que aún no se ha vivido. */
export function ringDashOffset(seconds: number, duration: number, radius: number): number {
  return 2 * Math.PI * radius * (1 - ringFraction(seconds, duration));
}

/** Un punto del anillo (centro en el origen, y hacia abajo como en SVG) para la hora `seconds`. */
export function ringPoint(
  seconds: number,
  duration: number,
  radius: number,
): { x: number; y: number } {
  const angle = ringFraction(seconds, duration) * 2 * Math.PI;
  return { x: Math.sin(angle) * radius, y: -Math.cos(angle) * radius };
}
