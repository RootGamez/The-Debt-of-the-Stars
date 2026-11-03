// Lo que pasa en el agua al tocarla (Fase 11E; reutilizable en cualquier mundo con mar): gotas que saltan al
// caer, ondas que se abren en la superficie y la siguen al moverse las olas, y burbujas que suben hasta romper
// arriba. Todo va en el marco del mundo de referencia (el de la escena) y se mueve en la CPU con pocas piezas.
import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import { isWet, surfacePoint, type WaterBody } from '../physics/water';

/** Cuántas gotas y burbujas y cuántas ondas a la vez como mucho. */
const MAX_PARTICLES = 480;
const MAX_RIPPLES = 28;
/** Gravedad de las gotas (m/s², hacia el centro) y lo que suben las burbujas (m/s). */
const DROP_GRAVITY = 12;
const BUBBLE_RISE = 1.3;
/** Altura sobre la superficie a la que se dibujan las ondas (m), para no pelear con el agua. */
const RIPPLE_LIFT = 0.05;

const VERTEX = /* glsl */ `
attribute float aAlpha;
attribute float aSize;
varying float vAlpha;
void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vAlpha = aAlpha;
  gl_PointSize = aSize * 700.0 / max(-view.z, 0.3);
  gl_Position = projectionMatrix * view;
}`;

const FRAGMENT = /* glsl */ `
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  // Una gota o una burbuja: borde claro y centro algo más tenue.
  float round = 1.0 - smoothstep(0.32, 0.5, d);
  float ring = 0.55 + 0.45 * smoothstep(0.1, 0.4, d);
  if (round * vAlpha < 0.01) discard;
  gl_FragColor = vec4(vec3(0.9, 0.97, 1.0), round * ring * vAlpha);
  #include <colorspace_fragment>
}`;

export interface WaterEffects {
  /** Lo que hay que añadir a la escena. */
  readonly object: Group;
  /** Gotas que saltan desde `at` (en la superficie), con fuerza 0–1.5 (caer de un salto ≈ 1). */
  splash(at: Vector3, up: Vector3, strength: number): void;
  /** Una onda que se abre en la superficie hasta `size` metros. */
  ripple(at: Vector3, up: Vector3, size: number): void;
  /** Burbujas que suben desde `at` (bajo el agua). */
  bubbles(at: Vector3, up: Vector3, count: number): void;
  /** Una vez por fotograma, con el mar del mundo donde ocurren (las ondas siguen a las olas). */
  update(dt: number, water: WaterBody | undefined): void;
  clear(): void;
  snapshot(): { particles: number; ripples: number };
  dispose(): void;
}

interface Ripple {
  mesh: Mesh<RingGeometry, MeshBasicMaterial>;
  at: Vector3;
  up: Vector3;
  size: number;
  age: number;
  life: number;
}

const zAxis = new Vector3(0, 0, 1);
const turn = new Quaternion();
const point = new Vector3();
const side = new Vector3();

