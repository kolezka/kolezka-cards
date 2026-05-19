<script lang="ts">
  import type { SparklineBlock } from '@kc/shared/zod/card-config';
  import { GlassInput, GlassSelect } from '$lib/ui';

  type Props = {
    block: SparklineBlock;
    update: (patch: Partial<SparklineBlock>) => void;
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
  options={[
    { value: 'followers', label: 'GitHub followers over time' },
    { value: 'contributions', label: 'Contributions over time' },
  ]}
  onchange={(e) =>
    update({ source: (e.target as HTMLSelectElement).value as SparklineBlock['source'] })}
/>
<GlassSelect
  value={block.period}
  label="Period"
  options={[
    { value: '30d', label: 'last 30 days' },
    { value: '90d', label: 'last 90 days' },
    { value: '365d', label: 'last 365 days' },
    { value: 'all', label: 'all time' },
  ]}
  onchange={(e) =>
    update({ period: (e.target as HTMLSelectElement).value as SparklineBlock['period'] })}
/>
