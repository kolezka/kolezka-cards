<script lang="ts">
  type Props = { size?: number; label?: string };
  let { size = 28, label = 'kolezka-cards' }: Props = $props();
  // Stable unique id so multiple Logos on one page don't collide on the gradient.
  const uid = `kc-logo-${Math.random().toString(36).slice(2, 8)}`;
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 36 28"
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  role="img"
  aria-label={label}
>
  <defs>
    <linearGradient id={`${uid}-back`} x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" style="stop-color: var(--accent-2); stop-opacity: 0.85;" />
      <stop offset="100%" style="stop-color: var(--accent); stop-opacity: 0.55;" />
    </linearGradient>
    <linearGradient id={`${uid}-front`} x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" style="stop-color: var(--accent);" />
      <stop offset="100%" style="stop-color: var(--accent-2);" />
    </linearGradient>
  </defs>
  <!-- Back card, rotated/offset -->
  <rect
    x="3"
    y="6"
    width="22"
    height="16"
    rx="3.5"
    fill={`url(#${uid}-back)`}
    transform="rotate(-9 14 14)"
  />
  <!-- Front card -->
  <rect x="11" y="6" width="22" height="16" rx="3.5" fill={`url(#${uid}-front)`} />
  <!-- Sparkline on front card -->
  <path
    d="M14 17 L17 15 L20 16 L23 13 L26 14 L29 12"
    stroke="white"
    stroke-opacity="0.85"
    stroke-width="1.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />
</svg>
