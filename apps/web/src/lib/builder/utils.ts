import type { Block } from '@kc/shared/zod/card-config';

export const GRID = 8;
export const CLICK_SLOP_PX = 3;

export type BlockKind = Block['kind'];

export const PALETTE: ReadonlyArray<{ kind: BlockKind; label: string }> = [
  { kind: 'text', label: 'Text' },
  { kind: 'stat', label: 'Stat' },
  { kind: 'badge', label: 'Badge' },
  { kind: 'sparkline', label: 'Sparkline' },
  { kind: 'divider', label: 'Divider' },
  { kind: 'image', label: 'Image' },
];

export const SOURCE_OPTIONS = [
  { value: 'literal', label: 'Literal text' },
  { value: 'visits.total', label: 'Card · total impressions' },
  { value: 'visits.unique', label: 'Card · unique visits' },
  { value: 'github.stars', label: 'GitHub · total stars' },
  { value: 'github.followers', label: 'GitHub · followers' },
  { value: 'github.repos', label: 'GitHub · public repos' },
  { value: 'github.gists', label: 'GitHub · public gists' },
  { value: 'github.contributions.year', label: 'GitHub · contributions this year' },
  { value: 'github.top.language', label: 'GitHub · top language' },
] as const;

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function newId(): string {
  return `b${Math.random().toString(36).slice(2, 8)}`;
}

export function svgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  canvasW: number,
  canvasH: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  const scaleX = canvasW / rect.width;
  const scaleY = canvasH / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export function glyph(kind: string): string {
  switch (kind) {
    case 'text':
      return 'T';
    case 'stat':
      return '#';
    case 'badge':
      return '◆';
    case 'sparkline':
      return '∿';
    case 'divider':
      return '—';
    case 'image':
      return '▢';
    default:
      return '·';
  }
}

export function defaultBlock(kind: BlockKind): Block {
  const base = { id: newId(), x: 16, y: 16 };
  switch (kind) {
    case 'text':
      return {
        ...base,
        kind: 'text',
        w: 200,
        h: 32,
        text: 'Hello',
        size: 'm',
        align: 'left',
        color: 'text',
        weight: 'normal',
      };
    case 'stat':
      return {
        ...base,
        kind: 'stat',
        w: 144,
        h: 80,
        label: 'label',
        source: 'literal',
        literal: '0',
      };
    case 'badge':
      return {
        ...base,
        kind: 'badge',
        w: 144,
        h: 24,
        label: 'badge',
        source: 'literal',
        literal: '1',
      };
    case 'divider':
      return { ...base, kind: 'divider', w: 200, h: 8 };
    case 'sparkline':
      return {
        ...base,
        kind: 'sparkline',
        w: 240,
        h: 96,
        source: 'followers',
        period: '90d',
        label: 'Followers',
      };
    case 'image':
      return { ...base, kind: 'image', w: 96, h: 96, src: '', alt: '' };
  }
}
