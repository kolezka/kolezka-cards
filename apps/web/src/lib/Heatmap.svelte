<script lang="ts">
  interface Props {
    grid: number[][]; // [7][24], UTC Sun..Sat
    cell?: number;
  }
  let { grid, cell = 18 }: Props = $props();
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const max = $derived(Math.max(1, ...grid.flat()));
  const width = $derived(40 + 24 * cell);
  const height = $derived(20 + 7 * cell);

  function colorFor(value: number): string {
    if (value === 0) return '#161b22';
    const intensity = value / max;
    if (intensity < 0.25) return '#0e4429';
    if (intensity < 0.5) return '#006d32';
    if (intensity < 0.75) return '#26a641';
    return '#39d353';
  }
</script>

<svg viewBox="0 0 {width} {height}" role="img" aria-label="visits by hour of week (UTC)">
  {#each Array(24) as _, h}
    {#if h % 6 === 0}
      <text x={40 + h * cell + cell / 2} y="14" font-size="9" fill="#8b949e" text-anchor="middle">
        {h.toString().padStart(2, '0')}
      </text>
    {/if}
  {/each}

  {#each grid as row, d}
    <text x="32" y={24 + d * cell + cell / 2} font-size="9" fill="#8b949e" text-anchor="end">
      {DAYS[d]}
    </text>
    {#each row as v, h}
      <rect
        x={40 + h * cell}
        y={20 + d * cell}
        width={cell - 2}
        height={cell - 2}
        rx="2"
        fill={colorFor(v)}
      >
        <title>{DAYS[d]} {h.toString().padStart(2, '0')}:00 UTC — {v}</title>
      </rect>
    {/each}
  {/each}
</svg>

<style>
  svg {
    width: 100%;
    height: auto;
  }
</style>
