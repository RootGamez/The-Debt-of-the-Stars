// La absorción de los mundos en pantalla (Fase 8C). Durante su ventana, cada mundo se estira hacia el agujero
// negro y cae en él (en el sombreador de sus materiales: las colisiones no cambian y el suelo bajo tus pies se
// queda quieto), suelta trozos que caen y, visto desde fuera, enrojece y se queda casi quieto. Tragado, su modelo
// se oculta (su pivote no: de él cuelga el agujero). Las cuentas están en system/absorption.ts (con tests); el
// sombreador repite la de `stretchedPoint`.
import {
  IcosahedronGeometry,
  InstancedMesh,
  MeshLambertMaterial,
  Object3D,
  Vector3,
  type Material,
  type Mesh,
} from 'three';
import { absorptionProgress, debrisTravel, frozenRate, STRETCH_SHAPE } from '../system/absorption';
import { isMesh } from '../worlds/markers';

/** Trozos que pueden estar cayendo a la vez (se reutilizan). */
const DEBRIS_POOL = 32;
/** Trozos por segundo real que suelta un mundo al final de su ventana. */
const DEBRIS_RATE = 6;
/** Segundos reales que tarda un trozo en llegar al agujero (de tanto a tanto). */
const DEBRIS_LIFE = [2.5, 4] as const;
/** Tamaño de un trozo (fracción del radio de su mundo). */
const DEBRIS_SIZE = 0.05;
const DEBRIS_COLOR = 0x8a7464;

export interface AbsorbingWorld {
  id: string;
  /** El modelo del mundo, con su centro en el origen. */
  model: Object3D;
  /** Radio del mundo (m). */
  radius: number;
  /** Su ventana de absorción (reloj de Umbral); `undefined` = nunca se lo traga. */
  window: readonly [number, number] | undefined;
}

export interface AbsorptionFrame {
  /** Reloj de Umbral. */
  t: number;
  /** El agujero negro en la escena, o `undefined` si aún no ha nacido. */
  hole: { position: Vector3; radius: number } | undefined;
  /** Mundo en cuyo marco estás: su suelo no se mueve bajo tus pies y no lo ves ni frenado ni rojo. */
  reference: string | undefined;
  /** Dónde está quien mira, en la escena. */
  viewer: Vector3;
  /** Segundos reales (0 en pausa). */
  dt: number;
}

export interface AbsorptionSnapshot {
  /** Avance de la absorción de cada mundo que se traga (0–1). */
  progress: Record<string, number>;
  /** Mundos ya tragados (su modelo no se ve). */
  swallowed: string[];
  /** Trozos cayendo ahora mismo. */
  debris: number;
}

export interface AbsorptionView {
  update(frame: AbsorptionFrame): void;
  /** Lo deprisa que se mueven las piezas de un mundo (1 = normal; casi 0 si lo ves caer desde fuera). */
  rateOf(world: string): number;
  snapshot(): AbsorptionSnapshot;
  dispose(): void;
}

interface Uniforms {
  uAbsorbCenter: { value: Vector3 };
  uAbsorbHole: { value: Vector3 };
  uAbsorbRadius: { value: number };
  uAbsorbProgress: { value: number };
  uAbsorbViewer: { value: Vector3 };
  uAbsorbAnchored: { value: number };
  uRedshift: { value: number };
}

interface Piece {
  world: Entry | undefined;
  /** Desde dónde se suelta: dirección (unitaria) desde el centro de su mundo. */
  direction: Vector3;
  age: number;
  life: number;
}

interface Entry {
  world: AbsorbingWorld;
  uniforms: Uniforms;
  /** Sus mallas: mientras cae se dibujan aunque su sitio quede fuera de la vista (el sombreador las lleva lejos). */
  meshes: Mesh[];
  progress: number;
  /** Trozos pendientes de soltar (se acumula la parte fraccionaria). */
  owed: number;
}

const f = (value: number): string => value.toFixed(3);
const S = STRETCH_SHAPE;

const STRETCH_UNIFORMS = `uniform vec3 uAbsorbCenter;
uniform vec3 uAbsorbHole;
uniform float uAbsorbRadius;
uniform float uAbsorbProgress;
uniform vec3 uAbsorbViewer;
uniform float uAbsorbAnchored;`;

