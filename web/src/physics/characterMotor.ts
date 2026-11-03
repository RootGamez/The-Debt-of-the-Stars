// Motor del personaje en primera persona sobre planetas esféricos (código propio; las colisiones
// llegan a través de CollisionWorld). En cada paso de física:
//   1. gravedad → nuevo "arriba"   2. intención → velocidad deseada sobre el suelo
//   3. salto (con búfer y tiempo coyote) y gravedad   4. mover la cápsula en subpasos y sacarla de
//   la geometría   5. pegarse al suelo al bajar cuestas o pasar aristas
// En el agua (mundos con mar) los pasos 2 y 3 cambian: se nada en 3D, el agua empuja hacia arriba y frena.
// El estado se modifica en el sitio para no crear objetos en cada paso.
import { Quaternion, Vector3 } from 'three';
import type { MoveIntent } from '../core/input';
import {
  AIR_ACCELERATION,
  COYOTE_SECONDS,
  GROUND_ACCELERATION,
  FLOAT_LINE,
  GROUND_SNAP_DISTANCE,
  JUMP_BUFFER_SECONDS,
  JUMP_SPEED,
  MAX_SLOPE_DEGREES,
  MAX_BUOYANCY,
  MAX_SPEED,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  RUN_SPEED,
  SWIM_ACCELERATION,
  SWIM_SPEED,
  SWIM_SUBMERSION,
  SWIM_VERTICAL_ACCELERATION,
  UP_ALIGN_RATE,
  WALK_SPEED,
  WATER_DRAG,
  WATER_DRAG_QUADRATIC,
} from '../data/movement';
import { createCapsule, createContact, placeCapsule, type CollisionWorld } from './collisionWorld';
import { gravityAt, type GravityWell } from './gravity';
import { alignUp, forwardOf, rightOf, smoothingFactor, upOf } from './surfaceFrame';
import { submersion, type WaterBody } from './water';
import { maxWaveHeight, waveClock, waveDrift } from './waves';

export interface CharacterState {
  /** Posición de los pies (m). */
  position: Vector3;
  velocity: Vector3;
  /** Orientación del cuerpo (arriba = +Y local, mirada = -Z local). */
  body: Quaternion;
  grounded: boolean;
  /** Normal del suelo bajo los pies (válida si `grounded`). */
  groundNormal: Vector3;
  /** Para saltar una sola vez por pulsación. */
  jumpHeld: boolean;
  /** Tiempo restante del salto pulsado y aún no hecho (s). */
  jumpBuffer: number;
  /** Tiempo restante en el que aún se puede saltar tras dejar el suelo (s). */
  coyote: number;
  /** Veces que ha dejado el suelo (saltos o caídas); útil para depurar. */
  takeoffs: number;
  /** Veces que ha aterrizado; con `lastLandingSpeed` permite leer cada impacto una sola vez. */
  landings: number;
  /** Velocidad contra el suelo en el último aterrizaje (m/s), para la muerte por caída. */
  lastLandingSpeed: number;
  /** Nada (bastante cuerpo bajo el agua): Espacio sube, Mayús bucea. */
  swimming: boolean;
}

export interface MotorEnvironment {
  wells: readonly GravityWell[];
  world: CollisionWorld;
  /** El mar del mundo, si lo tiene. */
  water?: WaterBody | undefined;
}

const MIN_WALKABLE_DOT = Math.cos((MAX_SLOPE_DEGREES * Math.PI) / 180);
/** Cada subpaso mueve como mucho media cápsula para no atravesar paredes ni suelo. */
const MAX_SUBSTEP_DISTANCE = PLAYER_RADIUS * 0.5;
/** Suficientes subpasos para MAX_SPEED con pasos de hasta 1/30 s. */
const MAX_SUBSTEPS = Math.ceil(MAX_SPEED / 30 / MAX_SUBSTEP_DISTANCE) + 1;
/** El sondeo de suelo baja por tramos menores que el radio: el eje de la cápsula nunca atraviesa
 * una cara (en ese caso el sentido del empuje sería ambiguo). */
