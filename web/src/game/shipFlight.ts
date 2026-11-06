// La nave en el juego: dónde espera en cada ciclo, sentarse a pilotar y levantarse (Fase 11: se entra andando por
// la escalerilla y se pilota desde el asiento), el vuelo entre marcos de referencia (de un mundo al espacio abierto y
// a otro mundo), la cámara (cabina o fuera, con V), lo que se usa dentro (el Registro y el mapa) y la interfaz de
// vuelo. La física y las reglas están en src/ship/ (con tests); esto las conecta con la
// escena y lo cubren las pruebas de Playwright (e2e/ship.spec.ts).
import { PointLight, Quaternion, Vector3, type Camera, type Object3D } from 'three';
import type { DeathCause } from '../core/loopDirector';
import type { Player } from '../core/player';
import { sunkInGas } from '../physics/gas';
import { gravityAt } from '../physics/gravity';
import { EYE_HEIGHT } from '../data/movement';
import type { PlacedCollider } from '../physics/movingCollider';
import { spawnOnGround } from '../physics/spawn';
import { forwardOf, lookAlong, upOf } from '../physics/surfaceFrame';
import type { SystemScene } from '../render/systemScene';
import { BoardingManager } from '../ship/boarding';
import { closingSpeed, placeMarker } from '../ship/hudMath';
import type { ShipModel } from '../ship/model/albatros';
import { LADDER_FOOT, SEAT } from '../ship/model/albatrosShape';
import { THRUSTERS, VISIBLE_THRUST } from '../ship/thrusters';
import { stationInFocus, type Station, type StationId } from '../ship/stations';
import { Ship } from '../ship/ship';
import { createShipInput, type FlightKeys } from '../ship/shipInput';
import { createShipCabin } from './shipCabin';
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
import { t } from '../i18n';

export type ShipAction = 'board' | 'target' | 'stabilize' | 'use' | 'camera';

/** Desde dónde se ve al pilotar (D2): desde el asiento o desde fuera, detrás de la nave. */
export type ShipView = 'cabina' | 'fuera';

export interface ShipFlightOptions {
  spec: SystemSpec;
  runtimes: ReadonlyMap<string, WorldRuntime>;
  model: ShipModel;
  systemScene: SystemScene;
  player: Player;
  /** Mundo donde espera la nave al empezar cada ciclo (su marca PARK_). */
  homeWorld: string;
  /** Pone al jugador a pie en ese mundo (marco, gravedad, fuentes de lectura). */
  walkInto(world: string): void;
  setReadingEnabled(enabled: boolean): void;
  /** Pantalla táctil: las sugerencias nombran botones en vez de teclas. */
  touch: boolean;
  /** Lo que tira además de la gravedad de su mundo (el horizonte estable, Fase 10D): se suma a `target` (m/s²). */
  pull?: (frame: string, position: Vector3, target: Vector3) => void;
  /** El nombre del objetivo en el tablero (el que le puso el jugador, con el oficial al lado). */
  nameOf?: (world: string) => string;
  /** El atril del cuaderno, dentro de la nave: abre el Registro. */
  openRegistry?: () => void;
  /** La mesa del mapa, dentro de la nave: abre el mapa de órbitas. */
  openMap?: () => void;
  /** En el prólogo la nave apunta sola a lo que toca y T son las tareas: el aviso no habla de «T objetivo». */
  autoTarget?: boolean;
  /** Los relojes del ciclo, para el reloj doble de pared y el planetario. */
  clock?: () => { t: number; tau: number; duration: number };
}