// La misma cuenta que `stretchedPoint` y `anchorWeight`.
const STRETCH_VERTEX = `vec3 world = (modelMatrix * vec4(transformed, 1.0)).xyz;
if (uAbsorbProgress > 0.0) {
  vec3 axis = uAbsorbHole - uAbsorbCenter;
  float span = length(axis);
  if (span > 1e-3 && uAbsorbRadius > 0.0) {
    axis /= span;
    vec3 rel = world - uAbsorbCenter;
    float along = dot(rel, axis);
    vec3 across = rel - axis * along;
    float p = uAbsorbProgress;
    float stretch = ${f(S.maxStretch)} * p * p;
    float ahead = max(0.0, along / uAbsorbRadius);
    vec3 moved = uAbsorbCenter
      + axis * (along * (1.0 + stretch) + ${f(S.nearPull)} * stretch * uAbsorbRadius * ahead * ahead)
      + across * inversesqrt(1.0 + stretch);
    float near = clamp(0.5 + 0.5 * along / uAbsorbRadius, 0.0, 1.0);
    float fall = pow(smoothstep(${f(S.fallFrom)}, 1.0, p), 1.0 + ${f(S.fallLead)} * (1.0 - near));
    moved = mix(moved, uAbsorbHole, fall);
    float anchor = smoothstep(${f(S.anchorNear)}, ${f(S.anchorFar)}, distance(world, uAbsorbViewer));
    world = mix(world, moved, mix(1.0, anchor, uAbsorbAnchored));
  }
}
vec4 mvPosition = viewMatrix * vec4(world, 1.0);
gl_Position = projectionMatrix * mvPosition;`;

/** La luz de un mundo que cae llega roja y débil. */
const REDSHIFT_FRAGMENT = 'gl_FragColor.rgb *= mix(vec3(1.0), vec3(1.0, 0.45, 0.32), uRedshift);';

function patch(material: Material, uniforms: Uniforms): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${STRETCH_UNIFORMS}`)
      .replace('#include <project_vertex>', STRETCH_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uRedshift;')
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>\n${REDSHIFT_FRAGMENT}`,
      );
  };
  material.needsUpdate = true;
}

function createUniforms(radius: number): Uniforms {
  return {
    uAbsorbCenter: { value: new Vector3() },
    uAbsorbHole: { value: new Vector3() },
    uAbsorbRadius: { value: radius },
    uAbsorbProgress: { value: 0 },
    uAbsorbViewer: { value: new Vector3() },
    uAbsorbAnchored: { value: 0 },
    uRedshift: { value: 0 },
  };
}

/** Dirección al azar, inclinada hacia el agujero (los trozos se sueltan sobre todo por la cara que lo mira). */
function looseDirection(toHole: Vector3, target: Vector3): Vector3 {
  target.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  if (target.lengthSq() < 1e-6) target.set(0, 1, 0);
  return target.normalize().addScaledVector(toHole, 1.2).normalize();
}

