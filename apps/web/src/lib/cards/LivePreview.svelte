<script lang="ts">
  import { Glass } from '$lib/ui';
  import { renderPreview } from './preview-renderers';

  type Props = {
    cardType: string;
    cardUrl: string;
    cfg: { size?: { width?: number; height?: number } } & Record<string, unknown>;
    fallbackImgUrl: string;
  };
  let { cardType, cardUrl, cfg, fallbackImgUrl }: Props = $props();

  // Live preview — render every card type client-side from the in-memory
  // cfg so edits appear immediately, without a save round-trip. Last-good
  // retention: keep the previous SVG visible while the user finishes
  // typing (renderPreview returns '' on a throw).
  let svg = $state('');
  $effect(() => {
    // Pass dims only when the user explicitly set them. Otherwise each
    // renderer uses its own natural default (profile-summary is 1080×320
    // with a two-column layout; forcing it to 480 squashes the stats
    // column under the chart polygon).
    const dims = {
      width: cfg.size?.width,
      height: cfg.size?.height,
    };
    const next = renderPreview(cardType, cfg, dims);
    if (next) svg = next;
  });
</script>

<Glass tier={2} rounded="lg" padding="lg" as="section" class="preview">
  <h2>Preview</h2>
  <div class="preview-canvas">
    {#if svg}
      <!-- Client-side render of the in-progress cfg with mock data, so
           every config change shows up immediately. Falls back to the
           server-rendered URL on the very first paint or if the renderer
           throws on an in-progress invalid cfg. -->
      {@html svg}
    {:else}
      <img src={fallbackImgUrl} alt="Card preview" />
    {/if}
  </div>
  <p class="muted preview-url">
    Live URL: <code>{cardUrl}</code>
  </p>
</Glass>

<style>
  :global(.preview) {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  :global(.preview) h2 {
    margin: 0;
    font-size: 18px;
    letter-spacing: -0.01em;
  }
  .preview-canvas {
    padding: 16px;
    background:
      linear-gradient(45deg, var(--glass-1) 25%, transparent 25%),
      linear-gradient(-45deg, var(--glass-1) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--glass-1) 75%),
      linear-gradient(-45deg, transparent 75%, var(--glass-1) 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
    border-radius: var(--radius-md);
    border: 1px solid var(--ring-soft);
  }
  .preview-canvas img,
  .preview-canvas :global(svg) {
    width: 100%;
    height: auto;
    display: block;
    border-radius: var(--radius-sm);
  }
  .preview-url {
    margin: 0;
    font-size: 12px;
    word-break: break-all;
  }
  .preview-url code {
    background: var(--glass-2);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }
  .muted {
    color: var(--text-3);
  }
</style>
