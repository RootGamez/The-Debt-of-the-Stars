// Los agujeros de gusano estables de las Puertas plegadas (plan de historia y puzzles físicos, T11): en el aro de cada
// Puerta abierta, una esfera de agujero de gusano (render/wormholeSphere.ts), como la del gusano de la Luna y la de la
// boca del cielo. El aro de piedra y sus postes son la miniestructura que la contiene; cruzarla teletransporta
// (worlds/gates.ts). Qué se aplica a la pantalla al acercarse está en game/gateWormhole.ts.
import { Group, Quaternion, Vector3 } from 'three';
import { proximity } from '../game/gateWormhole';
import type { Gate } from '../worlds/gates';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { createWormholeSphere } from './wormholeSphere';

/** A qué altura sobre el pie del anillo está su centro (m) y lo que mide el hueco (m). */
const RING_CENTER = 1.75;
const OPENING = 1.38;

interface GateEntry {
  gate: Gate;
  mesh: WormholeMesh;
  center: Vector3;
}

export interface WormholeMesh {
  /** Un grupo que se coloca y se escala desde fuera; la esfera de agujero de gusano va dentro, de `OPENING` m de radio. */
  root: Group;
  /** Segundos reales para el otro lado. */
  time: { value: number };
  dispose(): void;
}

/** El agujero de gusano estable de una Puerta o de la boca del cielo: una esfera de lente. */
export function createWormholeMesh(): WormholeMesh {
  const sphere = createWormholeSphere();
  sphere.root.scale.setScalar(OPENING);
  const root = new Group();
  root.add(sphere.root);
  return {
    root,
    time: sphere.time,
    dispose() {
      sphere.dispose();
      root.removeFromParent();
    },
  };
}

export interface GateWormholeSample {
  /** Cuánto afecta la boca más cercana abierta (0–1). */
  proximity: number;
  /** Dónde está esa boca (en la escena), si hay alguna cerca. */
  position: Vector3 | undefined;
}

export interface GateWormholeView {
  /** Una vez por fotograma: `eye` es dónde está quien mira (en la escena); `time`, segundos reales. */
  update(eye: Vector3, time: number): GateWormholeSample;
  /** Cuántas hay. */
  readonly count: number;
  dispose(): void;
}

/** Pone un velo de gusano en cada anillo de cada mundo; `isOpen` dice si la Puerta está abierta ahora. */
export function createGateWormholes(
  runtimes: Iterable<WorldRuntime>,
  isOpen: (gate: Gate) => boolean,
): GateWormholeView {
  const entries: GateEntry[] = [];
  const forward = new Vector3(0, 0, 1);
  const rotation = new Quaternion();
  for (const runtime of runtimes) {
    for (const gate of runtime.gates) {
      const mesh = createWormholeMesh();
      mesh.root.name = `GusanoEstable_${gate.name}`;
      mesh.root.position.copy(gate.position).addScaledVector(gate.up, RING_CENTER);
      // El plano del velo es perpendicular a hacia dónde mira el anillo.
      rotation.setFromUnitVectors(forward, gate.forward);
      mesh.root.quaternion.copy(rotation);
      runtime.world.scene.add(mesh.root);
      entries.push({ gate, mesh, center: new Vector3() });
    }
  }

  const sample: GateWormholeSample = { proximity: 0, position: undefined };
  const world = new Vector3();
  return {
    update(eye, time) {
      let best = 0;
      let bestPosition: Vector3 | undefined;
      for (const entry of entries) {
        const open = isOpen(entry.gate);
        entry.mesh.root.visible = open;
        if (!open) continue;
        entry.mesh.time.value = time;
        entry.mesh.root.getWorldPosition(world);
        const p = proximity(world.distanceTo(eye));
        if (p > best) {
          best = p;
          bestPosition = entry.center.copy(world);
        }
      }
      sample.proximity = best;
      sample.position = bestPosition;
      return sample;
    },
    get count() {
      return entries.length;
    },
    dispose() {
      for (const { mesh } of entries) mesh.dispose();
    },
  };
}
