<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { api, type AnalyticsResult, type CardSummary } from '$lib/api';
  import { THEME_NAMES } from '$lib/theme';
  import Sparkline from '$lib/Sparkline.svelte';
  import Heatmap from '$lib/Heatmap.svelte';

  let cardId = $derived(page.params.id ?? '');
  let card = $state<CardSummary | null>(null);
  let analytics = $state<AnalyticsResult | null>(null);
  let range = $state<AnalyticsResult['range']>('7d');
  let err = $state<string | null>(null);
  let saving = $state(false);
  let copied = $state(false);
  let cacheBuster = $state(Date.now());

  type LooseConfig = {
    type: string;
    theme: string;
    title?: string;
    overrides?: Record<string, string>;
    show?: Record<string, boolean>;
    repo?: string;
  };
  let cfg = $state<LooseConfig>({ type: '', theme: 'github_dark' });

  async function loadAll() {
    try {
      const [c, a] = await Promise.all([api.getCard(cardId), api.analytics(cardId, range)]);
      if (!c) return goto('/app');
      card = c;
      cfg = { ...(c.config as LooseConfig) };
      analytics = a;
    } catch (e) {
      err = (e as Error).message;
    }
  }

  async function loadAnalytics() {
    try {
      analytics = await api.analytics(cardId, range);
    } catch (e) {
      err = (e as Error).message;
    }
  }

  async function save() {
    if (!card) return;
    saving = true;
    err = null;
    try {
      const updated = await api.patchCard(card.id, { config: cfg as Record<string, unknown> });
      if (updated) {
        card = updated;
        cacheBuster = Date.now();
      }
    } catch (e) {
      err = (e as Error).message;
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (!card) return;
    if (!confirm(`Delete /${card.ownerLogin}/${card.slug}?`)) return;
    await api.deleteCard(card.id);
    goto('/app');
  }

  function copyMarkdown() {
    if (!card) return;
    const origin = location.origin;
    navigator.clipboard.writeText(`![card](${origin}${card.url})`);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 1500);
  }

  onMount(loadAll);

  let svgUrl = $derived(card ? `${card.url}?v=${cacheBuster}` : '');
</script>

