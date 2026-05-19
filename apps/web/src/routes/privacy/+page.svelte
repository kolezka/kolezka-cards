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
  <link rel="canonical" href="https://ghcards.raqz.link/privacy" />
  <meta property="og:title" content="Privacy Policy · kolezka-cards" />
  <meta property="og:url" content="https://ghcards.raqz.link/privacy" />
  <meta
    property="og:description"
    content="Privacy policy for kolezka-cards — data controller, what we collect, GDPR rights."
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
    <p class="updated">Last updated: 2026-05-19</p>
  </header>

  <Glass tier={2} rounded="lg" padding="lg" as="section" class="prose">
    <h2>1. Who we are</h2>
    <p>
      <strong>Mariusz Rakus</strong> — <a href="mailto:mariusz@raqz.pl">mariusz@raqz.pl</a>.
    </p>

    <h2>2. What we collect</h2>
    <ul>
      <li>
        <strong>Card views.</strong> Aggregated counts per card with a coarse country code and a
        daily-rotating, one-way fingerprint so we can show owners how many unique visitors hit
        their card. No raw IPs, no User-Agent strings, no cross-day tracking.
      </li>
      <li>
        <strong>Your account.</strong> When you sign in with GitHub we store your GitHub id,
        login, and avatar URL, plus one session.
      </li>
    </ul>

    <h2>3. Cookies</h2>
    <p>
      One first-party, HTTP-only session cookie after you sign in. Nothing else. The card SVG
      endpoint sets no cookies.
    </p>

    <h2>4. Third parties</h2>
    <ul>
      <li><strong>GitHub</strong> — OAuth sign-in and public profile data used to render cards.</li>
      <li><strong>Cloudflare</strong> — CDN and country code header for analytics.</li>
      <li><strong>Wakatime</strong> — only if you configure a wakatime card.</li>
    </ul>

    <h2>5. Retention</h2>
    <p>
      Analytics rows live as long as the card. Sessions expire after 30 days. Deleting a card or
      account purges everything tied to it.
    </p>

    <h2>6. Your rights &amp; data deletion</h2>
    <p>
      You can access, correct, export, or delete your data — log out to drop your session, delete
      a card from the dashboard to remove its analytics, or email
      <a href="mailto:mariusz@raqz.pl">mariusz@raqz.pl</a> for a full account purge. You also have
      the right to lodge a complaint with the Polish DPA (UODO).
    </p>

    <h2>7. Changes</h2>
    <p>
      Material changes will be announced on the dashboard before taking effect.
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
  :global(.prose) a {
    color: var(--accent);
    text-decoration: none;
  }
  :global(.prose) a:hover {
    filter: brightness(1.1);
  }
</style>
