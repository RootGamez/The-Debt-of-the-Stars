// El Archivo de las Puertas por código (Fase 11; plan de la Fase 10D, todo 🟡): el sitio fuera del tiempo al otro lado
// del horizonte estable. Un planetoide oscuro de 30 m por el que corren anillos de luz desde las bocas de casa
// (puertasFloor.ts); de pie sobre él, una veintena de bocas de otras manos, cada una con la vista de su lado; en el
// cielo negro, más bocas que giran despacio alrededor, y el horizonte, un aro de luz enorme. Senderos de losas
// encendidas unen la llegada, las bocas de casa (puertasHome.ts), el muro de los rastros, las ofrendas y la primera
// Puerta de los Ausentes (puertasLore.ts). Sustituye a puertas.glb con el mismo contrato (raíz con radio, gravedad y
// reloj; COL_puertas_Terreno y COL_puertas_Lugares; INT_rastros, INT_bocas e INT_planos; SPAWN_Puertas;
// puertas_Planos suelto y puertas_VistaCasa_0..2).
import {
  Color,
  Euler,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
  type Material,
} from 'three';
import {
  ball,
  box,
  colliderMesh,
  cylinder,
  direction,
  frameAt,
  headingTowards,
  latLon,
  pieceMatrix,
  piecesToMeshes,
  sphereTerrain,
  torus,
  type PieceKind,
  type PieceSet,
} from './kit';
import { seededRandom } from './noise';
import { applyTimeRipples } from './puertasFloor';
import { buildHome } from './puertasHome';
import { MOUTH_MATERIALS, PALETTE as P, PuertasBuilder, VIEWS, siteFrame } from './puertasKit';
import { buildLore } from './puertasLore';
import {
  PATHS,
  PUERTAS_AMBIENT,
  PUERTAS_CLOCK,
  PUERTAS_GRAVITY,
  PUERTAS_ID,
  PUERTAS_RADIUS,
  SITES,
  awayFromSites,
  puertasGround,
  puertasSurface,
  siteDirection,
} from './puertasShape';

export { PUERTAS_ID } from './puertasShape';
/** Subdivisión del suelo (la colisión usa la misma malla): aristas de metro y medio. */
export const PUERTAS_DETAIL = 22;
const STANDING_MOUTHS = 18;
const SKY_GROUPS = 3;
const SKY_MOUTHS_PER_GROUP = 8;
const STEP = 1.5;

function pick<T>(list: readonly T[], r: number): T {
  const value = list[Math.floor(r * list.length) % list.length];
  if (value === undefined) throw new Error('lista vacía');
  return value;
}

/** Los senderos: losas claras con un hilo de luz en medio, cada paso y medio, siguiendo el arco entre dos sitios. */
function paths(b: PuertasBuilder): void {
  for (const [a, z] of PATHS) {
    const A = siteDirection(a);
    const B = siteDirection(z);
    const total = A.angleTo(B) * PUERTAS_RADIUS;
    const steps = Math.floor(total / STEP);
    for (let k = 1; k < steps; k++) {
      const d = A.clone()
        .lerp(B, k / steps)
        .normalize();
      const { lat, lon } = latLon(d);
      const f = frameAt(puertasSurface, lat, lon, { heading: headingTowards(lat, lon, B) });
      b.view(
        k % 2 ? P.stoneLight : P.slate,
        box(),
        f.at([0, 0, 0.01], undefined, [1.4, 1.2, 0.05]),
      );
      b.lamp(P.thread, box(), f.at([0, 0, 0.045], undefined, [0.08, 0.9, 0.02]), 1.1);
    }
  }
}

