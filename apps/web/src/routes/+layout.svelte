<script lang="ts">
  let { children } = $props();
</script>

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
  main {
    max-width: 760px;
    margin: 0 auto;
    padding: 32px 24px;
  }
</style>
