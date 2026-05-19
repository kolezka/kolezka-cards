<script lang="ts">
  import type { ImageBlock } from '@kc/shared/zod/card-config';
  import { GlassInput } from '$lib/ui';

  type Props = {
    block: ImageBlock;
    update: (patch: Partial<ImageBlock>) => void;
  };
  let { block, update }: Props = $props();
</script>

<GlassInput
  value={block.src}
  label="Image URL"
  placeholder="https://…"
  oninput={(e) => update({ src: (e.target as HTMLInputElement).value })}
/>
<GlassInput
  value={block.alt}
  label="Alt text"
  oninput={(e) => update({ alt: (e.target as HTMLInputElement).value })}
/>
