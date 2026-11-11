// Colisiones reales con three-mesh-bvh: une las mallas COL_ en una sola geometría en coordenadas
// del mundo, construye el árbol una vez al cargar y saca la cápsula de los triángulos que toca.
// Basado en el ejemplo "characterMovement" de three-mesh-bvh.
// Nota para la Fase 5: hoy los mundos están quietos; si se mueven, transformar la cápsula al espacio
// local del mundo antes de resolver.
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Line3,
  Ray,
  Vector3,
  type Mesh,
} from 'three';
import { ExtendedTriangle, MeshBVH } from 'three-mesh-bvh';
import { WorldDataError } from '../worlds/markers';
import {
  clearContact,
  considerFloor,
  type Capsule,
  type CollisionWorld,
  type Contact,
  type RaycastWorld,
} from './collisionWorld';

/** Un impacto de rayo: a qué distancia, dónde y hacia dónde mira la superficie (hacia quien lanzó el rayo). */
export interface RayHit {
  distance: number;
  point: Vector3;
  normal: Vector3;
}

export type BvhWorld = CollisionWorld &
  RaycastWorld & {
    /** Como `raycast`, pero con el punto y la normal de la superficie. Los vectores son nuevos en cada llamada. */
    raycastHit(origin: Vector3, direction: Vector3, maxDistance: number): RayHit | null;
  };

const segment = new Line3();
const bounds = new Box3();
const trianglePoint = new Vector3();
const capsulePoint = new Vector3();
const push = new Vector3();
const middle = new Vector3();
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

/**
 * Dirección en la que un triángulo empuja a la cápsula. Si el eje de la cápsula lo atraviesa
 * (distancia 0), la normal del triángulo tiene un signo arbitrario (depende del orden de los
 * vértices): se orienta hacia el lado donde está el centro de la cápsula.
 */
function pushDirection(triangle: ExtendedTriangle, distance: number, target: Vector3): Vector3 {
  if (distance > 1e-6) return target.subVectors(capsulePoint, trianglePoint).normalize();
  triangle.getNormal(target);
  segment.getCenter(middle).sub(trianglePoint);
  return middle.dot(target) < 0 ? target.negate() : target;
}

export function createBvhWorld(colliders: readonly Mesh[]): BvhWorld {
  if (colliders.length === 0) {
    throw new WorldDataError('El mundo no tiene mallas de colisión (COL_)');
  }
  const bvh = new MeshBVH(mergeInWorldSpace(colliders));

  // Estado de la llamada en curso; las funciones de recorrido se crean una sola vez.
  let radius = 0;
  let up: Vector3 = new Vector3(0, 1, 0);
  let result: Contact | undefined;

  const intersectsBounds = (box: Box3): boolean => box.intersectsBox(bounds);
  const intersectsTriangle = (triangle: ExtendedTriangle): boolean => {
    const distance = triangle.closestPointToSegment(segment, trianglePoint, capsulePoint);
    if (distance >= radius || !result) return false;
    pushDirection(triangle, distance, push);
    const depth = radius - distance;
    segment.start.addScaledVector(push, depth);
    segment.end.addScaledVector(push, depth);
    considerFloor(result, push, up);
    return false;
  };

  return {
    resolve(capsule: Capsule, upDirection: Vector3, contact: Contact): boolean {
      clearContact(contact);
      segment.start.copy(capsule.start);
      segment.end.copy(capsule.end);
      bounds.makeEmpty().expandByPoint(segment.start).expandByPoint(segment.end);
      bounds.min.addScalar(-capsule.radius);
      bounds.max.addScalar(capsule.radius);
      radius = capsule.radius;
      up = upDirection;
      result = contact;

      // El aviso de obsoleto viene de los tipos genéricos de BVH; en MeshBVH este callback es el
      // previsto (ver la sobrecarga de MeshBVH.shapecast en three-mesh-bvh/src/index.d.ts).
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      bvh.shapecast({ intersectsBounds, intersectsTriangle });
      result = undefined;

      contact.correction.subVectors(segment.start, capsule.start);
      if (contact.floorDot === -Infinity) {
        contact.correction.set(0, 0, 0);
        return false;
      }
      return true;
    },

    raycast(origin: Vector3, direction: Vector3, maxDistance: number): number | null {
      ray.origin.copy(origin);
      ray.direction.copy(direction);
      // Ambas caras: la colisión de la cápsula tampoco depende del orden de los vértices.
      const hit = bvh.raycastFirst(ray, DoubleSide, 0, maxDistance);
      return hit ? hit.distance : null;
    },

    raycastHit(origin: Vector3, direction: Vector3, maxDistance: number): RayHit | null {
      ray.origin.copy(origin);
      ray.direction.copy(direction);
      const hit = bvh.raycastFirst(ray, DoubleSide, 0, maxDistance);
      if (!hit?.face) return null;
      // La malla está unida en coordenadas del mundo: la normal de la cara ya está en ese marco.
      const normal = hit.face.normal.clone().normalize();
      if (normal.dot(direction) > 0) normal.negate();
      return { distance: hit.distance, point: hit.point.clone(), normal };
    },
  };
}
