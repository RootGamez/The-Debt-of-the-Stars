// La nave en el juego: dónde espera en cada ciclo, subir y bajar, el vuelo entre marcos de referencia
// (de un mundo al espacio abierto y a otro mundo), la cámara de cabina, el brillo de los motores y la
// interfaz de vuelo. La física y las reglas están en src/ship/ (con tests); esto las conecta con la
// escena y lo cubren las pruebas de Playwright (e2e/ship.spec.ts).
import { PointLight, Quaternion, Vector3, type Camera, type MeshStandardMaterial } from 'three';
import type { DeathCause } from '../core/loopDirector';
import type { Player } from '../core/player';
import { gravityAt } from '../physics/gravity';
import type { SphereObstacle } from '../physics/obstacles';
import { spawnOnGround } from '../physics/spawn';
import { forwardOf, lookAlong } from '../physics/surfaceFrame';
import type { SystemScene } from '../render/systemScene';
import { BoardingManager } from '../ship/boarding';
import { closingSpeed, placeMarker } from '../ship/hudMath';
import type { LoadedShipModel } from '../ship/loadShip';
import { Ship } from '../ship/ship';
import { createShipInput, type FlightKeys } from '../ship/shipInput';
import type { ShipEnvironment } from '../ship/shipPhysics';
import { TargetingSystem } from '../ship/targeting';
import { SYSTEM_FRAME, toLocalPosition, toLocalVelocity, toSystemPosition } from '../system/frames';
import { pickReference, SPHERE_RADII, type Sphere } from '../system/influence';
import { bodyPose, createPose, type BodyPose } from '../system/orbits';
import { reframe } from '../system/reframe';
import type { SystemSpec } from '../system/systemData';
import { createShipHud, type ShipHudTarget } from '../ui/shipHud';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { worldTitle } from '../worlds/worldSelection';

export type ShipAction = 'board' | 'target' | 'stabilize';

export interface ShipFlightOptions {
  spec: SystemSpec;
  runtimes: ReadonlyMap<string, WorldRuntime>;
  model: LoadedShipModel;
  systemScene: SystemScene;
  player: Player;
  /** Mundo donde espera la nave al empezar cada ciclo (su marca PARK_). */
  homeWorld: string;
  /** Pone al jugador a pie en ese mundo (marco, gravedad, fuentes de lectura). */
  walkInto(world: string): void;
  setReadingEnabled(enabled: boolean): void;
  /** Pantalla táctil: las sugerencias nombran botones en vez de teclas. */
  touch: boolean;
}

export interface ShipSnapshot {
  piloting: boolean;
  landed: boolean;
  frame: string | null;
  speed: number;
  altitude: number | null;
  stabilize: boolean;
  target: string | null;
}

export interface ShipFrameInfo {
  t: number;
  alpha: number;
  dt: number;
  camera: Camera;
  /** Mundo donde camina el jugador. */
  onFootWorld: string;
  /** El juego responde ahora a las teclas (no está en pausa, leyendo ni muriendo). */
  active: boolean;
}

export interface ShipFlight {
  readonly piloting: boolean;
  /** Posición de quien juega en su marco: la nave al pilotar, si no, los pies del jugador. */
  readonly position: Vector3;
  /** Marco donde está quien juega cuando pilota (`undefined` = espacio abierto). */
  readonly frame: string | undefined;
  /** La nave posada como obstáculo para quien camina por ese mundo. */
  obstacleIn(world: string): SphereObstacle | undefined;
  addLook(dx: number, dy: number): void;
  /** Un paso de física; devuelve la causa de muerte si la nave se estrelló o entró en la Brasa. */
  step(t: number, keys: FlightKeys, dt: number): DeathCause | undefined;
  /** Coloca la cámara en la cabina (con la pose interpolada). */
  view(alpha: number, camera: Camera): void;
  /** Pilotando sin paso de física (pausa, lectura, muerte): la nave se queda donde está. */
  hold(): void;
  /** Una vez por fotograma: modelo (con la misma interpolación que la cámara), motores e interfaz. */
  update(frame: ShipFrameInfo): void;
  action(action: ShipAction, onFootWorld: string, t: number): void;
  /** Ciclo nuevo: el jugador a pie y la nave esperando en su sitio. */
  reset(): void;
  snapshot(): ShipSnapshot;
  /** Depuración (`?debug`): pone al jugador a pie junto a la escotilla, si la nave está en su mundo. */
  standAtHatch(onFootWorld: string): boolean;
  /** Depuración (`?debug`): la nave, pilotada, aparece quieta a esa altura sobre un mundo. */
  warpTo(world: string, altitude: number): boolean;
}

