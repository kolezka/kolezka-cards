<script lang="ts"></script>

<svelte:head>
  <meta name="robots" content="index,follow" />
</svelte:head>

<h1>Privacy</h1>

<p>
  kolezka-cards is a public SVG-rendering service. Every card you embed in a README is a
  public URL anyone can hit, so we collect the minimum data needed to give you useful
  analytics without tracking your readers across days.
</p>

<h2>What we collect when a card is rendered</h2>
<ul>
  <li>
    A <strong>per-day fingerprint</strong> computed as
    <code>sha256(User-Agent | Accept-Language | Accept-Encoding | daily_salt)</code>.
    <br />
    The daily salt is <code>HMAC(APP_SECRET, "salt:" + UTC-date)</code> and rotates at 00:00 UTC.
  </li>
  <li>Country code from <code>CF-IPCountry</code> when Cloudflare provides it.</li>
  <li>Referrer hostname when forwarded (usually <code>github.com</code> when embedded in a README).</li>
  <li>A coarse user-agent family bucket (chrome / firefox / safari / curl / bot / other).</li>
  <li>Per-hour total impressions and unique visits, kept as long as the card exists.</li>
</ul>

<h2>What we do not collect</h2>
<ul>
  <li>No raw IP addresses, ever.</li>
  <li>No User-Agent strings in logs (we hash to 12 hex chars for triage).</li>
  <li>No cookies, no localStorage, no fingerprinting libraries on the embedded SVG.</li>
  <li>No cross-day identifiers — the daily salt rotation means a returning visitor next week
    cannot be linked to today's visit.</li>
</ul>

<h2>Authentication data (only for signed-in card owners)</h2>
<ul>
  <li>Your GitHub <code>id</code>, <code>login</code>, and <code>avatar_url</code> — fetched once
    during OAuth and refreshed on each login.</li>
  <li>A session row with a hashed User-Agent so you can audit your active sessions in a future
    release. Sessions expire after 30 days.</li>
</ul>

<h2>Data deletion</h2>
<p>
  Logging out drops your session. Deleting a card cascades to all its visit rows and hourly
  buckets. We can fully purge your account on request — email
  <a href="mailto:support@kolezka.dev">support@kolezka.dev</a>.
</p>

<p class="muted">
  For the technical methodology behind the unique-visit count, see
  <a href="/methodology">methodology</a>.
</p>

<style>
  h1 {
    margin-top: 0;
  }
  h2 {
    margin-top: 28px;
  }
  ul {
    color: #c9d1d9;
  }
  code {
    background: #161b22;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .muted {
    color: #8b949e;
  }
</style>
