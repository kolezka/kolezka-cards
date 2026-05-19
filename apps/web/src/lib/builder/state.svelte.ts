import type { Block, CustomConfig } from '@kc/shared/zod/card-config';
import { type BlockKind, GRID, clamp, defaultBlock, newId, snap } from './utils';

// Drag-to-move state. Only set while the user is actively dragging a block.
export type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  wasSelected: boolean;
  moved: boolean;
};

// Corner-resize state. Only set while a block's corner handle is being dragged.
export type Corner = 'tl' | 'tr' | 'bl' | 'br';
export type ResizeState = {
  id: string;
  corner: Corner;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
};

// Canvas drag-resize state. Set while the SE canvas handle is being dragged.
export type CanvasResizeState = {
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  scaleX: number;
  scaleY: number;
};

// Right-click context menu state. `targetId` is the block under the cursor,
// or null for an empty-canvas right-click.
export type MenuState = {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  targetId: string | null;
};

export type BuilderState = ReturnType<typeof createBuilderState>;

/**
 * Factory for all reactive state and actions used by the card builder.
 * The parent component owns the `cfg` prop and a `commit` callback; the
 * factory closes over them via getters so reads stay reactive even though
 * cfg is passed by-value as a prop.
 */
export function createBuilderState(
  getCfg: () => CustomConfig,
  commit: (patch: Partial<CustomConfig>) => void,
) {
  let selectedId = $state<string | null>(null);
  let dragging = $state<DragState | null>(null);
  let resizing = $state<ResizeState | null>(null);
  let canvasResize = $state<CanvasResizeState | null>(null);
  let menu = $state<MenuState | null>(null);

  function canvasW(): number {
    return getCfg().size?.width ?? 480;
  }
  function canvasH(): number {
    return getCfg().size?.height ?? 300;
  }

  function addBlock(kind: BlockKind, at?: { x: number; y: number }) {
    const block = defaultBlock(kind);
    if (at) {
      block.x = clamp(snap(at.x), 0, Math.max(0, canvasW() - block.w));
      block.y = clamp(snap(at.y), 0, Math.max(0, canvasH() - block.h));
    }
    commit({ blocks: [...getCfg().blocks, block] });
    selectedId = block.id;
  }

  function removeBlock(id: string) {
    commit({ blocks: getCfg().blocks.filter((b) => b.id !== id) });
    if (selectedId === id) selectedId = null;
  }

  function duplicateBlock(id: string) {
    const src = getCfg().blocks.find((b) => b.id === id);
    if (!src) return;
    const copy = {
      ...(src as Block),
      id: newId(),
      x: clamp(snap(src.x + GRID * 2), 0, Math.max(0, canvasW() - src.w)),
      y: clamp(snap(src.y + GRID * 2), 0, Math.max(0, canvasH() - src.h)),
    } as Block;
    commit({ blocks: [...getCfg().blocks, copy] });
    selectedId = copy.id;
  }

  function bringToFront(id: string) {
    const blocks = getCfg().blocks;
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1 || idx === blocks.length - 1) return;
    const next = blocks.slice();
    const [b] = next.splice(idx, 1);
    if (!b) return;
    next.push(b);
    commit({ blocks: next });
  }

  function sendToBack(id: string) {
    const blocks = getCfg().blocks;
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx <= 0) return;
    const next = blocks.slice();
    const [b] = next.splice(idx, 1);
    if (!b) return;
    next.unshift(b);
    commit({ blocks: next });
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    commit({
      blocks: getCfg().blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)),
    });
  }

  // Keyboard nudge: apply a delta in pixels, clamped to the canvas. Snaps
  // to keep the block aligned with the 8px grid even if the previous value
  // was off-grid for any reason (e.g. an old import).
  function nudgeBlock(id: string, dx: number, dy: number) {
    const b = getCfg().blocks.find((x) => x.id === id);
    if (!b) return;
    const x = clamp(snap(b.x + dx), 0, Math.max(0, canvasW() - b.w));
    const y = clamp(snap(b.y + dy), 0, Math.max(0, canvasH() - b.h));
    if (x === b.x && y === b.y) return;
    updateBlock(id, { x, y } as Partial<Block>);
  }

  function resizeCanvas(width: number, height: number) {
    const w = clamp(snap(width), 200, 1200);
    const h = clamp(snap(height), 80, 600);
    const cur = getCfg().size ?? {};
    if (w !== (cur.width ?? canvasW()) || h !== (cur.height ?? canvasH())) {
      commit({ size: { width: w, height: h } });
    }
  }

  function openMenu(args: MenuState) {
    menu = args;
  }
  function closeMenu() {
    menu = null;
  }

  return {
    // reactive reads
    get cfg() {
      return getCfg();
    },
    get canvasW() {
      return canvasW();
    },
    get canvasH() {
      return canvasH();
    },
    get selectedId() {
      return selectedId;
    },
    set selectedId(v: string | null) {
      selectedId = v;
    },
    get selected(): Block | null {
      const id = selectedId;
      if (!id) return null;
      return getCfg().blocks.find((b) => b.id === id) ?? null;
    },
    get dragging() {
      return dragging;
    },
    set dragging(v: DragState | null) {
      dragging = v;
    },
    get resizing() {
      return resizing;
    },
    set resizing(v: ResizeState | null) {
      resizing = v;
    },
    get canvasResize() {
      return canvasResize;
    },
    set canvasResize(v: CanvasResizeState | null) {
      canvasResize = v;
    },
    get menu() {
      return menu;
    },
    // actions
    addBlock,
    removeBlock,
    duplicateBlock,
    bringToFront,
    sendToBack,
    updateBlock,
    nudgeBlock,
    resizeCanvas,
    openMenu,
    closeMenu,
  };
}
