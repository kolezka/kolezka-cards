<script lang="ts">
  import { goto } from '$app/navigation';
  import { api } from '$lib/api';
  import {
    CARD_TYPES,
    THEME_NAMES,
    defaultConfigFor,
    type CardType,
    type ThemeName,
  } from '$lib/theme';
  import { Glass, GlassButton, GlassInput, GlassSelect } from '$lib/ui';

  let slug = $state('my-card');
  let type = $state<CardType>('visit-counter');
  let theme = $state<ThemeName>('github_dark');
  let saving = $state(false);
  let err = $state<string | null>(null);

  const typeOptions = CARD_TYPES.map((t) => ({ value: t, label: t }));
  const themeOptions = THEME_NAMES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }));

  async function create(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    err = null;
    try {
      const config = defaultConfigFor(type, theme);
      const card = await api.createCard(slug, config);
      if (card) goto(`/app/c/${card.id}`);
    } catch (e) {
      err = (e as Error).message;
    } finally {
      saving = false;
    }
  }
</script>

<div class="wrap">
  <header class="head">
    <p class="eyebrow">Create</p>
    <h1 class="title-display">New card</h1>
    <p class="sub">Pick a type and theme. You can fine-tune everything afterwards.</p>
  </header>

  <Glass tier={3} rounded="lg" padding="lg" as="section" class="panel">
    <form onsubmit={create}>
      <GlassInput
        bind:value={slug}
        label="Slug"
        help="Lowercase letters, digits, and hyphens. This is the URL fragment."
        required
        autocomplete="off"
      />
      <GlassSelect bind:value={type} label="Card type" options={typeOptions} />
      <GlassSelect bind:value={theme} label="Theme" options={themeOptions} />

      {#if err}
        <p class="err">{err}</p>
      {/if}

      <div class="actions">
        <GlassButton variant="primary" size="md" type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create card'}
        </GlassButton>
        <GlassButton variant="ghost" size="md" href="/app">Cancel</GlassButton>
      </div>
    </form>
  </Glass>
</div>

<style>
  .wrap {
    max-width: 520px;
    margin: 24px auto 0;
  }
  .head {
    margin-bottom: 22px;
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
    font-size: clamp(28px, 4vw, 36px);
    letter-spacing: -0.02em;
  }
  .sub {
    color: var(--text-2);
    margin: 0;
  }
  :global(.panel) form {
    display: grid;
    gap: 16px;
  }
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 6px;
  }
  .err {
    color: var(--danger);
    font-size: 13px;
    margin: 0;
  }
</style>
