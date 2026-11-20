/**
 * Que three no guarde en cajas cada número de sus uniformes.
 *
 * three guarda en cada uniforme el último valor que mandó a la GPU (`cache`), y todos esos arrays nacen del mismo
 * `[]`. En cuanto uno guarda un booleano (los uniformes `bool` como `isOrthographic` o `receiveShadow`), V8 aprende
 * que de ese `[]` salen arrays de objetos: desde entonces los crea así y, al copiar en ellos, convierte también los
 * que solo tenían números. En un array de objetos cada número que cambia (las matrices de cada objeto, en cada
 * fotograma) se guarda en una caja nueva: basura que el recolector barre a tirones.
 *
 * Basta con que ningún uniforme `bool` guarde un booleano: se envían como 0 o 1 (lo mismo para la GPU). Hay que
 * instalarlo antes de compilar el primer programa: se engancha a la lista de programas del renderer y arregla cada
 * uno la primera vez que three lee sus uniformes, antes de mandar ningún valor. Si three cambia por dentro, no hace
 * nada.
 */

/** Tipo de GL de los uniformes `bool`. */
const GL_BOOL = 0x8b56;

/** Lo que se necesita de un programa de three (`WebGLProgram`). */
export interface ProgramLike {
  getUniforms(): unknown;
}

type Setter = (this: unknown, gl: unknown, value: unknown, textures: unknown) => void;

interface UniformNode {
  type?: unknown;
  setValue?: unknown;
  cache?: unknown;
  seq?: unknown;
}

const patchedLists = new WeakSet();

function isNode(value: unknown): value is UniformNode {
  return typeof value === 'object' && value !== null;
}

function asNumber(value: unknown): unknown {
  if (value === true) return 1;
  if (value === false) return 0;
  return value;
}

/** Los `bool` sueltos (con `cache`) pasan a enviar 0 o 1; los de structs, igual; el resto no se toca. */
function numericBooleans(node: UniformNode): void {
  if (node.type === GL_BOOL && Array.isArray(node.cache) && typeof node.setValue === 'function') {
    const set = node.setValue as Setter;
    node.setValue = function (this: unknown, gl: unknown, value: unknown, textures: unknown): void {
      set.call(this, gl, asNumber(value), textures);
    } satisfies Setter;
  }
  if (Array.isArray(node.seq)) {
    for (const child of node.seq) if (isNode(child)) numericBooleans(child);
  }
}

/** La primera vez que se leen sus uniformes, los arregla y deja el método como estaba. */
function watchProgram(program: unknown): void {
  if (!isNode(program)) return;
  const target = program as Partial<ProgramLike>;
  const original = target.getUniforms;
  if (typeof original !== 'function') return;
  target.getUniforms = function (this: unknown): unknown {
    target.getUniforms = original;
    const uniforms = original.call(this);
    if (isNode(uniforms)) numericBooleans(uniforms);
    return uniforms;
  };
}

/**
 * Engancha `programs` (`renderer.info.programs`): cada programa que three añada se arregla antes de usarse.
 * Devuelve si pudo engancharse.
 */
export function keepUniformCachesNumeric(programs: unknown[] | null | undefined): boolean {
  if (!Array.isArray(programs)) return false;
  if (patchedLists.has(programs)) return true;
  patchedLists.add(programs);
  for (const program of programs) watchProgram(program);
  const list: unknown[] = programs;
  Object.defineProperty(list, 'push', {
    configurable: true,
    writable: true,
    value: (...items: unknown[]): number => {
      for (const item of items) watchProgram(item);
      return Array.prototype.push.apply(list, items);
    },
  });
  return true;
}
