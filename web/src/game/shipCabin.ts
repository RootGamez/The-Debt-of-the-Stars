// Lo que se mueve en el Albatros II (Fase 11): la trampilla y la escalerilla según esté posada (ship/hatch.ts), una
// llama por tobera con el nivel que les dio la física (ship/thrusters.ts), las agujas del reloj doble de pared (el
// reloj de Umbral y el tuyo, una vuelta por ciclo) y el planetario de la mesa del mapa, con cada mundo donde está.
// Lo cubren las pruebas de Playwright de la nave (e2e/ship.spec.ts).
import { Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three';
import { ball } from '../worlds/procedural/kit';
import { hatchPose, stepHatch } from '../ship/hatch';
import type { ShipModel } from '../ship/model/albatros';
import { VISIBLE_THRUST } from '../ship/thrusters';
import { LADDER_ANGLE, MAP_TABLE_RADIUS } from '../ship/model/albatrosShape';
import { bodyPose, createPose } from '../system/orbits';
import type { SystemSpec } from '../system/systemData';

export interface CabinFrame {
  dt: number;
  landed: boolean;
  /** Las toberas arden: se pilota y la nave no está posada. */
  burning: boolean;
  levels: Float32Array;
  /** Reloj de Umbral y el tuyo (s) y lo que dura el ciclo. */
  clock: { t: number; tau: number; duration: number };
}

export interface ShipCabin {
  update(frame: CabinFrame): void;
  /** Ciclo nuevo: la nave posada, con la escotilla abierta y la escalerilla bajada. */
  reset(): void;
  /** Lo abierta que está la escotilla (0 a 1). */
  readonly hatch: number;
}

/** La trampilla abierta cuelga hacia abajo (rad). */
const DOOR_OPEN_ANGLE = (100 * Math.PI) / 180;
/** Recogida, la escalerilla queda corta y plana bajo la trampilla. */
const LADDER_STOWED_LENGTH = 0.25;
/** Colores de los mundos en el planetario (🟡): por orden de la Brasa hacia fuera. */
const ORRERY_COLORS = ['#c96f4a', '#d9b26a', '#5fa0c8', '#9b8bd0', '#7bb37a', '#d68aa1', '#a0a0a0'];

function orreryBalls(spec: SystemSpec | undefined, parent: Object3D): Map<string, Mesh> {
  const balls = new Map<string, Mesh>();
  if (!spec) return balls;
  const sun = new Mesh(
    ball(0.06, 1),
    new MeshStandardMaterial({ color: '#ffcf7a', emissive: '#ffb04a' }),
  );
  sun.name = 'nave_Planetario_Brasa';
  parent.add(sun);
  const visible = [...spec.bodies]
    .filter((b) => !b.hidden)
    .sort((a, b) => a.orbitRadius - b.orbitRadius);
  visible.forEach((body, k) => {
    const mesh = new Mesh(
      ball(0.035, 1),
      new MeshStandardMaterial({
        color: ORRERY_COLORS[k % ORRERY_COLORS.length],
        flatShading: true,
      }),
    );
    mesh.name = `nave_Planetario_${body.world}`;
    parent.add(mesh);
    balls.set(body.world, mesh);
  });
  return balls;
}

export function createShipCabin(model: ShipModel, spec: SystemSpec | undefined): ShipCabin {
  const { door, ladder, clockHands, orrery } = model.parts;
  const balls = orreryBalls(spec, orrery);
  const reach = spec ? Math.max(...spec.bodies.map((b) => b.orbitRadius)) : 1;
  const scale = (MAP_TABLE_RADIUS - 0.08) / reach;
  const pose = createPose();
  const where = new Vector3();
  let open = 1;

  function placeHatch(): void {
    const { door: d, ladder: l } = hatchPose(open);
    door.rotation.x = d * DOOR_OPEN_ANGLE;
    ladder.visible = open > 0.4;
    ladder.rotation.x = l * LADDER_ANGLE;
    ladder.scale.z = LADDER_STOWED_LENGTH + (1 - LADDER_STOWED_LENGTH) * l;
  }

  function placeFlames(burning: boolean, levels: Float32Array): void {
    model.flames.forEach((flame, i) => {
      const level = burning ? (levels[i] ?? 0) : 0;
      flame.visible = level > VISIBLE_THRUST;
      if (!flame.visible) return;
      const full = typeof flame.userData.fullLength === 'number' ? flame.userData.fullLength : 1;
      // Parpadeo leve: es fuego.
      const flicker = 0.85 + 0.15 * Math.sin(performance.now() * 0.03 + i * 1.7);
      flame.scale.z = full * Math.sqrt(level) * flicker;
    });
  }

  function placeOrrery(t: number): void {
    if (!spec) return;
    for (const body of spec.bodies) {
      const mesh = balls.get(body.world);
      if (!mesh) continue;
      bodyPose(body, t, pose);
      // El sistema se ve desde arriba: su plano de órbitas es el de la mesa.
      where.copy(pose.position).multiplyScalar(scale);
      mesh.position.set(where.x, where.y * 0.2, where.z);
    }
  }

  placeHatch();
  return {
    get hatch() {
      return open;
    },
    update({ dt, landed, burning, levels, clock }) {
      open = stepHatch(open, landed, dt);
      placeHatch();
      placeFlames(burning, levels);
      const turn = (seconds: number): number => -(seconds / clock.duration) * Math.PI * 2;
      clockHands.umbral.rotation.z = turn(clock.t);
      clockHands.yours.rotation.z = turn(clock.tau);
      placeOrrery(clock.t);
    },
    reset() {
      open = 1;
      placeHatch();
      placeFlames(false, new Float32Array(0));
    },
  };
}
