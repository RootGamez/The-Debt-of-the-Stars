// Ritmo del reloj de un mundo en cada momento del ciclo. Por defecto es el `clock_rate` del glTF;
// algunos mundos cambian con el tiempo (Cicatriz "0,60 y bajando") y lo indican con una curva de
// puntos (t, ritmo) en la cronología, interpolada en línea recta.

export type RateCurve = readonly (readonly [number, number])[];

export function rateAt(baseRate: number, curve: RateCurve | undefined, t: number): number {
  if (!curve || curve.length === 0) return baseRate;
  const first = curve[0];
  const last = curve[curve.length - 1];
  if (!first || !last) return baseRate;
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (!a || !b || t > b[0]) continue;
    const k = (t - a[0]) / (b[0] - a[0]);
    return a[1] + (b[1] - a[1]) * k;
  }
  return last[1];
}
