// Rombos suaves sobre las fuentes que aún tienen algo que dar (provisional hasta el arte de la Fase 6).
// Se ven a menos de VISIBLE_DISTANCE metros y se apagan cuando ya no hay nada nuevo que aprender
// allí (ni se abrió en esta sesión).
import { Group, Mesh, MeshBasicMaterial, OctahedronGeometry, Vector3, type Object3D } from 'three';
import type { Interactable } from '../registry/interaction';

const VISIBLE_DISTANCE = 30;
const HOVER_METERS = 0.35;
const BOB_METERS = 0.06;

export interface SourceMarkers {
  /** `wanted(id)` dice si esa fuente aún merece un rombo. */
  update(timeSeconds: number, viewer: Vector3, wanted: (id: string) => boolean): void;
  /** Esconde todos los rombos (el jugador está en otro mundo). */
  hide(): void;
  dispose(): void;
}

/** @param upAt "arriba" del suelo en cada punto (hacia el centro dentro de un mundo hueco). */
export function createSourceMarkers(
  scene: Object3D,
  sources: readonly Interactable[],
  upAt: (position: Vector3) => Vector3,
): SourceMarkers {
  const group = new Group();
  group.name = 'Rombos de fuentes';
  const geometry = new OctahedronGeometry(0.14);
  const material = new MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.9 });
  const entries = sources.map((source) => {
    const up = upAt(source.position);
    const mesh = new Mesh(geometry, material);
    mesh.position.copy(source.position).addScaledVector(up, HOVER_METERS);
    mesh.visible = false;
    group.add(mesh);
    return { id: source.id, mesh, up, base: mesh.position.clone() };
  });
  scene.add(group);
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    update(time, viewer, wanted) {
      for (const entry of entries) {
        const near = entry.base.distanceTo(viewer) < VISIBLE_DISTANCE;
        entry.mesh.visible = near && wanted(entry.id);
        if (!entry.mesh.visible) continue;
        if (still) continue; // "reducir movimiento": el rombo se queda quieto
        entry.mesh.position
          .copy(entry.base)
          .addScaledVector(entry.up, Math.sin(time * 2) * BOB_METERS);
        entry.mesh.rotation.y = time;
      }
    },
    hide() {
      for (const entry of entries) entry.mesh.visible = false;
    },
    dispose() {
      scene.remove(group);
      geometry.dispose();
      material.dispose();
    },
  };
}
