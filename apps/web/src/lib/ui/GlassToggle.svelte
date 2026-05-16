<script lang="ts">
  type Props = {
    checked: boolean;
    label: string;
    help?: string;
    disabled?: boolean;
    onchange?: (e: Event) => void;
  };

  let {
    checked = $bindable(false),
    label,
    help,
    disabled = false,
    onchange,
  }: Props = $props();
</script>

<label class="toggle">
  <input type="checkbox" bind:checked {disabled} {onchange} />
  <span class="track"><span class="dot"></span></span>
  <span class="meta">
    <span class="lbl">{label}</span>
    {#if help}<span class="help">{help}</span>{/if}
  </span>
</label>

<style>
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    user-select: none;
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .track {
    position: relative;
    flex: 0 0 auto;
    width: 38px;
    height: 22px;
    border-radius: var(--radius-pill);
    background: var(--glass-3);
    border: 1px solid var(--ring-soft);
    box-shadow: var(--highlight);
    transition: background var(--dur-fast) var(--ease-glass);
  }
  .dot {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text-1);
    box-shadow: 0 1px 3px hsla(0 0% 0% / 0.35);
    transition: transform var(--dur-fast) var(--ease-glass);
  }
  input:checked + .track {
    background: var(--accent);
    border-color: transparent;
  }
  input:checked + .track .dot {
    transform: translateX(16px);
    background: var(--text-on-accent);
  }
  input:focus-visible + .track {
    box-shadow: 0 0 0 3px oklch(72% 0.18 250 / 0.30);
  }
  .meta {
    display: flex;
    flex-direction: column;
  }
  .lbl {
    font-size: 14px;
    color: var(--text-1);
  }
  .help {
    font-size: 12px;
    color: var(--text-3);
  }
  input:disabled ~ .meta {
    opacity: 0.5;
  }
  input:disabled ~ .track {
    opacity: 0.5;
  }
</style>
