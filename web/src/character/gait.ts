// El andar del explorador (lógica pura, sin Three): de lo que hace el cuerpo (velocidad, suelo, aire, agua, giro)
// a los ángulos de cada articulación. La fase del paso avanza con lo andado (una vuelta por zancada), así los pies
// casi no patinan; quieto, andar, correr, saltar y nadar se mezclan suavemente.
//
// Convenios (marco del explorador: Y arriba, frente −Z, derecha +X; todo en radianes):
// - Pierna izquierda `hip = A·sin φ`, la derecha al revés. `hip` > 0 la lleva hacia delante.
// - `knee` > 0 es doblar la rodilla (la espinilla va hacia atrás); `ankle` > 0 sube la punta.
// - Brazos: `shoulder` > 0 hacia delante, `shoulderRoll` > 0 separado del cuerpo, `elbow` > 0 doblado.
// - Tronco y cabeza: `…Pitch` > 0 hacia atrás (mirar arriba), `…Roll` > 0 hacia la izquierda.
import { RUN_SPEED, WALK_SPEED } from '../data/movement';

/** Lo que se avanza en una vuelta entera del paso (dos pisadas), andando y corriendo (m). Piernas cortas. */
export const STRIDE_WALK = 1.3;
export const STRIDE_RUN = 1.8;

/** Lo rápido que se pasa de un modo a otro (1/s). */
const MOVE_RATE = 10;
const AIR_RATE = 8;
const SWIM_RATE = 4;
const TURN_RATE = 6;
/** Bracear y patalear en el agua (vueltas por segundo). */
const PADDLE_RATE = 1.4;
/** El agacharse al caer: a partir de qué velocidad es entero y lo que tarda en irse (1/s). */
const HARD_LANDING = 8;
const LANDING_RECOVERY = 3;
/** Respirar quieto (rad/s) y cuánto se hincha el pecho. */
const BREATH_RATE = 1.6;
const BREATH_DEPTH = 0.012;
/** El muelle de la mochila (rigidez y amortiguación) y lo más que se balancea. */
const PACK_STIFFNESS = 120;
const PACK_DAMPING = 14;
const PACK_LIMIT = 0.15;
const MAX_DT = 0.1;
const TAU = Math.PI * 2;

export interface GaitInput {
  dt: number;
  /** Velocidad sobre el suelo (m/s). */
  speed: number;
  /** Hacia dónde va respecto a donde mira (−1 atrás … 1 delante): de espaldas, el paso va al revés. */
  forward: number;
  grounded: boolean;
  swimming: boolean;
  /** Velocidad hacia arriba (m/s): subiendo encoge las piernas, cayendo las estira. */
  verticalSpeed: number;
  /** Lo que gira sobre sí mismo (rad/s): quieto, da pasitos. */
  turnRate: number;
  /** Cuántas veces ha aterrizado (del motor) y a qué velocidad la última. */
  landings: number;
  landingSpeed: number;
}

export interface GaitState {
  phase: number;
  /** 0 quieto … 1 andando. */
  move: number;
  /** 0 andando … 1 corriendo. */
  run: number;
  air: number;
  swim: number;
  /** Pasitos al girar quieto (0–1). */
  turn: number;
  /** El agacharse al caer (0–1). */
  land: number;
  /** Subiendo (1) o cayendo (−1), suavizado. */
  rise: number;
  time: number;
  pack: number;
  packVelocity: number;
  previousBob: number;
  lastLandings: number | undefined;
}

export interface LegPose {
  hip: number;
  hipRoll: number;
  knee: number;
  ankle: number;
}

export interface ArmPose {
  shoulder: number;
  shoulderRoll: number;
  elbow: number;
  wrist: number;
}

export interface BodyPose {
  /** Subir y bajar la pelvis (m) y llevarla de lado (m, +X a la derecha). */
  bob: number;
  sway: number;
  pelvisRoll: number;
  pelvisYaw: number;
  torsoPitch: number;
  torsoYaw: number;
  torsoRoll: number;
  headPitch: number;
  /** Cuánto se hincha el pecho (fracción). */
  breath: number;
  /** El balanceo de la mochila (rad, > 0 hacia atrás). */
  pack: number;
  /** Izquierda y derecha. */
  legs: readonly [LegPose, LegPose];
  arms: readonly [ArmPose, ArmPose];
}

export function createGait(): GaitState {
  return {
    phase: 0,
    move: 0,
    run: 0,
    air: 0,
    swim: 0,
    turn: 0,
    land: 0,
    rise: 0,
    time: 0,
    pack: 0,
    packVelocity: 0,
    previousBob: 0,
    lastLandings: undefined,
  };
}

