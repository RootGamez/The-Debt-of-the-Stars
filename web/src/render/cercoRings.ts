// El Cerco que se ve: dos anillos de dovelas que giran en sentidos opuestos alrededor de la estrella, unidos solo
// en los polos (anclajes). La forma y el estado de cada dovela salen de `system/cercoShape.ts`; aquí se dibujan con
// el lenguaje de los Ausentes: arenisca, pizarra y cobre. Cada anillo es un grupo que gira entero; sus piezas se
// unen en pocas mallas (una por material).
import {
  BoxGeometry,
  BufferAttribute,
  Color,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ringAzimuth, ringSegments, type RingSegment } from '../system/cercoShape';
import type { RingSpec, StructureSpec } from '../system/systemData';

const COLOR = {
  sandstone: new Color('#c4af88'),
  slate: new Color('#47525e'),
  copper: new Color('#a8643a'),
  panel: new Color('#1b2634'),
  beam: new Color('#8a8f94'),
  glow: new Color('#ffcf8a'),
} as const;

type Kind = 'stone' | 'metal';

/** Reúne cajas coloreadas y las une al final. */
class Parts {
  private readonly lists: Record<Kind, BufferGeometry[]> = { stone: [], metal: [] };
  private static readonly unit = new BoxGeometry(1, 1, 1);

  /** Una caja de `size` (a lo largo de tangente, radial, eje) con la base `basis` y desplazada `offset` en ese marco. */
  box(
    basis: Matrix4,
    offset: readonly [number, number, number],
    size: readonly [number, number, number],
    color: Color,
    kind: Kind,
  ): void {
    const local = new Matrix4()
      .makeTranslation(offset[0], offset[1], offset[2])
      .multiply(new Matrix4().makeScale(size[0], size[1], size[2]));
    const g = Parts.unit.clone().applyMatrix4(basis.clone().multiply(local));
    const count = g.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3);
    g.setAttribute('color', new BufferAttribute(colors, 3));
    g.deleteAttribute('uv');
    this.lists[kind].push(g);
  }

  merged(kind: Kind): BufferGeometry | undefined {
    const list = this.lists[kind];
    return list.length > 0 ? mergeGeometries(list) : undefined;
  }
}

/** La base de una dovela: tangente, radial y eje del anillo, con el origen en su centro. */
function segmentBasis(ring: RingSpec, angle: number): Matrix4 {
  const tangent = new Vector3(-Math.sin(angle), Math.cos(angle), 0);
  const radial = new Vector3(Math.cos(angle), Math.sin(angle), 0);
  const axis = new Vector3(0, 0, 1);
  return new Matrix4()
    .makeBasis(tangent, radial, axis)
    .setPosition(radial.clone().multiplyScalar(ring.radius));
}

function addSegment(
  parts: Parts,
  segment: RingSegment,
  ring: RingSpec,
  structure: StructureSpec,
): void {
  if (segment.state === 'faltante') return;
  const basis = segmentBasis(ring, segment.angle);
  const length = ((Math.PI * 2 * ring.radius) / structure.segments) * 1.02;
  const { width, thickness } = structure;
  if (segment.state === 'terminada') {
    parts.box(basis, [0, 0, 0], [length, thickness * 0.6, width], COLOR.sandstone, 'stone');
    // Cara hacia la estrella: el captador, de pizarra oscura, con su friso de cobre.
    parts.box(
      basis,
      [0, -thickness * 0.45, 0],
      [length * 0.92, 0.5, width * 0.86],
      COLOR.panel,
      'metal',
    );
    parts.box(
      basis,
      [0, thickness * 0.35, -width * 0.36],
      [length, 0.5, 0.7],
      COLOR.copper,
      'metal',
    );
    parts.box(
      basis,
      [0, thickness * 0.35, width * 0.36],
      [length, 0.5, 0.7],
      COLOR.copper,
      'metal',
    );
    parts.box(basis, [0, thickness * 0.34, 0], [0.6, 0.4, width * 0.5], COLOR.slate, 'stone');
    return;
  }
  // Armazón: cuatro largueros y tres costillas.
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      parts.box(
        basis,
        [0, (sy * thickness) / 2, (sx * width) / 2],
        [length, 0.55, 0.55],
        COLOR.beam,
        'metal',
      );
    }
  }
  for (const along of [-0.46, 0, 0.46]) {
    parts.box(basis, [along * length, 0, 0], [0.5, thickness, width], COLOR.slate, 'metal');
  }
  if (segment.state === 'andamio') {
    // El frente de obra: postes de andamio hacia fuera y una grúa con su brazo y su contrapeso.
    for (const sx of [-1, 1]) {
      parts.box(
        basis,
        [0, thickness / 2 + 4, (sx * width) / 2],
        [0.4, 8, 0.4],
        COLOR.beam,
        'metal',
      );
    }
    parts.box(basis, [0, thickness / 2 + 9, 0], [length * 0.5, 0.6, 0.6], COLOR.beam, 'metal');
    parts.box(basis, [-length * 0.2, thickness / 2 + 4.5, 0], [0.9, 9, 0.9], COLOR.copper, 'metal');
    parts.box(
      basis,
      [length * 0.18, thickness / 2 + 9, 0],
      [1.6, 1.6, 1.6],
      COLOR.sandstone,
      'stone',
    );
  }
}

