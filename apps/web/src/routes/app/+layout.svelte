<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api, type Me } from '$lib/api';
  import { Glass } from '$lib/ui';

  let { children } = $props();
  let ready = $state(false);
  let me = $state<Me | null>(null);

  onMount(async () => {
    try {
      me = await api.me();
    } catch {
      me = null;
    }
    if (!me) {
      goto('/auth/github');
      return;
    }
    ready = true;
  });
</script>

<svelte:head>
  <meta name="robots" content="noindex" />
</svelte:head>

{#if ready && me}
  {@render children?.()}
{:else}
  <Glass tier={2} rounded="lg" padding="lg" class="checking">
    <span class="dot" aria-hidden="true"></span> Checking session…
  </Glass>
{/if}

<style>
  :global(.checking) {
    color: var(--text-2);
    text-align: center;
    margin: 80px auto;
    max-width: 320px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  :global(.checking .dot) {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 1.2s var(--ease-glass) infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 0.4;
      transform: scale(0.85);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
