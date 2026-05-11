<script lang="ts">
  interface Point {
    hourBucket: number;
    totalImpressions: number;
    uniqueVisits: number;
  }
  interface Props {
    series: Point[];
    width?: number;
    height?: number;
  }
  let { series, width = 720, height = 180 }: Props = $props();

  const HOUR_MS = 60 * 60 * 1000;

  const points = $derived(series ?? []);
  const xMin = $derived(points[0]?.hourBucket ?? 0);
  const xMax = $derived(points[points.length - 1]?.hourBucket ?? 1);
  const xSpan = $derived(Math.max(1, xMax - xMin));
  const yMax = $derived(
    Math.max(1, ...points.flatMap((p) => [p.totalImpressions, p.uniqueVisits])),
  );

  const PAD_L = 36;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;

  function xOf(b: number): number {
    if (points.length <= 1) return PAD_L + (width - PAD_L - PAD_R) / 2;
    return PAD_L + ((b - xMin) / xSpan) * (width - PAD_L - PAD_R);
  }
  function yOf(v: number): number {
    return PAD_T + (1 - v / yMax) * (height - PAD_T - PAD_B);
  }

  const pathTotal = $derived(
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.hourBucket)} ${yOf(p.totalImpressions)}`)
      .join(' '),
  );
  const pathUnique = $derived(
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.hourBucket)} ${yOf(p.uniqueVisits)}`)
      .join(' '),
  );

  const tickValues = $derived(
    Array.from(
      new Set([0.25, 0.5, 0.75, 1].map((r) => Math.max(0, Math.round(yMax * r)))),
    ).sort((a, b) => a - b),
  );

  function fmtTick(b: number): string {
    return new Date(b * HOUR_MS).toLocaleString(undefined, { month: 'numeric', day: 'numeric' });
  }
</script>

<svg viewBox="0 0 {width} {height}" role="img" aria-label="hourly impressions and unique visits">
  <rect x="0" y="0" width={width} height={height} fill="transparent" />
  <line x1={PAD_L} y1={height - PAD_B} x2={width - PAD_R} y2={height - PAD_B} stroke="#30363d" />
  <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={height - PAD_B} stroke="#30363d" />

  {#each tickValues as v}
    <text x="4" y={yOf(v) + 4} font-size="10" fill="#8b949e">{v}</text>
    <line
      x1={PAD_L}
      y1={yOf(v)}
      x2={width - PAD_R}
      y2={yOf(v)}
      stroke="#21262d"
      stroke-dasharray="2,2"
    />
  {/each}

  {#if points.length > 1}
    <text x={PAD_L} y={height - 6} font-size="10" fill="#8b949e">{fmtTick(xMin)}</text>
    <text
      x={width - PAD_R}
      y={height - 6}
      font-size="10"
      text-anchor="end"
      fill="#8b949e">{fmtTick(xMax)}</text
    >
  {/if}

  {#if points.length === 0}
    <text
      x={width / 2}
      y={height / 2}
      text-anchor="middle"
      font-size="12"
      fill="#8b949e">No visits yet</text
    >
  {:else if points.length === 1}
    <circle cx={xOf(points[0].hourBucket)} cy={yOf(points[0].totalImpressions)} r="3" fill="#58a6ff" />
    <circle cx={xOf(points[0].hourBucket)} cy={yOf(points[0].uniqueVisits)} r="3" fill="#3fb950" />
  {:else}
    <path d={pathTotal} stroke="#58a6ff" stroke-width="2" fill="none" />
    <path d={pathUnique} stroke="#3fb950" stroke-width="2" fill="none" stroke-dasharray="4,3" />
  {/if}

  <g transform={`translate(${width - 160}, ${PAD_T})`}>
    <rect x="0" y="0" width="148" height="36" fill="#161b22" stroke="#30363d" rx="4" />
    <line x1="8" y1="12" x2="20" y2="12" stroke="#58a6ff" stroke-width="2" />
    <text x="24" y="16" font-size="11" fill="#e6edf3">impressions</text>
    <line x1="8" y1="26" x2="20" y2="26" stroke="#3fb950" stroke-width="2" stroke-dasharray="4,3" />
    <text x="24" y="30" font-size="11" fill="#e6edf3">unique visits</text>
  </g>
</svg>

<style>
  svg {
    width: 100%;
    height: auto;
  }
</style>
