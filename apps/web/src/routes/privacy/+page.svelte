<script lang="ts">
  import { Glass } from '$lib/ui';
</script>

<svelte:head>
  <title>Privacy Policy · kolezka-cards</title>
  <meta name="robots" content="index,follow" />
  <meta
    name="description"
    content="Privacy policy for kolezka-cards (ghcards.raqz.link) — data controller, what we collect, GDPR rights."
  />
</svelte:head>

<article class="article-wrap">
  <header class="article-head">
    <p class="eyebrow">Legal</p>
    <h1 class="title-display">Privacy Policy</h1>
    <p class="lede">
      kolezka-cards (<a href="https://ghcards.raqz.link">ghcards.raqz.link</a>) is designed to give
      card owners useful visit analytics without tracking individual readers across days.
    </p>
    <p class="updated">Last updated: 2026-05-17</p>
  </header>

  <Glass tier={2} rounded="lg" padding="lg" as="section" class="prose">
    <h2>1. Data controller</h2>
    <p>
      <strong>Mariusz Rakus</strong><br />
      Email: <a href="mailto:mariusz@raqz.pl">mariusz@raqz.pl</a><br />
      Service:
      <a href="https://ghcards.raqz.link">https://ghcards.raqz.link</a>
    </p>

    <h2>2. What this service does</h2>
    <p>
      kolezka-cards generates dynamic SVG cards (visit counters, profile stats, repo stats,
      streaks, language breakdowns, etc.) that GitHub users embed in their public README files.
      Cards are accessible at public URLs. We collect minimal, privacy-preserving analytics so the
      card owner can see how often their cards are viewed.
    </p>

    <h2>3. Data we process</h2>

    <h3>3.1 When a card is rendered (any visitor, no account needed)</h3>
    <p>For each card render the service stores:</p>
    <ul>
      <li>
        A <strong>per-day fingerprint</strong> computed as
        <code>sha256(User-Agent | Accept-Language | Accept-Encoding | daily_salt)</code> where
        <code>daily_salt = HMAC(APP_SECRET, "salt:" + UTC-date)</code> rotates at 00:00 UTC. The
        fingerprint is a one-way hash; the daily salt rotation means a return visitor on a
        following day produces a different fingerprint and cannot be linked to today's visit.
      </li>
      <li>
        A two-letter <strong>country code</strong> when Cloudflare provides it via the
        <code>CF-IPCountry</code> header. We never store the visitor's IP address.
      </li>
      <li>
        A <strong>referrer host</strong> when the browser sends one. Most GitHub embeds appear as
        <code>github.com</code> or empty (the Camo proxy strips most headers).
      </li>
      <li>
        A coarse <strong>User-Agent family</strong> bucket: <code>chrome</code> /
        <code>firefox</code> / <code>safari</code> / <code>curl</code> / <code>bot</code> /
        <code>other</code>. Full User-Agent strings are never logged; only a 12-character hash is
        kept for triage.
      </li>
      <li>
        Per-hour aggregated impression and unique-visit counters, retained as long as the
        corresponding card exists.
      </li>
    </ul>

    <h3>3.2 For signed-in card owners</h3>
    <p>When you sign in with GitHub OAuth, the service stores:</p>
    <ul>
      <li>
        Your GitHub <code>id</code>, <code>login</code>, and <code>avatar_url</code> — fetched at
        sign-in and refreshed on subsequent logins. Used to identify you as the owner of your
        cards.
      </li>
      <li>
        A session row containing a session token (HTTP-only cookie) and a hashed identifier of
        your browser User-Agent. Sessions expire 30 days after creation.
      </li>
    </ul>

    <h2>4. What we do not collect</h2>
    <ul>
      <li>No raw IP addresses, ever.</li>
      <li>No User-Agent strings in logs — only a short hash.</li>
      <li>
        No cookies, localStorage, or fingerprinting libraries are set on the embedded SVG endpoint
        (<code>/c/&lt;user&gt;/&lt;slug&gt;.svg</code>).
      </li>
      <li>
        No cross-day identifiers — the daily salt rotation deliberately breaks correlation between
        a return visitor on different days.
      </li>
      <li>
        No advertising, no tracking pixels, no third-party cookies. Aggregate
        (cookieless) Cloudflare Web Analytics runs on the dashboard pages only —
        see <a href="#sub-processors">Section 8</a>.
      </li>
    </ul>

    <h2>5. Cookies</h2>
    <p>
      The web dashboard sets a single first-party HTTP-only session cookie after you sign in with
      GitHub. No other cookies are set anywhere on the service. The embedded SVG endpoint sets no
      cookies at all.
    </p>

    <h2>6. Legal basis (GDPR)</h2>
    <p>
      For analytics on the public SVG endpoint the legal basis is the legitimate interests of the
      card owner to receive aggregated impression statistics about their public README content
      (Art. 6(1)(f) GDPR). The processing is designed to be minimally identifying: no persistent
      identifier, no IP, no cross-day correlation, no profiling.
    </p>
    <p>
      For authenticated card owners the legal basis is the performance of a contract (Art.
      6(1)(b) GDPR) — providing you the dashboard and card management features you signed up for.
    </p>

    <h2>7. Retention</h2>
    <ul>
      <li>
        Visit and impression rows persist as long as the card exists. Deleting a card cascades to
        all of its visit rows and hourly buckets.
      </li>
      <li>Sessions expire automatically 30 days after creation.</li>
      <li>
        The service does not maintain off-site backups; production runs against a single SQLite
        database file. Operational snapshots may be taken before migrations.
      </li>
    </ul>

    <h2 id="sub-processors">8. Sub-processors</h2>
    <p>The service is built on the following infrastructure and external services:</p>
    <ul>
      <li>The hosting provider that serves <code>ghcards.raqz.link</code>.</li>
      <li>
        <strong>Cloudflare</strong> — CDN/proxy, supplies the country code via the
        <code>CF-IPCountry</code> header. We also use
        <strong>Cloudflare Web Analytics</strong> on the dashboard pages
        (<code>ghcards.raqz.link</code>): a cookieless beacon that records aggregated
        pageviews, referrers, country, browser, and Core Web Vitals. No cookies, no
        cross-site tracking, no advertising identifiers — see
        <a href="https://www.cloudflare.com/web-analytics/" rel="noopener">Cloudflare's
          documentation</a>. The beacon is not loaded on the embedded SVG endpoint
        (<code>/c/&lt;user&gt;/&lt;slug&gt;.svg</code>); only the HTML pages.
      </li>
      <li>
        <strong>GitHub</strong> — OAuth provider; the service calls
        <code>api.github.com</code> to fetch your public profile data when rendering
        <code>profile-stats</code>, <code>repo-stats</code>, <code>streak</code>,
        <code>profile-summary</code>, <code>languages</code>, <code>top-repos</code>,
        <code>gist-counter</code>, and <code>followers-sparkline</code> cards.
      </li>
      <li>
        <strong>Wakatime</strong> — only if you configure a <code>wakatime</code> card. Your
        Wakatime API key (stored in your card's configuration) is sent to <code>wakatime.com</code>
        to fetch your coding-time statistics. Remove the card to stop these requests.
      </li>
    </ul>

    <h2>9. Your rights</h2>
    <p>Under GDPR you have the right to:</p>
    <ul>
      <li>Access the personal data we hold about you.</li>
      <li>Request correction of inaccurate data.</li>
      <li>
        Request erasure (the "right to be forgotten") — see
        <a href="#data-deletion">Section 10</a> for the data-deletion workflow.
      </li>
      <li>Receive your data in a machine-readable format (data portability).</li>
      <li>Object to or restrict processing.</li>
      <li>
        Lodge a complaint with the Polish Data Protection Authority (Prezes Urzędu Ochrony Danych
        Osobowych, UODO).
      </li>
    </ul>
    <p>
      To exercise any of these rights, email
      <a href="mailto:mariusz@raqz.pl">mariusz@raqz.pl</a>. We aim to respond within 30 days.
    </p>

    <h2 id="data-deletion">10. Data deletion</h2>
    <ul>
      <li>Logging out drops your active session row immediately.</li>
      <li>
        Deleting a card via the dashboard cascades to all visit rows and hourly impression
        buckets associated with that card.
      </li>
      <li>
        A full account purge — your user row, all your cards, all your sessions, all
        analytics — is available on request to
        <a href="mailto:mariusz@raqz.pl">mariusz@raqz.pl</a>.
      </li>
    </ul>

    <h2>11. International transfers</h2>
    <p>
      Personal data is processed on infrastructure located within the European Economic Area
      where possible. Calls to GitHub and Wakatime may be served from data centres in the United
      States; both are subject to their own privacy policies and (where applicable) the EU-US
      Data Privacy Framework.
    </p>

    <h2>12. Children</h2>
    <p>
      kolezka-cards is not directed at children under 16. If you believe a child has provided
      personal data, please contact
      <a href="mailto:mariusz@raqz.pl">mariusz@raqz.pl</a> and we will delete it.
    </p>

    <h2>13. Changes to this policy</h2>
    <p>
      Material changes will be announced via a banner on the dashboard for at least 30 days
      before taking effect.
    </p>

    <p class="muted-foot">
      For the technical methodology behind the unique-visit count, see the
      <a href="/methodology">methodology page</a>.
    </p>
  </Glass>
</article>

<style>
  .article-wrap {
    max-width: 780px;
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
  .lede a {
    color: var(--accent);
    text-decoration: none;
  }
  .updated {
    color: var(--text-3);
    font-size: 13px;
    margin: 8px 0 0;
  }
  :global(.prose) h2 {
    margin: 32px 0 12px;
    font-size: 18px;
    letter-spacing: -0.01em;
    color: var(--text-1);
  }
  :global(.prose) h3 {
    margin: 18px 0 6px;
    font-size: 14.5px;
    color: var(--text-1);
    font-weight: 600;
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
