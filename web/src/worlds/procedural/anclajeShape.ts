// Los anclajes del Cerco (🟡, plan `docs/plan-soles-y-luz-dinamica.md` §4.2): las dos estaciones de los polos, donde los
// anillos se atan y se puede desembarcar. Son esferas de 40 m con un tambor (el cojinete) alrededor del ecuador, por
// donde giran los brazos de los anillos: esa franja no se pisa. Los casquetes son lo pisable: el exterior (lejos de la
// estrella, a oscuras: atraque y casa de mando) y el interior (cara al sol: receptor y almacén). Medidas puras.
import { direction, smoothstep, type XYZ } from './kit';

export const ANCLAJE_RADIUS = 40;
export const ANCLAJE_GRAVITY = 0.35;
/** Cerca de la estrella, el tiempo va algo más lento (🟡). */
export const ANCLAJE_CLOCK = 0.92;
/** Altura del tambor del cojinete sobre la esfera (m). */
const DRUM_HEIGHT = 1.6;
/** Latitud (grados) hasta la que llega el tambor: ahí no se construye nada. */
export const DRUM_LAT = 26;

export type HubId = 'norte' | 'sur';

export interface HubSpec {
  /** Id del mundo. */
  world: string;
  /** Dónde está, respecto de la estrella (m). */
  position: readonly [number, number, number];
  /** +1 si su casquete exterior está en el polo +Z del modelo (norte) y −1 si en el −Z (sur). */
  outer: 1 | -1;
}

export const HUBS: Record<HubId, HubSpec> = {
  norte: { world: 'anclaje_norte', position: [0, 270, 0], outer: 1 },
  sur: { world: 'anclaje_sur', position: [0, -270, 0], outer: -1 },
};

/** Cuánto vale el tambor en una dirección: 1 en el cinturón, 0 pasada su orilla. */
export function drumWeight(d: XYZ): number {
  const lat =
    Math.abs(Math.asin(Math.max(-1, Math.min(1, d.z / (Math.hypot(d.x, d.y, d.z) || 1))))) *
    (180 / Math.PI);
  return 1 - smoothstep(DRUM_LAT - 6, DRUM_LAT, lat);
}

/** Distancia del centro al suelo en una dirección unitaria. */
export function anclajeGround(d: XYZ): number {
  return ANCLAJE_RADIUS + DRUM_HEIGHT * drumWeight(d);
}

export interface HubSite {
  /** Latitud y longitud (grados), en el marco de Blender (Z arriba). */
  lat: number;
  lon: number;
  /** Rumbo (grados) de su marco. */
  heading: number;
}

export type SiteName = 'pad' | 'gateOuter' | 'building' | 'plaque' | 'inner' | 'gateInner';

export function siteDirection(site: HubSite) {
  return direction(site.lat, site.lon);
}

/** Los sitios de un anclaje. Los de arriba (`outer`) van en el casquete exterior; `inner` y `gateInner`, en el del sol. */
export function hubSites(id: HubId): Record<SiteName, HubSite> {
  const o = HUBS[id].outer;
  return {
    pad: { lat: o * 82, lon: 0, heading: 0 },
    plaque: { lat: o * 66, lon: 25, heading: 25 },
    building: { lat: o * 56, lon: -75, heading: -75 },
    gateOuter: { lat: o * 56, lon: 85, heading: 85 },
    inner: { lat: -o * 80, lon: 0, heading: 0 },
    gateInner: { lat: -o * 56, lon: 85, heading: 85 },
  };
}

/** Dónde está la estrella en el marco del modelo (siempre por el lado del casquete interior). */
export function sunDirection(id: HubId): XYZ {
  return { x: 0, y: 0, z: -HUBS[id].outer };
}
