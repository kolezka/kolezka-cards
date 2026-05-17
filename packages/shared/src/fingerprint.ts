import { createHash, createHmac } from 'node:crypto';

/**
 * Inputs to the daily-rotating fingerprint. Required core headers, plus
 * optional modern client-hint headers, country and a truncated IP prefix.
 *
 * Privacy model is unchanged: every input is one-way through a daily
 * salt rotated at 00:00 UTC, so a returning visitor on a different day
 * is uncorrelatable. The added inputs improve _accuracy_ inside a
 * single UTC day — distinguishing mobile Chrome from desktop Chrome
 * with otherwise-identical reduced User-Agent strings, distinguishing
 * users in different countries or networks, etc.
 */
export interface FingerprintHeaders {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  /** `Sec-CH-UA` (Chromium full client-hint), if present. */
  secChUa?: string;
  /** `Sec-CH-UA-Mobile` — typically `?0` or `?1`. */
  secChUaMobile?: string;
  /** `Sec-CH-UA-Platform` — e.g. `"macOS"`, `"Android"`, `"Windows"`. */
  secChUaPlatform?: string;
  /** `Sec-CH-UA-Arch` — e.g. `"x86"`, `"arm"`. Only sent after the
   *  origin returns `Accept-CH: sec-ch-ua-arch`. */
  secChUaArch?: string;
  /** `Sec-CH-UA-Bitness` — e.g. `"64"`, `"32"`. */
  secChUaBitness?: string;
  /** `Sec-CH-UA-Model` — e.g. `"Pixel 7"`. */
  secChUaModel?: string;
  /** `CF-IPCountry` two-letter country code. Low-entropy categorical. */
  country?: string;
  /** Truncated client IP prefix (IPv4 /24 or IPv6 /64), pre-canonicalized.
   *  Produced by {@link truncateIp}. Omit entirely for proxied traffic
   *  (e.g. github-camo) where the source IP is not the real viewer's. */
  ipPrefix?: string;
}

export function utcDateKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeDailySalt(appSecret: string, now: Date = new Date()): string {
  return createHmac('sha256', appSecret)
    .update(`salt:${utcDateKey(now)}`)
    .digest('hex');
}

/**
 * Normalize a header value so cosmetic variations (case, whitespace,
 * order of comma-separated lists) don't produce different fingerprints
 * for what is functionally the same client.
 */
export function normalizeHeaderValue(value: string | undefined | null): string {
  if (!value) return '';
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV4_MAPPED_RE = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;

function truncateIpv4(ip: string): string {
  const m = ip.match(IPV4_RE);
  if (!m) return '';
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  const d = Number(m[4]);
  if (a > 255 || b > 255 || c > 255 || d > 255) return '';
  return `${a}.${b}.${c}.0/24`;
}

function truncateIpv6(ip: string): string {
  // Reject anything that isn't plausibly IPv6 (must contain a colon, no dots
  // outside the IPv4-mapped form which is handled separately).
  if (!ip.includes(':')) return '';
  if (ip.includes('.')) return '';

  // Expand `::` into the right number of zero hextets.
  const doubleIdx = ip.indexOf('::');
  let hextets: string[];
  if (doubleIdx === -1) {
    hextets = ip.split(':');
  } else {
    const left = ip.slice(0, doubleIdx);
    const right = ip.slice(doubleIdx + 2);
    const leftParts = left === '' ? [] : left.split(':');
    const rightParts = right === '' ? [] : right.split(':');
    const fill = 8 - leftParts.length - rightParts.length;
    if (fill < 0) return '';
    hextets = [...leftParts, ...Array(fill).fill('0'), ...rightParts];
  }

  if (hextets.length !== 8) return '';
  for (const h of hextets) {
    if (h.length === 0 || h.length > 4) return '';
    if (!/^[0-9a-f]+$/i.test(h)) return '';
  }

  // Take first 64 bits = first 4 hextets. Normalize each to lowercase,
  // strip leading zeros but keep "0" for empty groups.
  const first4 = hextets.slice(0, 4).map((h) => h.replace(/^0+/, '').toLowerCase() || '0');
  return `${first4.join(':')}::/64`;
}

/**
 * Truncate a client IP to its /24 (IPv4) or /64 (IPv6) network prefix,
 * returning a canonical text form suitable as a fingerprint input.
 *
 * Returns `""` for empty / unparseable / out-of-range input. IPv4-mapped
 * IPv6 (`::ffff:1.2.3.4`) is treated as the underlying IPv4 so dual-stack
 * visitors produce the same prefix.
 */
export function truncateIp(ip: string | undefined | null): string {
  if (!ip) return '';
  const trimmed = ip.trim();
  if (trimmed === '') return '';

  const mapped = trimmed.match(IPV4_MAPPED_RE);
  if (mapped) return truncateIpv4(mapped[1] as string);

  if (trimmed.includes('.')) return truncateIpv4(trimmed);
  return truncateIpv6(trimmed);
}

/**
 * Detect whether a request reached us through GitHub's image proxy.
 * Camo strips client hints, replaces the source IP with its own, and
 * collapses most distinguishing headers — so for Camo we omit the IP
 * prefix from the fingerprint (it would just be GitHub's pool).
 */
export function detectCamo(headers: {
  userAgent?: string | null;
  via?: string | null;
}): boolean {
  const ua = (headers.userAgent ?? '').toLowerCase();
  if (ua.startsWith('github-camo')) return true;
  const via = (headers.via ?? '').toLowerCase();
  if (via.includes('camo')) return true;
  return false;
}

/**
 * Length-prefix each part and join with a newline so the boundaries
 * between parts are unambiguous regardless of what's inside any part
 * (no delimiter-injection collisions possible).
 */
function canonicalEncode(parts: readonly string[]): string {
  let out = '';
  for (let i = 0; i < parts.length; i += 1) {
    if (i > 0) out += '\n';
    const p = parts[i] ?? '';
    out += `${p.length}:${p}`;
  }
  return out;
}

export function computeFingerprint(
  headers: FingerprintHeaders,
  appSecret: string,
  now: Date = new Date(),
): string {
  const salt = computeDailySalt(appSecret, now);
  const input = canonicalEncode([
    normalizeHeaderValue(headers.userAgent),
    normalizeHeaderValue(headers.acceptLanguage),
    normalizeHeaderValue(headers.acceptEncoding),
    normalizeHeaderValue(headers.secChUa),
    normalizeHeaderValue(headers.secChUaMobile),
    normalizeHeaderValue(headers.secChUaPlatform),
    normalizeHeaderValue(headers.secChUaArch),
    normalizeHeaderValue(headers.secChUaBitness),
    normalizeHeaderValue(headers.secChUaModel),
    normalizeHeaderValue(headers.country),
    headers.ipPrefix ?? '',
    salt,
  ]);
  return createHash('sha256').update(input).digest('hex');
}
