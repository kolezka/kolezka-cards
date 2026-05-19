<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { api, type AnalyticsResult, type CardSummary } from '$lib/api';
  import CardAnalytics from '$lib/cards/CardAnalytics.svelte';
  import LivePreview from '$lib/cards/LivePreview.svelte';
  import { THEME_NAMES } from '$lib/theme';
  import { Glass, GlassButton, GlassInput, GlassSelect, GlassToggle } from '$lib/ui';

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
    {#if card.type !== 'custom'}
      <!-- For custom cards the builder's own canvas IS the live preview —
           showing two of the same thing is just noise. -->
      <LivePreview
        cardType={card.type}
        cardUrl={card.url}
        cfg={cfg as never}
        fallbackImgUrl={svgUrl}
        login={card.ownerLogin}
      />
    {/if}

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

      {#if card.type === 'profile-views'}
        <GlassSelect
          value={(cfg as unknown as { metric?: string }).metric ?? 'total'}
          label="Metric"
          options={[
            { value: 'total', label: 'Total impressions' },
            { value: 'unique', label: 'Unique visits' },
          ]}
          onchange={(e) => {
            (cfg as unknown as { metric: string }).metric = (
              e.target as HTMLSelectElement
            ).value;
          }}
        />
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

      {#if card.type === 'custom'}
        <p class="muted preview-url">
          Live URL: <code>{card.url}</code>
        </p>
        {#await import('$lib/CardBuilder.svelte')}
          <p class="muted">Loading builder…</p>
        {:then Mod}
          {@const Builder = Mod.default}
          <Builder
            cfg={cfg as never}
            onChange={(next) => {
              cfg = next as never;
            }}
          />
        {/await}
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
  </div>

  <CardAnalytics
    {analytics}
    {range}
    onRangeChange={(next) => {
      range = next;
      loadAnalytics();
    }}
  />
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
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    margin: 0 0 32px;
  }

  :global(.builder) {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  :global(.builder) h2 {
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
  .muted {
    color: var(--text-3);
  }
</style>
