<script lang="ts">
  import type {
    BadgeBlock,
    Block,
    ImageBlock,
    SparklineBlock,
    StatBlock,
    TextBlock,
  } from '@kc/shared/zod/card-config';
  import { GlassInput } from '$lib/ui';
  import type { BuilderState } from './state.svelte';
  import { snap } from './utils';
  import TextFields from './blocks/TextFields.svelte';
  import StatBadgeFields from './blocks/StatBadgeFields.svelte';
  import SparklineFields from './blocks/SparklineFields.svelte';
  import ImageFields from './blocks/ImageFields.svelte';

  type Props = { builder: BuilderState };
  let { builder }: Props = $props();
</script>

<aside class="inspector">
  {#if !builder.selected}
    <h3>How it works</h3>
    <p class="help-line">
      <strong>Right-click</strong> the canvas to add a block at that spot, or
      right-click a block for <em>duplicate</em>, <em>reorder</em>, and
      <em>delete</em>.
    </p>
    <p class="help-line">Drag blocks to move (snaps to 8px).</p>
    <ul class="kbd-list">
      <li><kbd>Del</kbd> <span>remove selected</span></li>
      <li><kbd>⌘D</kbd> <span>duplicate selected</span></li>
      <li><kbd>Esc</kbd> <span>deselect</span></li>
    </ul>
    <p class="muted help-foot">Canvas size lives below.</p>
  {:else}
    {@const sel = builder.selected}
    <header class="insp-head">
      <span class="kind-pill">{sel.kind}</span>
      <div class="head-actions">
        <button
          type="button"
          class="icon-btn"
          title="Duplicate (⌘D)"
          aria-label="Duplicate block"
          onclick={() => builder.duplicateBlock(sel.id)}
        >⎘</button>
        <button
          type="button"
          class="icon-btn danger"
          title="Delete (Del)"
          aria-label="Delete block"
          onclick={() => builder.removeBlock(sel.id)}
        >✕</button>
      </div>
    </header>

    <section class="insp-section">
      <h4 class="insp-h">Position</h4>
      <div class="row">
        <GlassInput
          type="number"
          step={8}
          min={0}
          value={String(sel.x)}
          label="X"
          oninput={(e) =>
            builder.updateBlock(sel.id, {
              x: snap(Number((e.target as HTMLInputElement).value) || 0),
            } as Partial<Block>)}
        />
        <GlassInput
          type="number"
          step={8}
          min={0}
          value={String(sel.y)}
          label="Y"
          oninput={(e) =>
            builder.updateBlock(sel.id, {
              y: snap(Number((e.target as HTMLInputElement).value) || 0),
            } as Partial<Block>)}
        />
      </div>
    </section>

    <section class="insp-section">
      <h4 class="insp-h">Size</h4>
      <div class="row">
        <GlassInput
          type="number"
          step={8}
          min={8}
          value={String(sel.w)}
          label="W"
          oninput={(e) =>
            builder.updateBlock(sel.id, {
              w: snap(Number((e.target as HTMLInputElement).value) || 8),
            } as Partial<Block>)}
        />
        <GlassInput
          type="number"
          step={8}
          min={8}
          value={String(sel.h)}
          label="H"
          oninput={(e) =>
            builder.updateBlock(sel.id, {
              h: snap(Number((e.target as HTMLInputElement).value) || 8),
            } as Partial<Block>)}
        />
      </div>
    </section>

    <section class="insp-section">
      <h4 class="insp-h">Content</h4>
      {#if sel.kind === 'text'}
        <TextFields
          block={sel as TextBlock}
          update={(p) => builder.updateBlock(sel.id, p as Partial<Block>)}
        />
      {:else if sel.kind === 'stat' || sel.kind === 'badge'}
        <StatBadgeFields
          block={sel as StatBlock | BadgeBlock}
          update={(p) => builder.updateBlock(sel.id, p as Partial<Block>)}
        />
      {:else if sel.kind === 'sparkline'}
        <SparklineFields
          block={sel as SparklineBlock}
          update={(p) => builder.updateBlock(sel.id, p as Partial<Block>)}
        />
      {:else if sel.kind === 'image'}
        <ImageFields
          block={sel as ImageBlock}
          update={(p) => builder.updateBlock(sel.id, p as Partial<Block>)}
        />
      {:else if sel.kind === 'divider'}
        <p class="muted help-foot">Dividers have no extra options.</p>
      {/if}
    </section>
  {/if}
</aside>

<style>
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
  .help-line {
    font-size: 13px;
    line-height: 1.55;
    margin: 0 0 10px;
    color: var(--text-2);
  }
  .help-line strong {
    color: var(--text-1);
  }
  .help-line em {
    font-style: normal;
    color: var(--text-1);
  }
  .kbd-list {
    list-style: none;
    margin: 6px 0 12px;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .kbd-list li {
    display: grid;
    grid-template-columns: 48px 1fr;
    align-items: center;
    gap: 10px;
    font-size: 12.5px;
    color: var(--text-2);
  }
  .kbd-list kbd {
    justify-self: start;
    padding: 2px 8px;
    background: var(--glass-3);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-sm);
    font: 500 11px var(--font-mono);
    color: var(--text-1);
  }
  .help-foot {
    font-size: 12px;
    margin: 8px 0 0;
  }
  .insp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 0 0 14px;
  }
  .head-actions {
    display: flex;
    gap: 4px;
  }
  .icon-btn {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: var(--glass-3);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-sm);
    color: var(--text-1);
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease-glass),
      color var(--dur-fast) var(--ease-glass);
  }
  .icon-btn:hover {
    background: var(--glass-4);
  }
  .icon-btn.danger:hover {
    background: oklch(60% 0.21 25 / 0.18);
    color: var(--danger);
  }
  .insp-section {
    margin: 0 0 14px;
  }
  .insp-section:last-child {
    margin-bottom: 0;
  }
  .insp-h {
    margin: 0 0 8px;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
    font-weight: 600;
  }
  .insp-section .row {
    margin-bottom: 0;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
    min-width: 0;
  }
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
    padding: 3px 10px;
    background: var(--glass-3);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-pill);
    font: 600 11px var(--font-mono);
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .muted {
    color: var(--text-3);
    font-size: 13px;
  }
</style>
