// Hogar diez años después (F5, el final malo «Llegas tarde»; 🟡 todo el aspecto, sobre lo ✅ de plan-finales.md):
// la misma isla, pero con la Puerta Mayor terminada y encendida, el Motor dando luz a la ciudad por cables hasta el
// Instituto, anillos pequeños de prueba por la costa, las crías ya mayores, un memorial al explorador perdido junto al
// nido vacío y el banco de la Maestra con su bastón (❓ si vive: se deja en el aire). Aquí, las medidas y las reglas
// puras (con tests); las piezas, en hogarLater.ts.
import { Vector3 } from 'three';
import { WorldDataError } from '../markers';
import { direction, latLon, type Triple, type XYZ } from './kit';
import { hogarGround, SEA_LEVEL, SITES, surfaceDistance, type SiteId } from './hogarShape';
import type { OolOutfit, OolSpec } from './ool';

/** Qué Hogar se construye: el de siempre (`antes`) o el de diez años después (`despues`, solo el final malo). */
export type HogarEra = 'antes' | 'despues';

/** La variante de mundo (`loadWorld(id, variante)`) que pide el Hogar de diez años después. */
export const LATER_VARIANT = 'despues';

/** El Hogar de una variante de mundo: sin variante, el de siempre; con una que no existe, un error. */
export function hogarEra(variant: string | undefined): HogarEra {
  if (variant === undefined || variant === 'antes') return 'antes';
  if (variant === LATER_VARIANT) return 'despues';
  throw new WorldDataError(`Hogar no tiene la variante «${variant}»`);
}

/** Quienes ya no están donde estaban: la Directora (no sale) y la Maestra (❓: solo queda su banco con el bastón). */
export const GONE_LATER: readonly string[] = ['directora', 'maestra'];
/** Cuánto envejecen diez años (de 0, cría, a 1, mayor). */
export const TEN_YEARS = 0.35;
/** Las crías ya mayores visten como los de su oficio (se elige por su semilla, siempre el mismo). */
const GROWN_OUTFITS: readonly OolOutfit[] = ['vecino', 'mecanica', 'tejedora', 'campesino'];
/** Hasta qué edad un Ool sin ropa es una cría que crece y se viste. */
const CHILD_AGE = 0.3;

/** Cómo es un Ool diez años después, o `undefined` si ya no está. */
export function laterOol(spec: OolSpec): OolSpec | undefined {
  if (GONE_LATER.includes(spec.id)) return undefined;
  const age = Math.min(1, spec.age + TEN_YEARS);
  const child = spec.outfit === 'cria' || (spec.outfit === 'ninguna' && spec.age < CHILD_AGE);
  if (!child) return { ...spec, age };
  const outfit = GROWN_OUTFITS[(spec.seed ?? 0) % GROWN_OUTFITS.length] ?? 'vecino';
  return { ...spec, age, outfit };
}

/** La escalinata de la Puerta Mayor (marco del Motor): el andén bajo el aro, a la altura de su borde de dentro. */
export const GATE_LANDING = {
  /** Mitad del ancho (m, en X): cabe entre los calzos de la cuna. */
  halfWidth: 2.2,
  /** De dónde a dónde va el andén (m, en Y: atraviesa el aro). */
  from: -6.6,
  to: -3.4,
  /** Altura del andén (m): el borde de dentro del aro (8,4 − 7 + 0,6). */
  top: 2,
  /** Peldaños de la escalinata hacia el Instituto (+Y), cada uno de `run` m. */
  steps: 5,
  run: 1,
} as const;
/** Dónde se aparece al salir de la esfera (marco del Motor): al pie de la escalinata, mirando al Instituto. */
export const GATE_EXIT: Triple = [0, 2.6, 0.3];
/** El radio de la esfera de gusano de la Puerta Mayor encendida (m): llena el aro (radio de dentro 6,4). */
export const GATE_SPHERE_RADIUS = 6;

/**
 * Los cables del Motor: del Motor a cada lugar, con postes cada `spacing` m, apartados `side` m del camino. La del
 * Instituto va por el lado del generador (a la izquierda de la Puerta Mayor): así no cruza la escalinata.
 */
export const POWER_LINES: readonly { to: SiteId; side: number }[] = [
  { to: 'instituto', side: 11 },
  { to: 'ciudad', side: 6 },
];
export const POLE_SPACING = 11;
/** Lo alto del generador del Motor (marco del Motor), de donde salen las líneas. */
export const GENERATOR_TOP: Triple = [-8, -13, 4.9];
/** Altura de un poste (m). */
export const POLE_HEIGHT = 5.2;
/** Los postes no entran en el llano de su destino ni en el del Motor (m, desde el borde de dentro). */
const POLE_CLEAR = 3;
/** Un poste se planta en tierra seca (a tanto sobre el mar, m) o, sobre pilotes, en agua poco honda (hasta tanto). */
const DRY_MARGIN = 0.4;
export const SHALLOW = 4;

