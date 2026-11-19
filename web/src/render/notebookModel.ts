// Tu cuaderno de verdad, en tres dimensiones (F4, la escena del nido): tapas de cuero, el canto de las hojas y, en
// cada doble página, las páginas de tu Registro pintadas como en el libro del juego (ui/notebookCanvas.ts). Se abre y
// se cierra por el lomo y pasa hojas (una hoja que gira por el lomo con la página de antes por delante y la de después
// por detrás). Las texturas se pintan al pedirlas y se repintan cuando llega la letra a mano.
//
// Marco del cuaderno: el origen en el lomo, +X hacia la página derecha, +Y hacia arriba del texto (lejos de quien
// lee) y +Z saliendo de las páginas (hacia los ojos de quien lee).
import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
  type Material,
} from 'three';
import type { NotebookPage } from '../registry/notebookPages';
import { drawNotebookPage, PAPER } from '../ui/notebookCanvas';

/** Medidas (m): la página, la tapa (algo mayor), el grueso de cada mitad de hojas y el de la tapa. */
export const NOTEBOOK = {
  pageWidth: 0.165,
  pageHeight: 0.215,
  coverWidth: 0.174,
  coverHeight: 0.226,
  block: 0.011,
  board: 0.004,
} as const;
/** El lienzo de cada página (px): alto de sobra para que se lea de cerca. */
const CANVAS_HEIGHT = 900;
const CANVAS_WIDTH = Math.round((CANVAS_HEIGHT * NOTEBOOK.pageWidth) / NOTEBOOK.pageHeight);
/** La letra a mano que pide el papel (se espera antes de repintar). */
const HAND_FONTS = ["500 40px 'Caveat'", "700 40px 'Caveat'"];

export interface NotebookView {
  open: number;
  spread: number;
  turning?: { from: number; to: number; progress: number };
}

export interface NotebookModel {
  object: Group;
  /** Abierto o cerrado, la doble página a la vista y la hoja que pasa. */
  set(view: NotebookView): void;
  /** El centro de una página abierta (marco del cuaderno). */
  pageCenter(side: 'left' | 'right'): Vector3;
  dispose(): void;
}

