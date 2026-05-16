<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { api, type AnalyticsResult, type CardSummary } from '$lib/api';
  import { THEME_NAMES } from '$lib/theme';
  import Sparkline from '$lib/Sparkline.svelte';
  import Heatmap from '$lib/Heatmap.svelte';
  import {
    Glass,
    GlassButton,
    GlassInput,
    GlassSelect,
    GlassToggle,
    Stat,
  } from '$lib/ui';

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
    size?: { width?: number; height?: number };
    repo?: string;
    period?: string | { days: number };
    limit?: number;
    style?: string;
    sort?: string;
    apiKey?: string;
    range?: string;
  };
  let cfg = $state<LooseConfig>({ type: '', theme: 'github_dark' });

  const themeOptions = THEME_NAMES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }));
  const periodOptions = [
    { value: '1m', label: '1 month' },
    { value: '3m', label: '3 months' },
    { value: '6m', label: '6 months' },
    { value: '1y', label: '1 year' },
    { value: '2y', label: '2 years' },
    { value: 'all', label: 'all' },
  ];
  const followersPeriodOptions = [
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: '365d', label: '1 year' },
    { value: 'all', label: 'all' },
  ];
  const wakaRangeOptions = [
    { value: 'last_7_days', label: 'last 7 days' },
    { value: 'last_30_days', label: 'last 30 days' },
    { value: 'last_6_months', label: 'last 6 months' },
    { value: 'last_year', label: 'last year' },
  ];
  const sortOptions = [
    { value: 'stars', label: 'stars' },
    { value: 'forks', label: 'forks' },
    { value: 'updated', label: 'recently updated' },
  ];
  const styleOptions = [
    { value: 'bar', label: 'bar' },
    { value: 'donut', label: 'donut' },
  ];

  let periodString = $derived(
    typeof cfg.period === 'string' ? cfg.period : cfg.period ? 'custom' : '1y',
  );

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

  function setSizeField(field: 'width' | 'height', raw: string) {
    const n = raw.trim() === '' ? undefined : Number(raw);
    const next = { ...(cfg.size ?? {}) };
    if (n === undefined || Number.isNaN(n)) delete next[field];
    else next[field] = n;
    cfg.size = Object.keys(next).length > 0 ? next : undefined;
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
  <Glass tier={1} rounded="md" padding="md" class="error-banner">{err}</Glass>
{/if}

{#if card}
  <header class="head">
    <div>
      <p class="eyebrow">{card.type}</p>
      <h1 class="title-display">{cfg.title || card.type}</h1>
      <p class="sub">
        <code class="path">/{card.ownerLogin}/{card.slug}</code>
        · created {new Date(card.createdAt).toLocaleDateString()}
      </p>
    </div>
    <div class="head-actions">
      <GlassButton variant="ghost" size="md" onclick={copyMarkdown}>
        {copied ? '✓ Copied' : 'Copy markdown'}
      </GlassButton>
      <GlassButton variant="danger" size="md" onclick={remove}>Delete</GlassButton>
    </div>
  </header>

  <div class="grid">
    <!-- Config panel -->
    <Glass tier={3} rounded="lg" padding="lg" as="section" class="builder">
      <h2>Configure</h2>

      <GlassInput
        value={cfg.title ?? ''}
        label="Title"
        placeholder="(default)"
        oninput={(e) => {
          const v = (e.target as HTMLInputElement).value;
          cfg.title = v === '' ? undefined : v;
        }}
      />
      <GlassSelect bind:value={cfg.theme} label="Theme" options={themeOptions} />

      <!-- Per-type controls -->
      {#if card.type === 'visit-counter' && cfg.show}
        <fieldset>
          <legend>Show</legend>
          <GlassToggle bind:checked={cfg.show.total} label="Total impressions" />
          <GlassToggle bind:checked={cfg.show.unique} label="Unique visits" />
        </fieldset>
      {/if}

      {#if card.type === 'profile-stats' && cfg.show}
        <fieldset>
          <legend>Show</legend>
          <GlassToggle bind:checked={cfg.show.languages} label="Languages bar" />
        </fieldset>
      {/if}

      {#if card.type === 'repo-stats'}
        <GlassInput
          value={cfg.repo ?? ''}
          label="Repo"
          placeholder="owner/name"
          oninput={(e) => {
            cfg.repo = (e.target as HTMLInputElement).value;
          }}
        />
      {/if}

      {#if card.type === 'profile-summary' && cfg.show}
        <GlassSelect bind:value={periodString} label="Time period" options={periodOptions}
          onchange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            cfg.period = v;
          }}
        />
        <fieldset>
          <legend>Show</legend>
          <GlassToggle bind:checked={cfg.show.contributions} label="Contributions stat" />
          <GlassToggle bind:checked={cfg.show.repos} label="Public repos stat" />
          <GlassToggle bind:checked={cfg.show.joined} label="Joined stat" />
          <GlassToggle bind:checked={cfg.show.chart} label="Contribution chart" />
        </fieldset>
      {/if}

      {#if card.type === 'languages'}
        <div class="row">
          <GlassInput
            value={String(cfg.limit ?? 8)}
            label="Limit (3–15)"
            oninput={(e) => {
              cfg.limit = Number((e.target as HTMLInputElement).value);
            }}
          />
          <GlassSelect
            value={cfg.style ?? 'bar'}
            label="Style"
            options={styleOptions}
            onchange={(e) => {
              cfg.style = (e.target as HTMLSelectElement).value;
            }}
          />
        </div>
      {/if}

      {#if card.type === 'top-repos'}
        <div class="row">
          <GlassInput
            value={String(cfg.limit ?? 5)}
            label="Limit (3–8)"
            oninput={(e) => {
              cfg.limit = Number((e.target as HTMLInputElement).value);
            }}
          />
          <GlassSelect
            value={cfg.sort ?? 'stars'}
            label="Sort"
            options={sortOptions}
            onchange={(e) => {
              cfg.sort = (e.target as HTMLSelectElement).value;
            }}
          />
        </div>
      {/if}

      {#if card.type === 'gist-counter' && cfg.show}
        <fieldset>
          <legend>Show</legend>
          <GlassToggle bind:checked={cfg.show.count} label="Public gist count" />
          <GlassToggle bind:checked={cfg.show.latest} label="Latest gist" />
        </fieldset>
      {/if}

      {#if card.type === 'wakatime'}
        <GlassInput
          value={cfg.apiKey ?? ''}
          type="password"
          label="Wakatime API key"
          help="Stored in plain text in v1 — self-hosted only."
          oninput={(e) => {
            cfg.apiKey = (e.target as HTMLInputElement).value;
          }}
        />
        <div class="row">
          <GlassSelect
            value={cfg.range ?? 'last_7_days'}
            label="Range"
            options={wakaRangeOptions}
            onchange={(e) => {
              cfg.range = (e.target as HTMLSelectElement).value;
            }}
          />
          <GlassInput
            value={String(cfg.limit ?? 6)}
            label="Limit (3–10)"
            oninput={(e) => {
              cfg.limit = Number((e.target as HTMLInputElement).value);
            }}
          />
        </div>
      {/if}

      {#if card.type === 'followers-sparkline'}
        <GlassSelect
          value={typeof cfg.period === 'string' ? cfg.period : '90d'}
          label="Period"
          options={followersPeriodOptions}
          onchange={(e) => {
            cfg.period = (e.target as HTMLSelectElement).value;
          }}
        />
      {/if}

      <!-- Size, applies to every card type -->
      <fieldset>
        <legend>Size (optional)</legend>
        <div class="row">
          <GlassInput
            value={cfg.size?.width !== undefined ? String(cfg.size.width) : ''}
            label="Width (200–1200)"
            placeholder="auto"
            oninput={(e) => setSizeField('width', (e.target as HTMLInputElement).value)}
          />
          <GlassInput
            value={cfg.size?.height !== undefined ? String(cfg.size.height) : ''}
            label="Height (80–600)"
            placeholder="auto"
            oninput={(e) => setSizeField('height', (e.target as HTMLInputElement).value)}
          />
        </div>
      </fieldset>

      <!-- Theme overrides -->
      <fieldset>
        <legend>Theme overrides (hex)</legend>
        <div class="overrides">
          {#each ['background', 'text', 'muted', 'accent', 'border'] as token (token)}
            <GlassInput
              value={cfg.overrides?.[token] ?? ''}
              label={token}
              placeholder="#000000"
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                const next = { ...(cfg.overrides ?? {}) };
                if (v) next[token] = v;
                else delete next[token];
                cfg.overrides = Object.keys(next).length > 0 ? next : undefined;
              }}
            />
          {/each}
        </div>
      </fieldset>

      <div class="actions">
        <GlassButton variant="primary" size="md" onclick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </GlassButton>
      </div>
    </Glass>

    <!-- Preview + URL -->
    <Glass tier={2} rounded="lg" padding="lg" as="section" class="preview">
      <h2>Preview</h2>
      <div class="preview-canvas">
        <img src={svgUrl} alt="Card preview" />
      </div>
      <p class="muted preview-url">
        Live URL: <code>{card.url}</code>
      </p>
    </Glass>
  </div>

  <!-- Analytics -->
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
            onclick={() => {
              range = r;
              loadAnalytics();
            }}
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
          <Stat label="Unique ({range})" value={analytics.totals.uniqueVisits} accent />
        </Glass>
      </div>

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
{/if}

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    margin: 16px 0 24px;
    flex-wrap: wrap;
  }
  .eyebrow {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0 0 6px;
  }
  h1 {
    margin: 0 0 6px;
    font-size: clamp(26px, 4vw, 36px);
    letter-spacing: -0.02em;
  }
  .sub {
    color: var(--text-3);
    font-size: 13px;
    margin: 0;
  }
  .path {
    font-family: var(--font-mono);
    background: var(--glass-2);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    color: var(--text-2);
    border: 1px solid var(--ring-soft);
  }
  .head-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  :global(.error-banner) {
    color: var(--danger);
    margin-bottom: 16px;
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 20px;
    margin: 0 0 32px;
  }
  @media (max-width: 880px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  :global(.builder) {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  :global(.builder) h2,
  :global(.preview) h2 {
    margin: 0;
    font-size: 18px;
    letter-spacing: -0.01em;
  }
  fieldset {
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    margin: 0;
    background: var(--glass-1);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  legend {
    color: var(--text-3);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
    padding: 0 6px;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .overrides {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
  }
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }

  :global(.preview) {
    display: flex;
    flex-direction: column;
    gap: 16px;
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
  .preview-canvas img {
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
    border: 1px solid var(--ring-soft);
    font-family: var(--font-mono);
    color: var(--text-2);
  }

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
