// El suelo de la cara interior del Laboratorio: un tablero de ajedrez que se enrosca en espiral de un polo a otro
// de la cavidad. Las casillas se estrechan hacia los polos hasta hacerse un remolino, las juntas brillan con el
// frío de la Puerta y una onda lenta las recorre de un polo al otro: mires donde mires, el suelo gira.
import { Color, type Mesh, type MeshStandardMaterial } from 'three';

/** Sectores del tablero en una vuelta completa (en el ecuador, casillas de unos 3 m). */
export const BOARD_SECTORS = 40;
/** Filas de polo a polo. */
export const BOARD_ROWS = 20;
/** Cuántos sectores se tuerce el tablero por radián de latitud: el giro de la espiral. */
export const BOARD_TWIST = 6;
/** Velocidad de la onda que recorre las juntas (radianes por segundo). */
const WAVE_SPEED = 0.6;

/** La casilla (columna, fila) de un punto de la cara interior, en el marco del mundo (Z arriba). */
export function boardCell(
  x: number,
  y: number,
  z: number,
): { column: number; row: number; dark: boolean } {
  const length = Math.hypot(x, y, z) || 1;
  const lat = Math.asin(Math.min(1, Math.max(-1, z / length)));
  const lon = Math.atan2(y, x);
  const column = Math.floor((lon / (Math.PI * 2)) * BOARD_SECTORS + lat * BOARD_TWIST);
  const row = Math.floor((lat / Math.PI) * BOARD_ROWS);
  return { column, row, dark: (((column + row) % 2) + 2) % 2 === 0 };
}

/**
 * Pinta el tablero en espiral sobre `material` (sus colores de vértice siguen dando los estratos y el relieve) y
 * hace que `mesh` avance la onda en cada fotograma. Mismo cálculo que `boardCell`.
 */
export function applySpiralBoard(mesh: Mesh, material: MeshStandardMaterial, seam: Color): void {
  const uniforms = {
    uBoardTime: { value: 0 },
    uBoardSeam: { value: seam.clone() },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBoardPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBoardPos = transformed;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uBoardTime;
        uniform vec3 uBoardSeam;
        varying vec3 vBoardPos;
        float boardSeam;
        float boardWave;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec3 d = normalize(vBoardPos);
          float lat = asin(clamp(d.z, -1.0, 1.0));
          float lon = atan(d.y, d.x);
          vec2 cell = vec2(lon / (2.0 * PI) * ${BOARD_SECTORS.toFixed(1)} + lat * ${BOARD_TWIST.toFixed(1)},
                           lat / PI * ${BOARD_ROWS.toFixed(1)});
          vec2 f = fract(cell);
          vec2 id = floor(cell);
          float light = mod(id.x + id.y, 2.0);
          // Juntas de ancho constante en pantalla, sin dientes de sierra.
          vec2 w = fwidth(cell) * 1.4;
          vec2 e = smoothstep(vec2(0.0), w, min(f, 1.0 - f));
          boardSeam = 1.0 - e.x * e.y;
          boardWave = 0.5 + 0.5 * sin(lat * 7.0 - uBoardTime * ${WAVE_SPEED.toFixed(2)});
          diffuseColor.rgb = mix(diffuseColor.rgb * 0.3, diffuseColor.rgb * 1.22, light);
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += uBoardSeam * boardSeam * (0.25 + 1.1 * pow(boardWave, 6.0));
        totalEmissiveRadiance += uBoardSeam * 0.05 * pow(boardWave, 10.0);`,
      );
  };
  const start = performance.now();
  mesh.onBeforeRender = () => {
    uniforms.uBoardTime.value = (performance.now() - start) / 1000;
  };
}

/** El color de las juntas: el frío de la Puerta, algo apagado para no deslumbrar. */
export function boardSeamColor(fold: string): Color {
  return new Color(fold).multiplyScalar(0.55);
}
