# Fingerprint accuracy — design

**Date:** 2026-05-17
**Status:** Approved, implementing.
**Author:** kolezka-cards team

## Problem

The per-day visit fingerprint in `packages/shared/src/fingerprint.ts` is used by `trackVisit` (12h dedup window) to decide whether a card render counts as a new unique. Today it hashes a small set of headers plus a daily-rotating salt. Three accuracy problems exist:

1. **False collisions (low entropy).** UA, Accept-Language, Accept-Encoding and three client-hint headers are coarse. Two different visitors on similar browsers in the same country collide.
2. **False splits (volatility).** Some sub-fields churn within a real visitor's session (Sec-CH-UA version on browser update, Accept-Encoding flipping between `gzip` and `gzip, br`, comma-list ordering).
3. **Camo handling.** The dominant traffic source is README embeds proxied through `github-camo`. Camo strips client hints and replaces the IP with its own. Today this proxied traffic looks identical to a small number of direct visitors and produces a flat ~1 unique/day regardless of true viewership.

## Goals

- Improve unique-visitor distinction for direct (non-proxied) traffic.
- Be honest about Camo's limits instead of inflating uniqueness through it.
- Keep the existing privacy properties: no raw IP storage, daily fingerprint rotation, no cross-day correlation.

## Non-goals

