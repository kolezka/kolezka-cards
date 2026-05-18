<script lang="ts">
  import { renderCustom, type CustomData } from '@kc/shared/svg/custom';
  import type {
    BadgeBlock,
    Block,
    CustomConfig,
    ImageBlock,
    SparklineBlock,
    StatBlock,
    TextBlock,
  } from '@kc/shared/zod/card-config';
  import { Glass, GlassButton, GlassInput, GlassSelect, GlassToggle } from '$lib/ui';

  // Controlled component: parent passes the current cfg snapshot and a
  // change handler. Avoids `bind:` type friction with the page's loose
  // multi-card LooseConfig state.
  type Props = {
    cfg: CustomConfig;
    onChange: (next: CustomConfig) => void;
  };
  let { cfg, onChange }: Props = $props();

  function commit(patch: Partial<CustomConfig>): void {
    onChange({ ...cfg, ...patch } as CustomConfig);
  }

  const GRID = 8;
  const PALETTE: Array<{ kind: Block['kind']; label: string }> = [
    { kind: 'text', label: 'Text' },
    { kind: 'stat', label: 'Stat' },
    { kind: 'badge', label: 'Badge' },
    { kind: 'sparkline', label: 'Sparkline' },
    { kind: 'divider', label: 'Divider' },
    { kind: 'image', label: 'Image' },
  ];

  const SOURCE_OPTIONS = [
    { value: 'literal', label: 'Literal text' },
    { value: 'visits.total', label: 'Card · total impressions' },
    { value: 'visits.unique', label: 'Card · unique visits' },
    { value: 'github.stars', label: 'GitHub · total stars' },
    { value: 'github.followers', label: 'GitHub · followers' },
    { value: 'github.repos', label: 'GitHub · public repos' },
    { value: 'github.gists', label: 'GitHub · public gists' },
    { value: 'github.contributions.year', label: 'GitHub · contributions this year' },
    { value: 'github.top.language', label: 'GitHub · top language' },
  ] as const;

  let selectedId = $state<string | null>(null);
  let canvasW = $derived(cfg.size?.width ?? 480);
  let canvasH = $derived(cfg.size?.height ?? 300);

  // Mock data for the live preview. The numbers don't match production, but
  // the rendering / layout / theme are identical because this is the real
  // renderer from @kc/shared.
  const MOCK: CustomData = {
    visits: { total: 1234, unique: 567 },
    github: {
      stars: 89,
      followers: 421,
      repos: 32,
      gists: 5,
      contributionsYear: 1842,
      topLanguage: 'TypeScript',
    },
    followersHistory: Array.from({ length: 90 }, (_, i) => {
      const day = new Date(Date.now() - (89 - i) * 86_400_000).toISOString().slice(0, 10);
      return { day, followers: 400 + Math.round(Math.sin(i / 8) * 15 + i * 0.4) };
    }),
    contributionsHistory: Array.from({ length: 90 }, (_, i) => ({
      date: new Date(Date.now() - (89 - i) * 86_400_000).toISOString().slice(0, 10),
      count: Math.max(0, Math.round(4 + Math.sin(i / 5) * 4 + Math.random() * 3)),
    })),
    currentFollowers: 421,
  };

  let svgMarkup = $derived(renderCustom(cfg, MOCK, { width: canvasW, height: canvasH }));

  function newId(): string {
    return `b${Math.random().toString(36).slice(2, 8)}`;
  }

  function snap(v: number): number {
    return Math.round(v / GRID) * GRID;
  }

  function defaultBlock(kind: Block['kind']): Block {
    const base = { id: newId(), x: 16, y: 16 };
    switch (kind) {
      case 'text':
        return {
          ...base,
          kind: 'text',
          w: 200,
          h: 32,
          text: 'Hello',
          size: 'm',
          align: 'left',
          color: 'text',
          weight: 'normal',
        };
      case 'stat':
        return {
          ...base,
          kind: 'stat',
          w: 144,
          h: 80,
          label: 'label',
          source: 'literal',
          literal: '0',
        };
      case 'badge':
        return {
          ...base,
          kind: 'badge',
          w: 144,
          h: 24,
          label: 'badge',
          source: 'literal',
          literal: '1',
        };
      case 'divider':
        return { ...base, kind: 'divider', w: 200, h: 8 };
      case 'sparkline':
        return {
          ...base,
          kind: 'sparkline',
          w: 240,
          h: 96,
          source: 'followers',
          period: '90d',
          label: 'Followers',
        };
      case 'image':
        return { ...base, kind: 'image', w: 96, h: 96, src: '', alt: '' };
    }
  }

  function addBlock(kind: Block['kind'], at?: { x: number; y: number }) {
    const block = defaultBlock(kind);
    if (at) {
      block.x = clamp(snap(at.x), 0, Math.max(0, canvasW - block.w));
      block.y = clamp(snap(at.y), 0, Math.max(0, canvasH - block.h));
    }
    commit({ blocks: [...cfg.blocks, block] });
    selectedId = block.id;
  }

  function removeBlock(id: string) {
    commit({ blocks: cfg.blocks.filter((b) => b.id !== id) });
    if (selectedId === id) selectedId = null;
  }

  function duplicateBlock(id: string) {
    const src = cfg.blocks.find((b) => b.id === id);
    if (!src) return;
    const copy = {
      ...(src as Block),
      id: newId(),
      x: clamp(snap(src.x + GRID * 2), 0, Math.max(0, canvasW - src.w)),
      y: clamp(snap(src.y + GRID * 2), 0, Math.max(0, canvasH - src.h)),
    } as Block;
    commit({ blocks: [...cfg.blocks, copy] });
    selectedId = copy.id;
  }

  function bringToFront(id: string) {
    const idx = cfg.blocks.findIndex((b) => b.id === id);
    if (idx === -1 || idx === cfg.blocks.length - 1) return;
    const next = cfg.blocks.slice();
    const [b] = next.splice(idx, 1);
    if (!b) return;
    next.push(b);
    commit({ blocks: next });
  }

  function sendToBack(id: string) {
    const idx = cfg.blocks.findIndex((b) => b.id === id);
    if (idx <= 0) return;
    const next = cfg.blocks.slice();
    const [b] = next.splice(idx, 1);
    if (!b) return;
    next.unshift(b);
    commit({ blocks: next });
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    commit({
      blocks: cfg.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)),
    });
  }

  let selected = $derived(cfg.blocks.find((b) => b.id === selectedId) ?? null);

  // Drag-to-move and corner-resize logic on the overlay.
  // Only one of {dragging, resizing} is non-null at a time.
  type Corner = 'tl' | 'tr' | 'bl' | 'br';
  const CLICK_SLOP_PX = 3;
  let dragging = $state<{
    id: string;
    offsetX: number;
    offsetY: number;
    startClientX: number;
    startClientY: number;
    wasSelected: boolean;
    moved: boolean;
  } | null>(null);
  let resizing = $state<{
    id: string;
    corner: Corner;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  function onBlockPointerDown(e: PointerEvent, block: Block) {
    e.stopPropagation();
    const wasSelected = selectedId === block.id;
    selectedId = block.id;
    const svg = e.currentTarget as SVGElement;
    const ownerSvg = svg.ownerSVGElement ?? (svg as unknown as SVGSVGElement);
    const pt = svgPoint(ownerSvg, e.clientX, e.clientY);
    dragging = {
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
    selectedId = block.id;
    resizing = {
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
    const pt = svgPoint(svg, e.clientX, e.clientY);
    if (dragging) {
      // Suppress tiny shakes so a stationary click doesn't get treated as
      // a drag (which would prevent the click-to-deselect path below).
      if (!dragging.moved) {
        const dx = Math.abs(e.clientX - dragging.startClientX);
        const dy = Math.abs(e.clientY - dragging.startClientY);
        if (dx < CLICK_SLOP_PX && dy < CLICK_SLOP_PX) return;
        dragging.moved = true;
      }
      const nextX = clamp(snap(pt.x - dragging.offsetX), 0, canvasW - 8);
      const nextY = clamp(snap(pt.y - dragging.offsetY), 0, canvasH - 8);
      updateBlock(dragging.id, { x: nextX, y: nextY } as Partial<Block>);
    } else if (resizing) {
      const r = resizing;
      const px = clamp(snap(pt.x), 0, canvasW);
      const py = clamp(snap(pt.y), 0, canvasH);
      let nx = r.startX;
      let ny = r.startY;
      let nw = r.startW;
      let nh = r.startH;
      const right = r.startX + r.startW;
      const bottom = r.startY + r.startH;
      if (r.corner === 'tl' || r.corner === 'bl') {
        nx = clamp(px, 0, right - 8);
        nw = right - nx;
      }
      if (r.corner === 'tr' || r.corner === 'br') {
        nw = clamp(px - r.startX, 8, canvasW - r.startX);
      }
      if (r.corner === 'tl' || r.corner === 'tr') {
        ny = clamp(py, 0, bottom - 8);
        nh = bottom - ny;
      }
      if (r.corner === 'bl' || r.corner === 'br') {
        nh = clamp(py - r.startY, 8, canvasH - r.startY);
      }
      updateBlock(r.id, { x: nx, y: ny, w: nw, h: nh } as Partial<Block>);
    }
  }

  function onOverlayPointerUp() {
    // Click-toggle: if pointer didn't move AND the block was already
    // selected when this cycle started, treat it as a deselect. A normal
    // drag bypasses this because dragging.moved becomes true.
    if (dragging && !dragging.moved && dragging.wasSelected) {
      selectedId = null;
    }
    dragging = null;
    resizing = null;
  }

  function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
  }

  function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
    const rect = svg.getBoundingClientRect();
    const scaleX = canvasW / rect.width;
    const scaleY = canvasH / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  // Only deselect on canvas-wrap clicks that aren't bubbled from a block /
  // handle. Without this, every pointer-up on a block bubbled to the wrap's
  // onclick and immediately cleared the selection — making the inspector
  // (and the delete button) disappear right after you clicked.
  function maybeDeselect(e: MouseEvent) {
    if (e.target === e.currentTarget) selectedId = null;
  }

  // ── Context menu ────────────────────────────────────────────────────────
  let overlayEl = $state<SVGSVGElement | null>(null);
  type MenuState = {
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    targetId: string | null;
  };
  let menu = $state<MenuState | null>(null);
  const MENU_WIDTH = 200;
  const MENU_HEIGHT_BLOCK = 360;
  const MENU_HEIGHT_EMPTY = 220;

  function openMenuAt(clientX: number, clientY: number, targetId: string | null) {
    let canvasX = 0;
    let canvasY = 0;
    if (overlayEl) {
      const pt = svgPoint(overlayEl, clientX, clientY);
      canvasX = pt.x;
      canvasY = pt.y;
    }
    const h = targetId ? MENU_HEIGHT_BLOCK : MENU_HEIGHT_EMPTY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = Math.min(clientX, vw - MENU_WIDTH - 8);
    const y = Math.min(clientY, vh - h - 8);
    menu = { x, y, canvasX, canvasY, targetId };
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
    selectedId = block.id;
    openMenuAt(e.clientX, e.clientY, block.id);
  }

  function closeMenu() {
    menu = null;
  }

  function menuAdd(kind: Block['kind']) {
    const m = menu;
    if (!m) return;
    addBlock(kind, { x: m.canvasX, y: m.canvasY });
    closeMenu();
  }

  function menuDuplicate() {
    if (menu?.targetId) duplicateBlock(menu.targetId);
    closeMenu();
  }
  function menuBringToFront() {
    if (menu?.targetId) bringToFront(menu.targetId);
    closeMenu();
  }
  function menuSendToBack() {
    if (menu?.targetId) sendToBack(menu.targetId);
    closeMenu();
  }
  function menuDelete() {
    if (menu?.targetId) removeBlock(menu.targetId);
    closeMenu();
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  function isEditableTarget(t: EventTarget | null): boolean {
    if (!(t instanceof HTMLElement)) return false;
    const tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return t.isContentEditable;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (menu) {
        closeMenu();
        return;
      }
      if (selectedId) {
        selectedId = null;
      }
      return;
    }
    // Block-targeted shortcuts must not fire while typing in a form field.
    if (isEditableTarget(e.target)) return;
    if (!selectedId) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeBlock(selectedId);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      duplicateBlock(selectedId);
    }
  }

  $effect(() => {
    window.addEventListener('keydown', onKeydown);
    const onScroll = () => closeMenu();
    const onResize = () => closeMenu();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeydown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  });

</script>

<div class="builder">
  <aside class="palette">
    <h3>Add block</h3>
    <div class="palette-grid">
      {#each PALETTE as p (p.kind)}
        <button type="button" class="palette-item" onclick={() => addBlock(p.kind)}>
          <span class="palette-glyph" aria-hidden="true">{glyph(p.kind)}</span>
          <span>{p.label}</span>
        </button>
      {/each}
    </div>
    <p class="muted hint">
      Drag to move. Right-click for add / duplicate / delete. Del removes, ⌘D duplicates,
      Esc deselects. Canvas size lives below.
    </p>
  </aside>

  <div
    class="canvas-wrap"
    onclick={maybeDeselect}
    oncontextmenu={openCanvasMenu}
    role="presentation"
  >
    <div class="canvas" style="aspect-ratio: {canvasW}/{canvasH};">
      <div class="svg-bg" aria-hidden="true">
        <!-- Real renderer output, used as a faithful preview. -->
        {@html svgMarkup}
      </div>
      <svg
        class="overlay"
        bind:this={overlayEl}
        viewBox="0 0 {canvasW} {canvasH}"
        preserveAspectRatio="none"
        onpointermove={onOverlayPointerMove}
        onpointerup={onOverlayPointerUp}
        onpointerleave={onOverlayPointerUp}
        role="presentation"
      >
        {#each cfg.blocks as block (block.id)}
          <rect
            class="hit"
            class:selected={block.id === selectedId}
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
          {#if block.id === selectedId}
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
    </div>
  </div>

  <aside class="inspector">
    <h3>Inspector</h3>
    {#if !selected}
      <p class="muted">Click a block on the canvas to edit it. Or add one from the palette.</p>
    {:else}
      <p class="kind-pill">{selected.kind}</p>

      <div class="row">
        <GlassInput
          value={String(selected.x)}
          label="X"
          oninput={(e) => updateBlock(selected!.id, { x: snap(Number((e.target as HTMLInputElement).value) || 0) } as Partial<Block>)}
        />
        <GlassInput
          value={String(selected.y)}
          label="Y"
          oninput={(e) => updateBlock(selected!.id, { y: snap(Number((e.target as HTMLInputElement).value) || 0) } as Partial<Block>)}
        />
      </div>
      <div class="row">
        <GlassInput
          value={String(selected.w)}
          label="W"
          oninput={(e) => updateBlock(selected!.id, { w: snap(Number((e.target as HTMLInputElement).value) || 8) } as Partial<Block>)}
        />
        <GlassInput
          value={String(selected.h)}
          label="H"
          oninput={(e) => updateBlock(selected!.id, { h: snap(Number((e.target as HTMLInputElement).value) || 8) } as Partial<Block>)}
        />
      </div>

      {#if selected.kind === 'text'}
        {@const t = selected as TextBlock}
        <GlassInput
          value={t.text}
          label="Text"
          oninput={(e) => updateBlock(t.id, { text: (e.target as HTMLInputElement).value } as Partial<TextBlock>)}
        />
        <GlassSelect
          value={t.size}
          label="Size"
          options={[
            { value: 's', label: 'small' },
            { value: 'm', label: 'medium' },
            { value: 'l', label: 'large' },
            { value: 'xl', label: 'extra-large' },
          ]}
          onchange={(e) => updateBlock(t.id, { size: (e.target as HTMLSelectElement).value } as Partial<TextBlock>)}
        />
        <GlassSelect
          value={t.align}
          label="Align"
          options={[
            { value: 'left', label: 'left' },
            { value: 'center', label: 'center' },
            { value: 'right', label: 'right' },
          ]}
          onchange={(e) => updateBlock(t.id, { align: (e.target as HTMLSelectElement).value } as Partial<TextBlock>)}
        />
        <GlassSelect
          value={t.color}
          label="Color"
          options={[
            { value: 'text', label: 'primary' },
            { value: 'muted', label: 'muted' },
            { value: 'accent', label: 'accent' },
          ]}
          onchange={(e) => updateBlock(t.id, { color: (e.target as HTMLSelectElement).value } as Partial<TextBlock>)}
        />
        <GlassToggle
          checked={t.weight === 'bold'}
          label="Bold"
          onchange={(e) => updateBlock(t.id, { weight: (e.target as HTMLInputElement).checked ? 'bold' : 'normal' } as Partial<TextBlock>)}
        />
      {:else if selected.kind === 'stat' || selected.kind === 'badge'}
        {@const sb = selected as StatBlock | BadgeBlock}
        <GlassInput
          value={sb.label}
          label="Label"
          oninput={(e) => updateBlock(sb.id, { label: (e.target as HTMLInputElement).value } as Partial<typeof sb>)}
        />
        <GlassSelect
          value={sb.source}
          label="Source"
          options={SOURCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          onchange={(e) => updateBlock(sb.id, { source: (e.target as HTMLSelectElement).value } as Partial<typeof sb>)}
        />
        {#if sb.source === 'literal'}
          <GlassInput
            value={sb.literal}
            label="Value"
            oninput={(e) => updateBlock(sb.id, { literal: (e.target as HTMLInputElement).value } as Partial<typeof sb>)}
          />
        {/if}
      {:else if selected.kind === 'sparkline'}
        {@const s = selected as SparklineBlock}
        <GlassInput
          value={s.label}
          label="Label"
          oninput={(e) => updateBlock(s.id, { label: (e.target as HTMLInputElement).value } as Partial<SparklineBlock>)}
        />
        <GlassSelect
          value={s.source}
          label="Source"
          options={[
            { value: 'followers', label: 'GitHub followers over time' },
            { value: 'contributions', label: 'Contributions over time' },
          ]}
          onchange={(e) => updateBlock(s.id, { source: (e.target as HTMLSelectElement).value } as Partial<SparklineBlock>)}
        />
        <GlassSelect
          value={s.period}
          label="Period"
          options={[
            { value: '30d', label: 'last 30 days' },
            { value: '90d', label: 'last 90 days' },
            { value: '365d', label: 'last 365 days' },
            { value: 'all', label: 'all time' },
          ]}
          onchange={(e) => updateBlock(s.id, { period: (e.target as HTMLSelectElement).value } as Partial<SparklineBlock>)}
        />
      {:else if selected.kind === 'image'}
        {@const im = selected as ImageBlock}
        <GlassInput
          value={im.src}
          label="Image URL"
          placeholder="https://…"
          oninput={(e) => updateBlock(im.id, { src: (e.target as HTMLInputElement).value } as Partial<ImageBlock>)}
        />
        <GlassInput
          value={im.alt}
          label="Alt text"
          oninput={(e) => updateBlock(im.id, { alt: (e.target as HTMLInputElement).value } as Partial<ImageBlock>)}
        />
      {/if}

      <div class="inspector-actions">
        <GlassButton variant="danger" size="sm" onclick={() => removeBlock(selected!.id)}>
          Delete block
        </GlassButton>
      </div>
    {/if}
  </aside>
</div>

{#if menu}
  <!-- Backdrop catches outside-clicks to dismiss the menu. -->
  <div
    class="menu-backdrop"
    role="presentation"
    onclick={closeMenu}
    oncontextmenu={(e) => {
      e.preventDefault();
      closeMenu();
    }}
  ></div>
  <div
    class="context-menu"
    role="menu"
    style:left="{menu.x}px"
    style:top="{menu.y}px"
  >
    <div class="menu-label">Add block</div>
    {#each PALETTE as p (p.kind)}
      <button type="button" class="menu-item" role="menuitem" onclick={() => menuAdd(p.kind)}>
        <span class="menu-glyph" aria-hidden="true">{glyph(p.kind)}</span>
        <span>Add {p.label.toLowerCase()}</span>
      </button>
    {/each}
    {#if menu.targetId}
      <div class="menu-sep" role="separator"></div>
      <button type="button" class="menu-item" role="menuitem" onclick={menuDuplicate}>
        <span class="menu-glyph" aria-hidden="true">⎘</span>
        <span>Duplicate</span>
        <span class="menu-kbd">⌘D</span>
      </button>
      <button type="button" class="menu-item" role="menuitem" onclick={menuBringToFront}>
        <span class="menu-glyph" aria-hidden="true">▲</span>
        <span>Bring to front</span>
      </button>
      <button type="button" class="menu-item" role="menuitem" onclick={menuSendToBack}>
        <span class="menu-glyph" aria-hidden="true">▼</span>
        <span>Send to back</span>
      </button>
      <button type="button" class="menu-item danger" role="menuitem" onclick={menuDelete}>
        <span class="menu-glyph" aria-hidden="true">✕</span>
        <span>Delete</span>
        <span class="menu-kbd">Del</span>
      </button>
    {/if}
  </div>
{/if}

<script lang="ts" module>
  function glyph(kind: string): string {
    switch (kind) {
      case 'text':
        return 'T';
      case 'stat':
        return '#';
      case 'badge':
        return '◆';
      case 'sparkline':
        return '∿';
      case 'divider':
        return '—';
      case 'image':
        return '▢';
      default:
        return '·';
    }
  }
</script>

<style>
  .builder {
    display: grid;
    grid-template-columns: 220px 1fr 280px;
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 1100px) {
    .builder {
      grid-template-columns: 1fr;
    }
  }
  .palette,
  .inspector {
    background: var(--glass-2);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-md);
    padding: 14px;
    position: sticky;
    top: 80px;
    max-height: calc(100vh - 100px);
    overflow: auto;
  }
  h3 {
    margin: 0 0 10px;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
    font-weight: 600;
  }
  .palette-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .palette-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 6px;
    background: var(--glass-3);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-sm);
    color: var(--text-1);
    font: 600 11px var(--font-sans);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease-glass);
  }
  .palette-item:hover {
    background: var(--glass-4);
  }
  .palette-glyph {
    font-size: 18px;
    color: var(--accent);
  }
  .hint {
    font-size: 12px;
    margin: 10px 0 0;
  }

  /* ── Context menu ─────────────────────────────────────────────────── */
  .menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: transparent;
  }
  .context-menu {
    position: fixed;
    z-index: 100;
    min-width: 200px;
    padding: 6px;
    background: var(--glass-3);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-2);
    backdrop-filter: blur(var(--blur-md)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--blur-md)) saturate(180%);
    display: flex;
    flex-direction: column;
    gap: 1px;
    font: 500 13px var(--font-sans);
    color: var(--text-1);
    animation: menu-in 80ms var(--ease-glass);
  }
  @keyframes menu-in {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .menu-label {
    padding: 6px 10px 2px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .menu-item {
    display: grid;
    grid-template-columns: 18px 1fr auto;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 7px 10px;
    background: transparent;
    border: 0;
    border-radius: var(--radius-sm);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease-glass);
  }
  .menu-item:hover,
  .menu-item:focus-visible {
    background: var(--glass-4);
    outline: none;
  }
  .menu-item.danger {
    color: var(--danger);
  }
  .menu-item.danger:hover {
    background: oklch(60% 0.21 25 / 0.18);
  }
  .menu-glyph {
    text-align: center;
    color: var(--accent);
    font-size: 14px;
  }
  .menu-item.danger .menu-glyph {
    color: var(--danger);
  }
  .menu-kbd {
    font: 500 11px var(--font-mono);
    color: var(--text-3);
    padding: 1px 6px;
    background: var(--glass-2);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-sm);
  }
  .menu-sep {
    height: 1px;
    margin: 4px 6px;
    background: var(--ring-soft);
  }
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
    max-width: 100%;
    box-shadow: var(--shadow-2);
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
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
    min-width: 0;
  }
  /* The inspector / row grid items wrap GlassInput / GlassSelect whose
     root is `.field`. Without min-width: 0 grid items can't shrink below
     the input's intrinsic ~180px content-size, which overflows the
     280px-wide inspector aside. The dead `:global(.glass-input)` rules
     this replaces never matched anything — GlassInput's wrapper is
     `.field`, not `.glass-input`. */
  .row > :global(.field),
  .inspector > :global(.field) {
    min-width: 0;
  }
  .row :global(input),
  .row :global(select),
  .inspector :global(input),
  .inspector :global(select) {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
  }
  .inspector > :global(.field) {
    margin-bottom: 10px;
  }
  .kind-pill {
    display: inline-block;
    margin: 0 0 12px;
    padding: 3px 8px;
    background: var(--glass-3);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-pill);
    font: 600 11px var(--font-mono);
    color: var(--text-2);
  }
  .inspector-actions {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
  }
  .muted {
    color: var(--text-3);
    font-size: 13px;
  }
</style>
