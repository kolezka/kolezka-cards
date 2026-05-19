<script lang="ts">
  import type { TextBlock } from '@kc/shared/zod/card-config';
  import { GlassInput, GlassSelect, GlassToggle } from '$lib/ui';

  type Props = {
    block: TextBlock;
    update: (patch: Partial<TextBlock>) => void;
  };
  let { block, update }: Props = $props();
</script>

<GlassInput
  value={block.text}
  label="Text"
  oninput={(e) => update({ text: (e.target as HTMLInputElement).value })}
/>
<GlassSelect
  value={block.size}
  label="Size"
  options={[
    { value: 's', label: 'small' },
    { value: 'm', label: 'medium' },
    { value: 'l', label: 'large' },
    { value: 'xl', label: 'extra-large' },
  ]}
  onchange={(e) => update({ size: (e.target as HTMLSelectElement).value as TextBlock['size'] })}
/>
<GlassSelect
  value={block.align}
  label="Align"
  options={[
    { value: 'left', label: 'left' },
    { value: 'center', label: 'center' },
    { value: 'right', label: 'right' },
  ]}
  onchange={(e) => update({ align: (e.target as HTMLSelectElement).value as TextBlock['align'] })}
/>
<GlassSelect
  value={block.color}
  label="Color"
  options={[
    { value: 'text', label: 'primary' },
    { value: 'muted', label: 'muted' },
    { value: 'accent', label: 'accent' },
  ]}
  onchange={(e) => update({ color: (e.target as HTMLSelectElement).value as TextBlock['color'] })}
/>
<GlassToggle
  checked={block.weight === 'bold'}
  label="Bold"
  onchange={(e) =>
    update({ weight: (e.target as HTMLInputElement).checked ? 'bold' : 'normal' })}
/>
