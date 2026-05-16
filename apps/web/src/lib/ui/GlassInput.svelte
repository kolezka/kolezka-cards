<script lang="ts">
  type Props = {
    value: string;
    type?: 'text' | 'email' | 'url' | 'password' | 'search';
    placeholder?: string;
    label?: string;
    help?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    autocomplete?: AutoFill;
    id?: string;
    class?: string;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
  };

  let {
    value = $bindable(''),
    type = 'text',
    placeholder,
    label,
    help,
    error,
    disabled = false,
    required = false,
    autocomplete,
    id,
    class: extraClass = '',
    oninput,
    onchange,
  }: Props = $props();

  let inputId = $derived(id ?? `i-${Math.random().toString(36).slice(2, 8)}`);
</script>

<div class={`field ${extraClass}`}>
  {#if label}
    <label for={inputId}>{label}{required ? ' *' : ''}</label>
  {/if}
  <input
    id={inputId}
    {type}
    bind:value
    {placeholder}
    {disabled}
    {required}
    {autocomplete}
    aria-invalid={!!error}
    aria-describedby={error ? `${inputId}-err` : help ? `${inputId}-help` : undefined}
    {oninput}
    {onchange}
  />
  {#if error}
    <p class="err" id={`${inputId}-err`} role="alert">{error}</p>
  {:else if help}
    <p class="help" id={`${inputId}-help`}>{help}</p>
  {/if}
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
    letter-spacing: 0;
  }
  input {
    appearance: none;
    background: var(--glass-2);
    color: var(--text-1);
    font: inherit;
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-md);
    padding: 10px 14px;
    backdrop-filter: blur(var(--blur-sm));
    -webkit-backdrop-filter: blur(var(--blur-sm));
    transition: border-color var(--dur-fast) var(--ease-glass),
      background var(--dur-fast) var(--ease-glass);
  }
  input:hover:not(:disabled) {
    background: var(--glass-3);
  }
  input:focus-visible {
    outline: none;
    border-color: var(--ring-accent);
    box-shadow: 0 0 0 3px oklch(72% 0.18 250 / 0.20);
  }
  input[aria-invalid='true'] {
    border-color: var(--danger);
  }
  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .help {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--text-3);
  }
  .err {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--danger);
  }
</style>
