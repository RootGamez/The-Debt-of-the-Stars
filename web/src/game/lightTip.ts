// El aviso de la luz de las antenas en el prólogo (lógica pura). La pieza de la isla del primer Albatros está al
// otro lado de casa, donde es de noche: al bajar de la nave cerca de ella, si la luz sigue apagada, sale arriba un
// aviso que dice que la L la enciende. Dura unos segundos y, si aún no se ha encendido, vuelve a salir de vez en
// cuando; en cuanto se enciende allí, se da por aprendido y no sale más.
import type { TaskId } from './tasks';

export const LIGHT_TIP = {
  /** La tarea durante la que se avisa. */
  task: 'isla' as TaskId,
  /** A menos de esto (m) de la pieza se avisa. */
  near: 160,
  /** Lo que dura el aviso a la vista (s de juego). */
  showFor: 10,
  /** Cuánto espera, tras irse, para volver a salir mientras siga apagada (s de juego). */
  every: 45,
} as const;

export interface LightTipFrame {
  /** La tarea de ahora. */
  task: TaskId | undefined;
  piloting: boolean;
  lightOn: boolean;
  /** Distancia (m) hasta lo que pide la tarea, si se sabe. */
  meters: number | undefined;
  /** Segundos de juego (0 en pausa o leyendo). */
  dt: number;
}

export class LightTip {
  private left = 0;
  private wait = 0;
  private learned = false;

  /** @returns si el aviso se ve ahora. */
  update(frame: LightTipFrame): boolean {
    if (this.learned) return false;
    const there = frame.task === LIGHT_TIP.task && !frame.piloting;
    if (frame.lightOn) {
      if (there) this.learned = true;
      this.left = 0;
      return false;
    }
    const near = there && frame.meters !== undefined && frame.meters < LIGHT_TIP.near;
    if (!near) {
      // Lejos (o volando) se olvida la cuenta: al volver a bajar cerca sale enseguida.
      this.left = 0;
      this.wait = 0;
      return false;
    }
    if (this.left > 0) {
      this.left = Math.max(0, this.left - frame.dt);
    } else {
      this.wait -= frame.dt;
      if (this.wait <= 0) {
        this.left = LIGHT_TIP.showFor;
        this.wait = LIGHT_TIP.every;
      }
    }
    return this.left > 0;
  }

  /** Ya se encendió la luz donde hacía falta: no se vuelve a avisar. */
  get done(): boolean {
    return this.learned;
  }
}
