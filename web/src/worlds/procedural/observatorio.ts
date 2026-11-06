// El Observatorio por código (Fase 11; 🟡 el aspecto, ✅ que existe como extra opcional): un asteroide alargado,
// silencioso y lejos de todo, que los Ausentes adaptaron para buscar y estudiar las fluctuaciones de la luz. En el
// polo tallaron una terraza (observatorioShape.ts) y encima levantaron un edificio cerrado al vacío: la cúpula con el
// gran telescopio (observatorioDome.ts), el hangar donde se posa la nave (observatorioHangar.ts), el cuarto del turno
// (observatorioSites.ts) y la Sala de las Fluctuaciones (observatorioStudy.ts). Se diseña en un plano y se dobla
// sobre la terraza (observatorioDrape.ts). Sustituye a observatorio.glb con el mismo contrato (raíz con radio,
// gravedad y reloj; COL_observatorio_Terreno y COL_observatorio_Lugares; SPAWN_Cupula y las marcas INT_) y suma lo
// que tiene vida: piezas que giran (ANIM_) y los faroles de la alineación de las 6:30 (EVT_alineacion_Luces).
import {
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FAR_HIDDEN } from '../../render/nearDetail';
import {
  angleBetween,
  applySkyLight,
  ball,
  colliderMesh,
  cylinder,
  marker,
  piecesToMeshes,
  scatter,
  sphereTerrain,
  type PieceKind,
  type XYZ,
} from './kit';
import { buildDome } from './observatorioDome';
import { ALIGNMENT_EVENT, ObsBuilder, PALETTE as P } from './observatorioKit';
import {
  OBSERVATORIO_CLOCK,
  OBSERVATORIO_GRAVITY,
  OBSERVATORIO_ID,
  OBSERVATORIO_RADIUS,
  TERRACE,
  observatorioGround,
  observatorioReliefAt,
  terraceWeight,
} from './observatorioShape';
import { drapeAll, drapePoint, drapeTurn } from './observatorioDrape';
import { buildStudy } from './observatorioStudy';
import { buildHangar, PAD_CENTRE } from './observatorioHangar';
import { buildAnnex } from './observatorioSites';
import { seededRandom } from './noise';
import { sunInWorld } from './sun';

export { OBSERVATORIO_ID } from './observatorioShape';
/** Subdivisión del terreno (la colisión usa la misma malla). */
export const OBSERVATORIO_DETAIL = 22;

const AMBIENT = { strength: 1.5, color: '#8c94d0' } as const;
/** Bandas de color por altura (0 a 1): el fondo de un cráter es casi negro, la cresta, gris pálido. */
const BANDS: readonly (readonly [number, string])[] = [
  [0, '#0a0a12'],
  [0.35, '#2a2a5a'],
  [0.7, '#77778a'],
];

/** El suelo tallado de la terraza: piedra pulida, más clara que la roca. */
const TERRACE_COLOR = new Color('#4a4a6e');

function groundColor(relief01: number): Color {
  let tone: string = BANDS[0]?.[1] ?? '#0a0a12';
  for (const [from, color] of BANDS) if (relief01 >= from) tone = color;
  return new Color(tone);
}

interface ObservatorioMaterials extends Record<PieceKind, Material> {
  ground: MeshStandardMaterial;
  loose: MeshStandardMaterial;
}

function createMaterials(sun: Vector3): ObservatorioMaterials {
  // Poco que iluminar: casi todo es cielo, y lo que rebota es índigo.
  const sky = {
    day: new Color(AMBIENT.color).multiplyScalar(0.8),
    ground: new Color('#4a4e78'),
    night: new Color(0.05, 0.06, 0.13),
  };
  const make = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => {
    const material = new MeshStandardMaterial({ flatShading: true, ...options });
    applySkyLight(material, sun, sky);
    return material;
  };
  return {
    ground: make({ vertexColors: true, roughness: 0.95 }),
    stone: make({ vertexColors: true, roughness: 0.88, side: DoubleSide }),
    metal: make({ vertexColors: true, roughness: 0.4, metalness: 0.55 }),
    light: new MeshBasicMaterial({ vertexColors: true }),
    loose: make({ roughness: 0.92 }),
  };
}

/** La terraza tallada y lo que la rodea: ahí no hay nada suelto. */
function nearSite(d: XYZ): boolean {
  if (terraceWeight(d) > 0) return true;
  return angleBetween(d, TERRACE.up) * OBSERVATORIO_RADIUS < 6;
}

/** Dobla todo lo construido en el plano del mapa sobre la terraza: piezas, colisiones, cristal, marcas y lo que gira. */
function drapeBuilding(builder: ObsBuilder): void {
  for (const set of [builder.pieces, builder.alignment]) {
    for (const kind of ['stone', 'metal', 'light'] as const) drapeAll(set.parts[kind]);
    drapeAll(set.colliders, false);
  }
  drapeAll(builder.glass);
  for (const extra of builder.extras) {
    extra.quaternion.premultiply(drapeTurn(extra.position));
    extra.position.copy(drapePoint(extra.position));
  }
}

