// Paso fijo con acumulador: la física avanza siempre en pasos iguales aunque cambie la tasa de
// fotogramas. Un tope de pasos por fotograma evita la "espiral de lentitud" tras un parón.

export interface FixedStepOptions {
  stepSeconds: number;
  maxStepsPerFrame: number;
}

export interface FixedStep {
  /** Avanza el tiempo real del fotograma; devuelve la fracción (0..1) hacia el siguiente paso. */
  advance(frameSeconds: number): number;
}

export function createFixedStep(
  { stepSeconds, maxStepsPerFrame }: FixedStepOptions,
  step: (dt: number) => void,
): FixedStep {
  let accumulator = 0;
  return {
    advance(frameSeconds) {
      if (Number.isFinite(frameSeconds) && frameSeconds > 0) accumulator += frameSeconds;
      let steps = 0;
      while (accumulator >= stepSeconds && steps < maxStepsPerFrame) {
        step(stepSeconds);
        accumulator -= stepSeconds;
        steps++;
      }
      if (steps === maxStepsPerFrame && accumulator >= stepSeconds) {
        accumulator %= stepSeconds; // se descarta el tiempo que no se pudo simular
      }
      return accumulator / stepSeconds;
    },
  };
}
