// La apertura del gusano junto al fragmento de la Luna (Fase 9E, 🟡): un anillo de luz que se abre delante del
// fragmento, siempre de cara a quien mira, con un velo de luz dentro. Da a la lente del cielo un "peso" que crece
// (las estrellas se doblan alrededor) y cuánto se estira la vista. Los tiempos y tamaños, en game/wormhole.ts.
import {
  AdditiveBlending,
  BufferAttribute,
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
  Vector3,
  type Scene,
} from 'three';
import { lensRadius, ringRadius, viewStretch, wormholeProgress } from '../game/wormhole';

const RING_COLOR = 0xfff0d0;
const VEIL_COLOR = 0xffe2b0;
/** Brillo del velo en el borde (en el centro, 1): luz al fondo del túnel. */
const VEIL_RIM = 0.25;
/** Opacidad del velo abierto del todo: casi blanco justo antes del fundido. */
const VEIL_OPACITY = 0.7;

/** Un disco que brilla más en el centro que en el borde (CircleGeometry pone el centro primero). */
function glowDisc(radius: number, segments: number): CircleGeometry {
  const geometry = new CircleGeometry(radius, segments);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3).fill(VEIL_RIM);
  colors.fill(1, 0, 3);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

export interface WormholeView {
  /** Abre el gusano en `center` (en la escena). */
  start(center: Vector3): void;
  /** `dt`: segundos de juego (0 en pausa); `eye`: dónde está quien mira. */
  update(dt: number, eye: Vector3): void;
  /** Ya se ha abierto (y sigue abierto hasta que el fundido se lleva al jugador). */
  readonly active: boolean;
  /** Avance de la apertura (0–1); a 1 ha terminado. */
  readonly progress: number;
  /** Cuánto se ensancha la vista ahora (fracción). */
  readonly stretch: number;
  /** Lo que la lente del cielo debe doblar, si está abierto. */
  lens(): { position: Vector3; radius: number } | undefined;
  dispose(): void;
}

export function createWormholeView(scene: Scene): WormholeView {
  const root = new Group();
  root.name = 'Gusano';
  root.visible = false;
  const ringMaterial = new MeshBasicMaterial({
    color: RING_COLOR,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const ring = new Mesh(new TorusGeometry(1, 0.06, 10, 64), ringMaterial);
  const inner = new Mesh(new TorusGeometry(0.82, 0.02, 6, 64), ringMaterial);
  const veilMaterial = new MeshBasicMaterial({
    color: VEIL_COLOR,
    transparent: true,
    opacity: 0,
    vertexColors: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const veil = new Mesh(glowDisc(0.95, 48), veilMaterial);
  root.add(ring, inner, veil);
  scene.add(root);
  const lensOut = { position: new Vector3(), radius: 0 };
  let elapsed = 0;
  let active = false;
  let progress = 0;

  return {
    start(center) {
      if (active) return;
      active = true;
      elapsed = 0;
      root.position.copy(center);
      root.visible = true;
    },
    update(dt, eye) {
      if (!active) return;
      elapsed += dt;
      progress = wormholeProgress(elapsed);
      root.scale.setScalar(Math.max(1e-3, ringRadius(progress)));
      root.lookAt(eye); // siempre de cara
      ringMaterial.opacity = Math.min(1, progress * 4);
      veilMaterial.opacity = VEIL_OPACITY * progress * progress;
    },
    get active() {
      return active;
    },
    get progress() {
      return progress;
    },
    get stretch() {
      return active ? viewStretch(progress) : 0;
    },
    lens() {
      if (!active) return undefined;
      lensOut.position.copy(root.position);
      lensOut.radius = lensRadius(progress);
      return lensOut.radius > 0 ? lensOut : undefined;
    },
    dispose() {
      scene.remove(root);
      ring.geometry.dispose();
      inner.geometry.dispose();
      veil.geometry.dispose();
      ringMaterial.dispose();
      veilMaterial.dispose();
    },
  };
}