/** Rocas, polvo y cantos sueltos por todo el asteroide (solo de cerca). */
function scatterDetails(loose: Material) {
  const random = seededRandom(73);
  const rocks = scatter(
    {
      name: 'observatorio_Rocas',
      geometry: ball(1, 1),
      material: loose,
      count: 70,
      castShadow: true,
      groundRadius: observatorioGround,
      solidAbove: 0.5,
      pick: (d, r) => {
        if (nearSite(d)) return null;
        const size = 0.3 + r() * 0.9;
        return {
          scale: [size, size * (0.6 + r() * 0.4), size * (0.45 + r() * 0.35)],
          sink: 0.12 - size * 0.25,
          color: r() < 0.5 ? P.rock : P.dust,
          tilt: 1,
        };
      },
    },
    random,
  );
  const dust = scatter(
    {
      name: 'observatorio_Polvo',
      geometry: cylinder(1, 9),
      material: loose,
      count: 50,
      castShadow: false,
      groundRadius: observatorioGround,
      pick: (d, r) => {
        if (nearSite(d)) return null;
        const size = 1 + r() * 1.6;
        return { scale: [size, size * (0.6 + r() * 0.4), 0.04], sink: -0.01, color: P.dust };
      },
    },
    random,
  );
  const meshes = [rocks.mesh, dust.mesh];
  for (const mesh of meshes) mesh.userData[FAR_HIDDEN] = true;
  return { meshes, colliders: rocks.colliders };
}

/** Construye el Observatorio con la forma de una escena exportada: la raíz `observatorio`, sus mallas y sus marcas. */
export function buildObservatorio(): Group {
  const sun = sunInWorld(OBSERVATORIO_ID);
  const materials = createMaterials(sun);
  const builder = new ObsBuilder(materials);
  const dome = buildDome(builder);
  buildAnnex(builder, dome);
  buildStudy(builder, dome);
  buildHangar(builder, dome);
  // Se llega en nave: se aterriza en la pista del hangar y se aparece junto a ella, mirando a la esclusa.
  builder.mark('SPAWN_Cupula', dome, [
    PAD_CENTRE[0] + 3.6,
    PAD_CENTRE[1] + 4.2,
    PAD_CENTRE[2] + 1.0,
  ]);
  drapeBuilding(builder);

  // Marco de Blender: el contenido se gira −90° en X (como el exportador glTF).
  const frame = new Group();
  frame.name = 'observatorio_Marco';
  frame.rotation.x = -Math.PI / 2;

  const terrainGeometry = sphereTerrain(
    {
      radius: OBSERVATORIO_RADIUS,
      detail: OBSERVATORIO_DETAIL,
      height: (x, y, z) => observatorioGround({ x, y, z }) - OBSERVATORIO_RADIUS,
      faceColor: (x, y, z, _h, _slope, random) => {
        // La altura relativa sale del relieve de la esfera de la que se estira el asteroide; lo tallado es más claro.
        const rock = groundColor((observatorioReliefAt({ x, y, z }) + 1) / 2);
        const carved = terraceWeight({ x, y, z });
        return rock.lerp(TERRACE_COLOR, carved * 0.85).offsetHSL(0, 0, (random() - 0.5) * 0.03);
      },
    },
    9,
  );
  const terrain = new Mesh(terrainGeometry, materials.ground);
  terrain.name = 'observatorio_Terreno';
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  const groundCollider = new Mesh(terrainGeometry);
  groundCollider.name = 'COL_observatorio_Terreno';
  groundCollider.visible = false;
  frame.add(terrain, groundCollider);

  const details = scatterDetails(materials.loose);
  frame.add(...details.meshes);
  for (const g of details.colliders) builder.pieces.addCollider(g);
  frame.add(...piecesToMeshes(builder.pieces, materials, 'observatorio'));
  frame.add(colliderMesh('COL_observatorio_Lugares', builder.pieces.colliders));

  // Los faroles de la alineación: EVT_, el juego los enseña solo durante las 6:30.
  const lamps = new Mesh(mergeGeometries(builder.alignment.parts.light), materials.light);
  lamps.name = 'EVT_alineacion_Luces';
  lamps.userData.event = ALIGNMENT_EVENT;
  frame.add(lamps, ...builder.extras);
  // El cristal de la ranura de la cúpula: se ve el cielo a través de él.
  if (builder.glass.length > 0) {
    const glass = new Mesh(
      mergeGeometries(builder.glass),
      new MeshStandardMaterial({
        color: P.glass,
        transparent: true,
        opacity: 0.18,
        roughness: 0.05,
        metalness: 0.1,
        side: DoubleSide,
        depthWrite: false,
      }),
    );
    glass.name = 'observatorio_Cristal';
    glass.renderOrder = 3;
    frame.add(glass);
  }
  for (const { name, frame: f, at, props } of builder.markers) {
    const flat = f.point(at);
    frame.add(marker(name, drapePoint(flat), drapeTurn(flat).multiply(f.rotation()), props));
  }

  const root = new Object3D();
  root.name = OBSERVATORIO_ID;
  Object.assign(root.userData, {
    world_id: OBSERVATORIO_ID,
    radius: OBSERVATORIO_RADIUS,
    gravity: OBSERVATORIO_GRAVITY,
    clock_rate: OBSERVATORIO_CLOCK,
    ambient: AMBIENT.strength,
    ambient_color: AMBIENT.color,
  });
  root.add(frame);

  const scene = new Group();
  scene.add(root);
  scene.updateMatrixWorld(true);
  return scene;
}