const finite = (x: number, fallback = 0): number => (Number.isFinite(x) ? x : fallback);
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const approach = (from: number, to: number, rate: number, dt: number): number =>
  from + (to - from) * (1 - Math.exp(-rate * dt));
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Un paso de tiempo: mezcla de modos, fase del paso, caída y mochila. Modifica `state`. */
export function stepGait(state: GaitState, input: GaitInput): void {
  const dt = Math.min(MAX_DT, Math.max(0, finite(input.dt)));
  const speed = Math.min(RUN_SPEED * 2, Math.max(0, finite(input.speed)));
  const turnRate = Math.min(6, Math.abs(finite(input.turnRate)));
  const swimming = input.swimming;
  const grounded = input.grounded && !swimming;
  state.time += dt;
  if (grounded) {
    state.move = approach(state.move, clamp01(speed / WALK_SPEED), MOVE_RATE, dt);
    state.run = approach(
      state.run,
      clamp01((speed - WALK_SPEED) / (RUN_SPEED - WALK_SPEED)),
      MOVE_RATE,
      dt,
    );
  }
  state.air = approach(state.air, !grounded && !swimming ? 1 : 0, AIR_RATE, dt);
  state.swim = approach(state.swim, swimming ? 1 : 0, SWIM_RATE, dt);
  state.rise = approach(state.rise, Math.tanh(finite(input.verticalSpeed) / 3), AIR_RATE, dt);
  state.turn = approach(state.turn, grounded ? clamp01(turnRate / 3) : 0, TURN_RATE, dt);
  advancePhase(state, { dt, speed, turnRate, grounded, forward: finite(input.forward, 1) });
  landing(state, input, dt);
  swingPack(state, dt);
}

function advancePhase(
  state: GaitState,
  m: { dt: number; speed: number; turnRate: number; grounded: boolean; forward: number },
): void {
  const direction = m.forward < -0.2 ? -1 : 1;
  if (m.grounded) {
    const stride = mix(STRIDE_WALK, STRIDE_RUN, state.run);
    state.phase += (direction * m.speed * m.dt * TAU) / stride;
    // Quieto y girando: pasitos en el sitio.
    if (state.move < 0.3) state.phase += m.turnRate * m.dt * 0.9;
  }
  if (state.swim > 0.1) state.phase += m.dt * TAU * PADDLE_RATE * state.swim;
  if (Math.abs(state.phase) > 1e4) state.phase %= TAU;
}

function landing(state: GaitState, input: GaitInput, dt: number): void {
  const landings = finite(input.landings);
  if (state.lastLandings !== undefined && landings > state.lastLandings) {
    state.land = Math.max(state.land, clamp01(finite(input.landingSpeed) / HARD_LANDING));
  }
  state.lastLandings = landings;
  state.land = Math.max(0, state.land - LANDING_RECOVERY * dt);
}

/** La mochila va un poco a destiempo del cuerpo: un muelle empujado por el subir y bajar. */
function swingPack(state: GaitState, dt: number): void {
  if (dt <= 0) return;
  const bob = groundBob(state);
  const bobVelocity = (bob - state.previousBob) / dt;
  state.previousBob = bob;
  const target = Math.max(-0.1, Math.min(0.1, -bobVelocity * 0.6));
  const acceleration = PACK_STIFFNESS * (target - state.pack) - PACK_DAMPING * state.packVelocity;
  state.packVelocity += acceleration * dt;
  state.pack = Math.max(-PACK_LIMIT, Math.min(PACK_LIMIT, state.pack + state.packVelocity * dt));
}

/** La pose del cuerpo ahora. `lookPitch`: el cabeceo de la cámara (rad, > 0 arriba). */
export function gaitPose(state: GaitState, lookPitch: number): BodyPose {
  const ground = groundPose(state);
  const swim = clamp01(state.swim);
  const air = clamp01(state.air) * (1 - swim);
  let pose = air > 0.001 ? mixPose(ground, airPose(state), air) : ground;
  if (swim > 0.001) pose = mixPose(pose, swimPose(state), swim);
  const look = Math.max(-1.5, Math.min(1.5, finite(lookPitch)));
  const headPitch = Math.max(-0.75, Math.min(0.75, look * 0.55 - pose.torsoPitch));
  return { ...pose, headPitch, pack: state.pack };
}

/** Lo que sube y baja la pelvis andando (igual que en groundPose, sin construir la pose entera). */
function groundBob(state: GaitState): number {
  const move = Math.max(state.move, 0.35 * state.turn * (1 - state.move));
  return (0.022 + 0.02 * state.run) * Math.cos(2 * state.phase) * move - state.land * 0.1;
}