/** La dirección que queda a `side` m a un lado del camino de `from` a `to`, en el punto `s` (0–1) del camino. */
function along(from: Vector3, to: Vector3, s: number, side: number): Vector3 {
  const point = from.clone().lerp(to, s).normalize();
  const ahead = to.clone().sub(from);
  const across = point.clone().cross(ahead).normalize();
  return point.addScaledVector(across, side / SEA_LEVEL).normalize();
}

/**
 * Las direcciones (unitarias) de los postes de una línea, del Motor hacia su destino. Donde el camino cruza agua poco
 * honda, el poste va sobre un pilote (`poleBase`); en agua honda no se planta y el vano es más largo.
 */
export function polesOf(line: { to: SiteId; side: number }): Vector3[] {
  const motor = SITES.motor;
  const end = SITES[line.to];
  const from = direction(motor.lat, motor.lon);
  const to = direction(end.lat, end.lon);
  const length = from.angleTo(to) * SEA_LEVEL;
  const count = Math.ceil(length / POLE_SPACING);
  const poles: Vector3[] = [];
  for (let k = 1; k < count; k++) {
    const d = along(from, to, k / count, line.side);
    if (surfaceDistance(d, motor.lat, motor.lon) < motor.pad - POLE_CLEAR) continue;
    if (surfaceDistance(d, end.lat, end.lon) < end.pad - POLE_CLEAR) continue;
    if (hogarGround(d) < SEA_LEVEL - SHALLOW) continue;
    poles.push(d);
  }
  return poles;
}

/** Cuánto se hunde en el agua el pie de un poste (m, 0 en tierra): su pilote sube desde el fondo hasta la orilla. */
export function poleBase(d: XYZ): number {
  return Math.max(0, SEA_LEVEL + DRY_MARGIN - hogarGround(d));
}

/** Los anillos de prueba de la costa: cuántos y lo grandes que son (m). */
export const COAST_RINGS = { count: 5, radius: 1.6, tube: 0.16 } as const;
/** El centro del continente de casa (desde donde se busca la costa) y los rumbos a probar. */
const CONTINENT = { lat: 24, lon: 36 } as const;
const COAST_STEP = 1.5;
const COAST_SEARCH = 140;
/** A qué distancia de la orilla, tierra adentro, se plantan (m), y lejos de los lugares. */
const COAST_INLAND = 2.5;
const COAST_SITE_CLEAR = 6;

export interface CoastSpot {
  lat: number;
  lon: number;
  /** Rumbo (grados desde el norte hacia el este) que mira al mar. */
  heading: number;
}

/** Busca la orilla siguiendo un rumbo desde el centro del continente; `undefined` si no la encuentra o está ocupada. */
function coastAlong(bearing: number): CoastSpot | undefined {
  const center = direction(CONTINENT.lat, CONTINENT.lon);
  let north = new Vector3(0, 0, 1).addScaledVector(center, -center.z);
  north = north.lengthSq() < 1e-9 ? new Vector3(1, 0, 0) : north.normalize();
  const east = north.clone().cross(center).normalize();
  const heading = new Vector3()
    .addScaledVector(north, Math.cos(bearing))
    .addScaledVector(east, Math.sin(bearing));
  const at = (distance: number): Vector3 => {
    const angle = distance / SEA_LEVEL;
    return center
      .clone()
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(heading, Math.sin(angle))
      .normalize();
  };
  for (let distance = COAST_STEP; distance < COAST_SEARCH; distance += COAST_STEP) {
    if (hogarGround(at(distance)) >= SEA_LEVEL + 0.2) continue;
    const spot = at(distance - COAST_INLAND);
    if (hogarGround(spot) < SEA_LEVEL + DRY_MARGIN) return undefined;
    if (nearAnySite(spot)) return undefined;
    const { lat, lon } = latLon(spot);
    return { lat, lon, heading: (bearing * 180) / Math.PI };
  }
  return undefined;
}

function nearAnySite(d: XYZ): boolean {
  return Object.values(SITES).some(
    (site) => surfaceDistance(d, site.lat, site.lon) < site.pad + COAST_SITE_CLEAR,
  );
}

/** Dónde se plantan los anillos de la costa: rumbos repartidos alrededor del continente, en la orilla seca. */
export function coastSpots(): CoastSpot[] {
  const spots: CoastSpot[] = [];
  const tries = COAST_RINGS.count * 4;
  for (let k = 0; k < tries && spots.length < COAST_RINGS.count; k++) {
    const spot = coastAlong(((k * 360) / tries + 7) * (Math.PI / 180));
    if (!spot) continue;
    const apart = spots.every(
      (other) => surfaceDistance(direction(spot.lat, spot.lon), other.lat, other.lon) > 18,
    );
    if (apart) spots.push(spot);
  }
  return spots;
}

/** El memorial del explorador, junto al nido vacío del hangar (marco del Instituto) y hacia dónde mira (grados). */
export const MEMORIAL = { at: [15.6, -11.6, 0] as Triple, turn: -30 } as const;
/** El banco de la Maestra, al borde de la cima mirando al Motor (marco del Instituto; es el mismo banco de siempre). */
export const MAESTRA_BENCH = { at: [22, 8, 0] as Triple, yaw: 0.4 } as const;
