// Rombos suaves sobre las fuentes que aún tienen algo que dar (provisional hasta el arte de la Fase 6).
// Se ven a menos de VISIBLE_DISTANCE metros y se apagan cuando ya no hay nada nuevo que aprender
// allí (ni se abrió en esta sesión).
import { Group, Mesh, MeshBasicMaterial, OctahedronGeometry, Vector3, type Scene } from 'three';
import type { Interactable } from '../registry/interaction';

const VISIBLE_DISTANCE = 30;
const HOVER_METERS = 0.35;
const BOB_METERS = 0.06;

export interface SourceMarkers {
  /** `wanted(id)` dice si esa fuente aún merece un rombo. */
  update(timeSeconds: number, viewer: Vector3, wanted: (id: string) => boolean): void;
  dispose(): void;
}

export function createSourceMarkers(
  scene: Scene,
  sources: readonly Interactable[],
  planetCenter: Vector3,
): SourceMarkers {
  const group = new Group();
  group.name = 'Rombos de fuentes';
  const geometry = new OctahedronGeometry(0.14);
  const material = new MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.9 });
  const entries = sources.map((source) => {
    const up = source.position.clone().sub(planetCenter).normalize();
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
    dispose() {
      scene.remove(group);
      geometry.dispose();
      material.dispose();
    },
  };
}
