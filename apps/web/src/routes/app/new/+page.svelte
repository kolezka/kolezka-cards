<script lang="ts">
  import { goto } from '$app/navigation';
  import { api } from '$lib/api';
  import { CARD_TYPES, THEME_NAMES, defaultConfigFor, type CardType, type ThemeName } from '$lib/theme';

  let slug = $state('my-card');
  let type = $state<CardType>('visit-counter');
  let theme = $state<ThemeName>('github_dark');
  let saving = $state(false);
  let err = $state<string | null>(null);

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

<h1>New card</h1>

<form onsubmit={create}>
  <label>
    Slug
    <input
      type="text"
      bind:value={slug}
      pattern="[a-z0-9][a-z0-9-]*"
      title="lowercase letters, digits, hyphens"
      required
    />
  </label>

  <label>
    Type
    <select bind:value={type}>
      {#each CARD_TYPES as t}
        <option value={t}>{t}</option>
      {/each}
    </select>
  </label>

  <label>
    Theme
    <select bind:value={theme}>
      {#each THEME_NAMES as t}
        <option value={t}>{t}</option>
      {/each}
    </select>
  </label>

  {#if err}<p class="err">{err}</p>{/if}

  <button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create card'}</button>
  <a href="/app">Cancel</a>
</form>

<style>
  form {
    display: grid;
    gap: 12px;
    max-width: 420px;
  }
  label {
    display: grid;
    gap: 4px;
    color: #8b949e;
    font-size: 12px;
  }
  input,
  select {
    background: #161b22;
    color: #e6edf3;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 14px;
  }
  button {
    background: #238636;
    color: white;
    border: 0;
    border-radius: 6px;
    padding: 8px 16px;
    cursor: pointer;
  }
  .err {
    color: #f87171;
  }
  a {
    color: #8b949e;
    margin-left: 12px;
  }
</style>
