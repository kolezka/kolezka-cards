<script lang="ts">
  import { Glass } from '$lib/ui';
</script>

<article class="article-wrap">
  <header class="article-head">
    <p class="eyebrow">Methodology</p>
    <h1 class="title-display">How we count visits</h1>
    <p class="lede">
      A pragmatic, privacy-respecting approach to counting unique readers of a public SVG —
      without cookies, raw IPs, or cross-day identifiers.
    </p>
  </header>

  <Glass tier={2} rounded="lg" padding="lg" as="section" class="prose">
    <h2>The Camo problem</h2>
    <p>
      GitHub proxies every README image through <code>camo.githubusercontent.com</code>. That
      means we never see the end user's IP — only Camo's. We also have to set strict no-cache
      headers (and rotate the ETag on every render) to keep Camo from serving a stale, cached SVG.
    </p>

    <h2>The approximate-unique fingerprint</h2>
    <p>
      For every render we compute
      <code>sha256(User-Agent | Accept-Language | Accept-Encoding | daily_salt)</code> where
      <code>daily_salt = HMAC(APP_SECRET, "salt:" + UTC-date)</code>.
    </p>
    <p>
      A visit counts as <em>unique</em> if no row with that same fingerprint exists for the same
      card in the last 12 hours.
    </p>
    <p>Every render still increments the total impressions counter in the hourly bucket.</p>

    <h2>What this means</h2>
    <ul>
      <li><strong>Same browser in the same UTC day</strong> — counted as unique at most once per 12h.</li>
      <li>
        <strong>Same browser across UTC midnight</strong> — the daily salt rotates, so a return
        visit a few hours later may be counted as a new unique. Minor inflation, but no cross-day
        tracking.
      </li>
      <li><strong>Two different browsers</strong> (or UA spoofers) — counted as separate uniques.</li>
      <li><strong>Bots that don't send User-Agent</strong> — all collapse into one fingerprint per day.</li>
    </ul>

    <h2>What we do not store</h2>
    <ul>
      <li>No raw IPs. Only a country code derived from <code>CF-IPCountry</code> when present.</li>
      <li>No User-Agent strings in logs (we hash to 12 hex chars for triage).</li>
      <li>
        No cookies or persistent identifiers on the card request — your README is a public
        resource and we treat it as such.
      </li>
    </ul>

    <h2>Referrer chart caveat</h2>
    <p>
      Camo strips most headers, so the top-referrer chart will be dominated by
      <code>github.com</code> and <code>(none)</code>. The chart is still useful for spotting
      embeds on other sites, but don't read absolute numbers off it.
    </p>
  </Glass>
</article>

<style>
  .article-wrap {
    max-width: 760px;
    margin: 24px auto 0;
  }
  .article-head {
    margin-bottom: 24px;
    text-align: center;
  }
  .eyebrow {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-3);
    margin: 0 0 12px;
  }
  h1 {
    margin: 0 0 14px;
    font-size: clamp(30px, 5vw, 48px);
    letter-spacing: -0.02em;
  }
  .lede {
    color: var(--text-2);
    font-size: 16px;
    line-height: 1.6;
    margin: 0;
  }
  :global(.prose) h2 {
    margin: 32px 0 12px;
    font-size: 18px;
    letter-spacing: -0.01em;
    color: var(--text-1);
  }
  :global(.prose) h2:first-of-type {
    margin-top: 4px;
  }
  :global(.prose) p,
  :global(.prose) li {
    color: var(--text-2);
    line-height: 1.65;
    font-size: 14.5px;
  }
  :global(.prose) ul {
    padding-left: 22px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  :global(.prose) code {
    background: var(--glass-2);
    color: var(--text-1);
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--ring-soft);
    font-family: var(--font-mono);
    font-size: 12.5px;
  }
</style>
