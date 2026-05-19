<script lang="ts">
  import type { BadgeBlock, StatBlock } from '@kc/shared/zod/card-config';
  import { GlassInput, GlassSelect } from '$lib/ui';
  import { SOURCE_OPTIONS } from '../utils';

  type Props = {
    block: StatBlock | BadgeBlock;
    update: (patch: Partial<StatBlock | BadgeBlock>) => void;
  };
  let { block, update }: Props = $props();
</script>

<GlassInput
  value={block.label}
  label="Label"
  oninput={(e) => update({ label: (e.target as HTMLInputElement).value })}
/>
<GlassSelect
  value={block.source}
  label="Source"
  options={SOURCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
  onchange={(e) =>
    update({ source: (e.target as HTMLSelectElement).value as (StatBlock | BadgeBlock)['source'] })}
/>
{#if block.source === 'literal'}
  <GlassInput
    value={block.literal}
    label="Value"
    oninput={(e) => update({ literal: (e.target as HTMLInputElement).value })}
  />
{/if}
