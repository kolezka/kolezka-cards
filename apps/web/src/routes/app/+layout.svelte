<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api, type Me } from '$lib/api';

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
  <div class="grid">
    {@render children?.()}
  </div>
{:else}
  <p class="muted">Checking session…</p>
{/if}

<style>
  .grid {
    display: block;
  }
  .muted {
    color: #8b949e;
  }
</style>
