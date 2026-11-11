// El sonido de manejar un objeto, según el verbo de la acción (el mismo que ve el jugador en el aviso): coger,
// poner, soltar. Los demás verbos no suenan.
const CARRY_SOUNDS: Readonly<Record<string, string>> = {
  coger: 'carry.pickup',
  recoger: 'carry.pickup',
  pinzar: 'carry.pickup',
  poner: 'carry.snap',
  dejar: 'carry.snap',
  echar: 'carry.snap',
  tirar: 'carry.snap',
  soltar: 'carry.drop',
};

export function carrySoundOf(verb: string): string | undefined {
  return CARRY_SOUNDS[verb];
}