export interface ShipSnapshot {
  piloting: boolean;
  landed: boolean;
  frame: string | null;
  speed: number;
  altitude: number | null;
  stabilize: boolean;
  target: string | null;
  view: ShipView;
  /** Lo abierta que está la escotilla (0 a 1). */
  hatch: number;
  /** Lo que tienes delante dentro de la nave (el asiento, el atril, la mesa del mapa). */
  station: string | null;
  /** Toberas encendidas ahora mismo (sus nombres). */
  firing: string[];
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
  /** El mundo fijado como objetivo (o `undefined`). */
  readonly targetId: string | undefined;
  /** Fija el objetivo de la nave (o lo quita con `undefined`): en el prólogo lo pone la tarea de ahora. */
  setTarget(id: string | undefined): void;
  /** La nave posada, con su casco, su sala y su escalerilla, para quien camina por ese mundo. */
  colliderIn(world: string): PlacedCollider | undefined;
  /** La mesa de carga de la nave: lo que se deja en la nave se ve ahí. */
  readonly cargo: Object3D;
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
  /** Depuración (`?debug`): pone al jugador de pie dentro de la nave, frente a un sitio, si está en su mundo. */
  standAt(onFootWorld: string, station: StationId): boolean;
  /** Depuración (`?debug`): pone al jugador en el suelo, al pie de la escalerilla. */
  standAtLadder(onFootWorld: string): boolean;
  /** Depuración (`?debug`): la nave, pilotada, aparece quieta a esa altura sobre un mundo. */
  warpTo(world: string, altitude: number): boolean;
  /** La primera llegada a Umbral: la nave posada donde cayó tras el gusano (marca `PARK_Caida`). */
  parkAtCrash(): boolean;
  /** Depuración (`?debug`): la nave, pilotada, aparece quieta en `position` (marco de `world`) mirando a `toward`. */
  placeAt(world: string, position: Vector3, toward: Vector3): boolean;
}

/** Dónde se posó la nave al caer del gusano (solo la primera llegada); no es donde espera cada ciclo. */
export const CRASH_PARK = 'PARK_Caida';
/** Segundos que se muestran los controles tras despegar. */
const CONTROLS_HINT_SECONDS = 12;
/** Por debajo de esta altura (m) se sugiere cómo posarse. */
const LANDING_HINT_ALTITUDE = 15;
const MARKER_MARGIN = 0.12;
/** A esta distancia (m) del Nudo ya se ve su cáscara y la nave lo puede fijar como objetivo. */
const HIDDEN_REVEAL_DISTANCE = 400;
/** Hasta dónde se busca el suelo bajo la nave para medir la altura (m). */
const ALTITUDE_PROBE = 200;
/** Lámpara cálida de la sala: la Brasa apenas entra por la cúpula. */
const CABIN_LIGHT_COLOR = 0xffd6a0;
const CABIN_LIGHT_INTENSITY = 6;
const CABIN_LIGHT_RANGE = 7;
/** La cámara de fuera: detrás y por encima de la nave (m, ejes de la nave), mirando un poco por encima de ella. */
const CHASE_OFFSET = new Vector3(0, 3.6, 13);
const CHASE_LOOK = new Vector3(0, 1.2, 0);
/** Depuración: a qué distancia (m) de un sitio se pone al jugador para usarlo. */
const STATION_STEP = 1;
/** Qué dice el aviso según lo que tengas delante dentro de la nave. */
const STATION_PROMPTS: Record<Station['id'], string> = {
  asiento: t('F · sentarse a pilotar'),
  registro: t('E · abrir el Registro'),
  mapa: t('E · mirar el mapa de órbitas'),
};
const TOUCH_STATION_PROMPTS: Record<Station['id'], string> = {
  asiento: t('Nave · sentarse a pilotar'),
  registro: t('Nave · abrir el Registro'),
  mapa: t('Nave · mirar el mapa de órbitas'),
};
/** Ejes de referencia para orientar la nave cuando apunta derecho al centro de un mundo. */
const Y_AXIS = new Vector3(0, 1, 0);
const X_AXIS = new Vector3(1, 0, 0);

const KEY_HINTS = {
  landed: t('Espacio despegar · F levantarse · V cámara · T objetivo'),
  free: t('Modo libre: sin ayudas (Z las devuelve)'),
  controls: t('W avanzar · ratón girar · Espacio subir · C bajar · X frenar'),
  land: t('Mantén C para posarte'),
};
const AUTO_KEY_LANDED = t('Espacio despegar · F levantarse · V cámara · T tareas');
const AUTO_TOUCH_LANDED = t('↑ despegar · Nave para levantarse · Objetivo: tareas');
const TOUCH_HINTS = {
  landed: t('↑ despegar · Nave para levantarse · Objetivo'),
  free: t('Modo libre: sin ayudas (Estab. las devuelve)'),
  controls: t('Palanca avanzar · arrastra para girar · ↑ subir · ↓ bajar'),
  land: t('Mantén ↓ para posarte'),
};