const SNAP_INCREMENT = PLAYER_RADIUS * 0.5;

// Temporales reutilizados (el motor se llama 60 veces por segundo).
const gravity = new Vector3();
const up = new Vector3();
const forward = new Vector3();
const right = new Vector3();
const wish = new Vector3();
const planeNormal = new Vector3();
const planar = new Vector3();
const motion = new Vector3();
const pushDirection = new Vector3();
const probe = new Vector3();
const capsule = createCapsule(PLAYER_RADIUS);
const contact = createContact();
const incoming = new Vector3();
/** Mayor velocidad contra el suelo en el paso actual. */
let stepImpact = 0;

export function createCharacter(feet: Vector3, body: Quaternion): CharacterState {
  return {
    position: feet.clone(),
    velocity: new Vector3(),
    body: body.clone(),
    grounded: false,
    groundNormal: upOf(body),
    jumpHeld: false,
    jumpBuffer: 0,
    coyote: 0,
    takeoffs: 0,
    landings: 0,
    lastLandingSpeed: 0,
    swimming: false,
  };
}

/** Componente de `v` en el plano de normal `n` (unitaria), escrita en `target`. */
function projectOnPlane(v: Vector3, n: Vector3, target: Vector3): Vector3 {
  return target.copy(v).addScaledVector(n, -v.dot(n));
}

/** Quita la parte de la velocidad que va contra una superficie de normal `n`. */
function removeInto(velocity: Vector3, n: Vector3): void {
  const into = velocity.dot(n);
  if (into < 0) velocity.addScaledVector(n, -into);
}

/** Mueve `current` hacia `target` como mucho `maxDelta` (en el sitio). */
function moveTowards(current: Vector3, target: Vector3, maxDelta: number): void {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const dz = target.z - current.z;
  const distance = Math.hypot(dx, dy, dz);
  if (distance <= maxDelta || distance === 0) {
    current.copy(target);
    return;
  }
  const k = maxDelta / distance;
  current.set(current.x + dx * k, current.y + dy * k, current.z + dz * k);
}

function updateUp(state: CharacterState, env: MotorEnvironment, dt: number): void {
  gravityAt(state.position, env.wells, gravity);
  const strength = gravity.length();
  if (strength > 1e-6) {
    up.copy(gravity).divideScalar(-strength);
    alignUp(state.body, up, smoothingFactor(UP_ALIGN_RATE, dt));
  }
  upOf(state.body, up);
}

function steer(state: CharacterState, intent: MoveIntent, dt: number): void {
  planeNormal.copy(state.grounded ? state.groundNormal : up);
  forwardOf(state.body, forward);
  rightOf(state.body, right);
  const speed = intent.run ? RUN_SPEED : WALK_SPEED;
  wish.set(0, 0, 0).addScaledVector(right, intent.x).addScaledVector(forward, intent.z);
  projectOnPlane(wish, planeNormal, wish);
  if (wish.lengthSq() > 1e-12) wish.setLength(Math.hypot(intent.x, intent.z) * speed);

  const normalSpeed = state.velocity.dot(planeNormal);
  projectOnPlane(state.velocity, planeNormal, planar);
  const acceleration = state.grounded ? GROUND_ACCELERATION : AIR_ACCELERATION;
  moveTowards(planar, wish, acceleration * dt);
  state.velocity.copy(planar).addScaledVector(planeNormal, normalSpeed);
}

