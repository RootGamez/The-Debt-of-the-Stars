// Los materiales de los Ausentes vivos (plan de finales, E3; 🟡 Anthony 2026-11-14: «menos low poly»): todo con
// sombreado suave. La cerámica lleva una capa de barniz (clearcoat), el vidrio de la cabeza es oscuro y pulido con un
// poco de luz dentro, la tela pesada tiene el brillo aterciopelado de la lana (sheen) y se ve por las dos caras, y el
// metal (cobre, oro viejo y el acero de las herramientas) es metálico a medias con un poco de luz propia: sin mapa de
// entorno, un metal de verdad se vería negro a contraluz. Cada Ausente tiene los suyos (se congelan por separado).
import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';
import type { AbsentPartKind, AbsentContext } from './absentParts';

/** Brillo del signo y de los dibujos de la cabeza a pose 1 (como las luces de los murales de Umbral). */
export const SIGN_GLOW = 2.6;
export const PATTERN_GLOW = 2.2;

const CERAMIC = { roughness: 0.42, clearcoat: 0.35 } as const;
const METAL = { roughness: 0.36, metalness: 0.58 } as const;
const CLOTH = { roughness: 0.88, sheen: 0.25 } as const;
const GLASS = { roughness: 0.12, depth: 0.015, clearcoat: 1 } as const;

/** La escarcha: la cerámica azulada y mate, el metal empañado, la tela blanquecina y el vidrio lechoso. */
const FROST = {
  ceramic: new Color('#bcd6ea'),
  metal: new Color('#a9c4d4'),
  cloth: new Color('#c2d6ea'),
  glass: new Color('#5c7488'),
} as const;
const WHITE = new Color('#ffffff');

export type AbsentMaterials = Record<AbsentPartKind, MeshStandardMaterial>;

export function createAbsentMaterials(c: AbsentContext): AbsentMaterials {
  return {
    ceramic: new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: CERAMIC.roughness,
      clearcoat: CERAMIC.clearcoat,
      clearcoatRoughness: 0.35,
    }),
    metal: new MeshStandardMaterial({
      vertexColors: true,
      roughness: METAL.roughness,
      metalness: METAL.metalness,
      emissive: '#3b2412',
      emissiveIntensity: 0.35,
    }),
    cloth: new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: CLOTH.roughness,
      sheen: CLOTH.sheen,
      sheenRoughness: 0.8,
      sheenColor: '#d6cbb8',
      side: DoubleSide,
    }),
    glass: new MeshPhysicalMaterial({
      color: c.look.glass,
      emissive: c.look.glow,
      emissiveIntensity: GLASS.depth,
      roughness: GLASS.roughness,
      metalness: 0.2,
      clearcoat: GLASS.clearcoat,
      clearcoatRoughness: 0.06,
    }),
    glow: new MeshStandardMaterial({
      color: '#10181c',
      emissive: c.look.glow,
      emissiveIntensity: PATTERN_GLOW,
      roughness: 0.4,
    }),
    sign: new MeshStandardMaterial({
      color: '#10181c',
      emissive: c.look.sign,
      emissiveIntensity: SIGN_GLOW,
      roughness: 0.4,
    }),
    frost: new MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 1,
      transparent: true,
      opacity: 0.85,
    }),
  };
}

const physical = (m: MeshStandardMaterial): MeshPhysicalMaterial | undefined =>
  m instanceof MeshPhysicalMaterial ? m : undefined;

/** Congela (1) o deshiela (0) los materiales: color, aspereza, barniz y la luz de dentro del vidrio. */
export function frostMaterials(materials: AbsentMaterials, glass: Color, frost: number): void {
  const f = Math.min(1, Math.max(0, frost));
  const { ceramic, metal, cloth } = materials;
  ceramic.color.copy(WHITE).lerp(FROST.ceramic, f);
  ceramic.roughness = CERAMIC.roughness + 0.55 * f;
  const coat = physical(ceramic);
  // (Nunca a 0: el barniz y el brillo de la lana que se apagan del todo recompilan el sombreador.)
  if (coat) coat.clearcoat = CERAMIC.clearcoat * (1 - 0.9 * f);
  metal.color.copy(WHITE).lerp(FROST.metal, f);
  metal.metalness = METAL.metalness * (1 - 0.8 * f);
  metal.roughness = METAL.roughness + 0.5 * f;
  cloth.color.copy(WHITE).lerp(FROST.cloth, f);
  cloth.roughness = CLOTH.roughness + (1 - CLOTH.roughness) * f;
  const wool = physical(cloth);
  if (wool) wool.sheen = CLOTH.sheen * (1 - 0.7 * f);
  materials.glass.color.copy(glass).lerp(FROST.glass, f);
  materials.glass.roughness = GLASS.roughness + 0.6 * f;
  materials.glass.emissiveIntensity = GLASS.depth * (1 - f);
  const varnish = physical(materials.glass);
  if (varnish) varnish.clearcoat = GLASS.clearcoat * (1 - 0.8 * f);
  materials.frost.opacity = 0.85 * f;
}
