// Cicatriz, el origen (CONTEXTO_PLANETAS.md §6), rehecha por código (Fase 11H; ✅ la idea, Anthony 2026-11-04):
// un mundo hueco. La cáscara de fuera está mordida por cortes esféricos que la atraviesan (cada uno deja un ojo que
// da a la cavidad); por dentro se camina con la cabeza hacia el centro, donde un micro agujero negro duerme dentro de
// la máquina, y alrededor gira el anillo de lo que las mordidas arrancaron. Sustituye a cicatriz.glb con el mismo
// contrato (raíz con radio, gravedad y reloj, ahora con la cavidad; mallas COL_; marcas SPAWN_, INT_, PASO_, ANIM_ y
// EVT_; el motor viejo y su sitio fuera para la Fase 10C). Las medidas están en cicatrizShape.ts.
import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  type Material,
} from 'three';
import {
  applySkyLight,
  colliderMesh,
  marker,
  piecesToMeshes,
  triangleCount,
  type PieceKind,
} from './kit';
import { sunInWorld } from './sun';
import {
  BITES,
  biteAxis,
  CAVITY_LIMIT,
  CICATRIZ_ID,
  eyeAngle,
  INNER_RADIUS,
  OUTER_RADIUS,
} from './cicatrizShape';
import { FAR_HIDDEN, NEAR_ONLY } from '../../render/nearDetail';
import { CicatrizBuilder } from './cicatrizKit';
import { eyeTrim, innerShell, lightShafts, outerShell } from './cicatrizCrust';
import { engineRoom } from './cicatrizCore';
import { surface } from './cicatrizSurface';
import { interior } from './cicatrizInterior';
import { ringDust, ringFragments } from './cicatrizRing';

export interface CicatrizStats {
  outer: number;
  inner: number;
  places: number;
  colliders: number;
}

export interface CicatrizOptions {
  /** Para tests: sin el polvo del anillo (miles de instancias que no chocan). */
  ring?: boolean;
}

export function buildCicatriz({ ring = true }: CicatrizOptions = {}): Group {
  const sun = sunInWorld(CICATRIZ_ID);
  // Fuera, luz de cielo rojiza (sin aire: no hay bruma); dentro, el resplandor del núcleo.
  const light = {
    day: new Color('#c79a86').multiplyScalar(1.1),
    ground: new Color('#b0502a').multiplyScalar(0.9),
    night: new Color(0.07, 0.04, 0.05),
  };
  const outsideMaterial = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => {
    const material = new MeshStandardMaterial({ flatShading: true, ...options });
    applySkyLight(material, sun, light);
    return material;
  };
  const glow = new Color('#3a160a');
  const insideMaterial = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial =>
    new MeshStandardMaterial({ flatShading: true, emissive: glow, ...options });
  // Las luces (lámparas, el Friso, los anillos) brillan igual fuera y dentro.
  const lamps = new MeshBasicMaterial({ vertexColors: true });
  const materials: Record<'outside' | 'inside', Record<PieceKind, Material>> = {
    outside: {
      stone: outsideMaterial({ vertexColors: true, roughness: 0.93 }),
      metal: outsideMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.45 }),
      light: lamps,
    },
    inside: {
      stone: insideMaterial({ vertexColors: true, roughness: 0.9 }),
      metal: insideMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.45 }),
      light: lamps,
    },
  };
  const builder = new CicatrizBuilder(materials);

  // Primero lo que abre huecos en la roca (la Cripta, las Galerías, el Pozo); luego las dos caras.
  surface(builder);
  interior(builder);
  const loose = engineRoom(builder);
  ringFragments(builder);
  for (const bite of BITES) eyeTrim(builder, bite);

  const frame = new Group();
  frame.name = 'cicatriz_Marco';
  frame.rotation.x = -Math.PI / 2;

  const outer = outerShell(builder);
  const outerMesh = new Mesh(outer, materials.outside.stone);
  outerMesh.name = 'cicatriz_Cascara';
  outerMesh.castShadow = true;
  outerMesh.receiveShadow = true;
  const inner = innerShell(builder);
  const innerMesh = new Mesh(inner, materials.inside.stone);
  innerMesh.name = 'cicatriz_Cara_Interior';
  innerMesh.receiveShadow = true;
  frame.add(
    outerMesh,
    innerMesh,
    colliderMesh('COL_cicatriz_Cascara', [outer]),
    colliderMesh('COL_cicatriz_Interior', [inner]),
  );

  const outsidePieces = piecesToMeshes(builder.outside, materials.outside, 'cicatriz_Fuera');
  for (const mesh of outsidePieces) mesh.userData[FAR_HIDDEN] = true; // de lejos basta la cáscara
  frame.add(...outsidePieces);
  const insidePieces = piecesToMeshes(builder.inside, materials.inside, 'cicatriz_Dentro');
  const shafts = lightShafts(sun);
  // Lo de dentro no se ve desde los otros mundos: solo se dibuja estando en Cicatriz.
  for (const mesh of [innerMesh, ...insidePieces, ...shafts]) mesh.userData[NEAR_ONLY] = true;
  frame.add(...insidePieces);
  frame.add(
    colliderMesh('COL_cicatriz_Lugares', [
      ...builder.outside.colliders,
      ...builder.inside.colliders,
    ]),
  );
  frame.add(...builder.extras, ...loose, ...shafts);
  if (ring) frame.add(ringDust(sun, light));

  for (const { name, position, rotation, props } of builder.markers) {
    frame.add(marker(name, position, rotation, props));
  }

  const root = new Object3D();
  root.name = CICATRIZ_ID;
  Object.assign(root.userData, {
    world_id: CICATRIZ_ID,
    radius: OUTER_RADIUS,
    gravity: 1.2,
    clock_rate: 0.6,
    ambient: 0.9,
    ambient_color: '#B88070',
    inner_radius: INNER_RADIUS,
    cavity_limit: CAVITY_LIMIT,
    cavity_tide: 'nucleo',
    // Los ojos, en el marco del mundo (Y arriba): eje y radio angular. Dentro de ellos la gravedad se tuerce
    // hacia la cara interior y quien cae por uno aterriza de pie al otro lado.
    cavity_holes: BITES.flatMap((b) => {
      const a = biteAxis(b);
      return [a.x, a.z, -a.y, eyeAngle(b)];
    }),
    interior_light: 2.4,
    interior_light_color: '#FF9A55',
  });
  root.userData.stats = {
    outer: triangleCount(outer),
    inner: triangleCount(inner),
    places: [builder.outside, builder.inside].reduce(
      (sum, set) =>
        sum +
        Object.values(set.parts)
          .flat()
          .reduce((s, g) => s + triangleCount(g), 0),
      0,
    ),
    colliders: [...builder.outside.colliders, ...builder.inside.colliders].reduce(
      (s, g) => s + triangleCount(g),
      0,
    ),
  } satisfies CicatrizStats;
  root.add(frame);

  const scene = new Group();
  scene.add(root);
  scene.updateMatrixWorld(true);
  return scene;
}
