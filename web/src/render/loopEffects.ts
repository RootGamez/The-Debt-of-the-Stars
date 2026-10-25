// Efectos PROVISIONALES de la cronología (el arte final llega en las Fases 6 y 8):
//   senales        anillos de luz que se curvan en el cielo (5:00)
//   pulso_cicatriz destello rojo y temblor de cámara (9:00)
//   cielo_rojo     el cielo se tiñe de rojo
//   agujero_negro  esfera negra con halo que crece (13:30)
//   absorción      el cielo y la Brasa se apagan mientras el mundo es absorbido
import {
  AdditiveBlending,
  Color,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type DirectionalLight,
  type Scene,
} from 'three';
import type { TimelineEvent } from '../core/timeline';

const SKY = new Color(0x07070c);
const RED_SKY = new Color(0x2a0907);
const PULSE = new Color(0x6a1408);
const BLACK_HOLE_DIRECTION = new Vector3(-0.6, 0.35, -0.72).normalize();
const SKY_DISTANCE = 2600;
const BLACK_HOLE_MAX_RADIUS = 420;
const RING_COUNT = 4;
const SHAKE_METERS = 0.06;

export interface LoopEffects {
  /** Ajusta todos los efectos al instante `t` con los eventos en curso. */
  update(t: number, active: readonly TimelineEvent[], absorption: number, dt: number): void;
  /** Desplazamiento de cámara del temblor (se suma a la posición de los ojos). */
  readonly shake: Vector3;
  dispose(): void;
}

function progressOf(active: readonly TimelineEvent[], id: string, t: number): number | undefined {
  const event = active.find((e) => e.id === id);
  if (!event) return undefined;
  return event.duration > 0 ? Math.min(1, Math.max(0, (t - event.t) / event.duration)) : 1;
}

export function createLoopEffects(scene: Scene, sun: DirectionalLight): LoopEffects {
  const background = new Color().copy(SKY);
  scene.background = background;
  const sunIntensity = sun.intensity;

  const rings: Mesh[] = [];
  for (let i = 0; i < RING_COUNT; i++) {
    const ring = new Mesh(
      new TorusGeometry(260 + i * 140, 6, 6, 96),
      new MeshBasicMaterial({
        color: 0xffd9a0,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.position.copy(BLACK_HOLE_DIRECTION).multiplyScalar(SKY_DISTANCE);
    ring.lookAt(0, 0, 0);
    ring.rotateX(0.35 * i);
    ring.visible = false;
    rings.push(ring);
    scene.add(ring);
  }

  const hole = new Mesh(new SphereGeometry(1, 32, 16), new MeshBasicMaterial({ color: 0x000000 }));
  const halo = new Mesh(
    new SphereGeometry(1.35, 32, 16),
    new MeshBasicMaterial({
      color: 0xff8a3a,
      transparent: true,
      opacity: 0.35,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  for (const m of [hole, halo]) {
    m.position.copy(BLACK_HOLE_DIRECTION).multiplyScalar(SKY_DISTANCE);
    m.visible = false;
    scene.add(m);
  }

  const shake = new Vector3();
  let elapsed = 0;

  return {
    shake,
    update(t, active, absorption, dt) {
      elapsed += dt;
      const signals = progressOf(active, 'senales', t);
      rings.forEach((ring, i) => {
        ring.visible = signals !== undefined;
        if (!ring.visible) return;
        const material = ring.material as MeshBasicMaterial;
        material.opacity =
          0.25 * Math.min(1, (signals ?? 0) * 6) * (0.6 + 0.4 * Math.sin(elapsed * 0.8 + i));
        ring.rotateZ(dt * 0.02 * (i % 2 === 0 ? 1 : -1));
      });

      background.copy(SKY);
      const red = progressOf(active, 'cielo_rojo', t);
      if (red !== undefined) background.lerp(RED_SKY, Math.min(1, red * 4));
      const pulse = progressOf(active, 'pulso_cicatriz', t);
      if (pulse !== undefined) {
        const strength = Math.sin(pulse * Math.PI);
        background.lerp(PULSE, strength);
        shake
          .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .multiplyScalar(SHAKE_METERS * 2 * strength);
      } else {
        shake.set(0, 0, 0);
      }

      const growth = progressOf(active, 'agujero_negro', t);
      const radius = growth === undefined ? 0 : BLACK_HOLE_MAX_RADIUS * Math.max(0.05, growth);
      hole.visible = halo.visible = growth !== undefined;
      hole.scale.setScalar(radius);
      halo.scale.setScalar(radius);

      background.multiplyScalar(1 - absorption);
      sun.intensity = sunIntensity * (1 - 0.9 * absorption);
    },
    dispose() {
      for (const m of [...rings, hole, halo]) {
        scene.remove(m);
        m.geometry.dispose();
        (m.material as MeshBasicMaterial).dispose();
      }
      sun.intensity = sunIntensity;
    },
  };
}
