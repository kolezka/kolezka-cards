<script lang="ts">
  import { api, type Me } from '$lib/api';

  type Props = { me: Me };
  let { me }: Props = $props();

  let open = $state(false);
  let root: HTMLDivElement | undefined = $state();

  function toggle() {
    open = !open;
  }
  function close() {
    open = false;
  }

  async function logout() {
    close();
    await api.logout();
    location.href = '/';
  }

  // Click-outside + Escape close. Effect only attaches handlers while open.
  $effect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (root && !root.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  });
</script>

<div class="user-menu" bind:this={root}>
  <button
    type="button"
    class="trigger"
    onclick={toggle}
    aria-haspopup="menu"
    aria-expanded={open}
  >
    {#if me.avatarUrl}
      <img class="avatar" src={me.avatarUrl} alt="" loading="lazy" />
    {/if}
    <span class="login">@{me.login}</span>
    <span class="chev" class:open aria-hidden="true">▾</span>
  </button>

  {#if open}
    <div class="dropdown" role="menu" aria-label="Account menu">
      <a class="item" role="menuitem" href="/app" onclick={close}>
        <span class="ico" aria-hidden="true">▦</span>
        Cards
      </a>
      <button class="item" type="button" role="menuitem" onclick={logout}>
        <span class="ico" aria-hidden="true">⇥</span>
        Logout
      </button>
    </div>
  {/if}
</div>

<style>
  .user-menu {
    position: relative;
    display: inline-flex;
  }

  .trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--glass-3);
    color: var(--text-1);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-pill);
    padding: 4px 10px 4px 4px;
    font: 600 13px var(--font-sans);
    cursor: pointer;
    backdrop-filter: blur(var(--blur-sm));
    -webkit-backdrop-filter: blur(var(--blur-sm));
    transition: background var(--dur-fast) var(--ease-glass);
  }
  .trigger:hover {
    background: var(--glass-4);
  }
  .avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--glass-2);
  }
  .login {
    color: var(--text-2);
    font-weight: 500;
  }
  .chev {
    color: var(--text-3);
    font-size: 10px;
    transition: transform var(--dur-fast) var(--ease-glass);
  }
  .chev.open {
    transform: rotate(180deg);
  }

  .dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    min-width: 180px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--glass-3);
    border: 1px solid var(--ring-strong);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-2), var(--highlight-strong);
    backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    z-index: 60;
    animation: dropdown-in var(--dur-fast) var(--ease-glass);
  }
  @keyframes dropdown-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .item {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: transparent;
    color: var(--text-1);
    border: 0;
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    font: 500 14px var(--font-sans);
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease-glass);
  }
  .item:hover {
    background: var(--glass-4);
  }
  .ico {
    color: var(--text-3);
    font-size: 14px;
    width: 16px;
    display: inline-flex;
    justify-content: center;
  }

  @media (max-width: 640px) {
    .login {
      display: none;
    }
    .trigger {
      padding: 4px 8px 4px 4px;
    }
  }
</style>
