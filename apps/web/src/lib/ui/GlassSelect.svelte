<script lang="ts">
  type Option = { value: string; label: string };
  type Props = {
    value: string;
    options: Option[];
    label?: string;
    help?: string;
    disabled?: boolean;
    id?: string;
    class?: string;
    onchange?: (e: Event) => void;
  };

  let {
    value = $bindable(''),
    options,
    label,
    help,
    disabled = false,
    id,
    class: extraClass = '',
    onchange,
  }: Props = $props();

  let selectId = $derived(id ?? `s-${Math.random().toString(36).slice(2, 8)}`);
</script>

<div class={`field ${extraClass}`}>
  {#if label}<label for={selectId}>{label}</label>{/if}
  <div class="wrap">
    <select id={selectId} bind:value {disabled} {onchange}>
      {#each options as opt (opt.value)}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
    <span class="chev" aria-hidden="true">▾</span>
  </div>
  {#if help}<p class="help">{help}</p>{/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-2);
  }
  .wrap {
    position: relative;
  }
  select {
    appearance: none;
    background: var(--glass-2);
    color: var(--text-1);
    font: inherit;
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-md);
    padding: 10px 34px 10px 14px;
    width: 100%;
    backdrop-filter: blur(var(--blur-sm));
    -webkit-backdrop-filter: blur(var(--blur-sm));
    transition: background var(--dur-fast) var(--ease-glass);
  }
  select:hover:not(:disabled) {
    background: var(--glass-3);
  }
  select:focus-visible {
    outline: none;
    border-color: var(--ring-accent);
    box-shadow: 0 0 0 3px oklch(72% 0.18 250 / 0.20);
  }
  select option {
    background: var(--surface-1);
    color: var(--text-1);
  }
  .chev {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-3);
    pointer-events: none;
    font-size: 12px;
  }
  .help {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--text-3);
  }
</style>
