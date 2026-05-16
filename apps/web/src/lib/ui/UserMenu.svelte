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

  // While open: lock body scroll, install Escape + outside-click handlers.
  // Effect cleanup restores everything when the menu closes.
  $effect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    // Avoid layout shift when the scrollbar disappears.
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarW > 0) {
      document.body.style.paddingRight = `${scrollbarW}px`;
    }

    const onDocClick = (e: MouseEvent) => {
      if (root && !root.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
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
      <header class="head">
        {#if me.avatarUrl}
          <img class="avatar-lg" src={me.avatarUrl} alt="" />
        {/if}
        <div class="who">
          <span class="who-name">@{me.login}</span>
          <span class="who-sub">signed in</span>
        </div>
      </header>

      <div class="divider" role="separator"></div>

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
    min-width: 220px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    /* Opaque surface with a soft accent tint so text behind never bleeds
       through. The accent radial gives the panel a subtle colored glow
       matching the rest of the design system. */
    background:
      radial-gradient(140% 110% at 100% 0%, oklch(45% 0.18 280 / 0.55), transparent 65%),
      var(--surface-1);
    color: var(--text-1);
    border: 1px solid var(--ring-strong);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-2), var(--highlight-strong);
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

  .head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 10px 12px;
  }
  .avatar-lg {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--glass-3);
    border: 1px solid var(--ring-strong);
    flex: 0 0 auto;
  }
  .who {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.15;
  }
  .who-name {
    font: 600 14px var(--font-sans);
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who-sub {
    margin-top: 2px;
    font-size: 11px;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }
  .divider {
    height: 1px;
    background: var(--ring-soft);
    margin: 0 2px 4px;
  }

  .item {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: transparent;
    color: var(--text-1);
    border: 0;
    border-radius: var(--radius-sm);
    padding: 9px 12px;
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
    /* On mobile pin the dropdown to the right edge of the viewport (with a
       little gap) so it doesn't poke past the navbar pill. */
    .dropdown {
      right: 8px;
      min-width: min(260px, calc(100vw - 32px));
    }
  }
</style>