/** Segundos que se muestran los controles tras despegar. */
const CONTROLS_HINT_SECONDS = 12;
/** Por debajo de esta altura (m) se sugiere cómo posarse. */
const LANDING_HINT_ALTITUDE = 15;
/** Brillo de los motores en reposo y a pleno empuje, y lo deprisa que cambia (1/s). */
const ENGINE_IDLE = 0.35;
const ENGINE_FULL = 3;
const ENGINE_RATE = 6;
const MARKER_MARGIN = 0.12;
/** Hasta dónde se busca el suelo bajo la nave para medir la altura (m). */
const ALTITUDE_PROBE = 200;
/** Lámpara cálida de la cabina: la Brasa no ilumina el tablero desde fuera. */
const CABIN_LIGHT_COLOR = 0xffd6a0;
const CABIN_LIGHT_INTENSITY = 2.5;
const CABIN_LIGHT_RANGE = 3.5;

const KEY_HINTS = {
  landed: 'Espacio despegar · F bajar · T objetivo',
  free: 'Modo libre: sin ayudas (Z las devuelve)',
  controls: 'W avanzar · ratón girar · Espacio subir · C bajar · X frenar',
  land: 'Mantén C para posarte',
};
const TOUCH_HINTS = {
  landed: '↑ despegar · Nave para bajar · Objetivo',
  free: 'Modo libre: sin ayudas (Estab. las devuelve)',
  controls: 'Palanca avanzar · arrastra para girar · ↑ subir · ↓ bajar',
  land: 'Mantén ↓ para posarte',
};

function runtimeOf(runtimes: ReadonlyMap<string, WorldRuntime>, id: string): WorldRuntime {
  const runtime = runtimes.get(id);
  if (!runtime) throw new Error(`El mundo "${id}" no está cargado`);
  return runtime;
}