{#if err}
  <p class="err">{err}</p>
{/if}
{#if card}
  <div class="head">
    <div>
      <h1>{card.type}</h1>
      <p class="muted">
        /{card.ownerLogin}/{card.slug} · created {new Date(card.createdAt).toLocaleDateString()}
      </p>
    </div>
    <button class="danger" type="button" onclick={remove}>Delete</button>
  </div>

  <section class="grid">
    <div class="builder">
      <h2>Configure</h2>

      <label>
        Title
        <input type="text" bind:value={cfg.title} maxlength="80" placeholder="(default)" />
      </label>

      <label>
        Theme
        <select bind:value={cfg.theme}>
          {#each THEME_NAMES as t}
            <option value={t}>{t}</option>
          {/each}
        </select>
      </label>

      {#if card.type === 'visit-counter' && cfg.show}
        <fieldset>
          <legend>Show</legend>
          <label class="inline"><input type="checkbox" bind:checked={cfg.show.total} /> Total impressions</label>
          <label class="inline"><input type="checkbox" bind:checked={cfg.show.unique} /> Unique visits</label>
        </fieldset>
      {/if}

      {#if card.type === 'profile-stats' && cfg.show}
        <fieldset>
          <legend>Show</legend>
          <label class="inline"><input type="checkbox" bind:checked={cfg.show.languages} /> Languages</label>
        </fieldset>
      {/if}

      {#if card.type === 'repo-stats'}
        <label>
          Repo (owner/name)
          <input type="text" bind:value={cfg.repo} placeholder="owner/name" />
        </label>
      {/if}

      <fieldset>
        <legend>Theme overrides (hex)</legend>
        {#each ['background', 'text', 'muted', 'accent', 'border'] as token}
          <label class="inline">
            <input
              type="text"
              placeholder="#000000"
              value={cfg.overrides?.[token] ?? ''}
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                const next = { ...(cfg.overrides ?? {}) };
                if (v) next[token] = v;
                else delete next[token];
                cfg.overrides = Object.keys(next).length > 0 ? next : undefined;
              }}
            />
            <span>{token}</span>
          </label>
        {/each}
      </fieldset>

      <div class="actions">
        <button onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" class="ghost" onclick={copyMarkdown}>{copied ? 'Copied' : 'Copy markdown'}</button>
      </div>
    </div>

    <div class="preview">
      <h2>Preview</h2>
      <img src={svgUrl} alt="preview" />
      <p class="muted">Live URL: <code>{card.url}</code></p>
    </div>
  </section>

  <section>
    <h2>Analytics</h2>
    <div class="rangebar">
      {#each ['24h', '7d', '30d', 'all'] as const as r}
        <button
          type="button"
          class:active={range === r}
          onclick={() => {
            range = r;
            loadAnalytics();
          }}
        >
          {r}
        </button>
      {/each}
    </div>
    {#if analytics}
      <div class="tiles">
        <div class="tile">
          <div class="label">Impressions ({range})</div>
          <div class="value">{analytics.totals.totalImpressions}</div>
        </div>
        <div class="tile">
          <div class="label">Unique visits ({range})</div>
          <div class="value">{analytics.totals.uniqueVisits}</div>
        </div>
      </div>

      <Sparkline series={analytics.series} />

      <h3 class="sub">Visits by hour of week (UTC)</h3>
      <Heatmap grid={analytics.heatmap} />

      <div class="breakdowns">
        <div>
          <h3>Top referrers</h3>
          {#if analytics.referrers.length === 0}<p class="muted">None.</p>{/if}
          <ul>
            {#each analytics.referrers.slice(0, 8) as r}
              <li>
                <span>{r.host ?? '(none)'}</span>
                <strong>{r.count}</strong>
              </li>
            {/each}
          </ul>
        </div>
        <div>
          <h3>Countries</h3>
          {#if analytics.countries.length === 0}<p class="muted">None.</p>{/if}
          <ul>
            {#each analytics.countries.slice(0, 8) as r}
              <li>
                <span>{r.country ?? '(none)'}</span>
                <strong>{r.count}</strong>
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <p class="muted">
        Approximate unique visits — see <a href="/methodology">methodology</a>.
      </p>
    {/if}
  </section>
{/if}

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  h1 {
    margin: 0;
  }
  .muted {
    color: #8b949e;
  }
  .err {
    color: #f87171;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin: 24px 0;
  }
  @media (max-width: 720px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
  .builder {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 10px;
    padding: 16px;
    display: grid;
    gap: 12px;
  }
  .preview {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 10px;
    padding: 16px;
  }
  .preview img {
    width: 100%;
    border-radius: 6px;
  }
  label {
    display: grid;
    gap: 4px;
    color: #8b949e;
    font-size: 12px;
  }
  label.inline {
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: center;
  }
  fieldset {
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 8px;
    display: grid;
    gap: 6px;
  }
  legend {
    color: #8b949e;
    font-size: 12px;
    padding: 0 6px;
  }
  input,
  select,
  button {
    background: #0d1117;
    color: #e6edf3;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 14px;
  }
  button {
    background: #238636;
    border: 0;
    color: white;
    cursor: pointer;
  }
  button.ghost {
    background: #0d1117;
    color: #e6edf3;
    border: 1px solid #30363d;
  }
  button.danger {
    background: #b62324;
    color: white;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .rangebar {
    display: inline-flex;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 2px;
    margin-bottom: 12px;
  }
  .rangebar button {
    background: transparent;
    color: #8b949e;
    border: 0;
    border-radius: 4px;
    padding: 4px 12px;
  }
  .rangebar button.active {
    background: #21262d;
    color: #e6edf3;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  .tile {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 10px;
    padding: 16px;
  }
  .tile .label {
    color: #8b949e;
    font-size: 12px;
  }
  .tile .value {
    color: #58a6ff;
    font-size: 28px;
    font-weight: 700;
    margin-top: 4px;
  }
  .breakdowns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 16px;
  }
  .breakdowns ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .breakdowns li {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px solid #21262d;
  }
  code {
    background: #161b22;
    padding: 2px 4px;
    border-radius: 4px;
  }
</style>
