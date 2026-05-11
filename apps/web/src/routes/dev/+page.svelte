<script lang="ts">
  import { onMount } from 'svelte';

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
  let selected = $state<DevCard | null>(null);
  let totals = $state<Totals | null>(null);
  let error = $state<string | null>(null);
  let cacheBuster = $state(Date.now());

  async function loadCards() {
    try {
      const r = await fetch('/api/_dev/cards');
      if (!r.ok) throw new Error(`${r.status}`);
      cards = (await r.json()) as DevCard[];
      if (!selected && cards[0]) selected = cards[0];
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

<h1>Dev preview</h1>

{#if error}
  <p class="err">Error: {error}</p>
{/if}

{#if cards.length === 0}
  <p>No cards yet. Run <code>bun run db:seed</code>.</p>
{:else}
  <label>
    Card:
    <select
      bind:value={selected}
      onchange={() => {
        totals = null;
        loadTotals();
      }}
    >
      {#each cards as c (c.id)}
        <option value={c}>{c.userLogin}/{c.slug} ({c.type})</option>
      {/each}
    </select>
  </label>

  {#if selected}
    <section>
      <div class="tiles">
        <div class="tile">
          <div class="label">Total impressions</div>
          <div class="value">{totals?.totalImpressions ?? '…'}</div>
        </div>
        <div class="tile">
          <div class="label">Unique visits</div>
          <div class="value">{totals?.uniqueVisits ?? '…'}</div>
        </div>
      </div>

      <p>
        URL:
        <code>/c/{selected.userLogin}/{selected.slug}.svg</code>
        <button onclick={refresh}>Refresh</button>
      </p>

      <img src={svgUrl} alt="card preview" />

      <details>
        <summary>Markdown snippet</summary>
        <pre>![card](http://localhost:3001/c/{selected.userLogin}/{selected.slug}.svg)</pre>
      </details>
    </section>
  {/if}
{/if}

<style>
  h1 {
    margin-top: 0;
  }
  .err {
    color: #f87171;
  }
  select,
  button {
    background: #161b22;
    color: #e6edf3;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 6px 10px;
  }
  .tiles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 20px 0;
  }
  .tile {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 16px;
  }
  .label {
    color: #8b949e;
    font-size: 12px;
  }
  .value {
    color: #58a6ff;
    font-size: 28px;
    font-weight: 700;
    margin-top: 4px;
  }
  img {
    display: block;
    margin-top: 12px;
    border-radius: 8px;
  }
  code,
  pre {
    background: #161b22;
    padding: 2px 6px;
    border-radius: 4px;
  }
  pre {
    padding: 12px;
    overflow: auto;
  }
</style>
