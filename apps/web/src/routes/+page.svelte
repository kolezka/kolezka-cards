<script lang="ts">
  let copied = $state(false);
  const example = `![visits](https://kolezka-cards.example.com/c/yourname/profile.svg)`;
  function copy() {
    navigator.clipboard.writeText(example);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 1500);
  }
</script>

<section class="hero">
  <h1>Dynamic SVG cards for your GitHub README</h1>
  <p>
    Profile stats, repo stats, and a meta visit counter — with per-card analytics that survive
    GitHub's Camo proxy.
  </p>
  <p>
    <a class="btn" href="/auth/github">Sign in with GitHub</a>
    <a class="btn ghost" href="/dev">Live demo</a>
  </p>
</section>

<section>
  <h2>How it works</h2>
  <ol>
    <li>Sign in with GitHub.</li>
    <li>Pick a card type, theme, and section toggles.</li>
    <li>Copy a markdown snippet like the one below into your README.</li>
  </ol>
  <pre>{example}</pre>
  <button type="button" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
  <p class="muted">
    Each render is logged with a daily-rotating fingerprint, so unique visits are approximate but
    don't track users across days. See <a href="/methodology">methodology</a>.
  </p>
</section>

<style>
  .hero {
    padding: 40px 0;
    text-align: center;
  }
  h1 {
    font-size: 32px;
    margin: 0 0 12px;
  }
  .btn {
    display: inline-block;
    background: #238636;
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    text-decoration: none;
    margin: 4px;
  }
  .btn.ghost {
    background: transparent;
    border: 1px solid #30363d;
    color: #e6edf3;
  }
  pre {
    background: #161b22;
    padding: 12px;
    border-radius: 8px;
    overflow: auto;
  }
  .muted {
    color: #8b949e;
    font-size: 12px;
  }
  ol {
    color: #c9d1d9;
  }
</style>
