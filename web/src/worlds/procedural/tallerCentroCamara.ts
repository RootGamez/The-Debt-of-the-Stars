// La Cámara del escéptico (plan de finales, E5; ✅ que está en el centro del Taller, 🟡 su forma): un pie escalonado
// de piedra, una columna con aros de cobre y, arriba, la fuente de poder encajada en su zócalo entre cuatro garras,
// con dos anillos cruzados que giran a su alrededor en sentidos contrarios. Los anillos y la fuente van sueltos (con
// nombre) para que el juego los mueva, los pare y saque la fuente cuando se corta el bucle.
import {
  AdditiveBlending,
  BackSide,
  Color,
  Group,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  type Material,
} from 'three';
import { CentroParts, column, plain, softBox, type Lighting } from './tallerCentroParts';
import { CAMARA_FOOT, CAMARA_RINGS, SOURCE_HEIGHT, SOURCE_RADIUS } from './tallerCentroShape';
import type { Frame } from './kit';

export const CAMARA_NAMES = {
  ring: (k: number): string => `Taller_Camara_Anillo_${k + 1}`,
  source: 'Taller_Camara_Fuente',
  halo: 'Taller_Camara_Halo',
} as const;

const STONE = '#5d5560';
const METAL = '#8a8378';
const COPPER = '#b0673d';
const SOURCE = '#fff0cf';

/** El pie y la columna, con el zócalo y sus garras (fijos: van en la malla de la casa). */
export function buildCamaraBase(parts: CentroParts, f: Frame): void {
  const steps: readonly [number, number, number][] = [
    [CAMARA_FOOT, -0.15, 0.3],
    [CAMARA_FOOT - 0.3, 0.15, 0.2],
    [CAMARA_FOOT - 0.6, 0.35, 0.17],
  ];
  for (const [radius, z, h] of steps) {
    parts.add(column(radius, radius - 0.04, h, 48), f.at([0, 0, z]), STONE, { solid: true });
  }
  parts.add(column(0.44, 0.27, 0.95, 32), f.at([0, 0, 0.5]), STONE, { solid: true });
  for (const [z, r] of [
    [0.66, 0.4],
    [1.08, 0.33],
    [1.3, 0.29],
  ] as const) {
    parts.add(plain(new TorusGeometry(r, 0.035, 10, 48)), f.at([0, 0, z]), COPPER);
  }
  // El zócalo: una copa de metal donde asienta la fuente.
  parts.add(column(0.2, 0.31, 0.16, 32), f.at([0, 0, 1.42]), METAL);
  parts.add(plain(new TorusGeometry(0.31, 0.04, 10, 48)), f.at([0, 0, 1.58]), METAL);
  for (let k = 0; k < 4; k++) {
    // Cuatro garras que suben abrazando la fuente.
    const claw = plain(new TorusGeometry(SOURCE_RADIUS + 0.05, 0.022, 6, 16, 1.75))
      .rotateZ(-Math.PI / 2)
      .rotateX(Math.PI / 2);
    parts.add(claw, f.at([0, 0, SOURCE_HEIGHT], [0, 0, (k * Math.PI) / 2 + Math.PI / 4]), METAL);
  }
}

/** Un anillo con sus muescas, ya inclinado, en el marco de su grupo (el centro de la fuente). */
function ring(parts: CentroParts, radius: number, tilt: number, world: Matrix4): void {
  const tiltM = new Matrix4().makeRotationX(tilt);
  parts.add(plain(new TorusGeometry(radius, 0.05, 12, 160)), world.clone().multiply(tiltM), METAL, {
    vary: 0,
  });
  parts.add(
    plain(new TorusGeometry(radius - 0.07, 0.018, 8, 160)),
    world.clone().multiply(tiltM),
    COPPER,
    { vary: 0 },
  );
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    const long = k % 9 === 0;
    const notch = softBox(0.035, long ? 0.16 : 0.09, 0.07, 0.012, 1);
    const at = new Matrix4()
      .makeRotationZ(a)
      .multiply(new Matrix4().makeTranslation(radius + 0.05, 0, 0))
      .multiply(new Matrix4().makeRotationZ(Math.PI / 2));
    parts.add(notch, world.clone().multiply(tiltM).multiply(at), METAL, { vary: 0 });
  }
}

/** Los dos anillos cruzados: un grupo cada uno, en el centro de la fuente, que gira sobre su Z (arriba). */
export function buildCamaraRings(
  f: Frame,
  material: Material,
  lighting: Lighting,
  random: () => number,
): Group[] {
  return CAMARA_RINGS.map(({ radius, tilt, speed }, k) => {
    const group = new Group();
    group.name = CAMARA_NAMES.ring(k);
    group.userData.spin = speed;
    const at = f.at([0, 0, SOURCE_HEIGHT]);
    at.decompose(group.position, group.quaternion, group.scale);
    const parts = new CentroParts(random);
    ring(parts, radius, tilt, at);
    group.add(parts.mesh(`${group.name}_Metal`, material, lighting, at.clone().invert()));
    return group;
  });
}

const HALO_VERTEX = /* glsl */ `
varying float vFacing;
void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vFacing = abs(dot(n, normalize(-view.xyz)));
  gl_Position = projectionMatrix * view;
}
`;

const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
varying float vFacing;
void main() {
  float a = pow(vFacing, 3.0) * uStrength;
  gl_FragColor = vec4(uColor * a, a);
}
`;

/** La fuente de poder (brilla sola) y su halo de luz. */
export function buildCamaraSource(f: Frame): Mesh[] {
  const source = new Mesh(
    new IcosahedronGeometry(SOURCE_RADIUS, 5),
    new MeshBasicMaterial({ color: new Color(SOURCE).multiplyScalar(1.6) }),
  );
  source.name = CAMARA_NAMES.source;
  f.at([0, 0, SOURCE_HEIGHT]).decompose(source.position, source.quaternion, source.scale);
  const halo = new Mesh(
    new SphereGeometry(SOURCE_RADIUS * 3.4, 32, 16),
    new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color('#ffcf8a') },
        uStrength: { value: 0.75 },
      },
      vertexShader: HALO_VERTEX,
      fragmentShader: HALO_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: BackSide,
    }),
  );
  halo.name = CAMARA_NAMES.halo;
  halo.position.copy(source.position);
  halo.renderOrder = 4;
  return [source, halo];
}
