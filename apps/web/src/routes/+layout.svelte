<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type Me } from '$lib/api';

  let { children } = $props();
  let me = $state<Me | null | undefined>(undefined);

  async function loadMe() {
    try {
      me = await api.me();
    } catch {
      me = null;
    }
  }
  async function logout() {
    await api.logout();
    me = null;
    location.href = '/';
  }
  onMount(loadMe);
</script>

<header>
  <a class="brand" href="/">kolezka-cards</a>
  <nav>
    <a href="/methodology">methodology</a>
    <a href="/privacy">privacy</a>
    {#if me}
      <a href="/app">cards</a>
      <span class="login">@{me.login}</span>
      <button type="button" onclick={logout}>logout</button>
    {:else if me === null}
      <a class="btn" href="/auth/github">login with GitHub</a>
    {:else}
      <span class="login">…</span>
    {/if}
  </nav>
</header>

<main>
  {@render children?.()}
</main>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    background: #0d1117;
    color: #e6edf3;
    font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  }
  header {
    max-width: 1040px;
    margin: 0 auto;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #21262d;
  }
  .brand {
    font-weight: 600;
    color: #e6edf3;
    text-decoration: none;
  }
  nav {
    display: flex;
    gap: 14px;
    align-items: center;
  }
  nav a {
    color: #8b949e;
    text-decoration: none;
  }
  nav a:hover {
    color: #e6edf3;
  }
  .btn {
    background: #238636;
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
  }
  .login {
    color: #8b949e;
  }
  button {
    background: #21262d;
    color: #e6edf3;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 4px 10px;
    cursor: pointer;
  }
  main {
    max-width: 1040px;
    margin: 0 auto;
    padding: 24px;
  }
</style>
