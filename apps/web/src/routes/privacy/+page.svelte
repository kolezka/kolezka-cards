<script lang="ts">
  import { Glass } from '$lib/ui';
</script>

<svelte:head>
  <meta name="robots" content="index,follow" />
</svelte:head>

<article class="article-wrap">
  <header class="article-head">
    <p class="eyebrow">Privacy</p>
    <h1 class="title-display">What we collect, and what we don't</h1>
    <p class="lede">
      kolezka-cards is a public SVG-rendering service. Every embedded card is a public URL anyone
      can hit, so we collect the minimum data needed to give you useful analytics without tracking
      your readers across days.
    </p>
  </header>

  <Glass tier={2} rounded="lg" padding="lg" as="section" class="prose">
    <h2>What we collect when a card is rendered</h2>
    <ul>
      <li>
        A <strong>per-day fingerprint</strong> computed as
        <code>sha256(User-Agent | Accept-Language | Accept-Encoding | daily_salt)</code>. The
        daily salt is <code>HMAC(APP_SECRET, "salt:" + UTC-date)</code> and rotates at 00:00 UTC.
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
      <li>
        No cross-day identifiers — the daily salt rotation means a returning visitor next week
        cannot be linked to today's visit.
      </li>
    </ul>

    <h2>Authentication data (only for signed-in card owners)</h2>
    <ul>
      <li>
        Your GitHub <code>id</code>, <code>login</code>, and <code>avatar_url</code> — fetched
        once during OAuth and refreshed on each login.
      </li>
      <li>
        A session row with a hashed User-Agent so you can audit your active sessions in a future
        release. Sessions expire after 30 days.
      </li>
    </ul>

    <h2>Data deletion</h2>
    <p>
      Logging out drops your session. Deleting a card cascades to all its visit rows and hourly
      buckets. We can fully purge your account on request — email
      <a href="mailto:support@kolezka.dev">support@kolezka.dev</a>.
    </p>

    <p class="muted-foot">
      For the technical methodology behind the unique-visit count, see
      <a href="/methodology">methodology</a>.
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
  :global(.prose) a {
    color: var(--accent);
    text-decoration: none;
  }
  :global(.prose) a:hover {
    filter: brightness(1.1);
  }
  .muted-foot {
    margin-top: 24px;
    font-size: 13px;
    color: var(--text-3);
  }
</style>
