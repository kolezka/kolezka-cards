export function escapeXml(input: string): string {
  if (typeof input !== 'string') return '';
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    switch (code) {
      case 0x26:
        out += '&amp;';
        break;
      case 0x3c:
        out += '&lt;';
        break;
      case 0x3e:
        out += '&gt;';
        break;
      case 0x22:
        out += '&quot;';
        break;
      case 0x27:
        out += '&apos;';
        break;
      default:
        if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) {
          continue;
        }
        out += input[i];
    }
  }
  return out;
}
