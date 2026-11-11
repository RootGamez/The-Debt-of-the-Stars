// Mantener pulsado en el teléfono no debe seleccionar texto, abrir el menú del navegador, arrastrar la imagen ni
// hacer zoom con dos dedos sobre el juego. El CSS (`html.is-touch`, touch.css) hace la mayor parte; aquí van los
// eventos que el CSS no alcanza (menú contextual, inicio de selección, arrastre, gesto de pellizco de iOS).

/** Clase que lleva `<html>` en pantallas táctiles; los estilos de touch.css cuelgan de ella. */
export const TOUCH_CLASS = 'is-touch';

/** Lo que hace falta de un nodo para saber si ahí se escribe (se prueba sin DOM). */
interface NodeLike {
  tagName?: string;
  isContentEditable?: boolean;
  nodeType?: number;
  parentElement?: NodeLike | null;
}

const TEXT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const TEXT_NODE = 3;

/** ¿Es un campo donde se escribe (o un trozo de texto dentro de uno)? Ahí la selección y el menú sí valen. */
export function isTextEntry(target: unknown): boolean {
  if (typeof target !== 'object' || target === null) return false;
  const node = target as NodeLike;
  if (node.nodeType === TEXT_NODE) return isTextEntry(node.parentElement);
  if (node.isContentEditable === true) return true;
  return node.tagName !== undefined && TEXT_TAGS.has(node.tagName.toUpperCase());
}

/** Lo que se usa del evento (un `Event` del navegador cumple, y en las pruebas basta un objeto). */
export interface GuardEvent {
  readonly target: unknown;
  preventDefault(): void;
}

/** Lo que se usa del documento (el `document` del navegador cumple). */
export interface GuardDocument {
  readonly documentElement: { readonly classList: Pick<DOMTokenList, 'add' | 'remove'> };
  addEventListener(
    type: string,
    listener: (event: GuardEvent) => void,
    options?: AddEventListenerOptions,
  ): void;
}

export interface GuardOptions {
  /** En qué elementos se cancela el pellizco de iOS (el lienzo y los controles; no los paneles de texto). */
  blocksGesture?: (target: unknown) => boolean;
}

/** Eventos que se cancelan en todo el documento salvo en los campos de texto. */
const CANCELLED = ['contextmenu', 'selectstart', 'dragstart'] as const;
/** El pellizco de iOS Safari (no existe en otros navegadores, donde `touch-action` ya lo impide). */
const GESTURES = ['gesturestart', 'gesturechange'] as const;

/** Activa las guardas y devuelve la función que las quita. */
export function installTouchGuards(doc: GuardDocument, options: GuardOptions = {}): () => void {
  const abort = new AbortController();
  const { signal } = abort;
  doc.documentElement.classList.add(TOUCH_CLASS);

  for (const type of CANCELLED) {
    doc.addEventListener(
      type,
      (event) => {
        if (!isTextEntry(event.target)) event.preventDefault();
      },
      { signal },
    );
  }
  const { blocksGesture } = options;
  if (blocksGesture) {
    for (const type of GESTURES) {
      doc.addEventListener(
        type,
        (event) => {
          if (blocksGesture(event.target)) event.preventDefault();
        },
        { signal, passive: false },
      );
    }
  }

  return () => {
    abort.abort();
    doc.documentElement.classList.remove(TOUCH_CLASS);
  };
}
