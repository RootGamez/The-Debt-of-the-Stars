// Colisiones reales con three-mesh-bvh: une las mallas COL_ en una sola geometría en coordenadas
// del mundo, construye el árbol una vez al cargar y saca la cápsula de los triángulos que toca.
// Basado en el ejemplo "characterMovement" de three-mesh-bvh.
// Nota para la Fase 5: hoy los mundos están quietos; si se mueven, transformar la cápsula al espacio
// local del mundo antes de resolver.
import { Box3, BufferAttribute, BufferGeometry, Line3, Ray, Vector3, type Mesh } from 'three';
import { ExtendedTriangle, MeshBVH } from 'three-mesh-bvh';
import { WorldDataError } from '../worlds/markers';
import type { Capsule, CollisionWorld, RaycastWorld } from './collisionWorld';

export type BvhWorld = CollisionWorld & RaycastWorld;

const segment = new Line3();
const bounds = new Box3();
const trianglePoint = new Vector3();
const capsulePoint = new Vector3();
const push = new Vector3();
const ray = new Ray();

/** Copia las posiciones de las mallas a un Float32Array en coordenadas del mundo (sirve aunque
 * vengan cuantizadas por meshopt) y une los índices. */
function mergeInWorldSpace(meshes: readonly Mesh[]): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const vertex = new Vector3();
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    const position = mesh.geometry.getAttribute('position');
    const base = positions.length / 3;
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      positions.push(vertex.x, vertex.y, vertex.z);
    }
    const index = mesh.geometry.getIndex();
    const count = index ? index.count : position.count;
    for (let i = 0; i < count; i++) indices.push(base + (index ? index.getX(i) : i));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  return geometry;
}

export function createBvhWorld(colliders: readonly Mesh[]): BvhWorld {
  if (colliders.length === 0) {
    throw new WorldDataError('El mundo no tiene mallas de colisión (COL_)');
  }
  const bvh = new MeshBVH(mergeInWorldSpace(colliders));

  return {
    resolve(capsule: Capsule, correction: Vector3): boolean {
      segment.start.copy(capsule.start);
      segment.end.copy(capsule.end);
      bounds.makeEmpty().expandByPoint(segment.start).expandByPoint(segment.end);
      bounds.min.addScalar(-capsule.radius);
      bounds.max.addScalar(capsule.radius);

      bvh.shapecast({
        intersectsBounds: (box) => box.intersectsBox(bounds),
        intersectsTriangle: (triangle: ExtendedTriangle) => {
          const distance = triangle.closestPointToSegment(segment, trianglePoint, capsulePoint);
          if (distance >= capsule.radius) return false;
          if (distance > 1e-9) {
            push.subVectors(capsulePoint, trianglePoint).normalize();
          } else {
            triangle.getNormal(push); // el segmento toca el triángulo: salir por su normal
          }
          const depth = capsule.radius - distance;
          segment.start.addScaledVector(push, depth);
          segment.end.addScaledVector(push, depth);
          return false;
        },
      });

      correction.subVectors(segment.start, capsule.start);
      if (correction.lengthSq() < 1e-12) {
        correction.set(0, 0, 0);
        return false;
      }
      return true;
    },

    raycast(origin: Vector3, direction: Vector3, maxDistance: number): number | null {
      ray.origin.copy(origin);
      ray.direction.copy(direction);
      const hit = bvh.raycastFirst(ray, undefined, 0, maxDistance);
      return hit ? hit.distance : null;
    },
  };
}
