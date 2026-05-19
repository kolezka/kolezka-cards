<script lang="ts">
  import { renderCustom } from '@kc/shared/svg/custom';
  import type { Block } from '@kc/shared/zod/card-config';
  import type { BuilderState, Corner } from './state.svelte';
  import { CLICK_SLOP_PX, clamp, snap, svgPoint } from './utils';
  import { MOCK_PREVIEW } from './mock-preview-data';

  type Props = { builder: BuilderState };
  let { builder }: Props = $props();

  let overlayEl = $state<SVGSVGElement | null>(null);

  let svgMarkup = $derived(
    renderCustom(builder.cfg, MOCK_PREVIEW, { width: builder.canvasW, height: builder.canvasH }),
  );

  // ── Pointer handlers for block move / resize ─────────────────────────
  function onBlockPointerDown(e: PointerEvent, block: Block) {
    e.stopPropagation();
    const wasSelected = builder.selectedId === block.id;
    builder.selectedId = block.id;
    const target = e.currentTarget as SVGElement;
    const ownerSvg = target.ownerSVGElement ?? (target as unknown as SVGSVGElement);
    const pt = svgPoint(ownerSvg, e.clientX, e.clientY, builder.canvasW, builder.canvasH);
    builder.dragging = {
      id: block.id,
      offsetX: pt.x - block.x,
      offsetY: pt.y - block.y,
      startClientX: e.clientX,
      startClientY: e.clientY,
      wasSelected,
      moved: false,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onHandlePointerDown(e: PointerEvent, block: Block, corner: Corner) {
    e.stopPropagation();
    builder.selectedId = block.id;
    builder.resizing = {
      id: block.id,
      corner,
      startX: block.x,
      startY: block.y,
      startW: block.w,
      startH: block.h,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onOverlayPointerMove(e: PointerEvent) {
    const svg = e.currentTarget as SVGSVGElement;
    const pt = svgPoint(svg, e.clientX, e.clientY, builder.canvasW, builder.canvasH);
    const drag = builder.dragging;
    const res = builder.resizing;
    if (drag) {
      // Suppress tiny shakes so a stationary click doesn't get treated as
      // a drag (which would prevent the click-to-deselect path below).
      if (!drag.moved) {
        const dx = Math.abs(e.clientX - drag.startClientX);
        const dy = Math.abs(e.clientY - drag.startClientY);
        if (dx < CLICK_SLOP_PX && dy < CLICK_SLOP_PX) return;
        drag.moved = true;
      }
      const nextX = clamp(snap(pt.x - drag.offsetX), 0, builder.canvasW - 8);
      const nextY = clamp(snap(pt.y - drag.offsetY), 0, builder.canvasH - 8);
      builder.updateBlock(drag.id, { x: nextX, y: nextY } as Partial<Block>);
    } else if (res) {
      const px = clamp(snap(pt.x), 0, builder.canvasW);
      const py = clamp(snap(pt.y), 0, builder.canvasH);
      let nx = res.startX;
      let ny = res.startY;
      let nw = res.startW;
      let nh = res.startH;
      const right = res.startX + res.startW;
      const bottom = res.startY + res.startH;
      if (res.corner === 'tl' || res.corner === 'bl') {
        nx = clamp(px, 0, right - 8);
        nw = right - nx;
      }
      if (res.corner === 'tr' || res.corner === 'br') {
        nw = clamp(px - res.startX, 8, builder.canvasW - res.startX);
      }
      if (res.corner === 'tl' || res.corner === 'tr') {
        ny = clamp(py, 0, bottom - 8);
        nh = bottom - ny;
      }
      if (res.corner === 'bl' || res.corner === 'br') {
        nh = clamp(py - res.startY, 8, builder.canvasH - res.startY);
      }
      builder.updateBlock(res.id, { x: nx, y: ny, w: nw, h: nh } as Partial<Block>);
    }
  }

  function onOverlayPointerUp() {
    // Click-toggle: if pointer didn't move AND the block was already
    // selected when this cycle started, treat it as a deselect. A normal
    // drag bypasses this because dragging.moved becomes true.
    const drag = builder.dragging;
    if (drag && !drag.moved && drag.wasSelected) {
      builder.selectedId = null;
    }
    builder.dragging = null;
    builder.resizing = null;
  }

  // ── Click-outside deselection ────────────────────────────────────────
  function maybeDeselect(e: MouseEvent) {
    if (e.target === e.currentTarget) builder.selectedId = null;
  }
  function onOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) builder.selectedId = null;
  }

  // ── Context menu opening ─────────────────────────────────────────────
  const MENU_WIDTH = 200;
  const MENU_HEIGHT_BLOCK = 360;
  const MENU_HEIGHT_EMPTY = 220;

  function openMenuAt(clientX: number, clientY: number, targetId: string | null) {
    let canvasX = 0;
    let canvasY = 0;
    if (overlayEl) {
      const pt = svgPoint(overlayEl, clientX, clientY, builder.canvasW, builder.canvasH);
      canvasX = pt.x;
      canvasY = pt.y;
    }
    const h = targetId ? MENU_HEIGHT_BLOCK : MENU_HEIGHT_EMPTY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = Math.min(clientX, vw - MENU_WIDTH - 8);
    const y = Math.min(clientY, vh - h - 8);
    builder.openMenu({ x, y, canvasX, canvasY, targetId });
  }

  function openCanvasMenu(e: MouseEvent) {
    // Right-clicking a block bubbles up to canvas-wrap. The block handler
    // already opened a block-targeted menu and stopped propagation; if we
    // reach here the click was on empty canvas area.
    e.preventDefault();
    openMenuAt(e.clientX, e.clientY, null);
  }

  function openBlockMenu(e: MouseEvent, block: Block) {
    e.preventDefault();
    e.stopPropagation();
    builder.selectedId = block.id;
    openMenuAt(e.clientX, e.clientY, block.id);
  }

  // ── Canvas drag-resize ───────────────────────────────────────────────
  function onCanvasResizeStart(e: PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!overlayEl) return;
    const rect = overlayEl.getBoundingClientRect();
    builder.canvasResize = {
      startX: e.clientX,
      startY: e.clientY,
      startW: builder.canvasW,
      startH: builder.canvasH,
      scaleX: rect.width / builder.canvasW,
      scaleY: rect.height / builder.canvasH,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onCanvasResizeMove(e: PointerEvent) {
    const cr = builder.canvasResize;
    if (!cr) return;
    const dxCanvas = (e.clientX - cr.startX) / (cr.scaleX || 1);
    const dyCanvas = (e.clientY - cr.startY) / (cr.scaleY || 1);
    builder.resizeCanvas(cr.startW + dxCanvas, cr.startH + dyCanvas);
  }

  function onCanvasResizeUp() {
    builder.canvasResize = null;
  }
</script>

<div
  class="canvas-wrap"
  onclick={maybeDeselect}
  oncontextmenu={openCanvasMenu}
  role="presentation"
>
  <div
    class="canvas"
    class:resizing={builder.canvasResize !== null}
    style="aspect-ratio: {builder.canvasW}/{builder.canvasH}; max-width: {builder.canvasW}px;"
  >
    <div class="svg-bg" aria-hidden="true">
      <!-- Real renderer output, used as a faithful preview. -->
      {@html svgMarkup}
    </div>
    <svg
      class="overlay"
      bind:this={overlayEl}
      viewBox="0 0 {builder.canvasW} {builder.canvasH}"
      preserveAspectRatio="none"
      onclick={onOverlayClick}
      onpointermove={onOverlayPointerMove}
      onpointerup={onOverlayPointerUp}
      onpointerleave={onOverlayPointerUp}
      role="presentation"
    >
      {#each builder.cfg.blocks as block (block.id)}
        <rect
          class="hit"
          class:selected={block.id === builder.selectedId}
          x={block.x}
          y={block.y}
          width={block.w}
          height={block.h}
          onpointerdown={(e) => onBlockPointerDown(e, block)}
          oncontextmenu={(e) => openBlockMenu(e, block)}
          role="button"
          tabindex="0"
          aria-label={`${block.kind} block`}
        />
        {#if block.id === builder.selectedId}
          <!-- 4 corner resize handles. 8x8 squares centered on each corner.
               Each has its own pointerdown so the parent rect's drag handler
               doesn't fire. -->
          {#each [
            { corner: 'tl' as const, cx: block.x, cy: block.y, cursor: 'nwse-resize' },
            { corner: 'tr' as const, cx: block.x + block.w, cy: block.y, cursor: 'nesw-resize' },
            { corner: 'bl' as const, cx: block.x, cy: block.y + block.h, cursor: 'nesw-resize' },
            { corner: 'br' as const, cx: block.x + block.w, cy: block.y + block.h, cursor: 'nwse-resize' },
          ] as h (h.corner)}
            <rect
              class="handle"
              x={h.cx - 4}
              y={h.cy - 4}
              width="8"
              height="8"
              style:cursor={h.cursor}
              onpointerdown={(e) => onHandlePointerDown(e, block, h.corner)}
              role="presentation"
            />
          {/each}
        {/if}
      {/each}
    </svg>
    <!-- Canvas drag-resize handle. Lives in the SE corner of the rendered
         card and adjusts cfg.size in canvas units (display→canvas scale
         from the overlay's bounding rect). Mirrors the same 200–1200 /
         80–600 limits as the page-level Size (optional) inputs. -->
    <div
      class="canvas-resize"
      role="button"
      tabindex="0"
      aria-label="Resize canvas"
      title="Drag to resize canvas (snaps to 8px)"
      onpointerdown={onCanvasResizeStart}
      onpointermove={onCanvasResizeMove}
      onpointerup={onCanvasResizeUp}
      onpointercancel={onCanvasResizeUp}
    ></div>
  </div>
</div>

<style>
  .canvas-wrap {
    position: relative;
    background: repeating-linear-gradient(
        0deg,
        var(--glass-1),
        var(--glass-1) 8px,
        transparent 8px,
        transparent 16px
      ),
      repeating-linear-gradient(
        90deg,
        var(--glass-1),
        var(--glass-1) 8px,
        transparent 8px,
        transparent 16px
      ),
      var(--surface-1);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-md);
    padding: 20px;
    min-height: 200px;
    cursor: default;
  }
  .canvas {
    position: relative;
    margin: 0 auto;
    box-shadow: var(--shadow-2);
  }
  .canvas.resizing {
    user-select: none;
  }
  .canvas-resize {
    position: absolute;
    bottom: -7px;
    right: -7px;
    width: 14px;
    height: 14px;
    background: var(--accent);
    border: 2px solid var(--surface-1);
    border-radius: 3px;
    cursor: nwse-resize;
    z-index: 2;
    touch-action: none;
    transition: transform var(--dur-fast) var(--ease-glass);
  }
  .canvas-resize:hover {
    transform: scale(1.18);
  }
  .svg-bg :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
  .overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: auto;
  }
  .overlay .hit {
    fill: transparent;
    stroke: transparent;
    stroke-width: 1.5;
    cursor: grab;
  }
  .overlay .hit:hover {
    stroke: var(--accent);
    stroke-dasharray: 4 3;
  }
  .overlay .hit.selected {
    stroke: var(--accent);
    stroke-dasharray: 0;
    stroke-width: 2;
    fill: rgba(255, 255, 255, 0.04);
  }
  .overlay .handle {
    fill: var(--accent);
    stroke: var(--surface-1);
    stroke-width: 1;
  }
  .overlay .handle:hover {
    fill: var(--text-1);
  }
</style>
