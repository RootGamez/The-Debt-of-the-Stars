// Girar la vista hacia un punto (Fase 10E: el final A mira a la Luna; con `?debug`, `aimAt`).
import { Vector3, type Camera } from 'three';
import type { Player } from '../core/player';

const toward = new Vector3();

/** Gira la vista hacia `where` (en el mundo): `share` es la parte del giro que se hace ahora (1 = de golpe). */
export function aimToward(player: Player, camera: Camera, where: Vector3, share = 1): void {
  // La dirección en el marco del cuerpo: el giro va sobre su vertical y el cabeceo, aparte.
  const local = toward
    .copy(where)
    .sub(camera.position)
    .normalize()
    .applyQuaternion(player.state.body.clone().invert());
  const level = Math.hypot(local.x, local.z);
  const yaw = Math.atan2(-local.x, -local.z);
  const pitch = Math.atan2(local.y, level) - player.pitch;
  player.look(yaw * share, pitch * share);
}