/** Devuelve si saltó en este paso. */
function applyJumpAndGravity(state: CharacterState, intent: MoveIntent, dt: number): boolean {
  if (intent.jump && !state.jumpHeld) state.jumpBuffer = JUMP_BUFFER_SECONDS;
  state.jumpHeld = intent.jump;
  const canJump = state.grounded || state.coyote > 0;
  const jumped = state.jumpBuffer > 0 && canJump;
  if (jumped) {
    projectOnPlane(state.velocity, up, state.velocity).addScaledVector(up, JUMP_SPEED);
    state.grounded = false;
    state.jumpBuffer = 0;
    state.coyote = 0;
  } else {
    state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
  }
  if (state.grounded) {
    // En el suelo solo se aplica la gravedad perpendicular a él: no resbala en pendientes caminables.
    state.velocity.addScaledVector(state.groundNormal, gravity.dot(state.groundNormal) * dt);
  } else {
    state.velocity.addScaledVector(gravity, dt);
  }
  if (state.velocity.lengthSq() > MAX_SPEED * MAX_SPEED) state.velocity.setLength(MAX_SPEED);
  return jumped;
}

const fromCenter = new Vector3();
const drift = new Vector3();

/** El vaivén de las olas donde está quien nada (cero sin oleaje). */
function surfaceDrift(position: Vector3, water: WaterBody | undefined): Vector3 {
  drift.set(0, 0, 0);
  if (!water?.waves) return drift;
  fromCenter.subVectors(position, water.center);
  // Solo cerca del mar abierto: en el pozo que sube al tubo seco el agua no tiene olas.
  if (Math.abs(fromCenter.length() - water.level) > maxWaveHeight(water.waves) + PLAYER_HEIGHT) {
    return drift;
  }
  return waveDrift(water.waves, fromCenter.normalize(), water.level, waveClock(), drift);
}

/**
 * En el agua: se nada sobre el plano del suelo (la intención frena y acelera menos), Espacio sube y Mayús bucea;
 * el empuje del agua compensa la gravedad cuando se flota en la línea de flotación y el agua lo frena todo.
 */
function swim(
  state: CharacterState,
  intent: MoveIntent,
  wet: number,
  drift: Vector3,
  dt: number,
): void {
  forwardOf(state.body, forward);
  rightOf(state.body, right);
  wish.set(0, 0, 0).addScaledVector(right, intent.x).addScaledVector(forward, intent.z);
  projectOnPlane(wish, up, wish);
  if (wish.lengthSq() > 1e-12)
    wish.setLength(Math.min(1, Math.hypot(intent.x, intent.z)) * SWIM_SPEED);
  // En la superficie las olas mecen a quien nada; bajo el agua ya no llegan.
  wish.addScaledVector(drift, Math.max(0, Math.min(1, (1 - wet) / (1 - SWIM_SUBMERSION))));
  const verticalSpeed = state.velocity.dot(up);
  projectOnPlane(state.velocity, up, planar);
  moveTowards(planar, wish, SWIM_ACCELERATION * dt);
  state.velocity.copy(planar).addScaledVector(up, verticalSpeed);

  const buoyancy = Math.min(MAX_BUOYANCY, wet / FLOAT_LINE);
  state.velocity.addScaledVector(gravity, (1 - buoyancy) * dt);
  const stroke = (intent.jump ? 1 : 0) - (intent.run ? 1 : 0);
  state.velocity.addScaledVector(up, stroke * SWIM_VERTICAL_ACCELERATION * dt);
  // Lo de lado ya lo frena la intención (que lleva hacia `wish`); el agua frena lo que sube y baja.
  const rising = state.velocity.dot(up);
  const drag = WATER_DRAG + WATER_DRAG_QUADRATIC * Math.abs(rising);
  state.velocity.addScaledVector(up, rising * (Math.exp(-drag * dt) - 1));
  // Nadando no se salta: soltar Espacio tampoco deja un salto pendiente al salir.
  state.jumpHeld = intent.jump;
  state.jumpBuffer = 0;
  state.coyote = 0;
}

