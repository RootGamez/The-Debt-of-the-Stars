// Lo que se ve del escéptico y de su Cámara (plan de finales, E5): él, sentado en el catre (encorvado mientras gira el
// bucle; erguido y atento si entras con el Contrapeso; de pie cuando la fuente ya no está), y, cuando sale contigo
// por el anillo, de pie junto a la Pista. Los anillos de la Cámara giran en sentidos contrarios y, al sacar la fuente,
// se paran poco a poco; la luz de la casa baja con ella y se queda la de la lámpara.
import type { IUniform, Object3D } from 'three';
import { buildAbsent, type AbsentRig } from '../character/absentModel';
import {
  advanceAbsentPoser,
  createAbsentPoser,
  currentAbsentPose,
  switchAbsentPose,
  type AbsentPoser,
} from '../character/absentPoser';
import type { AbsentPoseName } from '../character/absentPoses';
import type { SkepticStage } from '../game/skeptic';
import { SKEPTIC_ANCHORS } from '../worlds/procedural/tallerCentro';
import { CAMARA_NAMES } from '../worlds/procedural/tallerCentroCamara';
import { CENTRO_GLOW_KEY } from '../worlds/procedural/tallerCentroMaterial';
import { COT_SIZE, CAMARA_RINGS } from '../worlds/procedural/tallerCentroShape';

/** Lo que tardan los anillos en pararse y la luz en bajar (s). */
const STOP_SECONDS = 5;
/** La luz que queda en la casa sin la fuente (la lámpara y el cielo van aparte). */
const GLOW_WITHOUT_SOURCE = 0;

export interface SkepticViewState {
  stage: SkepticStage;
  /** Ha salido contigo por el anillo: espera en la Pista. */
  left: boolean;
  loopCut: boolean;
}

export interface SkepticView {
  update(dt: number, state: SkepticViewState): void;
  /** Un ciclo nuevo: todo como al empezar, sin transiciones. */
  reset(): void;
  snapshot(): { pose: AbsentPoseName; at: 'home' | 'track'; spin: number; glow: number };
}

function poseFor(state: SkepticViewState): AbsentPoseName {
  if (state.left) return 'idle';
  if (state.loopCut) return 'standing';
  return state.stage === 'contrapeso' || state.stage === 'cuenta' ? 'seated' : 'slumped';
}

export function createSkepticView(world: Object3D): SkepticView | undefined {
  const home = world.getObjectByName(SKEPTIC_ANCHORS.home);
  const track = world.getObjectByName(SKEPTIC_ANCHORS.track);
  if (!home || !track) return undefined;
  const rings = CAMARA_RINGS.map((_, k) => world.getObjectByName(CAMARA_NAMES.ring(k)));
  const lights = [CAMARA_NAMES.source, CAMARA_NAMES.halo].map((n) => world.getObjectByName(n));
  const glow = findGlow(world);
  const rig: AbsentRig = buildAbsent('esceptico');
  const seat = { seatHeight: COT_SIZE.seat };
  let poser: AbsentPoser = createAbsentPoser('esceptico', 'slumped', seat);
  let running = 1;
  let at: 'home' | 'track' = 'home';
  home.add(rig.root);
  rig.setPose(currentAbsentPose(poser));

  const moveTo = (place: 'home' | 'track'): void => {
    if (place === at) return;
    at = place;
    (place === 'home' ? home : track).add(rig.root);
  };
  return {
    update(dt, state) {
      moveTo(state.left ? 'track' : 'home');
      const name = poseFor(state);
      poser = advanceAbsentPoser(
        switchAbsentPose(poser, name, name === 'slumped' || name === 'seated' ? seat : {}),
        dt,
      );
      rig.setPose(currentAbsentPose(poser));
      running = state.loopCut ? Math.max(0, running - dt / STOP_SECONDS) : 1;
      const ease = running * running * (3 - 2 * running);
      rings.forEach((ring, k) => ring?.rotateZ((CAMARA_RINGS[k]?.speed ?? 0) * ease * dt));
      for (const light of lights) if (light) light.visible = !state.loopCut;
      if (glow) glow.value = GLOW_WITHOUT_SOURCE + (1 - GLOW_WITHOUT_SOURCE) * ease;
    },
    reset() {
      poser = createAbsentPoser('esceptico', 'slumped', seat);
      running = 1;
      moveTo('home');
      for (const light of lights) if (light) light.visible = true;
      if (glow) glow.value = 1;
      rig.setPose(currentAbsentPose(poser));
    },
    snapshot() {
      return { pose: poser.name, at, spin: running, glow: glow?.value ?? 1 };
    },
  };
}

/** El brillo de la fuente en el material de la casa (lo comparten la casa y los anillos). */
function findGlow(world: Object3D): IUniform<number> | undefined {
  let found: IUniform<number> | undefined;
  world.traverse((node) => {
    const material = (node as { material?: { userData?: Record<string, unknown> } }).material;
    const glow = material?.userData?.[CENTRO_GLOW_KEY] as IUniform<number> | undefined;
    if (!found && glow) found = glow;
  });
  return found;
}
