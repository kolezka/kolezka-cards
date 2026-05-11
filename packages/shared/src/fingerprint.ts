import { createHash, createHmac } from 'node:crypto';

export interface FingerprintHeaders {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
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

export function computeFingerprint(
  headers: FingerprintHeaders,
  appSecret: string,
  now: Date = new Date(),
): string {
  const salt = computeDailySalt(appSecret, now);
  const input = [
    headers.userAgent ?? '',
    headers.acceptLanguage ?? '',
    headers.acceptEncoding ?? '',
    salt,
  ].join('|');
  return createHash('sha256').update(input).digest('hex');
}
