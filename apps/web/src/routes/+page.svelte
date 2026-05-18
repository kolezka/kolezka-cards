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

<svelte:head>
  <title>kolezka-cards — Dynamic SVG cards for your GitHub README</title>
  <meta name="robots" content="index,follow" />
  <meta
    name="description"
    content="Privacy-preserving SVG cards for GitHub READMEs — profile stats, repo stats, languages, streaks — with analytics that survive Camo. Self-hosted, fast, beautiful."
  />
  <link rel="canonical" href="https://ghcards.raqz.link/" />
  <meta property="og:url" content="https://ghcards.raqz.link/" />
</svelte:head>

<section class="hero">
  <h1 class="title-display">
    Dynamic SVG cards<br />
    <span class="accent-gradient">for your GitHub README.</span>
  </h1>
  <p class="lede">
    Profile stats, repo stats, languages, streaks — with privacy-preserving analytics that survive
    Camo. Self-hosted, fast, beautiful.
  </p>
  <div class="cta-row">
    {#if !me}
      <GlassButton variant="primary" size="lg" href="/auth/github">
        Sign in with GitHub
      </GlassButton>
    {/if}
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
</style>
