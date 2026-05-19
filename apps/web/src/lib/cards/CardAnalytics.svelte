<script lang="ts">
  import type { AnalyticsResult } from '$lib/api';
  import Heatmap from '$lib/Heatmap.svelte';
  import Sparkline from '$lib/Sparkline.svelte';
  import { Glass, Stat } from '$lib/ui';

  type Range = AnalyticsResult['range'];

  type Props = {
    analytics: AnalyticsResult | null;
    range: Range;
    onRangeChange: (next: Range) => void;
  };
  let { analytics, range, onRangeChange }: Props = $props();
</script>

<section class="analytics-section">
  <header class="analytics-head">
    <h2>Analytics</h2>
    <div class="rangebar" role="tablist" aria-label="Time range">
      {#each ['24h', '7d', '30d', 'all'] as const as r (r)}
        <button
          role="tab"
          aria-selected={range === r}
          type="button"
          class="range-pill"
          class:active={range === r}
          onclick={() => onRangeChange(r)}
        >
          {r}
        </button>
      {/each}
    </div>
  </header>

  {#if analytics}
    <div class="tiles">
      <Glass tier={2} rounded="md" padding="md">
        <Stat label="Impressions ({range})" value={analytics.totals.totalImpressions} accent />
      </Glass>
      <Glass tier={2} rounded="md" padding="md">
        <Stat
          label="Unique direct viewers ({range})"
          value={analytics.totals.uniqueVisits}
          accent
        />
      </Glass>
    </div>

    {#if analytics.totals.directImpressions + analytics.totals.camoImpressions > 0}
      <div class="traffic-source" title="Camo-proxied impressions cannot be deduped per viewer; only direct (non-proxied) impressions contribute to the unique counter.">
        <span class="pill pill-direct">
          <strong>{analytics.totals.directImpressions}</strong> direct
        </span>
        <span class="pill pill-camo">
          <strong>{analytics.totals.camoImpressions}</strong> via GitHub Camo
        </span>
        {#if analytics.totals.totalImpressions - analytics.totals.directImpressions - analytics.totals.camoImpressions > 0}
          <span class="pill pill-legacy">
            <strong>
              {analytics.totals.totalImpressions -
                analytics.totals.directImpressions -
                analytics.totals.camoImpressions}
            </strong>
            unclassified (pre-upgrade)
          </span>
        {/if}
      </div>
    {/if}

    <Glass tier={1} rounded="md" padding="md" class="chart-block">
      <Sparkline series={analytics.series} />
    </Glass>

    <h3 class="sub-h3">Visits by hour of week (UTC)</h3>
    <Glass tier={1} rounded="md" padding="md" class="chart-block">
      <Heatmap grid={analytics.heatmap} />
    </Glass>

    <div class="breakdowns">
      <Glass tier={2} rounded="md" padding="md">
        <h3>Top referrers</h3>
        {#if analytics.referrers.length === 0}
          <p class="muted">None.</p>
        {:else}
          <ul>
            {#each analytics.referrers.slice(0, 8) as r (r.host)}
              <li>
                <span>{r.host ?? '(none)'}</span>
                <strong>{r.count}</strong>
              </li>
            {/each}
          </ul>
        {/if}
      </Glass>
      <Glass tier={2} rounded="md" padding="md">
        <h3>Countries</h3>
        {#if analytics.countries.length === 0}
          <p class="muted">None.</p>
        {:else}
          <ul>
            {#each analytics.countries.slice(0, 8) as r (r.country)}
              <li>
                <span>{r.country ?? '(none)'}</span>
                <strong>{r.count}</strong>
              </li>
            {/each}
          </ul>
        {/if}
      </Glass>
    </div>

    <p class="muted methodology-link">
      Approximate unique visits — see <a href="/methodology">methodology</a>.
    </p>
  {/if}
</section>

<style>
  .analytics-section {
    margin-top: 24px;
  }
  .analytics-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .analytics-head h2 {
    margin: 0;
    font-size: 22px;
    letter-spacing: -0.01em;
  }
  .rangebar {
    display: inline-flex;
    padding: 4px;
    background: var(--glass-2);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-pill);
    box-shadow: var(--highlight);
    backdrop-filter: blur(var(--blur-sm));
    -webkit-backdrop-filter: blur(var(--blur-sm));
  }
  .range-pill {
    background: transparent;
    color: var(--text-3);
    border: 0;
    border-radius: var(--radius-pill);
    padding: 6px 14px;
    cursor: pointer;
    font: 600 13px var(--font-sans);
    transition: background var(--dur-fast) var(--ease-glass),
      color var(--dur-fast) var(--ease-glass);
  }
  .range-pill:hover {
    color: var(--text-1);
  }
  .range-pill.active {
    background: var(--glass-4);
    color: var(--text-1);
    box-shadow: var(--highlight);
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }
  .traffic-source {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: -6px 0 18px;
    font-size: 12px;
    cursor: help;
  }
  .traffic-source .pill {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--ring-soft);
    background: var(--glass-2);
    color: var(--text-2);
  }
  .traffic-source .pill strong {
    color: var(--text-1);
    font-variant-numeric: tabular-nums;
  }
  .traffic-source .pill-direct {
    border-color: color-mix(in oklch, var(--accent) 40%, var(--ring-soft));
  }
  .traffic-source .pill-camo {
    border-color: color-mix(in oklch, var(--text-3) 40%, var(--ring-soft));
  }
  .traffic-source .pill-legacy {
    opacity: 0.7;
  }
  :global(.chart-block) {
    margin-bottom: 18px;
  }
  .sub-h3 {
    font-size: 13px;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 16px 0 10px;
    font-weight: 700;
  }
  .breakdowns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  @media (max-width: 720px) {
    .breakdowns {
      grid-template-columns: 1fr;
    }
  }
  .breakdowns h3 {
    margin: 0 0 10px;
    font-size: 14px;
  }
  .breakdowns ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .breakdowns li {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid var(--ring-soft);
    font-size: 13px;
  }
  .breakdowns li:last-child {
    border-bottom: 0;
  }
  .muted {
    color: var(--text-3);
  }
  .methodology-link {
    margin-top: 16px;
    font-size: 12.5px;
  }
  .methodology-link a {
    color: var(--accent);
    text-decoration: none;
  }
</style>
