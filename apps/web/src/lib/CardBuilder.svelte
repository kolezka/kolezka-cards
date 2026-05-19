<script lang="ts">
  import type { CustomConfig } from '@kc/shared/zod/card-config';
  import BuilderCanvas from './builder/BuilderCanvas.svelte';
  import BlockInspector from './builder/BlockInspector.svelte';
  import BuilderContextMenu from './builder/BuilderContextMenu.svelte';
  import { createBuilderState } from './builder/state.svelte';

  // Controlled component: parent passes the current cfg snapshot and a
  // change handler. Avoids `bind:` type friction with the page's loose
  // multi-card LooseConfig builder.
  type Props = {
    cfg: CustomConfig;
    onChange: (next: CustomConfig) => void;
  };
  let { cfg, onChange }: Props = $props();

  // State factory closes over `cfg` via a getter so reads stay reactive
  // even though cfg is a by-value prop. Commit funnels patches back to the
  // parent. Local var is named `builder` (not `state`) to avoid the
  // $state-rune-vs-store-autosubscribe ambiguity inside child components.
  const builder = createBuilderState(
    () => cfg,
    (patch: Partial<CustomConfig>) => onChange({ ...cfg, ...patch } as CustomConfig),
  );

  // Global keyboard shortcuts and menu auto-dismiss live at the orchestrator
  // level because they operate on the whole builder, not a single child.
  function isEditableTarget(t: EventTarget | null): boolean {
    if (!(t instanceof HTMLElement)) return false;
    const tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return t.isContentEditable;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (builder.menu) {
        builder.closeMenu();
        return;
      }
      if (builder.selectedId) {
        builder.selectedId = null;
      }
      return;
    }
    if (isEditableTarget(e.target)) return;
    if (!builder.selectedId) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      builder.removeBlock(builder.selectedId);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      builder.duplicateBlock(builder.selectedId);
    }
  }

  $effect(() => {
    window.addEventListener('keydown', onKeydown);
    const onScroll = () => builder.closeMenu();
    const onResize = () => builder.closeMenu();
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
  <BuilderCanvas {builder} />
  <BlockInspector {builder} />
</div>

<BuilderContextMenu {builder} />

<style>
  .builder {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .builder {
      grid-template-columns: 1fr;
    }
  }
</style>
