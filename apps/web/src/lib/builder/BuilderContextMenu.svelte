<script lang="ts">
  import { glyph, PALETTE, type BlockKind } from './utils';
  import type { BuilderState } from './state.svelte';

  type Props = { builder: BuilderState };
  let { builder }: Props = $props();

  // Portal action — moves the menu out of any ancestor that creates a
  // containing block for fixed-positioned elements (here: the page's
  // .glass-2 wrapper has backdrop-filter, which is enough). Without this
  // the menu's `position: fixed` is anchored to that wrapper, so the
  // computed (clientX, clientY) coords land far from the actual mouse.
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode === document.body) {
          document.body.removeChild(node);
        }
      },
    };
  }

  function menuAdd(kind: BlockKind) {
    const m = builder.menu;
    if (!m) return;
    builder.addBlock(kind, { x: m.canvasX, y: m.canvasY });
    builder.closeMenu();
  }

  function menuDuplicate() {
    if (builder.menu?.targetId) builder.duplicateBlock(builder.menu.targetId);
    builder.closeMenu();
  }
  function menuBringToFront() {
    if (builder.menu?.targetId) builder.bringToFront(builder.menu.targetId);
    builder.closeMenu();
  }
  function menuSendToBack() {
    if (builder.menu?.targetId) builder.sendToBack(builder.menu.targetId);
    builder.closeMenu();
  }
  function menuDelete() {
    if (builder.menu?.targetId) builder.removeBlock(builder.menu.targetId);
    builder.closeMenu();
  }
</script>

{#if builder.menu}
  {@const m = builder.menu}
  <div use:portal>
    <div
      class="menu-backdrop"
      role="presentation"
      onclick={() => builder.closeMenu()}
      oncontextmenu={(e) => {
        e.preventDefault();
        builder.closeMenu();
      }}
    ></div>
    <div class="context-menu" role="menu" style:left="{m.x}px" style:top="{m.y}px">
      <div class="menu-label">Add block</div>
      {#each PALETTE as p (p.kind)}
        <button type="button" class="menu-item" role="menuitem" onclick={() => menuAdd(p.kind)}>
          <span class="menu-glyph" aria-hidden="true">{glyph(p.kind)}</span>
          <span>Add {p.label.toLowerCase()}</span>
        </button>
      {/each}
      {#if m.targetId}
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
  </div>
{/if}

<style>
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
</style>