/** @param root dónde cuelgan los trozos (la escena: se colocan en su marco). */
export function createAbsorptionView(
  root: Object3D,
  worlds: readonly AbsorbingWorld[],
): AbsorptionView {
  const entries: Entry[] = worlds
    .filter((world) => world.window !== undefined)
    .map((world) => {
      const uniforms = createUniforms(world.radius);
      const meshes: Mesh[] = [];
      world.model.traverse((object) => {
        if (!isMesh(object)) return;
        meshes.push(object);
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) patch(material, uniforms);
      });
      return { world, uniforms, meshes, progress: 0, owed: 0 };
    });
  const byId = new Map(entries.map((entry) => [entry.world.id, entry]));

  const geometry = new IcosahedronGeometry(1, 0);
  const material = new MeshLambertMaterial({ color: DEBRIS_COLOR, flatShading: true });
  const debris = new InstancedMesh(geometry, material, DEBRIS_POOL);
  debris.name = 'Trozos que caen';
  debris.frustumCulled = false; // cada trozo va por su lado: la caja de la malla no sirve
  debris.visible = false;
  root.add(debris);
  const pieces: Piece[] = Array.from({ length: DEBRIS_POOL }, () => ({
    world: undefined,
    direction: new Vector3(),
    age: 0,
    life: 1,
  }));

  const center = new Vector3();
  const toHole = new Vector3();
  const place = new Object3D();
  let reference: string | undefined;
  /** Trozos cayendo ahora mismo; sin ninguno, ni se recorren ni se dibujan. */
  let live = 0;

  function spawn(entry: Entry): void {
    const free = pieces.find((piece) => piece.world === undefined);
    if (!free) return;
    free.world = entry;
    looseDirection(toHole, free.direction);
    free.age = 0;
    free.life = DEBRIS_LIFE[0] + Math.random() * (DEBRIS_LIFE[1] - DEBRIS_LIFE[0]);
    live += 1;
  }

  function hide(index: number): void {
    place.scale.setScalar(0);
    place.updateMatrix();
    debris.setMatrixAt(index, place.matrix);
  }

  function release(piece: Piece, index: number): void {
    piece.world = undefined;
    live -= 1;
    hide(index);
  }

  for (let index = 0; index < pieces.length; index++) hide(index);

  /** Mientras cae, el sombreador lleva sus vértices lejos de su caja: se dibuja aunque su sitio no se vea. */
  function cullOnlyWhenStill(entry: Entry): void {
    const still = !(entry.progress > 0 && entry.progress < 1);
    if (entry.meshes[0]?.frustumCulled === still) return;
    for (const mesh of entry.meshes) mesh.frustumCulled = still;
  }

  function updatePieces(hole: Vector3 | undefined, dt: number): void {
    debris.visible = live > 0;
    if (live === 0) return;
    for (let index = 0; index < pieces.length; index++) {
      const piece = pieces[index];
      const entry = piece?.world;
      if (!piece || !entry) continue;
      piece.age += dt;
      if (!hole || piece.age >= piece.life) {
        release(piece, index);
        continue;
      }
      const { radius, model } = entry.world;
      const travel = debrisTravel(piece.age / piece.life);
      model.getWorldPosition(center);
      place.position.copy(center).addScaledVector(piece.direction, radius).lerp(hole, travel);
      place.lookAt(hole);
      // Se estira a lo largo de la caída y se apaga al llegar.
      const size = radius * DEBRIS_SIZE * (1 - travel ** 3);
      place.scale.set(size, size, size * (1 + 5 * travel));
      place.updateMatrix();
      debris.setMatrixAt(index, place.matrix);
    }
    debris.instanceMatrix.needsUpdate = true;
  }

  return {
    update({ t, hole, reference: here, viewer, dt }) {
      reference = here;
      for (const entry of entries) {
        const { world, uniforms } = entry;
        entry.progress = hole ? absorptionProgress(world.window, t) : 0;
        cullOnlyWhenStill(entry);
        const own = world.id === here;
        world.model.visible = !(entry.progress >= 1 && !own);
        uniforms.uAbsorbProgress.value = entry.progress;
        uniforms.uRedshift.value = own ? 0 : entry.progress;
        uniforms.uAbsorbAnchored.value = own ? 1 : 0;
        uniforms.uAbsorbViewer.value.copy(viewer);
        if (!hole || entry.progress <= 0) {
          entry.owed = 0;
          continue;
        }
        world.model.getWorldPosition(uniforms.uAbsorbCenter.value);
        uniforms.uAbsorbHole.value.copy(hole.position);
        if (entry.progress >= 1) continue;
        toHole.subVectors(hole.position, uniforms.uAbsorbCenter.value).normalize();
        entry.owed += DEBRIS_RATE * entry.progress * dt;
        for (; entry.owed >= 1; entry.owed -= 1) spawn(entry);
      }
      updatePieces(hole?.position, dt);
    },
    rateOf(world) {
      const entry = byId.get(world);
      return entry && world !== reference ? frozenRate(entry.progress) : 1;
    },
    snapshot() {
      return {
        progress: Object.fromEntries(entries.map((e) => [e.world.id, e.progress])),
        swallowed: entries.filter((e) => !e.world.model.visible).map((e) => e.world.id),
        debris: pieces.filter((piece) => piece.world !== undefined).length,
      };
    },
    dispose() {
      root.remove(debris);
      debris.dispose();
      geometry.dispose();
      material.dispose();
      for (const entry of entries) {
        entry.world.model.visible = true;
        entry.progress = 0;
        cullOnlyWhenStill(entry);
      }
    },
  };
}
