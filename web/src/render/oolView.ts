// Los Ool del mundo (Fase 9C): respiran (suben y bajan un poco), sus filamentos laten y, si te acercas, se giran
// despacio hacia ti sin dejar del todo lo que estaban mirando. Los modelos vienen en el .glb del mundo como objetos
// OOL_<quién> (worlds/markers.ts), con lo que brilla en un hijo aparte.
import { MeshStandardMaterial, Quaternion, Vector3, type Mesh, type Object3D } from 'three';

/** Cuánto suben y bajan al respirar, y cada cuánto (rad/s). */
const BREATH = 0.025;
const BREATH_RATE = 1.6;
/** El latido de la luz de los filamentos. */
const GLOW_RATE = 2.1;
const GLOW_DEPTH = 0.3;
/** Desde qué distancia (m) se giran hacia ti, cuánto como mucho (rad) y lo deprisa que lo hacen (1/s). */
const NOTICE_RANGE = 4.5;
const MAX_TURN = 1.1;
const TURN_RATE = 2.5;

export interface OolCharacter {
  id: string;
  object: Object3D;
  /** La malla de lo que brilla (filamentos y motas), si la tiene. */
  glow: Mesh | undefined;
}

export interface OolView {
  /** `viewer`: dónde está quien mira (en la escena), o `undefined` si no está en este mundo. */
  update(time: number, dt: number, viewer: Vector3 | undefined): void;
  /** Quiénes hay y hacia dónde se han girado (rad), para depurar. */
  snapshot(): Record<string, number>;
  dispose(): void;
}

interface Living {
  character: OolCharacter;
  rest: Quaternion;
  baseScale: number;
  phase: number;
  turn: number;
  material: MeshStandardMaterial | undefined;
  baseGlow: number;
}

const UP = new Vector3(0, 1, 0);
const local = new Vector3();
const spin = new Quaternion();

export function createOolView(
  characters: readonly OolCharacter[],
  reducedMotion: boolean,
): OolView {
  const living: Living[] = characters.map((character, k) => {
    // Cada uno con su propia luz, para que no laten todos a la vez.
    const original = character.glow?.material;
    const material = original instanceof MeshStandardMaterial ? original.clone() : undefined;
    if (character.glow && material) character.glow.material = material;
    return {
      character,
      rest: character.object.quaternion.clone(),
      baseScale: character.object.scale.y,
      phase: k * 1.7,
      turn: 0,
      material,
      baseGlow: material?.emissiveIntensity ?? 1,
    };
  });

  function wantedTurn(being: Living, viewer: Vector3 | undefined): number {
    const { object } = being.character;
    if (!viewer || !object.parent) return 0;
    // Dónde está quien mira, en el marco de reposo del Ool (su frente es −Z en el modelo).
    object.parent.worldToLocal(local.copy(viewer));
    local.sub(object.position).applyQuaternion(spin.copy(being.rest).invert());
    if (Math.hypot(local.x, local.z) > NOTICE_RANGE) return 0;
    const angle = Math.atan2(-local.x, -local.z);
    return Math.max(-MAX_TURN, Math.min(MAX_TURN, angle));
  }

  return {
    update(time, dt, viewer) {
      for (const being of living) {
        const { object } = being.character;
        if (!reducedMotion) {
          object.scale.y =
            being.baseScale * (1 + BREATH * Math.sin(time * BREATH_RATE + being.phase));
        }
        const target = wantedTurn(being, viewer);
        being.turn += (target - being.turn) * Math.min(1, TURN_RATE * dt);
        object.quaternion.copy(being.rest).multiply(spin.setFromAxisAngle(UP, being.turn));
        if (being.material) {
          const pulse = reducedMotion ? 0 : Math.sin(time * GLOW_RATE + being.phase);
          being.material.emissiveIntensity = being.baseGlow * (1 + GLOW_DEPTH * pulse);
        }
      }
    },
    snapshot() {
      return Object.fromEntries(living.map((being) => [being.character.id, being.turn]));
    },
    dispose() {
      for (const being of living) being.material?.dispose();
    },
  };
}
