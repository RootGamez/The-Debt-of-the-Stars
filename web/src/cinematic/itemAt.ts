/** El elemento `index` de una lista que se sabe que lo tiene (si no, es un fallo del guion: se avisa). */
export function itemAt<T>(list: readonly T[], index: number): T {
  const item = list[index];
  if (item === undefined) throw new RangeError(`no hay elemento ${index} (hay ${list.length})`);
  return item;
}