function groundPose(state: GaitState): BodyPose {
  const { phase, run, land } = state;
  const move = Math.max(state.move, 0.35 * state.turn * (1 - state.move));
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const legs = [0, Math.PI].map((offset) => {
    const legS = Math.sin(phase + offset);
    const swing = Math.max(0, Math.cos(phase + offset)); // pasando por debajo hacia delante
    const back = Math.max(0, -legS); // la que se queda atrás empuja con la punta
    const hip = legS * move * (0.5 + 0.25 * run);
    const knee = 0.08 + move * (0.12 + (0.85 + 0.5 * run) * swing ** 1.2) + land * 0.8;
    const ankle = 0.85 * (knee - hip) - 0.2 * back * move - land * 0.3;
    return { hip, hipRoll: 0.04, knee, ankle };
  }) as unknown as [LegPose, LegPose];
  const armSwing = move * (0.45 + 0.35 * run);
  const arms = [1, -1].map((side) => {
    const shoulder = -side * s * armSwing;
    return {
      shoulder,
      shoulderRoll: 0.22 + land * 0.25,
      elbow: 0.3 + 0.2 * move + 0.6 * run + Math.max(0, shoulder) * 0.4,
      wrist: 0.1,
    };
  }) as unknown as [ArmPose, ArmPose];
  const breath = BREATH_DEPTH * Math.sin(state.time * BREATH_RATE) * (1 - 0.6 * move);
  return {
    bob: groundBob(state),
    sway: 0.03 * c * move * (1 - 0.5 * run),
    pelvisRoll: -0.07 * c * move * (1 - 0.4 * run),
    pelvisYaw: -0.12 * s * move,
    torsoPitch: -(0.07 * move + 0.16 * run) - land * 0.2,
    torsoYaw: 0.2 * s * move,
    torsoRoll: 0.035 * c * move,
    headPitch: 0,
    breath,
    pack: 0,
    legs,
    arms,
  };
}

function airPose(state: GaitState): BodyPose {
  const up = clamp01(state.rise);
  const down = clamp01(-state.rise);
  const leg = (side: number): LegPose => ({
    hip: 0.15 + 0.4 * up + 0.12 * side,
    hipRoll: 0.1 + 0.1 * down,
    knee: 0.55 + 0.45 * up - 0.15 * down,
    ankle: 0.25 * up - 0.15 * down,
  });
  const arm = (side: number): ArmPose => ({
    shoulder: 0.25 * up + 0.1 * side,
    shoulderRoll: 0.5 + 0.35 * down,
    elbow: 0.5 - 0.2 * down,
    wrist: 0.1,
  });
  return {
    bob: 0.02 * up,
    sway: 0,
    pelvisRoll: 0,
    pelvisYaw: 0,
    torsoPitch: -0.06 + 0.06 * down,
    torsoYaw: 0,
    torsoRoll: 0,
    headPitch: 0,
    breath: 0,
    pack: 0,
    legs: [leg(1), leg(-1)],
    arms: [arm(1), arm(-1)],
  };
}

function swimPose(state: GaitState): BodyPose {
  const { phase } = state;
  const kick = 0.35 * Math.sin(2 * phase);
  const stroke = Math.sin(phase);
  const arm = (): ArmPose => ({
    shoulder: 0.9 + 0.5 * stroke,
    shoulderRoll: 0.6 + 0.4 * Math.cos(phase),
    elbow: 0.6 - 0.3 * stroke,
    wrist: 0.2,
  });
  return {
    bob: 0.03 * Math.sin(2 * phase),
    sway: 0,
    pelvisRoll: 0,
    pelvisYaw: 0,
    torsoPitch: -0.25,
    torsoYaw: 0,
    torsoRoll: 0,
    headPitch: 0,
    breath: 0,
    pack: 0,
    legs: [
      { hip: 0.2 + kick, hipRoll: 0.08, knee: 0.4 + 0.2 * Math.max(0, kick), ankle: -0.3 },
      { hip: 0.2 - kick, hipRoll: 0.08, knee: 0.4 + 0.2 * Math.max(0, -kick), ankle: -0.3 },
    ],
    arms: [arm(), arm()],
  };
}

function mixLeg(a: LegPose, b: LegPose, t: number): LegPose {
  return {
    hip: mix(a.hip, b.hip, t),
    hipRoll: mix(a.hipRoll, b.hipRoll, t),
    knee: mix(a.knee, b.knee, t),
    ankle: mix(a.ankle, b.ankle, t),
  };
}

function mixArm(a: ArmPose, b: ArmPose, t: number): ArmPose {
  return {
    shoulder: mix(a.shoulder, b.shoulder, t),
    shoulderRoll: mix(a.shoulderRoll, b.shoulderRoll, t),
    elbow: mix(a.elbow, b.elbow, t),
    wrist: mix(a.wrist, b.wrist, t),
  };
}

function mixPose(a: BodyPose, b: BodyPose, t: number): BodyPose {
  if (t <= 0) return a;
  return {
    bob: mix(a.bob, b.bob, t),
    sway: mix(a.sway, b.sway, t),
    pelvisRoll: mix(a.pelvisRoll, b.pelvisRoll, t),
    pelvisYaw: mix(a.pelvisYaw, b.pelvisYaw, t),
    torsoPitch: mix(a.torsoPitch, b.torsoPitch, t),
    torsoYaw: mix(a.torsoYaw, b.torsoYaw, t),
    torsoRoll: mix(a.torsoRoll, b.torsoRoll, t),
    headPitch: mix(a.headPitch, b.headPitch, t),
    breath: mix(a.breath, b.breath, t),
    pack: mix(a.pack, b.pack, t),
    legs: [mixLeg(a.legs[0], b.legs[0], t), mixLeg(a.legs[1], b.legs[1], t)],
    arms: [mixArm(a.arms[0], b.arms[0], t), mixArm(a.arms[1], b.arms[1], t)],
  };
}
