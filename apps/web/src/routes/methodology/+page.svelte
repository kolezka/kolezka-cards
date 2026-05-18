<script lang="ts">
  import { Glass } from '$lib/ui';
</script>

<article class="article-wrap">
  <header class="article-head">
    <p class="eyebrow">Methodology</p>
    <h1 class="title-display">How we count visits</h1>
    <p class="lede">
      A pragmatic, privacy-respecting approach to counting unique readers of a public SVG —
      no cookies, no stored IPs, no cross-day identifiers.
    </p>
  </header>

  <Glass tier={2} rounded="lg" padding="lg" as="section" class="prose">
    <h2>The Camo problem</h2>
    <p>
      GitHub proxies every README image through <code>camo.githubusercontent.com</code>. Through
      Camo we never see the viewer's IP (only Camo's), most client-hint headers are stripped,
      and the User-Agent is constant (<code>github-camo/&lt;id&gt;</code>). So Camo views are
      mostly indistinguishable from each other — counting them as &quot;unique&quot; would be a
      lie. We detect Camo via the UA prefix + <code>Via</code> header and track those impressions
      separately from direct (non-proxied) traffic.
    </p>
    <p>
      We also set strict no-cache headers (and rotate the ETag on every render) so Camo doesn't
      serve a stale, cached SVG.
    </p>

    <h2>The approximate-unique fingerprint</h2>
    <p>
      For every render we compute a one-way hash combining several request signals plus a
      server-side daily salt:
    </p>
    <pre class="formula">sha256(
  User-Agent
  · Accept-Language
  · Accept-Encoding
  · Sec-CH-UA · Sec-CH-UA-Mobile · Sec-CH-UA-Platform
  · Sec-CH-UA-Arch · Sec-CH-UA-Bitness · Sec-CH-UA-Model
  · CF-IPCountry         (two-letter country code from Cloudflare)
  · ip_prefix            (first /24 IPv4 or /64 IPv6 only, hashed in)
  · daily_salt
)

daily_salt = HMAC(APP_SECRET, "salt:" + UTC-date)</pre>
    <p>
      The <strong>IP prefix</strong> is the first 24 bits of an IPv4 (or 64 bits of an IPv6).
      For example <code>203.0.113.42</code> contributes <code>203.0.113.0/24</code>. The host
      portion is dropped, and even the prefix is hashed in — never persisted, never logged. For
      Camo-proxied requests the IP component is skipped entirely (the proxy hides the real IP).
    </p>
    <p>
      The <strong>daily salt</strong> rotates at 00:00 UTC. The same visitor on two different
      days produces two unrelated fingerprints — no cross-day correlation is possible. The salt
      lives only in the server's <code>APP_SECRET</code>, never in any response.
    </p>
    <p>
      A visit counts as <em>unique</em> if no row with that exact fingerprint exists for the
      same card in the last 12 hours.
    </p>
    <p>Every render still increments the total impressions counter in the hourly bucket.</p>

    <h2>What this means</h2>
    <ul>
      <li><strong>Same visitor in the same UTC day</strong> — counted as unique at most once per 12h.</li>
      <li>
        <strong>Same visitor across UTC midnight</strong> — the daily salt rotates, so a return
        visit a few hours later is counted as a new unique. Minor inflation, but no cross-day
        tracking.
      </li>
      <li>
        <strong>Different visitors on the same WiFi network</strong> — share the IPv4 /24
        prefix, so they fingerprint identically <em>unless</em> some other input differs
        (browser, language, OS, etc.). Typically they do.
      </li>
      <li><strong>Two different browsers</strong> on the same machine — counted as separate uniques.</li>
      <li><strong>Bots that don't send User-Agent</strong> — collapse into one fingerprint per day per network.</li>
    </ul>

    <h2>Direct vs Camo impressions</h2>
    <p>
      The dashboard splits impressions two ways: <strong>direct</strong> (visitor's browser hit
      the URL itself) and <strong>Camo</strong> (the request came through GitHub's image proxy).
      Camo views can't be deduped per viewer — see above — so the &quot;unique&quot; counter
      reflects only direct viewers. The Camo impression count is shown alongside so you can see
      both numbers without conflating them.
    </p>

    <h2>What we do not store</h2>
    <ul>
      <li>
        <strong>No raw IPs.</strong> Only a coarse network prefix (first 24 bits IPv4, first 64
        bits IPv6) is mixed into the daily fingerprint — and even that lives only as a transient
        input to the one-way hash. It's never persisted to disk, written to a log, or sent
        anywhere.
      </li>
      <li>The full IP address is not visible to the application — Cloudflare passes us
        <code>CF-Connecting-IP</code> per request, and the server discards it after computing the
        prefix.
      </li>
      <li>No User-Agent strings in logs (we hash to 12 hex chars for triage).</li>
      <li>
        No cookies or persistent identifiers on the card request — your README is a public
        resource and we treat it as such.
      </li>
    </ul>

    <h2>Referrer chart caveat</h2>
    <p>
      Camo strips most headers, so the top-referrer chart is dominated by
      <code>github.com</code> and <code>(none)</code>. Useful for spotting embeds on other
      sites; don't read absolute numbers off it.
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
  :global(.prose) pre.formula {
    background: var(--glass-2);
    color: var(--text-1);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    font-family: var(--font-mono);
    font-size: 12.5px;
    line-height: 1.6;
    overflow-x: auto;
    margin: 12px 0;
  }
</style>
