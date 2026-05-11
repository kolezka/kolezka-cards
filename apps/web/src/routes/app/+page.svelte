<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type CardSummary } from '$lib/api';

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

<div class="head">
  <h1>Your cards</h1>
  <a class="btn" href="/app/new">+ New card</a>
</div>

{#if loading}
  <p class="muted">Loading…</p>
{:else if err}
  <p class="err">Error: {err}</p>
{:else if cards.length === 0}
  <p class="muted">No cards yet. Create one to get started.</p>
{:else}
  <ul class="cards">
    {#each cards as c (c.id)}
      <li>
        <a href={`/app/c/${c.id}`}>
          <div class="type">{c.type}</div>
          <div class="slug">/{c.ownerLogin}/{c.slug}</div>
          <img src={`${c.url}?v=${Date.now()}`} alt="preview" loading="lazy" />
        </a>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h1 {
    margin: 0;
  }
  .btn {
    background: #238636;
    color: white;
    padding: 8px 14px;
    border-radius: 6px;
    text-decoration: none;
  }
  .cards {
    list-style: none;
    padding: 0;
    margin: 16px 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  .cards li a {
    display: block;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 10px;
    padding: 12px;
    text-decoration: none;
    color: inherit;
  }
  .type {
    color: #58a6ff;
    font-weight: 600;
  }
  .slug {
    color: #8b949e;
    font-size: 12px;
    margin-bottom: 8px;
  }
  img {
    width: 100%;
    height: auto;
    border-radius: 6px;
  }
  .err {
    color: #f87171;
  }
  .muted {
    color: #8b949e;
  }
</style>
