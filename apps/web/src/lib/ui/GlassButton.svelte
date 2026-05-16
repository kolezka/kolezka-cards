<script lang="ts">
  import type { Snippet } from 'svelte';

  type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
  type Size = 'sm' | 'md' | 'lg';
  type Props = {
    variant?: Variant;
    size?: Size;
    type?: 'button' | 'submit' | 'reset';
    href?: string;
    disabled?: boolean;
    fullWidth?: boolean;
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  };

  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    href,
    disabled = false,
    fullWidth = false,
    class: extraClass = '',
    onclick,
    children,
  }: Props = $props();

  const cls = $derived(
    [`btn`, `v-${variant}`, `s-${size}`, fullWidth ? 'fw' : '', extraClass]
      .filter(Boolean)
      .join(' '),
  );
</script>

{#if href}
  <a class={cls} {href} aria-disabled={disabled}>
    {@render children?.()}
  </a>
{:else}
  <button class={cls} {type} {disabled} {onclick}>
    {@render children?.()}
  </button>
{/if}

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--ring-soft);
    font: 600 14px var(--font-sans);
    letter-spacing: -0.01em;
    cursor: pointer;
    text-decoration: none;
    transition: filter var(--dur-fast) var(--ease-glass),
      background var(--dur-fast) var(--ease-glass), transform var(--dur-fast) var(--ease-glass);
    backdrop-filter: blur(var(--blur-sm));
    -webkit-backdrop-filter: blur(var(--blur-sm));
    box-shadow: var(--highlight);
  }
  .btn:hover:not(:disabled):not([aria-disabled='true']) {
    filter: brightness(1.08);
    transform: translateY(-0.5px);
  }
  .btn:active:not(:disabled):not([aria-disabled='true']) {
    transform: translateY(0);
    filter: brightness(0.97);
  }
  .btn:disabled,
  .btn[aria-disabled='true'] {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .fw {
    width: 100%;
  }

  .s-sm {
    padding: 6px 14px;
    font-size: 13px;
  }
  .s-md {
    padding: 9px 18px;
    font-size: 14px;
  }
  .s-lg {
    padding: 12px 22px;
    font-size: 15px;
  }

  .v-primary {
    background: var(--accent);
    color: var(--text-on-accent);
    border-color: transparent;
  }
  .v-secondary {
    background: var(--glass-3);
    color: var(--text-1);
  }
  .v-ghost {
    background: transparent;
    color: var(--text-2);
    border-color: transparent;
  }
  .v-ghost:hover {
    background: var(--glass-2);
    color: var(--text-1);
  }
  .v-danger {
    background: var(--danger);
    color: white;
    border-color: transparent;
  }
</style>
