<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type Me } from '$lib/api';
  import '$lib/styles/tokens.css';

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
  :global(body) {
    font-size: 15px;
    line-height: 1.55;
  }
  header {
    position: sticky;
    top: 12px;
    z-index: 50;
    max-width: 1100px;
    margin: 12px auto 0;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: var(--glass-2);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-pill);
    box-shadow: var(--shadow-1), var(--highlight);
    backdrop-filter: blur(var(--blur-md)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--blur-md)) saturate(180%);
  }
  @media (max-width: 520px) {
    header {
      top: 8px;
      margin: 8px 8px 0;
      padding: 6px 10px;
    }
    .brand {
      font-size: 14px;
    }
    nav {
      gap: 2px;
    }
    nav a {
      padding: 6px 8px;
      font-size: 13px;
    }
    .login {
      display: none;
    }
  }
  .brand {
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-1);
    text-decoration: none;
    padding: 6px 10px;
  }
  nav {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  nav a {
    color: var(--text-2);
    text-decoration: none;
    padding: 6px 12px;
    border-radius: var(--radius-pill);
    transition: color var(--dur-fast) var(--ease-glass),
      background var(--dur-fast) var(--ease-glass);
  }
  nav a:hover {
    color: var(--text-1);
    background: var(--glass-3);
  }
  .btn {
    background: var(--accent);
    color: var(--text-on-accent);
    padding: 7px 14px;
    border-radius: var(--radius-pill);
    font-weight: 600;
    transition: filter var(--dur-fast) var(--ease-glass);
  }
  .btn:hover {
    filter: brightness(1.08);
  }
  .login {
    color: var(--text-3);
    padding: 0 8px;
    font-size: 13px;
  }
  button {
    background: var(--glass-3);
    color: var(--text-1);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-pill);
    padding: 5px 12px;
    font: inherit;
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease-glass);
  }
  button:hover {
    background: var(--glass-4);
  }
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 80px;
  }
  @media (max-width: 520px) {
    main {
      padding: 24px 14px 64px;
    }
  }
</style>
