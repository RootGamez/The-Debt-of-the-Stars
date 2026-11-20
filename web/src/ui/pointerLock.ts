// Capturar el puntero pidiendo el movimiento en crudo (`unadjustedMovement`): sin la aceleración de Windows y sin
// recentrar el cursor, que con ratones de 1000 Hz da saltos falsos de cientos de píxeles (la vista se teletransporta).
// Donde no se admite, se pide la captura normal.

type LockOptions = { unadjustedMovement?: boolean };
type Lockable = HTMLElement & { requestPointerLock(options?: LockOptions): unknown };

/** Pide la captura; la promesa falla si no se concede ni en crudo ni normal. */
export async function lockPointer(target: HTMLElement): Promise<void> {
  const element = target as Lockable;
  try {
    await Promise.resolve(element.requestPointerLock({ unadjustedMovement: true }));
    return;
  } catch {
    // sin movimiento en crudo (otro navegador o sistema): la captura de siempre
  }
  // Navegadores antiguos devuelven undefined en vez de una promesa; Promise.resolve cubre los dos casos.
  await Promise.resolve(element.requestPointerLock());
}