function runtimeOf(runtimes: ReadonlyMap<string, WorldRuntime>, id: string): WorldRuntime {
  const runtime = runtimes.get(id);
  if (!runtime) throw new Error(`El mundo "${id}" no está cargado`);
  return runtime;
}

export function createShipFlight(options: ShipFlightOptions): ShipFlight {
  const { spec, runtimes, model, systemScene, player, homeWorld } = options;
  const ship = new Ship(model.hull);
  const cabin = createShipCabin(model, spec);
  let viewMode: ShipView = 'cabina';
  const boarding = new BoardingManager();
  const targeting = new TargetingSystem(
    spec.bodies.map((body) => ({
      id: body.world,
      name: worldTitle(body.world),
      hidden: body.hidden,
    })),
  );
  const hud = createShipHud();
  const cabinLight = new PointLight(CABIN_LIGHT_COLOR, CABIN_LIGHT_INTENSITY, CABIN_LIGHT_RANGE, 2);
  cabinLight.position.set(0, 0.9, 0);
  model.object.add(cabinLight);

  // Dónde espera la nave al empezar cada ciclo.
  const home = runtimeOf(runtimes, homeWorld);
  const park = [...home.world.markers.parks].find(([name]) => name !== CRASH_PARK)?.[1];
  if (!park) throw new Error(`${homeWorld} no tiene marca PARK_ para la nave`);
  /** La nave posada sobre la marca `mark` (de pie sobre el suelo, a su altura de patas). */
  function parkingOn(mark: Object3D): { position: Vector3; orientation: Quaternion } {
    const parked = spawnOnGround(mark, home.collision, home.well.center);
    const parkedUp = parked.feet.clone().sub(home.well.center).normalize();
    return {
      position: parked.feet.clone().addScaledVector(parkedUp, model.hull.clearance),
      orientation: parked.body.clone(),
    };
  }
  const { position: parkPosition, orientation: parkOrientation } = parkingOn(park);

  const spheres: Sphere[] = [...runtimes.values()]
    .filter((r) => spec.bodyOf(r.id))
    .map((r) => ({
      world: r.id,
      center: new Vector3(),
      radius: r.world.info.radius * SPHERE_RADII,
    }));
  const poses = new Map<string, BodyPose>();
  const look = { x: 0, y: 0 };
  let flightTime = 0;

  // Temporales.
  const sysPosition = new Vector3();
  const up = new Vector3();
  const gravity = new Vector3();
  const targetPosition = new Vector3();
  const targetVelocity = new Vector3();
  const relative = new Vector3();
  const spot = new Vector3();
  const seat = new Vector3();
  const eye = new Vector3();
  const gaze = new Vector3();
  const bodyUp = new Vector3();
  /** El mundo donde anda el jugador (el último que llegó en `update`). */
  let footWorld = homeWorld;
  const inverse = new Quaternion();
  const chaseTarget = new Vector3();
  const viewPosition = new Vector3();
  const viewOrientation = new Quaternion();
  const projected = new Vector3();
  const toward = new Vector3();
  const above = new Vector3();
  const down = new Vector3();
  const placed: PlacedCollider = {
    world: model.interior,
    position: ship.state.position,
    orientation: ship.state.orientation,
  };
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

  /** La primera llegada: la nave posada donde cayó (PARK_Caida), hasta el ciclo siguiente. */
  function parkAtCrash(): boolean {
    const mark = home.world.markers.parks.get(CRASH_PARK);
    if (!mark || boarding.isPiloting) return false;
    const crash = parkingOn(mark);
    ship.park(homeWorld, crash.position, crash.orientation);
    attach();
    return true;
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
    const ground = runtime.hull.raycast(ship.state.position, down, ALTITUDE_PROBE);
    return (ground ?? center - runtime.world.info.radius) - ship.clearance;
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
      options.pull?.(ship.frame, ship.state.position, gravity);
      environment.up = up.copy(ship.state.position).normalize();
      environment.altitude = altitudeOf(ship.frame);
    }
    targetIn(t);
    environment.targetVelocity = targetVelocity;
  }

  /** Un cuerpo oculto (el Nudo) solo se puede fijar desde cerca: ninguna marca lo delata de lejos. */
  function revealed(world: string, t: number): boolean {
    if (!spec.bodyOf(world)?.hidden) return true;
    toSystemPosition(framePose(ship.frame, t), ship.state.position, sysPosition);
    return framePose(world, t).position.distanceTo(sysPosition) < HIDDEN_REVEAL_DISTANCE;
  }

  /** Al subir, si el objetivo es el mundo donde estás, apunta al mundo más cercano. */
  function chooseTarget(t: number): void {
    const current = targeting.currentTarget;
    if (current && current.id !== ship.frame) return;
    toSystemPosition(framePose(ship.frame, t), ship.state.position, sysPosition);
    let best: { id: string; distance: number } | undefined;
    for (const body of spec.bodies) {
      if (body.world === ship.frame || !revealed(body.world, t)) continue;
      const distance = framePose(body.world, t).position.distanceTo(sysPosition);
      if (!best || distance < best.distance) best = { id: body.world, distance };
    }
    if (best) targeting.setTarget(best.id);
  }

  /** Un punto de la nave (sus ejes) en el marco donde está. */
  function shipPoint(local: Vector3, target: Vector3): Vector3 {
    return target.copy(local).applyQuaternion(ship.state.orientation).add(ship.state.position);
  }

  /** Lo que tiene delante quien anda por la nave posada, o `undefined`. */
  function focused(onFootWorld: string): Station | undefined {
    if (boarding.isPiloting || ship.frame !== onFootWorld || !ship.landed) return undefined;
    const body = player.state.body;
    upOf(body, bodyUp);
    eye.copy(player.state.position).addScaledVector(bodyUp, EYE_HEIGHT);
    forwardOf(body, gaze)
      .multiplyScalar(Math.cos(player.pitch))
      .addScaledVector(bodyUp, Math.sin(player.pitch))
      .normalize();
    inverse.copy(ship.state.orientation).invert();
    eye.sub(ship.state.position).applyQuaternion(inverse);
    gaze.applyQuaternion(inverse);
    return stationInFocus(model.stations, eye, gaze);
  }

  function canBoard(onFootWorld: string): boolean {
    if (focused(onFootWorld)?.id !== 'asiento') return false;
    return boarding.canBoard(player.state.position, shipPoint(SEAT, spot), ship.landed);
  }

  function board(t: number): void {
    boarding.board();
    options.setReadingEnabled(false);
    systemScene.setReference(ship.frame);
    flightTime = 0;
    look.x = look.y = 0;
    chooseTarget(t);
  }

  /** El jugador de pie en un sitio de la nave (pies, ejes de la nave), mirando a la proa. */
  function placeInShip(world: string, feet: Vector3): void {
    const runtime = runtimeOf(runtimes, world);
    shipPoint(feet, spot);
    up.copy(spot).sub(runtime.well.center).normalize();
    player.moveTo(spot, lookAlong(up, forwardOf(ship.state.orientation, seat)));
  }

  /** De pie a un paso de un sitio de la nave (hacia el centro de la sala), mirándolo. */
  function placeFacing(world: string, id: StationId): void {
    const station = model.stations.find((s) => s.id === id);
    if (!station || id === 'asiento') {
      placeInShip(world, model.standSpot);
      return;
    }
    const step = above.set(-station.position.x, 0, -station.position.z).normalize();
    const feet = toward.copy(station.position).addScaledVector(step, STATION_STEP);
    feet.y = model.standSpot.y;
    placeInShip(world, feet);
    const runtime = runtimeOf(runtimes, world);
    shipPoint(station.position, gaze).sub(spot);
    player.moveTo(spot, lookAlong(up.copy(spot).sub(runtime.well.center).normalize(), gaze));
  }

  /** El jugador en el suelo, al pie de la escalerilla, mirando a la nave. */
  function placeAtLadder(world: string): void {
    const runtime = runtimeOf(runtimes, world);
    shipPoint(LADDER_FOOT, spot);
    up.copy(spot).sub(runtime.well.center).normalize();
    above.copy(spot).addScaledVector(up, 2);
    const drop = runtime.collision.raycast(above, down.copy(up).negate(), 6);
    if (drop !== null) spot.copy(above).addScaledVector(up, -drop);
    toward.copy(ship.state.position).sub(spot);
    player.moveTo(spot, lookAlong(up, toward));
  }

  /** Levantarse del asiento: solo con la nave posada (D4), de pie detrás del asiento. */
  function standUp(): void {
    const world = ship.frame;
    if (!world || !boarding.canDisembark(ship.landed)) return;
    options.walkInto(world);
    placeInShip(world, model.standSpot);
    boarding.disembark();
    options.setReadingEnabled(true);
  }

  const base = options.touch ? TOUCH_HINTS : KEY_HINTS;
  const hints = options.autoTarget
    ? { ...base, landed: options.touch ? AUTO_TOUCH_LANDED : AUTO_KEY_LANDED }
    : base;

  function prompt(onFootWorld: string, active: boolean): string | undefined {
    if (!active || boarding.isPiloting) return undefined;
    const station = focused(onFootWorld);
    if (!station) return undefined;
    return (options.touch ? TOUCH_STATION_PROMPTS : STATION_PROMPTS)[station.id];
  }

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
      name: options.nameOf?.(id) ?? target.name,
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
    get targetId() {
      return targeting.currentTarget?.id;
    },
    setTarget(id) {
      if (id === undefined) targeting.clearTarget();
      else if (targeting.currentTarget?.id !== id) targeting.setTarget(id);
    },
    colliderIn(world) {
      if (boarding.isPiloting || ship.frame !== world) return undefined;
      return placed;
    },
    get cargo() {
      return model.parts.cargo;
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
      const result = ship.step(input, environment, groundOf(ship.frame), dt);
      if (!ship.landed) flightTime += dt;
      followSpheres(t);
      if (result.crashed) return 'choque';
      if (ship.frame !== undefined) {
        const { well, world } = runtimeOf(runtimes, ship.frame);
        if (sunkInGas(ship.state.position, well.center, world.info.gas)) return 'gas';
      }
      toSystemPosition(framePose(ship.frame, t), ship.state.position, sysPosition);
      return sysPosition.length() <= spec.star.radius + ship.radius ? 'calor' : undefined;
    },
    hold() {
      ship.syncPrevious();
    },
    view(alpha, camera) {
      ship.interpolate(alpha, viewPosition, viewOrientation);
      if (viewMode === 'cabina') {
        camera.position
          .copy(seat.copy(model.seatEye).applyQuaternion(viewOrientation))
          .add(viewPosition);
        camera.quaternion.copy(viewOrientation);
        return;
      }
      camera.position
        .copy(seat.copy(CHASE_OFFSET).applyQuaternion(viewOrientation))
        .add(viewPosition);
      chaseTarget.copy(CHASE_LOOK).applyQuaternion(viewOrientation).add(viewPosition);
      camera.up.set(0, 1, 0).applyQuaternion(viewOrientation);
      camera.lookAt(chaseTarget);
    },
    update({ t, alpha, dt, camera, onFootWorld, active }) {
      footWorld = onFootWorld;
      // Misma interpolación que la cámara: la cabina no tiembla respecto a la vista.
      ship.interpolate(
        boarding.isPiloting ? alpha : 1,
        model.object.position,
        model.object.quaternion,
      );
      cabin.update({
        dt,
        landed: ship.landed,
        burning: boarding.isPiloting && !ship.landed,
        levels: ship.state.thrusters,
        clock: options.clock?.() ?? { t, tau: t, duration: 1 },
      });

      hud.update({
        piloting: boarding.isPiloting,
        prompt: prompt(onFootWorld, active),
        speed: ship.state.velocity.length(),
        altitude: ship.frame ? altitudeOf(ship.frame) : undefined,
        stabilize: ship.stabilize,
        landed: ship.landed,
        target: boarding.isPiloting ? hudTarget(t, camera) : undefined,
        hint: boarding.isPiloting ? hint() : undefined,
      });
    },
    action(action, onFootWorld, t) {
      if (action === 'board' && boarding.isPiloting) {
        standUp();
        return;
      }
      if (action === 'board' || action === 'use') {
        // F (o el botón Nave) junto al asiento se sienta; E o F en el atril o la mesa del mapa, los abre.
        const station = focused(onFootWorld)?.id;
        if (station === 'asiento' && action === 'board' && canBoard(onFootWorld)) board(t);
        else if (station === 'registro') options.openRegistry?.();
        else if (station === 'mapa') options.openMap?.();
        return;
      }
      if (!boarding.isPiloting) return;
      if (action === 'camera') {
        viewMode = viewMode === 'cabina' ? 'fuera' : 'cabina';
        return;
      }
      if (action === 'target') {
        const seen = (id: string): boolean => revealed(id, t);
        targeting.cycleTarget(seen);
        if (targeting.currentTarget?.id === ship.frame) targeting.cycleTarget(seen);
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
      cabin.reset();
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
        view: viewMode,
        hatch: cabin.hatch,
        station: focused(footWorld)?.id ?? null,
        firing: THRUSTERS.filter(
          (_, i) => (ship.state.thrusters[i] ?? 0) > VISIBLE_THRUST && !ship.landed,
        ).map((thruster) => thruster.id),
      };
    },
    standAt(onFootWorld, station) {
      if (boarding.isPiloting || ship.frame !== onFootWorld) return false;
      placeFacing(onFootWorld, station);
      return true;
    },
    standAtLadder(onFootWorld) {
      if (boarding.isPiloting || ship.frame !== onFootWorld) return false;
      placeAtLadder(onFootWorld);
      return true;
    },
    parkAtCrash,
    warpTo(world, altitude) {
      if (!boarding.isPiloting || !spec.bodyOf(world)) return false;
      const runtime = runtimeOf(runtimes, world);
      up.copy(runtime.spawn.feet).normalize();
      const position = up
        .clone()
        .multiplyScalar(runtime.world.info.radius + ship.clearance + altitude);
      place(world, position, lookAlong(up, forwardOf(runtime.spawn.body, seat)));
      return true;
    },
    placeAt(world, position, toward) {
      if (!boarding.isPiloting || !spec.bodyOf(world)) return false;
      up.copy(position).normalize();
      const forward = toward.clone().sub(position);
      forward.addScaledVector(up, -forward.dot(up));
      if (forward.lengthSq() < 1e-6) {
        // Hacia el centro del mundo (el núcleo de Cicatriz hueca): el morro apunta abajo y el techo, a un lado.
        forward.copy(toward).sub(position);
        up.copy(Math.abs(forward.y) < 0.9 * forward.length() ? Y_AXIS : X_AXIS);
        up.addScaledVector(forward, -up.dot(forward) / forward.lengthSq()).normalize();
      }
      place(world, position, lookAlong(up, forward));
      return true;
    },
  };

  /** Deja la nave quieta en un sitio (depuración). */
  function place(world: string, position: Vector3, orientation: Quaternion): void {
    ship.state.position.copy(position);
    ship.state.velocity.set(0, 0, 0);
    ship.state.angularVelocity.set(0, 0, 0);
    ship.state.orientation.copy(orientation);
    ship.landed = false;
    ship.frame = world;
    ship.syncPrevious();
    attach();
    systemScene.setReference(world);
  }

  function groundOf(world: string | undefined) {
    if (!world) return undefined;
    const runtime = runtimeOf(runtimes, world);
    return { world: runtime.hull, center: runtime.well.center };
  }
}
