// Varias fuentes de acciones a la vez (el Contrapeso, las campanas del Anfiteatro, el epílogo…): cada una se ocupa de
// sus fuentes y de las demás no dice nada. Gana la primera que da un verbo.
import type { SourceActions } from './readingUi';

export function composeActions(
  parts: readonly (SourceActions | undefined)[],
  /** Se avisa con el verbo de lo que se acaba de hacer (para darle un sonido). */
  onRun?: (verb: string) => void,
): SourceActions | undefined {
  const list = parts.filter((part): part is SourceActions => part !== undefined);
  if (list.length === 0) return undefined;
  const ambients = list.flatMap((part) => (part.ambient ? [part.ambient] : []));
  return {
    ...(ambients.length > 0 && {
      ambient: {
        verb: () => {
          for (const ambient of ambients) {
            const verb = ambient.verb();
            if (verb !== undefined) return verb;
          }
          return undefined;
        },
        run: () => {
          ambients.find((ambient) => ambient.verb() !== undefined)?.run();
        },
      },
    }),
    gone: (id) => list.some((part) => part.gone(id)),
    verb: (id, unread) => {
      for (const part of list) {
        const verb = part.verb(id, unread);
        if (verb !== undefined) return verb;
      }
      return undefined;
    },
    run: (id) => {
      const owner = list.find((part) => part.verb(id, false) !== undefined);
      if (!owner) return;
      const verb = owner.verb(id, false);
      owner.run(id);
      if (verb !== undefined) onRun?.(verb);
    },
  };
}
