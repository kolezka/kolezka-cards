<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type CardSummary } from '$lib/api';
  import { Glass, GlassButton } from '$lib/ui';

  let cards = $state<CardSummary[]>([]);
  let loading = $state(true);
  let err = $state<string | null>(null);

  async function load() {
    try {
      cards = (await api.listCards()) ?? [];
    } catch (e) {
      err = (e as Error).message;
    } finally {
      loading = false;
    }
  }
  onMount(load);
</script>

<header class="head">
  <div>
    <p class="eyebrow">Your library</p>
    <h1 class="title-display">Cards</h1>
  </div>
  <GlassButton variant="primary" size="md" href="/app/new">
    <span class="plus" aria-hidden="true">+</span> New card
  </GlassButton>
</header>

{#if loading}
  <Glass tier={1} rounded="md" padding="md" class="state muted">Loading your cards…</Glass>
{:else if err}
  <Glass tier={1} rounded="md" padding="md" class="state error">Error: {err}</Glass>
{:else if cards.length === 0}
  <Glass tier={2} rounded="lg" padding="lg" class="empty">
    <h2>No cards yet</h2>
    <p>Create your first card to embed in your README.</p>
    <GlassButton variant="primary" size="md" href="/app/new">Create a card</GlassButton>
  </Glass>
{:else}
  <ul class="cards">
    {#each cards as c (c.id)}
      <li>
        <a class="tile" href={`/app/c/${c.id}`}>
          <Glass tier={2} rounded="lg" padding="md" class="tile-surface">
            <div class="tile-head">
              <span class="type-pill">{c.type}</span>
              <span class="slug">/{c.ownerLogin}/{c.slug}</span>
            </div>
            <div class="preview-wrap">
              <img src={`${c.url}?v=${Date.now()}`} alt={`Preview of ${c.type}`} loading="lazy" />
            </div>
          </Glass>
        </a>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    margin: 16px 0 28px;
    flex-wrap: wrap;
  }
  .eyebrow {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-3);
    margin: 0 0 8px;
  }
  h1 {
    margin: 0;
    font-size: clamp(28px, 4vw, 40px);
    letter-spacing: -0.02em;
  }
  .plus {
    font-size: 17px;
    line-height: 1;
  }

  :global(.state) {
    color: var(--text-2);
    text-align: center;
  }
  :global(.state.error) {
    color: var(--danger);
  }
  :global(.empty) {
    max-width: 480px;
    margin: 32px auto;
    text-align: center;
  }
  :global(.empty h2) {
    margin: 0 0 8px;
    font-size: 20px;
  }
  :global(.empty p) {
    color: var(--text-2);
    margin: 0 0 18px;
  }

  .cards {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 18px;
  }
  .tile {
    text-decoration: none;
    color: inherit;
    display: block;
    transition: transform var(--dur-med) var(--ease-glass);
  }
  .tile:hover {
    transform: translateY(-2px);
  }
  :global(.tile-surface) {
    transition: background var(--dur-med) var(--ease-glass);
  }
  .tile:hover :global(.tile-surface) {
    background: var(--glass-3);
  }
  .tile-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    gap: 8px;
  }
  .type-pill {
    background: var(--glass-3);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-pill);
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    color: var(--accent);
    letter-spacing: 0.02em;
    text-transform: lowercase;
    white-space: nowrap;
    flex: 0 0 auto;
  }
  .slug {
    color: var(--text-3);
    font-family: var(--font-mono);
    font-size: 11.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .preview-wrap {
    background: var(--glass-1);
    border-radius: var(--radius-md);
    padding: 10px;
    border: 1px solid var(--ring-soft);
  }
  img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: var(--radius-sm);
  }
</style>