/** Donde se despierta: un anillo caído a la espalda (por ahí se ha llegado), mirando a las bocas de casa. */
function arrival(b: PuertasBuilder): void {
  const s = SITES.llegada;
  const f = siteFrame(s.lat, s.lon, headingTowards(s.lat, s.lon, siteDirection('casa')));
  b.view(P.obsidian, torus(1.6, 0.18, 24, 4), f.at([0, -2.8, 0.02], [Math.PI / 2, 0, 0]));
  b.lamp(P.thread, torus(1.25, 0.03, 32, 3), f.at([0, -2.8, 0.05], [Math.PI / 2, 0, 0]), 1.3);
  b.mark('SPAWN_Puertas', f, [0, -0.5, 1.0]);
  // La nave espera a la espalda del anillo caído (T11: a las bocas de casa solo se llega volando).
  b.mark('PARK_Nave', f, [0, 14, 0]);
  b.mark('INT_cielo', f, [0, 0.8, 1.6], { clue_id: 'puertas.cielo', kind: 'observacion' });
}

/** Una veintena de bocas de otras manos de pie por el planetoide, lejos de los sitios y los senderos. */
function standingMouths(b: PuertasBuilder): void {
  const random = seededRandom(23);
  let placed = 0;
  for (let tries = 0; placed < STANDING_MOUTHS && tries < 2000; tries++) {
    const lat = Math.asin(random() * 1.85 - 0.95) * (180 / Math.PI);
    const lon = random() * 360 - 180;
    const radius = 1.4 + random() * 1.8;
    if (!awayFromSites(direction(lat, lon), radius + 2)) continue;
    const f = frameAt(puertasSurface, lat, lon, {
      heading: random() * 360,
      footprint: radius * 0.6,
      sink: 0.15,
    });
    const view = pick(VIEWS, random());
    const centre = b.mouth(f, {
      radius,
      material: pick(MOUTH_MATERIALS, random()),
      view,
      hours: pick([8, 10, 12, 16], random()),
    });
    // Un astro o un horizonte en la vista: lo que hay al otro lado.
    if (random() < 0.6) {
      const r = radius * (0.18 + random() * 0.17);
      b.lamp(
        pick(VIEWS, random()),
        cylinder(r, 12),
        f.at(
          [(random() - 0.5) * 0.8 * radius, -0.04, centre + (random() - 0.4) * 0.7 * radius],
          [Math.PI / 2, 0, 0],
          [1, 1, 0.02],
        ),
        1.3,
      );
    }
    placed++;
  }
}

/** Una boca flotando en el cielo, en coordenadas del grupo que gira. */
function skyMouth(set: PieceSet, random: () => number): void {
  const d = direction(Math.asin(random() * 2 - 1) * (180 / Math.PI), random() * 360 - 180);
  const at = d.multiplyScalar(PUERTAS_RADIUS * (1.9 + random() * 1.7));
  const radius = 2.5 + random() * 4.5;
  const turn: [number, number, number] = [
    random() * Math.PI,
    random() * Math.PI,
    random() * Math.PI,
  ];
  const centre: [number, number, number] = [at.x, at.y, at.z];
  set.add(
    pick(MOUTH_MATERIALS, random()),
    torus(radius, 0.3, 18, 4),
    pieceMatrix(centre, turn),
    'stone',
    {
      solid: false,
    },
  );
  const disc = pieceMatrix(centre, turn).multiply(
    pieceMatrix(undefined, [Math.PI / 2, 0, 0], [1, 1, 0.02]),
  );
  set.add(pick(VIEWS, random()), cylinder(radius - 0.2, 14), disc, 'light', {
    solid: false,
    glow: 1.2,
    vary: 0,
  });
}

