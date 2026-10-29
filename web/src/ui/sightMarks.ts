// Las marcas de la mira graduada: a cuántos píxeles del centro cae cada ángulo. La cámara proyecta en
// perspectiva, así que un ángulo θ cae a (alto/2) · tan θ / tan(campo/2) del centro. La mira no sabe nada del
// Nudo: solo mide ángulos (plan de la Fase 7, decisión 4).

export interface SightMark {
  degrees: number;
  /** Distancia al centro de la pantalla (px). */
  radius: number;
  /** Cada 10°: anillo con número. */
  major: boolean;
}

const STEP = 2;
const MAJOR = 10;

/** @param fovDegrees campo de visión vertical de la cámara. */
export function sightMarks(fovDegrees: number, heightPx: number, maxDegrees = 30): SightMark[] {
  if (!(fovDegrees > 0 && fovDegrees < 180) || !(heightPx > 0)) return [];
  const half = Math.tan((fovDegrees * Math.PI) / 360);
  const marks: SightMark[] = [];
  for (let degrees = STEP; degrees <= maxDegrees && degrees < fovDegrees / 2; degrees += STEP) {
    const radius = ((heightPx / 2) * Math.tan((degrees * Math.PI) / 180)) / half;
    marks.push({ degrees, radius, major: degrees % MAJOR === 0 });
  }
  return marks;
}
