<script lang="ts">
  import { onMount } from 'svelte';
  import { Glass, GlassButton, GlassSelect, Stat } from '$lib/ui';

  interface Totals {
    totalImpressions: number;
    uniqueVisits: number;
  }
  interface DevCard {
    id: string;
    userLogin: string;
    slug: string;
    type: string;
  }

  let cards = $state<DevCard[]>([]);
  let selectedId = $state<string>('');
  let totals = $state<Totals | null>(null);
  let error = $state<string | null>(null);
  let cacheBuster = $state(Date.now());

  let selected = $derived(cards.find((c) => c.id === selectedId) ?? cards[0] ?? null);
  let cardOptions = $derived(
    cards.map((c) => ({ value: c.id, label: `${c.userLogin}/${c.slug} (${c.type})` })),
  );

  async function loadCards() {
    try {
      const r = await fetch('/api/_dev/cards');
      if (!r.ok) throw new Error(`${r.status}`);
      cards = (await r.json()) as DevCard[];
      if (!selectedId && cards[0]) selectedId = cards[0].id;
    } catch (e) {
      error = `load cards: ${(e as Error).message}`;
    }
  }

  async function loadTotals() {
    if (!selected) return;
    try {
      const r = await fetch(`/api/_dev/cards/${selected.id}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const data = (await r.json()) as { totals: Totals };
      totals = data.totals;
    } catch (e) {
      error = `load totals: ${(e as Error).message}`;
    }
  }

  function refresh() {
    cacheBuster = Date.now();
    loadTotals();
  }

  onMount(() => {
    loadCards().then(loadTotals);
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  });

  let svgUrl = $derived(
    selected ? `/c/${selected.userLogin}/${selected.slug}.svg?v=${cacheBuster}` : '',
  );
</script>

<header class="head">
  <p class="eyebrow">Dev</p>
  <h1 class="title-display">Live card preview</h1>
</header>

{#if error}
  <Glass tier={1} rounded="md" padding="md" class="error-banner">Error: {error}</Glass>
{/if}

{#if cards.length === 0}
  <Glass tier={2} rounded="md" padding="lg" class="empty">
    No cards yet. Run <code>bun run db:seed</code>.
  </Glass>
{:else}
  <Glass tier={2} rounded="lg" padding="lg" class="picker">
    <GlassSelect bind:value={selectedId} label="Card" options={cardOptions} onchange={loadTotals} />
  </Glass>

  {#if selected}
    <div class="tiles">
      <Glass tier={2} rounded="md" padding="md">
        <Stat label="Total impressions" value={totals?.totalImpressions ?? '…'} accent />
      </Glass>
      <Glass tier={2} rounded="md" padding="md">
        <Stat label="Unique visits" value={totals?.uniqueVisits ?? '…'} accent />
      </Glass>
    </div>

    <Glass tier={3} rounded="lg" padding="lg" class="preview">
      <div class="preview-head">
        <code>/c/{selected.userLogin}/{selected.slug}.svg</code>
        <GlassButton variant="ghost" size="sm" onclick={refresh}>Refresh</GlassButton>
      </div>
      <div class="preview-canvas">
        <img src={svgUrl} alt="card preview" />
      </div>
      <details class="snippet">
        <summary>Markdown snippet</summary>
        <pre>![card](http://localhost:3001/c/{selected.userLogin}/{selected.slug}.svg)</pre>
      </details>
    </Glass>
  {/if}
{/if}

<style>
  .head {
    margin: 16px 0 22px;
  }
  .eyebrow {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-3);
    margin: 0 0 8px;
  }
  h1 {
    margin: 0 0 6px;
    font-size: clamp(26px, 4vw, 36px);
    letter-spacing: -0.02em;
  }
  .sub {
    color: var(--text-2);
    margin: 0;
  }
  :global(.error-banner) {
    color: var(--danger);
    margin-bottom: 16px;
  }
  :global(.empty) {
    text-align: center;
    color: var(--text-2);
  }
  :global(.picker) {
    margin-bottom: 18px;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }
  :global(.preview) {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .preview-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .preview-head code {
    background: var(--glass-2);
    border: 1px solid var(--ring-soft);
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--text-2);
  }
  .preview-canvas {
    background:
      linear-gradient(45deg, var(--glass-1) 25%, transparent 25%),
      linear-gradient(-45deg, var(--glass-1) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--glass-1) 75%),
      linear-gradient(-45deg, transparent 75%, var(--glass-1) 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
    padding: 16px;
    border-radius: var(--radius-md);
    border: 1px solid var(--ring-soft);
  }
  .preview-canvas img {
    width: 100%;
    display: block;
  }
  .snippet summary {
    cursor: pointer;
    color: var(--text-3);
    font-size: 13px;
  }
  .snippet pre {
    background: var(--glass-1);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    overflow: auto;
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--text-2);
    margin: 10px 0 0;
  }
  code {
    background: var(--glass-2);
    border: 1px solid var(--ring-soft);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--text-2);
  }
</style>
