<script lang="ts"></script>

<h1>How we count visits</h1>

<h2>The Camo problem</h2>
<p>
  GitHub proxies every README image through <code>camo.githubusercontent.com</code>. That means we
  never see the end user's IP — only Camo's. We also have to set strict no-cache headers (and
  rotate the ETag on every render) to keep Camo from serving a stale, cached SVG.
</p>

<h2>The approximate-unique fingerprint</h2>
<p>
  For every render we compute
  <code>sha256(User-Agent | Accept-Language | Accept-Encoding | daily_salt)</code>
  where <code>daily_salt = HMAC(APP_SECRET, "salt:" + UTC-date)</code>.
</p>
<p>A visit counts as <em>unique</em> if no row with that same fingerprint exists for the same card in the last 12 hours.</p>
<p>Every render still increments the total impressions counter in the hourly bucket.</p>

<h2>What this means</h2>
<ul>
  <li><strong>Same browser in the same UTC day</strong> → counted as unique at most once per 12h.</li>
  <li><strong>Same browser across UTC midnight</strong> → the daily salt rotates, so a return visit a few hours later may be counted as a new unique. Minor inflation, but no cross-day tracking.</li>
  <li><strong>Two different browsers (or UA spoofers)</strong> → counted as separate uniques.</li>
  <li><strong>Bots that don't send User-Agent</strong> → all collapse into one fingerprint per day.</li>
</ul>

<h2>What we do <em>not</em> store</h2>
<ul>
  <li>No raw IPs. Only a country code derived from <code>CF-IPCountry</code> when present.</li>
  <li>No User-Agent strings in logs (we hash to 12 hex chars for triage).</li>
  <li>No cookies or persistent identifiers on the card request — your README is a public
    resource and we treat it as such.</li>
</ul>

<h2>Referrer chart caveat</h2>
<p>
  Camo strips most headers, so the top-referrer chart will be dominated by
  <code>github.com</code> and <code>(none)</code>. The chart is still useful for spotting embeds
  on other sites, but don't read absolute numbers off it.
</p>

<style>
  h1 {
    margin-top: 0;
  }
  h2 {
    margin-top: 28px;
  }
  code,
  pre {
    background: #161b22;
    padding: 2px 6px;
    border-radius: 4px;
  }
  ul,
  ol {
    color: #c9d1d9;
  }
</style>