export function createShipFlight(options: ShipFlightOptions): ShipFlight {
  const { spec, runtimes, model, systemScene, player, homeWorld } = options;
  const ship = new Ship(model.radius);
  const boarding = new BoardingManager();
  const targeting = new TargetingSystem(
    spec.bodies.map((body) => ({ id: body.world, name: worldTitle(body.world) })),
  );
  const hud = createShipHud();
  const engineMaterial = model.engine?.material as MeshStandardMaterial | undefined;
  const cabinLight = new PointLight(CABIN_LIGHT_COLOR, CABIN_LIGHT_INTENSITY, CABIN_LIGHT_RANGE, 2);
  cabinLight.position.copy(model.seatOffset).add(new Vector3(0, 0.45, 0.3));
  model.object.add(cabinLight);

  // Dónde espera la nave al empezar cada ciclo.
  const home = runtimeOf(runtimes, homeWorld);
  const park = home.world.markers.parks.values().next().value;
  if (!park) throw new Error(`${homeWorld} no tiene marca PARK_ para la nave`);
  const parked = spawnOnGround(park, home.collision, home.well.center);
  const parkedUp = parked.feet.clone().sub(home.well.center).normalize();
  const parkPosition = parked.feet.clone().addScaledVector(parkedUp, model.radius);
  const parkOrientation = parked.body.clone();

  const spheres: Sphere[] = [...runtimes.values()]
    .filter((r) => spec.bodyOf(r.id))
    .map((r) => ({
      world: r.id,
      center: new Vector3(),
      radius: r.world.info.radius * SPHERE_RADII,
    }));
  const poses = new Map<string, BodyPose>();
  const look = { x: 0, y: 0 };
  let engine = ENGINE_IDLE;
  let thrusting = 0;
  let flightTime = 0;

  // Temporales.
  const sysPosition = new Vector3();
  const up = new Vector3();
  const gravity = new Vector3();
  const targetPosition = new Vector3();
  const targetVelocity = new Vector3();
  const relative = new Vector3();
  const hatch = new Vector3();
  const seat = new Vector3();
  const viewPosition = new Vector3();
  const viewOrientation = new Quaternion();
  const projected = new Vector3();
  const toward = new Vector3();
  const above = new Vector3();
  const down = new Vector3();
  const obstacle: SphereObstacle = { center: new Vector3(), radius: model.radius };
  const environment: ShipEnvironment = { gravity, targetVelocity: undefined };

  function framePose(world: string | undefined, t: number): BodyPose {
    const body = world === undefined ? undefined : spec.bodyOf(world);
    if (!world || !body) return SYSTEM_FRAME;
    let pose = poses.get(world);
    if (!pose) {
      pose = createPose();
      poses.set(world, pose);
    }
    return bodyPose(body, t, pose);
  }

  function attach(): void {
    systemScene.attachShip(model.object, ship.frame);
  }

  function parkAtHome(): void {
    ship.park(homeWorld, parkPosition, parkOrientation);
    attach();
  }

  /** Lleva la nave a otro marco conservando su movimiento real (posición, velocidad y giro). */
  function moveToFrame(world: string | undefined, t: number): void {
    reframe(ship.state, framePose(ship.frame, t), framePose(world, t));
    ship.frame = world;
    ship.syncPrevious();
    attach();
    systemScene.setReference(world);
  }

  /** Cambia de marco al entrar o salir de la esfera de influencia de un mundo. */
  function followSpheres(t: number): void {
    toSystemPosition(framePose(ship.frame, t), ship.state.position, sysPosition);
    for (const sphere of spheres) {
      const body = spec.bodyOf(sphere.world);
      if (body) sphere.center.copy(framePose(sphere.world, t).position);
    }
    const next = pickReference(sysPosition, spheres, ship.frame);
    if (next !== ship.frame) moveToFrame(next, t);
  }

  /** Altura de las patas sobre el suelo real (con relieve); sin suelo debajo, sobre el radio del mundo. */
  function altitudeOf(world: string): number {
    const runtime = runtimeOf(runtimes, world);
    const center = ship.state.position.length();
    down
      .copy(ship.state.position)
      .divideScalar(center || 1)
      .negate();
    const ground = runtime.collision.raycast(ship.state.position, down, ALTITUDE_PROBE);
    return (ground ?? center - runtime.world.info.radius) - ship.radius;
  }

  /** Velocidad del objetivo en el marco de vuelo (cero si no hay objetivo: X frena respecto al marco). */
  function targetIn(t: number): string | undefined {
    const target = targeting.currentTarget;
    const frame = framePose(ship.frame, t);
    if (!target || target.id === ship.frame) {
      targetPosition.set(0, 0, 0);
      targetVelocity.set(0, 0, 0);
      return target?.id;
    }
    const pose = framePose(target.id, t);
    toLocalPosition(frame, pose.position, targetPosition);
    toLocalVelocity(frame, pose.position, pose.velocity, targetVelocity);
    return target.id;
  }

  function updateEnvironment(t: number): void {
    gravity.set(0, 0, 0);
    environment.up = undefined;
    environment.altitude = undefined;
    if (ship.frame) {
      const runtime = runtimeOf(runtimes, ship.frame);
      // En el marco de un mundo su centro es el origen: solo cuenta su gravedad.
      gravityAt(ship.state.position, [runtime.well], gravity);
      environment.up = up.copy(ship.state.position).normalize();
      environment.altitude = altitudeOf(ship.frame);
    }
    targetIn(t);
    environment.targetVelocity = targetVelocity;
  }

  /** Al subir, si el objetivo es el mundo donde estás, apunta al mundo más cercano. */
  function chooseTarget(t: number): void {
    const current = targeting.currentTarget;
    if (current && current.id !== ship.frame) return;
    toSystemPosition(framePose(ship.frame, t), ship.state.position, sysPosition);
    let best: { id: string; distance: number } | undefined;
    for (const body of spec.bodies) {
      if (body.world === ship.frame) continue;
      const distance = framePose(body.world, t).position.distanceTo(sysPosition);
      if (!best || distance < best.distance) best = { id: body.world, distance };
    }
    if (best) targeting.setTarget(best.id);
  }

  function hatchInWorld(target: Vector3): Vector3 {
    return target
      .copy(model.exitOffset)
      .applyQuaternion(ship.state.orientation)
      .add(ship.state.position);
  }

  function canBoard(onFootWorld: string): boolean {
    if (boarding.isPiloting || ship.frame !== onFootWorld) return false;
    return boarding.canBoard(player.state.position, hatchInWorld(hatch), ship.landed);
  }

  function board(t: number): void {
    boarding.board();
    options.setReadingEnabled(false);
    systemScene.setReference(ship.frame);
    flightTime = 0;
    look.x = look.y = 0;
    chooseTarget(t);
  }

  /** El jugador, de pie en el suelo bajo la escotilla y mirando hacia donde mira la nave. */
  function placeAtHatch(world: string): void {
    const runtime = runtimeOf(runtimes, world);
    hatchInWorld(hatch);
    up.copy(hatch).sub(runtime.well.center).normalize();
    // Pie en el suelo bajo la escotilla aunque la nave se posara en cuesta.
    above.copy(hatch).addScaledVector(up, 2);
    const drop = runtime.collision.raycast(above, down.copy(up).negate(), 6);
    if (drop !== null) hatch.copy(above).addScaledVector(up, -drop);
    player.moveTo(hatch, lookAlong(up, forwardOf(ship.state.orientation, seat)));
  }

  function disembark(): void {
    const world = ship.frame;
    if (!world || !boarding.canDisembark(ship.landed)) return;
    options.walkInto(world);
    placeAtHatch(world);
    boarding.disembark();
    options.setReadingEnabled(true);
  }

  const hints = options.touch ? TOUCH_HINTS : KEY_HINTS;

  function hint(): string | undefined {
    if (ship.landed) return hints.landed;
    if (!ship.stabilize) return hints.free;
    if (flightTime < CONTROLS_HINT_SECONDS) return hints.controls;
    const altitude = ship.frame ? altitudeOf(ship.frame) : undefined;
    if (altitude !== undefined && altitude < LANDING_HINT_ALTITUDE) return hints.land;
    return undefined;
  }

  function hudTarget(t: number, camera: Camera): ShipHudTarget | undefined {
    const id = targetIn(t);
    const target = targeting.currentTarget;
    if (!id || !target || id === ship.frame) return undefined;
    relative.subVectors(ship.state.velocity, targetVelocity);
    toward.subVectors(targetPosition, ship.state.position);
    projected.copy(targetPosition).project(camera);
    return {
      name: target.name,
      distance: Math.max(0, toward.length() - runtimeOf(runtimes, id).world.info.radius),
      closing: closingSpeed(toward, relative),
      marker: placeMarker(projected, MARKER_MARGIN),
    };
  }

  parkAtHome();

  return {
    get piloting() {
      return boarding.isPiloting;
    },
    get position() {
      return boarding.isPiloting ? ship.state.position : player.state.position;
    },
    get frame() {
      return ship.frame;
    },
    obstacleIn(world) {
      if (boarding.isPiloting || ship.frame !== world) return undefined;
      obstacle.center.copy(ship.state.position);
      return obstacle;
    },
    addLook(dx, dy) {
      look.x += dx;
      look.y += dy;
    },
    step(t, keys, dt) {
      if (!boarding.isPiloting) return undefined;
      followSpheres(t);
      updateEnvironment(t);
      const input = createShipInput(keys, look, { stabilize: ship.stabilize });
      look.x = look.y = 0;
      thrusting = Math.min(1, input.thrust.length());
      const result = ship.step(input, environment, groundOf(ship.frame), dt);
      if (!ship.landed) flightTime += dt;
      followSpheres(t);
      if (result.crashed) return 'choque';
      toSystemPosition(framePose(ship.frame, t), ship.state.position, sysPosition);
      return sysPosition.length() <= spec.star.radius + ship.radius ? 'calor' : undefined;
    },
    hold() {
      ship.syncPrevious();
    },
    view(alpha, camera) {
      ship.interpolate(alpha, viewPosition, viewOrientation);
      camera.position
        .copy(seat.copy(model.seatOffset).applyQuaternion(viewOrientation))
        .add(viewPosition);
      camera.quaternion.copy(viewOrientation);
    },
    update({ t, alpha, dt, camera, onFootWorld, active }) {
      // Misma interpolación que la cámara: la cabina no tiembla respecto a la vista.
      ship.interpolate(
        boarding.isPiloting ? alpha : 1,
        model.object.position,
        model.object.quaternion,
      );
      const wanted =
        boarding.isPiloting && !ship.landed
          ? ENGINE_IDLE + thrusting * (ENGINE_FULL - ENGINE_IDLE)
          : ENGINE_IDLE;
      engine += (wanted - engine) * Math.min(1, ENGINE_RATE * dt);
      if (engineMaterial) engineMaterial.emissiveIntensity = engine;

      hud.update({
        piloting: boarding.isPiloting,
        canBoard: active && canBoard(onFootWorld),
        speed: ship.state.velocity.length(),
        altitude: ship.frame ? altitudeOf(ship.frame) : undefined,
        stabilize: ship.stabilize,
        landed: ship.landed,
        target: boarding.isPiloting ? hudTarget(t, camera) : undefined,
        hint: boarding.isPiloting ? hint() : undefined,
      });
    },
    action(action, onFootWorld, t) {
      if (action === 'board') {
        if (boarding.isPiloting) disembark();
        else if (canBoard(onFootWorld)) board(t);
        return;
      }
      if (!boarding.isPiloting) return;
      if (action === 'target') {
        targeting.cycleTarget();
        if (targeting.currentTarget?.id === ship.frame) targeting.cycleTarget();
      } else {
        ship.stabilize = !ship.stabilize;
      }
    },
    reset() {
      boarding.reset();
      options.setReadingEnabled(true);
      ship.stabilize = true;
      look.x = look.y = 0;
      parkAtHome();
    },
    snapshot() {
      return {
        piloting: boarding.isPiloting,
        landed: ship.landed,
        frame: ship.frame ?? null,
        speed: ship.state.velocity.length(),
        altitude: ship.frame ? altitudeOf(ship.frame) : null,
        stabilize: ship.stabilize,
        target: targeting.currentTarget?.id ?? null,
      };
    },
    standAtHatch(onFootWorld) {
      if (boarding.isPiloting || ship.frame !== onFootWorld) return false;
      placeAtHatch(onFootWorld);
      return true;
    },
    warpTo(world, altitude) {
      if (!boarding.isPiloting || !spec.bodyOf(world)) return false;
      const runtime = runtimeOf(runtimes, world);
      up.copy(runtime.spawn.feet).normalize();
      ship.state.position
        .copy(up)
        .multiplyScalar(runtime.world.info.radius + ship.radius + altitude);
      ship.state.velocity.set(0, 0, 0);
      ship.state.angularVelocity.set(0, 0, 0);
      ship.state.orientation.copy(lookAlong(up, forwardOf(runtime.spawn.body, seat)));
      ship.landed = false;
      ship.frame = world;
      ship.syncPrevious();
      attach();
      systemScene.setReference(world);
      return true;
    },
  };

  function groundOf(world: string | undefined) {
    if (!world) return undefined;
    const runtime = runtimeOf(runtimes, world);
    return { world: runtime.collision, center: runtime.well.center };
  }
}
