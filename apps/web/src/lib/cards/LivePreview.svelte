<script lang="ts">
  import { Glass } from '$lib/ui';
  import { type PreviewStats, renderPreview } from './preview-renderers';

  type Props = {
    cardType: string;
    cardUrl: string;
    cfg: { size?: { width?: number; height?: number } } & Record<string, unknown>;
    fallbackImgUrl: string;
    stats?: PreviewStats;
  };
  let { cardType, cardUrl, cfg, fallbackImgUrl, stats }: Props = $props();

  // Live preview — render every card type client-side from the in-memory
  // cfg so edits appear immediately, without a save round-trip. Last-good
  // retention: keep the previous SVG visible while the user finishes
  // typing (renderPreview returns '' on a throw).
  let svg = $state('');
  // Inner width of the preview canvas. When the card's natural width
  // exceeds this, we pass it through to renderPreview as `maxWidth` so
  // the renderer produces an SVG at the displayed size — avoiding a
  // CSS downscale that sub-pixels SVG glyphs and softens the text
  // (especially profile-summary, whose 1080-wide default doesn't fit
  // the ~964-px pane and was rendering visibly blurry).
  let canvasEl = $state<HTMLDivElement | null>(null);
  let canvasInnerWidth = $state(0);
  $effect(() => {
    if (!canvasEl) return;
    const el = canvasEl;
    const measure = () => {
      const cs = getComputedStyle(el);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      const w = Math.floor(el.clientWidth - padL - padR);
      if (w > 0) canvasInnerWidth = w;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });
  $effect(() => {
    // Pass dims only when the user explicitly set them. Otherwise each
    // renderer uses its own natural default (profile-summary is 1080×320
    // with a two-column layout; forcing it to 480 squashes the stats
    // column under the chart polygon).
    const dims = {
      width: cfg.size?.width,
      height: cfg.size?.height,
      maxWidth: canvasInnerWidth || undefined,
    };
    const next = renderPreview(cardType, cfg, dims, stats);
    if (next) svg = next;
  });
</script>

<Glass tier={2} rounded="lg" padding="lg" as="section" class="preview">
  <h2>Preview</h2>
  <div class="preview-canvas" bind:this={canvasEl}>
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
    /* Center small cards (profile-views is 220×40, visit-counter 480×160)
       inside the wide preview pane instead of left-aligning them. */
    text-align: center;
  }
  /* Render at the SVG's native size — never stretch. Each card type has a
     tuned default (profile-views 220×40, profile-summary 1080×320, etc.);
     forcing `width: 100%` would upscale them 2–5× past their intended
     resolution, blurring text and breaking 1.5px stroke widths. The
     max-width clamp only kicks in on narrow viewports where the natural
     size would overflow. */
  .preview-canvas img,
  .preview-canvas :global(svg) {
    max-width: 100%;
    height: auto;
    display: inline-block;
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
