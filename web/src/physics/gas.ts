// Los gigantes de gas (el Taller, Fase 11F): bajo la capa de nubes no hay suelo y hundirse en ellas acaba el
// ciclo (causa `gas`), a pie o con la nave. Solo la sala del centro, dentro del radio seguro, queda a salvo.
import type { Vector3 } from 'three';
import type { WorldInfo } from '../worlds/markers';

export type GasLayer = NonNullable<WorldInfo['gas']>;

/** Si en `position` (marco del mundo, centro en `center`) las nubes ya matan. */
export function sunkInGas(position: Vector3, center: Vector3, gas: GasLayer | undefined): boolean {
  if (!gas) return false;
  const distance = position.distanceTo(center);
  return distance < gas.lethal && distance > gas.safe;
}
