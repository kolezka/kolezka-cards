<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type Me } from '$lib/api';
  import { Glass, GlassButton } from '$lib/ui';

  // null = anonymous; undefined = still loading. We optimistically render the
  // login CTA while loading so the hero never flashes "open dashboard" then
  // collapses back; once we know the user is logged in we swap the CTA.
  let me = $state<Me | null | undefined>(undefined);
  onMount(async () => {
    try {
      me = await api.me();
    } catch {
      me = null;
    }
  });

  let copied = $state(false);
  const example = `![visits](https://kolezka-cards.example.com/c/yourname/profile.svg)`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(example);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 1500);
    } catch {
      copied = false;
    }
  }

  const features: Array<{ title: string; body: string; icon: string }> = [
    {
      title: 'Live SVG cards',
      body: 'Visit counter, profile stats, repo stats, streak, profile summary, languages, top repos, gists, Wakatime, followers — all renderable as plain SVG.',
      icon: '◐',
    },
    {
      title: 'Daily-rotating fingerprints',
      body: "Unique visits without cross-day tracking. No raw IPs stored, no UA strings logged, no cookies on the SVG endpoint.",
      icon: '◑',
    },
    {
      title: 'Themes & overrides',
      body: 'Pick a built-in theme or override individual tokens. Resize cards per-render via ?w/?h. Toggle sections via ?hide=.',
      icon: '◒',
    },
    {
      title: 'Survives Camo',
      body: "GitHub proxies and caches images; our impression dedup still tracks per-fingerprint unique visits inside a 12-hour window.",
      icon: '◓',
    },
  ];
</script>

<section class="hero">
  <p class="eyebrow">kolezka-cards</p>
  <h1 class="title-display">
    Dynamic SVG cards<br />
    <span class="accent-gradient">for your GitHub README.</span>
  </h1>
  <p class="lede">
    Profile stats, repo stats, languages, streaks — with privacy-preserving analytics that survive
    Camo. Self-hosted, fast, beautiful.
  </p>
  <div class="cta-row">
    {#if me}
      <GlassButton variant="primary" size="lg" href="/app">Open dashboard</GlassButton>
    {:else}
      <GlassButton variant="primary" size="lg" href="/auth/github">
        Sign in with GitHub
      </GlassButton>
    {/if}
    <GlassButton variant="secondary" size="lg" href="/dev">Live demo</GlassButton>
  </div>
</section>

<section class="features">
  {#each features as f (f.title)}
    <Glass tier={2} rounded="lg" padding="lg" class="feature">
      <div class="icon" aria-hidden="true">{f.icon}</div>
      <h3>{f.title}</h3>
      <p>{f.body}</p>
    </Glass>
  {/each}
</section>

<section class="how">
  <Glass tier={3} rounded="lg" padding="lg">
    <h2>How it works</h2>
    <ol>
      <li><span class="num">1</span>Sign in with GitHub. We only store your public profile.</li>
      <li><span class="num">2</span>Pick a card type. Configure size, period, theme, and sections.</li>
      <li><span class="num">3</span>Copy a markdown snippet and paste it into your README.</li>
    </ol>
    <Glass tier={1} rounded="md" padding="sm" class="code-block">
      <code>{example}</code>
    </Glass>
    <div class="how-actions">
      <GlassButton variant="ghost" size="sm" onclick={copy}>
        {copied ? '✓ Copied' : 'Copy snippet'}
      </GlassButton>
      <a class="link" href="/methodology">Read the methodology →</a>
    </div>
  </Glass>
</section>

<style>
  .hero {
    padding: 64px 0 56px;
    text-align: center;
  }
  .eyebrow {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-3);
    margin: 0 0 16px;
  }
  h1 {
    font-size: clamp(36px, 6vw, 64px);
    margin: 0 0 18px;
    letter-spacing: -0.03em;
    line-height: 1.05;
  }
  .accent-gradient {
    background: linear-gradient(120deg, var(--accent), var(--accent-2));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .lede {
    max-width: 640px;
    margin: 0 auto 32px;
    color: var(--text-2);
    font-size: 17px;
    line-height: 1.55;
  }
  .cta-row {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
  @media (max-width: 520px) {
    .hero {
      padding: 40px 0 36px;
    }
    .cta-row {
      gap: 8px;
    }
    /* Shrink the hero CTA buttons on phones. Touch-target floor (44px min-height
       from tokens.css :coarse pointer rule) still applies, so we only trim the
       inline padding/font without breaking accessibility. */
    .cta-row :global(.btn.s-lg) {
      padding: 9px 16px;
      font-size: 14px;
    }
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 18px;
    margin: 32px 0;
  }
  :global(.feature) {
    transition: transform var(--dur-med) var(--ease-glass);
  }
  :global(.feature:hover) {
    transform: translateY(-2px);
  }
  .icon {
    font-size: 28px;
    color: var(--accent);
    margin-bottom: 10px;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 16px;
    letter-spacing: -0.01em;
  }
  .features p {
    margin: 0;
    color: var(--text-2);
    font-size: 13.5px;
    line-height: 1.55;
  }

  .how {
    margin: 56px 0 0;
  }
  .how h2 {
    margin: 0 0 22px;
    font-size: 24px;
    letter-spacing: -0.01em;
  }
  ol {
    margin: 0 0 22px;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: var(--text-1);
  }
  ol .num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--glass-3);
    border: 1px solid var(--ring-soft);
    color: var(--accent);
    font-weight: 700;
    margin-right: 12px;
    font-size: 13px;
  }
  :global(.code-block) {
    font-family: var(--font-mono);
    overflow-x: auto;
  }
  :global(.code-block code) {
    font-family: inherit;
    color: var(--text-1);
    font-size: 13.5px;
  }
  .how-actions {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 14px;
    flex-wrap: wrap;
  }
  .link {
    color: var(--accent);
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 600;
  }
  .link:hover {
    filter: brightness(1.1);
  }
</style>