/** Dovelas sueltas que quedaron a la deriva junto a los huecos (la obra se dejó con prisa). */
function addDrifting(
  parts: Parts,
  segments: readonly RingSegment[],
  ring: RingSpec,
  structure: StructureSpec,
): void {
  const missing = segments.filter((s) => s.state === 'faltante');
  missing.forEach((segment, i) => {
    if (i % 5 !== 2) return;
    const basis = segmentBasis(ring, segment.angle + (i % 3) * 0.01);
    const lift = (i % 2 === 0 ? 1 : -1) * (14 + (i % 4) * 5);
    const shifted = basis.clone().multiply(new Matrix4().makeRotationZ(0.4 + i * 0.3));
    const length = ((Math.PI * 2 * ring.radius) / structure.segments) * 0.6;
    parts.box(
      shifted,
      [0, lift, (i % 3) * 3 - 3],
      [length, structure.thickness * 0.6, structure.width * 0.7],
      COLOR.sandstone,
      'stone',
    );
  });
}

/** El collar del polo: un tambor con tacos de cobre en el que se ata el anillo (gira con él). */
function addCollar(parts: Parts, ring: RingSpec, sign: 1 | -1): void {
  const basis = new Matrix4().makeTranslation(0, sign * ring.radius, 0);
  parts.box(basis, [0, 0, 0], [30, 8, 30], COLOR.slate, 'metal');
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    parts.box(basis, [Math.cos(a) * 16, 0, Math.sin(a) * 16], [3, 10, 3], COLOR.copper, 'metal');
  }
}

export interface CercoView {
  readonly object: Group;
  /** Gira cada anillo a su azimut en el instante `t` del reloj de Umbral. */
  update(t: number): void;
  dispose(): void;
}

export function createCercoView(structure: StructureSpec): CercoView {
  const object = new Group();
  object.name = 'El Cerco';
  const stone = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  const metal = new MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.45,
    metalness: 0.5,
  });
  const groups = structure.rings.map((ring, index) => {
    const group = new Group();
    group.name = `Anillo ${String(index + 1)}`;
    const segments = ringSegments(ring, structure);
    const parts = new Parts();
    for (const segment of segments) addSegment(parts, segment, ring, structure);
    addDrifting(parts, segments, ring, structure);
    addCollar(parts, ring, 1);
    addCollar(parts, ring, -1);
    for (const [kind, material] of [
      ['stone', stone],
      ['metal', metal],
    ] as const) {
      const geometry = parts.merged(kind);
      if (!geometry) continue;
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    object.add(group);
    return { group, ring };
  });

  return {
    object,
    update(t) {
      for (const { group, ring } of groups) group.rotation.y = -ringAzimuth(ring, t);
    },
    dispose() {
      object.traverse((o) => {
        if (o instanceof Mesh) (o.geometry as BufferGeometry).dispose();
      });
      stone.dispose();
      metal.dispose();
    },
  };
}
