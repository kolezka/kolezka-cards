<script lang="ts">
  import type { Snippet } from 'svelte';

  type Tier = 1 | 2 | 3 | 4;
  type Props = {
    tier?: Tier;
    rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'pill';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    as?: 'div' | 'section' | 'article' | 'aside';
    class?: string;
    children?: Snippet;
  };

  let {
    tier = 2,
    rounded = 'md',
    padding = 'md',
    as = 'div',
    class: extraClass = '',
    children,
  }: Props = $props();
</script>

<svelte:element
  this={as}
  class={`glass-${tier} r-${rounded} p-${padding} ${extraClass}`.trim()}
>
  {@render children?.()}
</svelte:element>

<style>
  .r-sm {
    border-radius: var(--radius-sm);
  }
  .r-md {
    border-radius: var(--radius-md);
  }
  .r-lg {
    border-radius: var(--radius-lg);
  }
  .r-xl {
    border-radius: var(--radius-xl);
  }
  .r-pill {
    border-radius: var(--radius-pill);
  }
  .p-none {
    padding: 0;
  }
  .p-sm {
    padding: 12px 14px;
  }
  .p-md {
    padding: 20px 22px;
  }
  .p-lg {
    padding: 28px 32px;
  }
</style>