- Per-hour Camo vs direct time-series breakdown. Out of scope; revisit after data lands.
- TLS / JA3 / JA4 fingerprinting (would need infrastructure changes).
- Any client-side beacon embedded in the SVG (SVGs can't run JS on github.com).
- Reverse-mapping a fingerprint back to a viewer.

## Design

### 1. Fingerprint composition

`FingerprintHeaders` gains:

```ts
secChUaArch?: string;    // "x86", "arm"
secChUaBitness?: string; // "64", "32"
secChUaModel?: string;   // "Pixel 7", "SM-S908B"
ipPrefix?: string;       // truncated IP, canonical text
```

New helper `truncateIp(ip: string | undefined): string` in `fingerprint.ts`:

- empty / invalid → `""`
- IPv4 → first three octets + `.0/24` (e.g. `203.0.113.0/24`)
- IPv6 → first four hextets, zero-padded canonical + `::/64` (e.g. `2001:db8:0:0::/64`)
- IPv4-mapped IPv6 (`::ffff:203.0.113.42`) → treated as IPv4 → `203.0.113.0/24`

`computeFingerprint` parts (length-prefix encoded, joined with `\n`, sha256'd):

```
userAgent | acceptLanguage | acceptEncoding |
secChUa | secChUaMobile | secChUaPlatform |
secChUaArch | secChUaBitness | secChUaModel |
country | ipPrefix |
salt
```

`normalizeHeaderValue` (lowercase, collapse whitespace, trim) applies to every header field. `ipPrefix` is already canonical and not normalized through that path.

**Forward-compat note.** Appending new fields changes the hash output for the same headers today. That's acceptable: fingerprints rotate at the next UTC midnight anyway, and the 12h dedup window means at worst returning visitors on deploy day get counted once extra.

### 2. Accept-CH directive

The Sec-CH-UA-Arch / Bitness / Model headers are only sent by Chromium browsers after the origin responds with `Accept-CH`. The SVG route adds:

```
Accept-CH: sec-ch-ua-arch, sec-ch-ua-bitness, sec-ch-ua-model, sec-ch-ua-platform
```

on every SVG response. Browsers cache the directive per-origin. First-ever request from a given browser to the origin gets the legacy fingerprint; subsequent requests get the richer one. Acceptable in a 12h dedup window.

### 3. Camo detection

New helper `detectCamo(headers: { userAgent?: string; via?: string }): boolean` in `fingerprint.ts`. Returns true if either:

- lower-cased `userAgent` starts with `github-camo`, OR
- lower-cased `via` contains `camo`

Belt-and-suspenders against future Camo UA changes.

### 4. Fingerprint branching at the call site

`apps/api/src/routes/render-card.ts`:

```ts
const viaCamo = detectCamo({ userAgent, via });
const fpHeaders: FingerprintHeaders = {
  userAgent, acceptLanguage, acceptEncoding,
  secChUa, secChUaMobile, secChUaPlatform,
  secChUaArch, secChUaBitness, secChUaModel,
  country,
  ...(viaCamo ? {} : { ipPrefix: truncateIp(headers['cf-connecting-ip']) }),
};
```

`viaCamo` is **not** mixed into the hash — only used to decide whether to include `ipPrefix` (Camo's IP is GitHub's pool, not the visitor's) and to tag the visit row.

### 5. Schema changes

`packages/db/src/schema.ts`:

**`visits` gains:**

```ts
viaCamo: integer('via_camo', { mode: 'boolean' }).notNull().default(false)
```

**`impression_buckets` gains:**

```ts
camoImpressions:   integer('camo_impressions').notNull().default(0),
directImpressions: integer('direct_impressions').notNull().default(0),
```

`totalImpressions` is unchanged and remains the sum of both (`trackVisit` keeps incrementing it, plus the new column matching `viaCamo`). For buckets created before the migration, `directImpressions + camoImpressions = 0` and `totalImpressions` carries the legacy un-classified total — the dashboard surfaces "unknown split" for those.

Migration generated by `bun run db:generate`. Additive only, no rewrite, no downtime.

### 6. visit-tracker.ts changes

`VisitInput` gains `viaCamo: boolean`. `trackVisit`:

- inserts `viaCamo` on new visit rows
- branches the `impressionBuckets` upsert to increment `directImpressions` or `camoImpressions` (not both) along with `totalImpressions`

### 7. Analytics surface

`AnalyticsResult` extensions in `apps/api/src/services/analytics.ts`:

```ts
totals: {
  totalImpressions: number;
  uniqueVisits: number;
  directImpressions: number;  // new
  camoImpressions: number;    // new
};
sources: Array<{ source: 'direct' | 'camo'; count: number }>;  // new
```

Series points unchanged in v1. `sources` is computed by grouping `visits` on `viaCamo` for the requested range — so `sources` counts **unique visits** split by source, while `directImpressions` / `camoImpressions` in `totals` count **raw impressions** split by source. Both numbers are surfaced; they answer different questions.

### 8. Frontend

`apps/web/src/routes/app/c/[id]/+page.svelte`:

- Add a small "Traffic source" pill row above existing totals: `direct: X uniques • camo: Y impressions`.
- Update the unique-counter tooltip to "unique direct viewers; README-embedded views counted separately."
- Don't change the rendered `visit-counter` / `profile-views` SVGs.

`apps/web/src/routes/dev/+page.svelte` (dev analytics page) — verify it still renders. It's an untyped JSON dump so the new fields appear automatically.

### 9. Privacy policy update

`apps/web/src/routes/privacy/+page.svelte`:

- Update the fingerprint formula in §3.1 to include the new inputs.
- Replace the "No raw IP addresses, ever." bullet in §4 with:
  > "Your full IP address. Only a coarse network prefix (first 24 bits IPv4, first 64 bits IPv6), and only as input to the daily-rotating fingerprint hash — never stored."
- Add a sentence to §3.1 explaining that Camo-proxied traffic has no IP component because we can only see GitHub's IP.

### 10. Privacy model

Guarantees preserved:

1. No raw IP is persisted. The truncated prefix is hashed into the daily-salted sha256 and discarded immediately. Never logged. Never appears in a column.
2. Fingerprints uncorrelatable across UTC days (daily salt rotation, unchanged).
3. No preimage attack without `APP_SECRET` (server-side only, never returned).
4. Per-card scope at read time — visits table joins on `(cardId, fingerprintHash)`.

### 11. Testing

**Unit (`packages/shared/src/fingerprint.test.ts`):**

- `truncateIp`: IPv4, IPv6 full and compressed, IPv4-mapped IPv6, empty, invalid.
- `detectCamo`: UA prefix (case-insensitive), Via header, normal browsers, both empty.
- `computeFingerprint`: new entropy assertions (changing `ipPrefix` or any of the three new hints changes the hash; omitting `ipPrefix` is equivalent to `""`).

**Integration (`apps/api/src/services/visit-tracker.test.ts`, `analytics.test.ts`):**

- `trackVisit` persists `viaCamo` on the row.
- `trackVisit` increments the correct impression column.
- Same-fingerprint dedup still works when `viaCamo=true`.
- `queryAnalytics` returns correct `sources` aggregation.
- `totals.directImpressions + totals.camoImpressions == totals.totalImpressions` for post-migration buckets.

**Route (`apps/api/src/routes/render-card.test.ts` — extend if exists, else add):**

- Camo UA → no IP, `viaCamo=true`.
- Direct browser + CF-Connecting-IP → IP prefix in hash, `viaCamo=false`.
- Two direct requests, identical UA, different /24 IPs → 2 uniques.
- Two direct requests, identical UA, same /24 different last octet → 1 unique.
- Response includes `Accept-CH` header.

**Gates:** `bun run typecheck && bun test` must pass before commit.

## Out of scope / deferred

- Per-hour Camo/direct time-series.
- Stacked time series chart.
- Cleanup of pre-migration "unknown split" buckets (none planned — they age out naturally).

## Risks

- **Browser support for new client hints.** Sec-CH-UA-Arch/Bitness/Model are Chromium-only. Firefox/Safari users get `""` for those parts. Their fingerprint relies on UA, language, encoding, country, and IP prefix — same set as today plus IP, so still a net entropy gain.
- **Privacy review tone.** The "No raw IP, ever." line was a strong public commitment. The change is honest: we don't store IPs, only mix a coarse prefix into a one-way hash. Plausible/Fathom use the same model. The policy text needs to be re-read carefully so it doesn't look like a downgrade.
- **Cloudflare-only.** `CF-Connecting-IP` and `CF-IPCountry` only exist behind Cloudflare. In local dev or other deploys both are empty, fingerprint silently degrades to the legacy set. No code path errors.
