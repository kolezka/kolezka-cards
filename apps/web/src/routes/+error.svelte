<script lang="ts">
  import { page } from '$app/state';
  import { Glass, GlassButton } from '$lib/ui';

  let status = $derived(page.status ?? 500);
  let message = $derived(page.error?.message ?? 'Something went wrong.');
  let isNotFound = $derived(status === 404);
</script>

<div class="wrap">
  <Glass tier={3} rounded="lg" padding="lg" as="section" class="error-card">
    <p class="code">{status}</p>
    <h1>{isNotFound ? 'Page not found' : 'Something went wrong'}</h1>
    <p class="msg">{message}</p>
    <div class="actions">
      <GlassButton variant="primary" size="md" href="/">Back home</GlassButton>
      {#if !isNotFound}
        <GlassButton variant="secondary" size="md" href="/app">Your cards</GlassButton>
      {/if}
    </div>
  </Glass>
</div>

<style>
  .wrap {
    max-width: 520px;
    margin: 80px auto 0;
  }
  :global(.error-card) {
    text-align: center;
  }
  .code {
    font: 700 64px var(--font-sans);
    background: linear-gradient(120deg, var(--accent), var(--accent-2));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin: 0 0 8px;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  h1 {
    margin: 0 0 12px;
    font-size: 24px;
    letter-spacing: -0.01em;
  }
  .msg {
    color: var(--text-2);
    margin: 0 0 24px;
  }
  .actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }
</style>
