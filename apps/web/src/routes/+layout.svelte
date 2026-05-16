<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type Me } from '$lib/api';
  import { Logo } from '$lib/ui';
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
  <a class="brand" href="/" aria-label="kolezka-cards home">
    <Logo size={28} />
  </a>
  <nav>
    <a class="nav-link nav-secondary" href="/methodology">methodology</a>
    <a class="nav-link nav-secondary" href="/privacy">privacy</a>
    {#if me}
      <a class="nav-link" href="/app">cards</a>
      <span class="login">@{me.login}</span>
      <button type="button" onclick={logout}>logout</button>
    {:else if me === null}
      <a class="btn" href="/auth/github">login</a>
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
    /* Pill hugs its contents (logo + nav). Capped so it never overflows
       the viewport on small screens. Centered via auto margins. */
    width: fit-content;
    max-width: calc(100% - 24px);
    margin: 12px auto 0;
    padding: 6px 10px 6px 12px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: var(--glass-2);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-pill);
    box-shadow: var(--shadow-1), var(--highlight);
    backdrop-filter: blur(var(--blur-md)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--blur-md)) saturate(180%);
  }
  @media (max-width: 640px) {
    header {
      top: 8px;
      margin: 8px 8px 0;
      padding: 6px 10px;
      gap: 8px;
    }
    .brand {
      width: 36px;
      height: 32px;
    }
    nav {
      gap: 2px;
    }
    .nav-link {
      padding: 6px 10px;
      font-size: 13px;
    }
    /* Hide secondary nav (methodology / privacy) when space is tight —
       they're still reachable from the footer-style links in long-form
       page bodies. Primary nav (cards / login / logout) stays. */
    .nav-secondary {
      display: none;
    }
    .login {
      display: none;
    }
  }
  .brand {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 40px;
    height: 36px;
    border-radius: var(--radius-pill);
    text-decoration: none;
    transition: background var(--dur-fast) var(--ease-glass),
      transform var(--dur-fast) var(--ease-glass);
  }
  .brand:hover {
    background: var(--glass-3);
  }
  .brand:active {
    transform: scale(0.96);
  }
  nav {
    display: flex;
    gap: 4px;
    align-items: center;
    min-width: 0;
    flex-wrap: nowrap;
  }
  .nav-link {
    color: var(--text-2);
    text-decoration: none;
    padding: 6px 12px;
    border-radius: var(--radius-pill);
    white-space: nowrap;
    transition: color var(--dur-fast) var(--ease-glass),
      background var(--dur-fast) var(--ease-glass);
  }
  .nav-link:hover {
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