export function createNotebookModel(pages: readonly NotebookPage[]): NotebookModel {
  const textures = new Map<number, CanvasTexture>();
  const disposable: { dispose(): void }[] = [];
  const blank = new MeshStandardMaterial({ color: PAPER.paper, roughness: 0.92 });
  const leather = new MeshStandardMaterial({ color: '#6b452b', roughness: 0.78, metalness: 0.02 });
  const edges = new MeshStandardMaterial({ color: '#e6d6b2', roughness: 0.95 });
  disposable.push(blank, leather, edges);

  function texture(index: number): CanvasTexture | undefined {
    if (index < 1 || index >= pages.length) return undefined;
    const known = textures.get(index);
    if (known) return known;
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    drawNotebookPage(ctx, pages[index], index, CANVAS_WIDTH, CANVAS_HEIGHT);
    const made = new CanvasTexture(canvas);
    made.colorSpace = SRGBColorSpace;
    made.anisotropy = 8;
    textures.set(index, made);
    disposable.push(made);
    return made;
  }

  // Cuando llega la letra a mano, se repinta lo ya pintado (si no llega, se queda la de respaldo).
  if (typeof document !== 'undefined' && 'fonts' in document) {
    Promise.all(HAND_FONTS.map((font) => document.fonts.load(font)))
      .then(() => {
        for (const [index, made] of textures) {
          const canvas = made.image;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          drawNotebookPage(ctx, pages[index], index, CANVAS_WIDTH, CANVAS_HEIGHT);
          made.needsUpdate = true;
        }
      })
      .catch(() => {
        // sin la letra a mano se queda la de respaldo del sistema
      });
  }

  const pageMaterial = (index: number): MeshStandardMaterial => {
    const map = texture(index);
    const material = new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.9,
      map: map ?? null,
    });
    if (!map) material.color.set(PAPER.paper);
    disposable.push(material);
    return material;
  };
  const materials = new Map<number, MeshStandardMaterial>();
  const materialOf = (index: number): Material => {
    if (index < 1 || index >= pages.length) return blank;
    let found = materials.get(index);
    if (!found) {
      found = pageMaterial(index);
      materials.set(index, found);
    }
    return found;
  };

  const { pageWidth, pageHeight, coverWidth, coverHeight, block, board } = NOTEBOOK;
  const boardGeometry = new BoxGeometry(coverWidth, coverHeight, board);
  const blockGeometry = new BoxGeometry(pageWidth, pageHeight, block);
  const pageGeometry = new PlaneGeometry(pageWidth, pageHeight);
  disposable.push(boardGeometry, blockGeometry, pageGeometry);

  /** Media libreta (la tapa, las hojas y la página de encima), hacia `side` del lomo. */
  function half(side: -1 | 1): { group: Group; page: Mesh } {
    const group = new Group();
    const cover = new Mesh(boardGeometry, leather);
    cover.position.set((side * coverWidth) / 2, 0, -block / 2 - board / 2);
    const leaves = new Mesh(blockGeometry, edges);
    leaves.position.set((side * pageWidth) / 2, 0, 0);
    const page = new Mesh(pageGeometry, blank);
    page.position.set((side * pageWidth) / 2, 0, block / 2 + 0.0004);
    for (const mesh of [cover, leaves]) mesh.castShadow = true;
    group.add(cover, leaves, page);
    return { group, page };
  }
  const left = half(-1);
  const right = half(1);
  // La hoja que pasa: dos caras, la de delante (antes) y la de detrás (después).
  const leaf = new Group();
  const leafFront: Mesh = new Mesh(pageGeometry, blank);
  leafFront.position.set(pageWidth / 2, 0, 0.0002);
  const leafBack: Mesh = new Mesh(pageGeometry, blank);
  leafBack.rotation.y = Math.PI;
  leafBack.position.set(pageWidth / 2, 0, -0.0002);
  leaf.add(leafFront, leafBack);
  leaf.position.z = block / 2 + 0.001;
  leaf.visible = false;

  const object = new Group();
  object.name = 'Cuaderno';
  object.add(left.group, right.group, leaf);

  return {
    object,
    set(view) {
      const open = Math.min(1, Math.max(0, view.open));
      // Cerrado, la mitad derecha se dobla por el lomo sobre la izquierda (y sube un grueso de hojas para no meterse
      // en ella).
      right.group.rotation.y = -Math.PI * (1 - open);
      right.group.position.z = (block + 0.001) * (1 - open);
      const turning = view.turning && open > 0.99 ? view.turning : undefined;
      leaf.visible = turning !== undefined;
      if (!turning) {
        left.page.material = materialOf(view.spread * 2 - 1);
        right.page.material = materialOf(view.spread * 2);
        return;
      }
      const forward = turning.to > turning.from;
      const k = turning.progress * turning.progress * (3 - 2 * turning.progress);
      if (forward) {
        // Hacia delante: la hoja derecha de antes gira hacia la izquierda y enseña la izquierda de después.
        left.page.material = materialOf(turning.from * 2 - 1);
        right.page.material = materialOf(turning.to * 2);
        leafFront.material = materialOf(turning.from * 2);
        leafBack.material = materialOf(turning.to * 2 - 1);
        leaf.rotation.y = -Math.PI * k;
      } else {
        // Hacia atrás: la hoja izquierda de antes vuelve a la derecha.
        left.page.material = materialOf(turning.to * 2 - 1);
        right.page.material = materialOf(turning.from * 2);
        leafFront.material = materialOf(turning.to * 2);
        leafBack.material = materialOf(turning.from * 2 - 1);
        leaf.rotation.y = -Math.PI * (1 - k);
      }
      // La hoja se levanta un poco en el aire mientras pasa.
      leaf.position.z = block / 2 + 0.001 + Math.sin(Math.PI * k) * 0.004;
    },
    pageCenter(side) {
      return new Vector3(((side === 'left' ? -1 : 1) * pageWidth) / 2, 0, block / 2);
    },
    dispose() {
      object.removeFromParent();
      for (const item of disposable) item.dispose();
      textures.clear();
      materials.clear();
    },
  };
}