export function createWaterEffects(random: () => number = Math.random): WaterEffects {
  const object = new Group();
  object.name = 'EfectosAgua';

  const positions = new Float32Array(MAX_PARTICLES * 3);
  const alphas = new Float32Array(MAX_PARTICLES);
  const sizes = new Float32Array(MAX_PARTICLES);
  const velocity = Array.from({ length: MAX_PARTICLES }, () => new Vector3());
  const ups = Array.from({ length: MAX_PARTICLES }, () => new Vector3());
  const age = new Float32Array(MAX_PARTICLES);
  const life = new Float32Array(MAX_PARTICLES);
  /** 0 = libre, 1 = gota, 2 = burbuja. */
  const kind = new Uint8Array(MAX_PARTICLES);
  let next = 0;
  let alive = 0;

  const geometry = new BufferGeometry();
  // BufferAttribute usa el mismo arreglo (Float32BufferAttribute lo copiaría): se escribe en él cada fotograma.
  const positionAttribute = new BufferAttribute(positions, 3);
  const alphaAttribute = new BufferAttribute(alphas, 1);
  const sizeAttribute = new BufferAttribute(sizes, 1);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('aAlpha', alphaAttribute);
  geometry.setAttribute('aSize', sizeAttribute);
  const particles = new Points(
    geometry,
    new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  particles.name = 'EfectosAgua_Gotas';
  particles.frustumCulled = false;
  particles.renderOrder = 2;
  object.add(particles);

  const ringGeometry = new RingGeometry(0.82, 1, 40);
  const ripples: Ripple[] = Array.from({ length: MAX_RIPPLES }, () => {
    const mesh = new Mesh(
      ringGeometry,
      new MeshBasicMaterial({
        color: 0xf2fbff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    mesh.visible = false;
    mesh.renderOrder = 2;
    object.add(mesh);
    return { mesh, at: new Vector3(), up: new Vector3(), size: 1, age: 0, life: 0 };
  });

  const spawn = (
    at: Vector3,
    up: Vector3,
    what: 1 | 2,
    speed: Vector3,
    size: number,
    span: number,
  ) => {
    const i = next;
    next = (next + 1) % MAX_PARTICLES;
    if (kind[i] === 0) alive++;
    kind[i] = what;
    positions[i * 3] = at.x;
    positions[i * 3 + 1] = at.y;
    positions[i * 3 + 2] = at.z;
    velocity[i]?.copy(speed);
    ups[i]?.copy(up);
    sizes[i] = size;
    age[i] = 0;
    life[i] = span;
    alphas[i] = 1;
  };

  const tangent = (up: Vector3): Vector3 => {
    side.set(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1);
    return side.addScaledVector(up, -side.dot(up)).normalize();
  };

  const kill = (i: number) => {
    kind[i] = 0;
    alphas[i] = 0;
    alive--;
  };

  return {
    object,
    splash(at, up, strength) {
      const s = Math.max(0, Math.min(1.5, strength));
      const count = Math.round(10 + 50 * s);
      const speed = new Vector3();
      for (let n = 0; n < count; n++) {
        const out = tangent(up);
        const rise = 1.5 + (2 + random() * 3.5) * s;
        speed
          .copy(out)
          .multiplyScalar((0.6 + random() * 2.2) * (0.4 + s))
          .addScaledVector(up, rise);
        spawn(at, up, 1, speed, 0.025 + random() * 0.05, 2);
      }
      this.ripple(at, up, 1.2 + 2.2 * s);
      if (s > 0.5) this.ripple(at, up, 0.7 + 1.2 * s);
    },
    ripple(at, up, size) {
      // Una onda libre o, si no queda ninguna, la que está más cerca de acabar.
      const progress = (r: Ripple): number => (r.life === 0 ? Infinity : r.age / r.life);
      const free = ripples.reduce((best, r) => (progress(r) > progress(best) ? r : best));
      free.at.copy(at);
      free.up.copy(up).normalize();
      free.size = size;
      free.age = 0;
      free.life = 1.1 + size * 0.35;
      free.mesh.visible = true;
      free.mesh.quaternion.copy(turn.setFromUnitVectors(zAxis, free.up));
    },
    bubbles(at, up, count) {
      const speed = new Vector3();
      for (let n = 0; n < count; n++) {
        const offset = tangent(up).multiplyScalar(random() * 0.15);
        point.copy(at).add(offset);
        speed.copy(up).multiplyScalar(BUBBLE_RISE * (0.7 + random() * 0.6));
        spawn(point, up, 2, speed, 0.03 + random() * 0.05, 12);
      }
    },
    update(dt, water) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (kind[i] === 0) continue;
        const v = velocity[i];
        const up = ups[i];
        if (!v || !up) continue;
        age[i] = (age[i] ?? 0) + dt;
        point.set(positions[i * 3] ?? 0, positions[i * 3 + 1] ?? 0, positions[i * 3 + 2] ?? 0);
        if (kind[i] === 1) {
          v.addScaledVector(up, -DROP_GRAVITY * dt);
        } else {
          // Las burbujas se mecen al subir.
          v.addScaledVector(tangent(up), 0.6 * dt);
        }
        point.addScaledVector(v, dt);
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
        const t = (age[i] ?? 0) / (life[i] ?? 1);
        alphas[i] = Math.max(0, 1 - t * t);
        const falling = kind[i] === 1 && v.dot(up) < 0;
        const inWater = water !== undefined && isWet(point, water);
        if (t >= 1) {
          kill(i);
        } else if (falling && inWater) {
          // La gota vuelve al agua; las más grandes dejan una onda pequeña.
          if ((sizes[i] ?? 0) > 0.06) this.ripple(surfacePoint(point, water, side), up, 0.35);
          kill(i);
        } else if (kind[i] === 2 && water !== undefined && !inWater) {
          // La burbuja rompe al llegar arriba (o al tubo seco).
          kill(i);
        }
      }
      positionAttribute.needsUpdate = true;
      alphaAttribute.needsUpdate = true;
      sizeAttribute.needsUpdate = true;

      for (const r of ripples) {
        if (r.life === 0) continue;
        r.age += dt;
        const t = r.age / r.life;
        if (t >= 1) {
          r.life = 0;
          r.mesh.visible = false;
          continue;
        }
        if (water) surfacePoint(r.at, water, r.mesh.position);
        else r.mesh.position.copy(r.at);
        r.mesh.position.addScaledVector(r.up, RIPPLE_LIFT);
        const grow = 1 - (1 - t) * (1 - t);
        r.mesh.scale.setScalar(r.size * (0.2 + 0.8 * grow));
        r.mesh.material.opacity = 0.5 * (1 - t) * (1 - t);
      }
    },
    clear() {
      for (let i = 0; i < MAX_PARTICLES; i++) if (kind[i] !== 0) kill(i);
      alphaAttribute.needsUpdate = true;
      for (const r of ripples) {
        r.life = 0;
        r.mesh.visible = false;
      }
    },
    snapshot() {
      return { particles: alive, ripples: ripples.filter((r) => r.life > 0).length };
    },
    dispose() {
      object.removeFromParent();
      geometry.dispose();
      particles.material.dispose();
      ringGeometry.dispose();
      for (const r of ripples) r.mesh.material.dispose();
    },
  };
}
