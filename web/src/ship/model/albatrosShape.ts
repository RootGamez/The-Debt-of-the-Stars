// Medidas del Albatros II redondo (Fase 11, docs/plan-fase-11-nave.md): un disco de 9 m con cúpula de cristal, una
// sola sala dentro y la escotilla en el suelo hacia popa. Lo comparten el modelo, la física y los tests.
// Ejes de la nave (como una cámara de Three.js): +X derecha (estribor), +Y arriba, −Z proa. El origen es el centro
// de la nave: con ella posada, el suelo queda `CLEARANCE` m por debajo.
import { Vector3 } from 'three';
import type { HullSphere } from '../shipContact';
import type { ShipHull } from '../ship';
import type { Station } from '../stations';

/** Radio del borde del disco (m). */
export const RIM_RADIUS = 4.5;
/** Altura del borde (m): de su canto de abajo al de arriba. */
export const RIM_BOTTOM = -0.55;
export const RIM_TOP = -0.3;
/** El fondo de la panza, en el centro (m). */
export const BELLY_Y = -1.3;
/** Del centro de la nave al suelo con las patas apoyadas (m). */
export const CLEARANCE = 3;

/** El suelo de la sala y su radio hasta la pared (m). */
export const FLOOR_Y = -0.95;
export const FLOOR_RADIUS = 3.75;
/** Grosor del suelo (m). */
export const FLOOR_THICKNESS = 0.08;
/** El anillo del techo donde empieza la cúpula, y lo alto de la cúpula (m). */
export const DOME_BASE_RADIUS = 2.55;
export const DOME_BASE_Y = 1.25;
export const DOME_TOP_Y = 2.35;
/** El ventanal delantero: de dónde a dónde (altura, m) y su anchura (rad, centrado en la proa). */
export const WINDOW_BOTTOM_Y = -0.27;
export const WINDOW_TOP_Y = 0.85;
export const WINDOW_ARC = (150 * Math.PI) / 180;

/** Hasta aquí la panza es plana (m); de aquí al borde sube en curva. */
export const BELLY_FLAT_RADIUS = 3.55;

/** La panza: altura de la cara de abajo del casco a una distancia `r` del eje (m). */
export function bellyY(r: number): number {
  const t = Math.min(1, Math.max(0, (r - BELLY_FLAT_RADIUS) / (RIM_RADIUS - BELLY_FLAT_RADIUS)));
  return BELLY_Y + (RIM_BOTTOM - BELLY_Y) * t * t;
}

/** El pozo de la escotilla en el suelo (m): de babor a estribor y de proa a popa. */
export const WELL = Object.freeze({ minX: -0.75, maxX: 0.75, minZ: 0.7, maxZ: 3.4 });
/** La escalerilla bajada: su inclinación (rad) y de dónde a dónde va. */
export const LADDER_ANGLE = (40 * Math.PI) / 180;
export const LADDER_TOP = new Vector3(0, FLOOR_Y, WELL.minZ + 0.1);
export const LADDER_LENGTH = (CLEARANCE + FLOOR_Y) / Math.sin(LADDER_ANGLE);
export const LADDER_HALF_WIDTH = 0.5;
/** En el suelo, un paso más allá del pie de la escalerilla (ejes de la nave). */
export const LADDER_FOOT = LADDER_TOP.clone()
  .add(
    new Vector3(0, -Math.sin(LADDER_ANGLE), Math.cos(LADDER_ANGLE)).multiplyScalar(LADDER_LENGTH),
  )
  .add(new Vector3(0, 0, 0.7));

/** ¿Cae ese punto del suelo (x, z) dentro del pozo de la escotilla? */
export function inWell(x: number, z: number): boolean {
  return x > WELL.minX && x < WELL.maxX && z > WELL.minZ && z < WELL.maxZ;
}

/** El asiento del piloto: dónde está (sobre el suelo, mirando a proa) y los ojos sentado (m). */
export const SEAT = new Vector3(0, FLOOR_Y, -2.45);
export const SEAT_EYE = new Vector3(0, FLOOR_Y + 1.15, -2.5);
/** Donde se pone de pie quien se levanta del asiento (los pies), mirando a proa. */
export const STAND_SPOT = new Vector3(0, FLOOR_Y, -1.35);

/** Los muebles de la sala (posición sobre el suelo). */
export const LECTERN = new Vector3(-2.75, FLOOR_Y, -0.55);
export const MAP_TABLE = new Vector3(2.35, FLOOR_Y, -0.15);
export const MAP_TABLE_RADIUS = 0.62;
export const MAP_TABLE_HEIGHT = 0.62;
export const CARGO_TABLE = new Vector3(-2.35, FLOOR_Y, 1.85);
export const CARGO_TABLE_HEIGHT = 0.55;
/** El reloj doble de pared: su centro y hacia dónde mira (hacia el centro de la sala). */
export const WALL_CLOCK = new Vector3(2.55, 0.25, 2.2);

/** Lo que se usa con F (el asiento) o con E (el atril y la mesa del mapa). */
export const STATIONS: readonly Station[] = Object.freeze([
  { id: 'asiento', position: new Vector3(0, FLOOR_Y + 0.55, -2.35) },
  { id: 'registro', position: LECTERN.clone().setY(FLOOR_Y + 0.95) },
  { id: 'mapa', position: MAP_TABLE.clone().setY(FLOOR_Y + MAP_TABLE_HEIGHT + 0.1) },
]);

/** Cómo choca contra el terreno: una esfera central que llega a las patas y un anillo de ocho en el borde. */
function hullSpheres(): HullSphere[] {
  const spheres: HullSphere[] = [{ center: new Vector3(0, -0.5, 0), radius: CLEARANCE - 0.5 }];
  const ringRadius = 1.1;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const r = RIM_RADIUS - ringRadius;
    spheres.push({
      center: new Vector3(Math.sin(a) * r, -0.6, Math.cos(a) * r),
      radius: ringRadius,
    });
  }
  return spheres;
}

export const ALBATROS_HULL: ShipHull = Object.freeze({
  radius: RIM_RADIUS + 0.1,
  clearance: CLEARANCE,
  spheres: Object.freeze(hullSpheres()),
});
