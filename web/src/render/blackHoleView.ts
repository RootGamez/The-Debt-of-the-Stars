// El agujero negro en la escena (Fase 8A): un horizonte negro, el anillo de luz que lo rodea (siempre de cara a
// quien mira) y un disco que brilla y gira. Cuelga del mundo donde nace (Cicatriz, en la Sala del Motor), así que
// viaja con él por sus rieles. Su tamaño sale de system/blackHole.ts (con tests).
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  SphereGeometry,
  Vector3,
  type Camera,
  type Object3D,
} from 'three';
import { blackHoleRadius, diskRadii, photonRingRadius } from '../system/blackHole';

const RING_COLOR = 0xffe2b0;
const DISK_INNER = new Color(0xfff0d0);
const DISK_OUTER = new Color(0x7a1a08);
/** Vueltas del disco por segundo real y su inclinación (rad). */
const DISK_SPIN = 0.05;
const DISK_TILT = 1.15;

export interface BlackHoleView {
  update(t: number, camera: Camera, dt: number): void;
  snapshot(): { radius: number; visible: boolean };
  /** Dónde está en la escena y su radio, para la lente del cielo; `undefined` si aún no ha nacido. */
  lens(): { position: Vector3; radius: number } | undefined;
  dispose(): void;
}

/** Disco con color de dentro (blanco caliente) a fuera (rojo oscuro). */
function diskGeometry(): RingGeometry {
  const { inner, outer } = diskRadii(1);
  const geometry = new RingGeometry(inner, outer, 96, 4);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const color = new Color();
  for (let i = 0; i < position.count; i++) {
    const r = Math.hypot(position.getX(i), position.getY(i));
    color.copy(DISK_INNER).lerp(DISK_OUTER, (r - inner) / (outer - inner));
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

/**
 * @param world grupo del mundo donde nace (se mueve con él), o `undefined` si no está en este sistema.
 * @param anchor dónde nace, en el marco de ese mundo (la Sala del Motor).
 */
export function createBlackHoleView(
  world: Object3D | undefined,
  anchor: Vector3 | undefined,
): BlackHoleView {
  const root = new Group();
  root.name = 'Agujero negro';
  root.visible = false;
  if (anchor) root.position.copy(anchor);
  world?.add(root);

  const horizon = new Mesh(
    new SphereGeometry(1, 40, 20),
    new MeshBasicMaterial({ color: 0x000000 }),
  );
  const ring = new Mesh(
    new RingGeometry(0.93, 1.07, 96),
    new MeshBasicMaterial({
      color: RING_COLOR,
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  const disk = new Mesh(
    diskGeometry(),
    new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  disk.rotation.x = DISK_TILT;
  root.add(horizon, disk, ring);
  const cameraPosition = new Vector3();
  const lens = { position: new Vector3(), radius: 0 };
  let radius = 0;

  return {
    update(t, camera, dt) {
      radius = blackHoleRadius(t);
      root.visible = world !== undefined && radius > 0;
      if (!root.visible) return;
      horizon.scale.setScalar(radius);
      disk.scale.setScalar(radius);
      disk.rotateZ(DISK_SPIN * 2 * Math.PI * dt);
      ring.scale.setScalar(photonRingRadius(radius));
      ring.lookAt(camera.getWorldPosition(cameraPosition)); // el anillo de luz siempre de cara
    },
    snapshot() {
      return { radius, visible: root.visible };
    },
    lens() {
      if (!root.visible) return undefined;
      root.getWorldPosition(lens.position);
      lens.radius = radius;
      return lens;
    },
    dispose() {
      root.removeFromParent();
      for (const mesh of [horizon, ring, disk]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  };
}
