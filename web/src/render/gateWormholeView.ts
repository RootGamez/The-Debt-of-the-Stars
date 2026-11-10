// Los agujeros de gusano estables de las Puertas plegadas (plan de historia y puzzles físicos, T11): en el aro de cada
// Puerta abierta, un velo en espiral de luz con un corazón brillante, hecho con el mismo lenguaje de luz que el
// gusano de la Luna (anillo cálido, velo aditivo). El aro de piedra y sus postes son la miniestructura que lo
// contiene; cruzarlo teletransporta (worlds/gates.ts). Qué se aplica a la pantalla al acercarse está en
// game/gateWormhole.ts.
import {
  AdditiveBlending,
  CircleGeometry,
  Group,
  Mesh,
  Quaternion,
  ShaderMaterial,
  TorusGeometry,
  MeshBasicMaterial,
  Vector3,
} from 'three';
import { proximity } from '../game/gateWormhole';
import type { Gate } from '../worlds/gates';
import type { WorldRuntime } from '../worlds/worldRuntime';

/** A qué altura sobre el pie del anillo está su centro (m) y lo que mide el hueco (m). */
const RING_CENTER = 1.75;
const OPENING = 1.38;

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy / ${OPENING.toFixed(2)};
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uGlow;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float a = atan(vUv.y, vUv.x);
  // Espiral que cae hacia el centro, como un túnel de luz.
  float swirl = 0.5 + 0.5 * sin(9.0 * r - 3.2 * uTime + 2.0 * a);
  float swirl2 = 0.5 + 0.5 * sin(5.0 * r + 2.1 * uTime - 3.0 * a);
  float tunnel = mix(swirl, swirl2, 0.4);
  float core = pow(1.0 - r, 2.2);
  float rim = smoothstep(0.78, 1.0, r) * (1.0 - smoothstep(0.96, 1.0, r));
  vec3 warm = vec3(1.0, 0.86, 0.62);
  vec3 cold = vec3(0.55, 0.78, 1.0);
  vec3 color = mix(cold, warm, core) * (0.25 + 0.75 * tunnel) + warm * rim * 0.9 + vec3(1.0) * core * core;
  float alpha = clamp((0.35 + 0.65 * tunnel) * (0.5 + core) + rim, 0.0, 1.0) * uGlow;
  gl_FragColor = vec4(color, alpha);
}`;

interface GateEntry {
  gate: Gate;
  root: Group;
  time: { value: number };
  material: ShaderMaterial;
  center: Vector3;
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
  const ringMaterial = new MeshBasicMaterial({
    color: 0xfff0d0,
    transparent: true,
    opacity: 0.85,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const forward = new Vector3(0, 0, 1);
  const rotation = new Quaternion();
  for (const runtime of runtimes) {
    for (const gate of runtime.gates) {
      const root = new Group();
      root.name = `GusanoEstable_${gate.name}`;
      root.position.copy(gate.position).addScaledVector(gate.up, RING_CENTER);
      // El plano del velo es perpendicular a hacia dónde mira el anillo.
      rotation.setFromUnitVectors(forward, gate.forward);
      root.quaternion.copy(rotation);
      const time = { value: 0 };
      const material = new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: { uTime: time, uGlow: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: 2,
      });
      const veil = new Mesh(new CircleGeometry(OPENING, 48), material);
      const halo = new Mesh(new TorusGeometry(OPENING + 0.04, 0.035, 8, 56), ringMaterial);
      root.add(veil, halo);
      runtime.world.scene.add(root);
      entries.push({ gate, root, time, material, center: new Vector3() });
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
        entry.root.visible = open;
        if (!open) continue;
        entry.time.value = time;
        entry.root.getWorldPosition(world);
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
      for (const { root, material } of entries) {
        root.removeFromParent();
        material.dispose();
      }
      ringMaterial.dispose();
    },
  };
}
