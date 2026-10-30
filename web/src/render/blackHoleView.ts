// El agujero negro en la escena (Fase 8A): un horizonte negro, el anillo de luz que lo rodea (siempre de cara a
// quien mira) y un disco que brilla y gira. Cuelga del mundo donde nace (Cicatriz, en la Sala del Motor), así que
// viaja con él por sus rieles. Su tamaño sale de system/blackHole.ts (con tests). Al final (Fase 8D), quien cae
// con su mundo lo ve acercarse hasta que el horizonte le llena el cielo (system/absorption.ts).
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
import { apparentDistance, skyFill } from '../system/absorption';
import { blackHoleRadius, diskRadii, photonRingRadius, type HoleGrowth } from '../system/blackHole';

const RING_COLOR = 0xffe2b0;
const DISK_INNER = new Color(0xfff4dc);
const DISK_MIDDLE = new Color(0xffa24a);
const DISK_OUTER = new Color(0xb0300c);
/** Vueltas del disco por segundo real y su inclinación (rad). */
const DISK_SPIN = 0.05;
const DISK_TILT = 1.15;

export interface BlackHoleView {
  /**
   * `approach`: cuánto ha caído hacia él quien mira (0–1, `finalApproach`); cuanto más, más cerca se dibuja.
   * `stable`: el Contrapeso está instalado (nace, pero no crece).
   */
  update(t: number, camera: Camera, dt: number, approach?: number, stable?: boolean): void;
  /** Radio (m), si se ve, su radio aparente desde quien mira (rad) y cuánto se ha acercado (0–1). */
  snapshot(): { radius: number; visible: boolean; span: number; approach: number };
  /** Cuánto ocupa en el cielo de quien mira (0–1, `skyFill`); 0 si aún no ha nacido. */
  readonly fill: number;
  /** Dónde está en la escena y su radio, para la lente del cielo; `undefined` si aún no ha nacido. */
  lens(): { position: Vector3; radius: number } | undefined;
  dispose(): void;
}

/**
 * Disco con color de dentro (blanco caliente) a fuera (rojo), que se desvanece hacia el borde. No se suma a lo
 * de detrás: tapa, para que se lea también contra el cielo rojo del final.
 */
function diskGeometry(): RingGeometry {
  const { inner, outer } = diskRadii(1);
  // Muchos anillos: al final el disco mide kilómetros y pasa cerca de los mundos; con pocos, su
  // transparencia se ve en dientes de sierra.
  const geometry = new RingGeometry(inner, outer, 128, 24);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 4);
  const color = new Color();
  for (let i = 0; i < position.count; i++) {
    const k = (Math.hypot(position.getX(i), position.getY(i)) - inner) / (outer - inner);
    if (k < 0.4) color.copy(DISK_INNER).lerp(DISK_MIDDLE, k / 0.4);
    else color.copy(DISK_MIDDLE).lerp(DISK_OUTER, (k - 0.4) / 0.6);
    colors.set([color.r, color.g, color.b, (1 - k) ** 2], i * 4);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 4));
  return geometry;
}

/**
 * @param world grupo del mundo donde nace (se mueve con él), o `undefined` si no está en este sistema.
 * @param anchor dónde nace, en el marco de ese mundo (la Sala del Motor).
 * @param growth cuándo nace y cuánto crece (de la cronología en uso, `growthFor`).
 */
export function createBlackHoleView(
  world: Object3D | undefined,
  anchor: Vector3 | undefined,
  growth?: HoleGrowth,
): BlackHoleView {
  const root = new Group();
  root.name = 'Agujero negro';
  root.visible = false;
  const home = anchor?.clone() ?? new Vector3();
  root.position.copy(home);
  world?.add(root);

  // Bastantes caras: al final llena medio cielo y con pocas se le ve el polígono en el borde. Por las dos
  // caras: dentro del horizonte (en Cicatriz, donde nace) todo lo de fuera queda negro.
  const horizon = new Mesh(
    new SphereGeometry(1, 64, 32),
    new MeshBasicMaterial({ color: 0x000000, side: DoubleSide }),
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
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  disk.rotation.x = DISK_TILT;
  root.add(horizon, disk, ring);
  const center = new Vector3();
  const eye = new Vector3();
  const toEye = new Vector3();
  const spot = new Vector3();
  const lens = { position: new Vector3(), radius: 0 };
  let radius = 0;
  let fill = 0;
  let approached = 0;

  return {
    update(t, camera, dt, approach = 0, stable = false) {
      radius = blackHoleRadius(t, growth, stable);
      approached = approach;
      root.visible = world !== undefined && radius > 0;
      if (!world || !root.visible) {
        fill = 0;
        return;
      }
      // Dónde está de verdad y desde dónde se mira; quien cae con su mundo lo ve más cerca, en la misma dirección.
      world.updateWorldMatrix(true, false);
      center.copy(home).applyMatrix4(world.matrixWorld);
      camera.getWorldPosition(eye);
      toEye.subVectors(eye, center);
      const distance = toEye.length();
      if (distance > 1e-6) toEye.divideScalar(distance);
      else toEye.set(0, 0, 1);
      const drawn = apparentDistance(distance, radius, approach);
      root.position.copy(world.worldToLocal(spot.copy(eye).addScaledVector(toEye, -drawn)));
      root.updateMatrixWorld();
      fill = skyFill(radius, drawn);

      horizon.scale.setScalar(radius);
      disk.scale.setScalar(radius);
      disk.rotateZ(DISK_SPIN * 2 * Math.PI * dt);
      // El anillo de luz rodea el borde del horizonte tal como se ve: ese borde queda algo más cerca de quien
      // mira que el centro y es más pequeño que el horizonte (de lejos apenas; de cerca, mucho). Dentro, centrado.
      const rim = fill < 1 ? fill : 0;
      ring.position.copy(
        root.worldToLocal(spot.copy(eye).addScaledVector(toEye, radius * rim - drawn)),
      );
      ring.scale.setScalar(photonRingRadius(radius) * Math.sqrt(1 - rim * rim));
      ring.lookAt(eye); // siempre de cara
    },
    get fill() {
      return fill;
    },
    snapshot() {
      return { radius, visible: root.visible, span: Math.asin(fill), approach: approached };
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
