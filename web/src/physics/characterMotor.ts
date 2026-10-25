// Motor del personaje en primera persona sobre planetas esféricos (código propio; las colisiones
// llegan a través de CollisionWorld). En cada paso de física:
//   1. gravedad → nuevo "arriba"   2. intención → velocidad deseada sobre el suelo
//   3. aceleración / salto / gravedad   4. mover la cápsula en subpasos y sacarla de la geometría
//   5. pegarse al suelo al bajar cuestas
// El estado se modifica en el sitio para no crear objetos en cada paso.
import { Quaternion, Vector3 } from 'three';
import type { MoveIntent } from '../core/input';
import {
  AIR_ACCELERATION,
  GROUND_ACCELERATION,
  GROUND_SNAP_DISTANCE,
  JUMP_SPEED,
  MAX_SLOPE_DEGREES,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  RUN_SPEED,
  UP_ALIGN_RATE,
  WALK_SPEED,
} from '../data/movement';
import { createCapsule, placeCapsule, type CollisionWorld } from './collisionWorld';
import { gravityAt, type GravityWell } from './gravity';
import { alignUp, forwardOf, rightOf, smoothingFactor, upOf } from './surfaceFrame';

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
}

export interface MotorEnvironment {
  wells: readonly GravityWell[];
  world: CollisionWorld;
}

const MIN_WALKABLE_DOT = Math.cos((MAX_SLOPE_DEGREES * Math.PI) / 180);
/** Cada subpaso mueve como mucho media cápsula para no atravesar paredes ni suelo. */
const MAX_SUBSTEP_DISTANCE = PLAYER_RADIUS * 0.5;
const MAX_SUBSTEPS = 32;

// Temporales reutilizados (el motor se llama 60 veces por segundo).
const gravity = new Vector3();
const up = new Vector3();
const forward = new Vector3();
const right = new Vector3();
const wish = new Vector3();
const planeNormal = new Vector3();
const planar = new Vector3();
const motion = new Vector3();
const correction = new Vector3();
const contactNormal = new Vector3();
const probe = new Vector3();
const capsule = createCapsule(PLAYER_RADIUS);

export function createCharacter(feet: Vector3, body: Quaternion): CharacterState {
  return {
    position: feet.clone(),
    velocity: new Vector3(),
    body: body.clone(),
    grounded: false,
    groundNormal: upOf(body),
    jumpHeld: false,
  };
}

/** Componente de `v` en el plano de normal `n` (unitaria), escrita en `target`. */
function projectOnPlane(v: Vector3, n: Vector3, target: Vector3): Vector3 {
  return target.copy(v).addScaledVector(n, -v.dot(n));
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

function updateUp(state: CharacterState, env: MotorEnvironment, dt: number): number {
  gravityAt(state.position, env.wells, gravity);
  const strength = gravity.length();
  if (strength > 1e-6) {
    alignUp(
      state.body,
      up.copy(gravity).divideScalar(-strength),
      smoothingFactor(UP_ALIGN_RATE, dt),
    );
  }
  upOf(state.body, up);
  return strength;
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

function applyJumpAndGravity(state: CharacterState, intent: MoveIntent, dt: number): void {
  const wantsJump = intent.jump && !state.jumpHeld;
  state.jumpHeld = intent.jump;
  if (state.grounded && wantsJump) {
    projectOnPlane(state.velocity, up, state.velocity).addScaledVector(up, JUMP_SPEED);
    state.grounded = false;
  }
  if (state.grounded) {
    // En el suelo solo se aplica la gravedad perpendicular a él: no resbala en pendientes caminables.
    state.velocity.addScaledVector(state.groundNormal, gravity.dot(state.groundNormal) * dt);
  } else {
    state.velocity.addScaledVector(gravity, dt);
  }
}

/** Saca la cápsula de la geometría; devuelve si quedó sobre suelo caminable. */
function resolveContacts(state: CharacterState, env: MotorEnvironment): boolean {
  placeCapsule(capsule, state.position, up, PLAYER_HEIGHT);
  if (!env.world.resolve(capsule, correction)) return false;
  state.position.add(correction);
  contactNormal.copy(correction).normalize();
  const into = state.velocity.dot(contactNormal);
  if (into < 0) state.velocity.addScaledVector(contactNormal, -into);
  if (contactNormal.dot(up) >= MIN_WALKABLE_DOT) {
    state.groundNormal.copy(contactNormal);
    return true;
  }
  return false;
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

/** Al bajar una cuesta o pasar un borde pequeño, vuelve a apoyar los pies en vez de "despegar". */
function snapToGround(state: CharacterState, env: MotorEnvironment): boolean {
  if (state.velocity.dot(up) > 0.1) return false; // subiendo (salto): no pegar
  probe.copy(state.position).addScaledVector(up, -GROUND_SNAP_DISTANCE);
  placeCapsule(capsule, probe, up, PLAYER_HEIGHT);
  if (!env.world.resolve(capsule, correction)) return false;
  contactNormal.copy(correction).normalize();
  if (contactNormal.dot(up) < MIN_WALKABLE_DOT) return false;
  state.position.copy(probe).add(correction);
  state.groundNormal.copy(contactNormal);
  const into = state.velocity.dot(contactNormal);
  if (into < 0) state.velocity.addScaledVector(contactNormal, -into);
  return true;
}

export function stepCharacter(
  state: CharacterState,
  intent: MoveIntent,
  env: MotorEnvironment,
  dt: number,
): void {
  updateUp(state, env, dt);
  steer(state, intent, dt);
  applyJumpAndGravity(state, intent, dt);
  const wasGrounded = state.grounded;
  let grounded = moveAndCollide(state, env, dt);
  if (!grounded && wasGrounded) grounded = snapToGround(state, env);
  state.grounded = grounded;
  if (!grounded) state.groundNormal.copy(up);
}
