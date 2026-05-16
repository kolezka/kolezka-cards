<script lang="ts">
  type Props = {
    label: string;
    value: string | number;
    sub?: string;
    accent?: boolean;
  };

  let { label, value, sub, accent = false }: Props = $props();
</script>

<div class={`stat ${accent ? 'accent' : ''}`}>
  <div class="v">{value}</div>
  <div class="l">{label}</div>
  {#if sub}<div class="s">{sub}</div>{/if}
</div>

<style>
  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .v {
    font: 700 28px var(--font-sans);
    letter-spacing: -0.02em;
    line-height: 1.05;
    color: var(--text-1);
  }
  .accent .v {
    color: var(--accent);
  }
  .l {
    font-size: 12px;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }
  .s {
    font-size: 12px;
    color: var(--text-2);
    margin-top: 4px;
  }
</style>