/** Saca la cápsula de la geometría; devuelve si quedó sobre suelo caminable. */
function resolveContacts(state: CharacterState, env: MotorEnvironment): boolean {
  placeCapsule(capsule, state.position, up, PLAYER_HEIGHT);
  if (!env.world.resolve(capsule, up, contact)) return false;
  incoming.copy(state.velocity); // velocidad antes de chocar, para medir el impacto
  state.position.add(contact.correction);
  if (contact.correction.lengthSq() > 1e-12) {
    removeInto(state.velocity, pushDirection.copy(contact.correction).normalize());
  }
  if (contact.floorDot < MIN_WALKABLE_DOT) return false;
  stepImpact = Math.max(stepImpact, -incoming.dot(contact.floorNormal));
  removeInto(state.velocity, contact.floorNormal);
  state.groundNormal.copy(contact.floorNormal);
  return true;
}

function moveAndCollide(state: CharacterState, env: MotorEnvironment, dt: number): boolean {
  motion.copy(state.velocity).multiplyScalar(dt);
  const substeps = Math.min(
    MAX_SUBSTEPS,
    Math.max(1, Math.ceil(motion.length() / MAX_SUBSTEP_DISTANCE)),
  );
  motion.divideScalar(substeps);
  let grounded = false;
  for (let i = 0; i < substeps; i++) {
    state.position.add(motion);
    if (resolveContacts(state, env)) grounded = true;
  }
  return grounded;
}

/**
 * Al bajar una cuesta o pasar una arista (de una cara inclinada a otra más plana), vuelve a apoyar
 * los pies en vez de "despegar". Solo se llama si el paso empezó en el suelo y no hubo salto. La
 * velocidad se reorienta sobre la nueva cara conservando la rapidez: si no, la componente que subía
 * por la rampa lanzaría al jugador.
 */
function snapToGround(state: CharacterState, env: MotorEnvironment): boolean {
  probe.copy(state.position);
  for (let travelled = 0; travelled < GROUND_SNAP_DISTANCE; travelled += SNAP_INCREMENT) {
    probe.addScaledVector(up, -Math.min(SNAP_INCREMENT, GROUND_SNAP_DISTANCE - travelled));
    placeCapsule(capsule, probe, up, PLAYER_HEIGHT);
    if (!env.world.resolve(capsule, up, contact)) continue;
    if (contact.floorDot < MIN_WALKABLE_DOT) return false; // lo primero que toca no es suelo
    // Se sale solo hacia arriba (lo que haga falta para dejar de tocar esa cara): al coronar una rampa empinada,
    // empujar según su normal devolvería al jugador cuesta abajo.
    const lift = contact.correction.dot(up);
    if (lift <= 1e-9) return false;
    state.position.copy(probe).addScaledVector(up, contact.correction.lengthSq() / lift);
    state.groundNormal.copy(contact.floorNormal);
    const speed = state.velocity.length();
    projectOnPlane(state.velocity, contact.floorNormal, state.velocity);
    if (state.velocity.lengthSq() > 1e-12) state.velocity.setLength(speed);
    return true;
  }
  return false;
}

export function stepCharacter(
  state: CharacterState,
  intent: MoveIntent,
  env: MotorEnvironment,
  dt: number,
): void {
  updateUp(state, env, dt);
  const wet = env.water ? submersion(state.position, up, env.water) : 0;
  state.swimming = wet > SWIM_SUBMERSION;
  const wasGrounded = state.grounded;
  let jumped = false;
  if (state.swimming) {
    swim(state, intent, wet, surfaceDrift(state.position, env.water), dt);
  } else {
    steer(state, intent, dt);
    jumped = applyJumpAndGravity(state, intent, dt);
  }
  stepImpact = 0;
  let grounded = moveAndCollide(state, env, dt);
  if (!grounded && wasGrounded && !jumped && !state.swimming) grounded = snapToGround(state, env);

  if (wasGrounded && !grounded) state.takeoffs++;
  if (!wasGrounded && grounded) {
    state.landings++;
    state.lastLandingSpeed = Math.max(0, stepImpact);
  }
  if (grounded) state.coyote = COYOTE_SECONDS;
  else if (!jumped) state.coyote = Math.max(0, state.coyote - dt);
  state.grounded = grounded;
  if (!grounded) state.groundNormal.copy(up);
}