/** El cielo: bocas que giran despacio alrededor en tres grupos, y el horizonte, un aro de luz enorme. */
function sky(b: PuertasBuilder): void {
  const random = seededRandom(31);
  const tilts = [
    [0.2, 0, 0.1],
    [1.1, 0.4, 0],
    [-0.6, 1.2, 0.3],
  ] as const;
  for (let g = 0; g < SKY_GROUPS; g++) {
    const [x = 0, y = 0, z = 0] = tilts[g] ?? [];
    const rotation = new Quaternion().setFromEuler(new Euler(x, y, z));
    b.spinning(
      `ANIM_cielo_${String(g)}`,
      new Vector3(),
      rotation,
      [0.02, -0.014, 0.009][g] ?? 0.01,
      (set) => {
        for (let k = 0; k < SKY_MOUTHS_PER_GROUP; k++) skyMouth(set, random);
      },
    );
  }
  // El horizonte estable: un aro de luz, lejos, que gira despacísimo; y otro más tenue dentro.
  b.spinning(
    'ANIM_horizonte',
    new Vector3(),
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.35),
    0.004,
    (set) => {
      set.add('#C8B8FF', torus(150, 1.6, 96, 4), pieceMatrix(), 'light', {
        solid: false,
        glow: 1.0,
        vary: 0,
      });
      set.add('#7060B0', torus(128, 0.8, 96, 4), pieceMatrix(), 'light', {
        solid: false,
        glow: 0.9,
        vary: 0,
      });
      for (let k = 0; k < 24; k++) {
        const a = (2 * Math.PI * k) / 24;
        set.add(
          '#E8E0FF',
          ball(1.4, 0),
          pieceMatrix([Math.cos(a) * 150, 0, Math.sin(a) * 150]),
          'light',
          {
            solid: false,
            glow: 1.3,
            vary: 0,
          },
        );
      }
    },
  );
}

function createMaterials(): Record<PieceKind, Material> & { ground: MeshStandardMaterial } {
  // Sin estrella cerca, la luz es la de las propias bocas: un poco de brillo propio para que nada sea negro del todo.
  const make = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial =>
    new MeshStandardMaterial({ flatShading: true, emissive: new Color('#16161f'), ...options });
  return {
    stone: make({ vertexColors: true, roughness: 0.88 }),
    metal: make({ vertexColors: true, roughness: 0.5, metalness: 0.4 }),
    light: new MeshBasicMaterial({ vertexColors: true }),
    ground: make({ vertexColors: true, roughness: 0.95 }),
  };
}

function terrain(): ReturnType<typeof sphereTerrain> {
  const tones = ['#0C0C14', '#161622', '#22222F'].map((c) => new Color(c));
  return sphereTerrain(
    {
      radius: PUERTAS_RADIUS,
      detail: PUERTAS_DETAIL,
      height: (x, y, z) => puertasGround({ x, y, z }) - PUERTAS_RADIUS,
      faceColor: (_x, _y, _z, h, _slope, random) =>
        (tones[h > 0.25 ? 2 : h > -0.2 ? 1 : 0] ?? new Color())
          .clone()
          .offsetHSL(0, 0, (random() - 0.5) * 0.02),
    },
    11,
  );
}

/** Construye el Archivo de las Puertas con la forma de una escena exportada: la raíz `puertas`, sus mallas y marcas. */
export function buildPuertas(): Group {
  const materials = createMaterials();
  const b = new PuertasBuilder(materials);
  paths(b);
  arrival(b);
  buildHome(b);
  buildLore(b);
  standingMouths(b);
  sky(b);

  const frame = new Group();
  frame.name = 'puertas_Marco';
  frame.rotation.x = -Math.PI / 2;

  const ground = terrain();
  const groundMesh = new Mesh(ground, materials.ground);
  groundMesh.name = 'puertas_Terreno';
  groundMesh.receiveShadow = true;
  applyTimeRipples(
    groundMesh,
    materials.ground,
    siteDirection('casa'),
    PUERTAS_RADIUS,
    new Color('#8C9CFF'),
  );
  frame.add(groundMesh, colliderMesh('COL_puertas_Terreno', [ground]));

  frame.add(...piecesToMeshes(b.pieces, materials, PUERTAS_ID));
  if (b.pieces.colliders.length > 0)
    frame.add(colliderMesh('COL_puertas_Lugares', b.pieces.colliders));
  frame.add(...b.extras, ...b.markers);

  const root = new Object3D();
  root.name = PUERTAS_ID;
  Object.assign(root.userData, {
    world_id: PUERTAS_ID,
    radius: PUERTAS_RADIUS,
    gravity: PUERTAS_GRAVITY,
    clock_rate: PUERTAS_CLOCK,
    ambient: PUERTAS_AMBIENT.strength,
    ambient_color: PUERTAS_AMBIENT.color,
  });
  root.add(frame);

  const scene = new Group();
  scene.add(root);
  scene.updateMatrixWorld(true);
  return scene;
}
