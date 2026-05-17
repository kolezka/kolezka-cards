<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type AdminCard, type AdminUser, type Me } from '$lib/api';
  import { Glass, GlassButton } from '$lib/ui';

  let me = $state<Me | null>(null);
  let users = $state<AdminUser[]>([]);
  let loading = $state(true);
  let err = $state<string | null>(null);

  // Cards per expanded user. undefined = not loaded; [] = loaded, empty.
  let cardsByUser = $state<Record<string, AdminCard[] | undefined>>({});
  let expanded = $state<Record<string, boolean>>({});
  let cardsLoading = $state<Record<string, boolean>>({});

  async function load() {
    try {
      me = await api.me();
      if (!me?.isAdmin) {
        err = 'forbidden';
        return;
      }
      users = (await api.admin.listUsers()) ?? [];
    } catch (e) {
      err = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  async function toggleExpand(u: AdminUser) {
    expanded[u.id] = !expanded[u.id];
    if (expanded[u.id] && cardsByUser[u.id] === undefined) {
      cardsLoading[u.id] = true;
      try {
        const res = await api.admin.listUserCards(u.id);
        cardsByUser[u.id] = res?.cards ?? [];
      } catch (e) {
        err = (e as Error).message;
      } finally {
        cardsLoading[u.id] = false;
      }
    }
  }

  async function deleteCard(userId: string, card: AdminCard) {
    if (!confirm(`Delete card "${card.slug}" (${card.type})? This cannot be undone.`)) return;
    try {
      await api.admin.deleteCard(card.id);
      cardsByUser[userId] = (cardsByUser[userId] ?? []).filter((c) => c.id !== card.id);
      // Keep the parent row's card count in sync.
      users = users.map((u) => (u.id === userId ? { ...u, cardCount: u.cardCount - 1 } : u));
    } catch (e) {
      err = (e as Error).message;
    }
  }

  async function deleteUser(u: AdminUser) {
    if (
      !confirm(
        `Delete user @${u.login} and ALL their cards? This cascades irreversibly to ${u.cardCount} card(s).`,
      )
    )
      return;
    if (!confirm(`Type @${u.login} confirmed?  Really delete?`)) return;
    try {
      await api.admin.deleteUser(u.id);
      users = users.filter((x) => x.id !== u.id);
      delete cardsByUser[u.id];
      delete expanded[u.id];
    } catch (e) {
      err = (e as Error).message;
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>Admin · kolezka-cards</title>
</svelte:head>

<header class="head">
  <div>
    <p class="eyebrow">Site admin</p>
    <h1 class="title-display">Users</h1>
  </div>
</header>

{#if loading}
  <Glass tier={1} rounded="md" padding="md" class="state muted">Loading…</Glass>
{:else if err === 'forbidden'}
  <Glass tier={2} rounded="lg" padding="lg" class="empty">
    <h2>403 — Forbidden</h2>
    <p>Your account doesn't have admin access.</p>
    <GlassButton variant="primary" size="md" href="/app">Back to your cards</GlassButton>
  </Glass>
{:else if err}
  <Glass tier={1} rounded="md" padding="md" class="state error">Error: {err}</Glass>
{:else if users.length === 0}
  <Glass tier={2} rounded="lg" padding="lg" class="empty">
    <h2>No users yet</h2>
  </Glass>
{:else}
  <Glass tier={2} rounded="lg" padding="md" class="users-block">
    <div class="users-head">
      <span class="col-user">User</span>
      <span class="col-id">GitHub ID</span>
      <span class="col-cards">Cards</span>
      <span class="col-joined">Joined</span>
      <span class="col-actions"></span>
    </div>
    <ul class="users">
      {#each users as u (u.id)}
        <li>
          <div class="user-row" class:expanded={expanded[u.id]}>
            <span class="col-user user-cell">
              {#if u.avatarUrl}
                <img class="avatar" src={u.avatarUrl} alt="" loading="lazy" />
              {/if}
              <div class="who">
                <span class="login">@{u.login}</span>
                {#if me && u.id === me.id}
                  <span class="self-badge">you</span>
                {/if}
              </div>
            </span>
            <span class="col-id mono">{u.githubId}</span>
            <span class="col-cards">
              <button
                type="button"
                class="link-btn"
                onclick={() => toggleExpand(u)}
                aria-expanded={expanded[u.id] ?? false}
              >
                {u.cardCount}
                <span class="chev" class:open={expanded[u.id]} aria-hidden="true">▾</span>
              </button>
            </span>
            <span class="col-joined muted">
              {new Date(u.createdAt).toISOString().slice(0, 10)}
            </span>
            <span class="col-actions">
              {#if me && u.id !== me.id}
                <button
                  type="button"
                  class="danger-btn"
                  onclick={() => deleteUser(u)}
                  title="Delete user and all their cards"
                >
                  Delete user
                </button>
              {/if}
            </span>
          </div>

          {#if expanded[u.id]}
            <div class="cards-panel">
              {#if cardsLoading[u.id]}
                <p class="muted">Loading cards…</p>
              {:else if (cardsByUser[u.id] ?? []).length === 0}
                <p class="muted">No cards.</p>
              {:else}
                <table class="cards-table">
                  <thead>
                    <tr>
                      <th>Slug</th>
                      <th>Type</th>
                      <th>Impressions</th>
                      <th>Unique</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each cardsByUser[u.id] ?? [] as c (c.id)}
                      <tr>
                        <td>
                          <a href={c.url} target="_blank" rel="noopener" class="card-link">
                            {c.slug}
                          </a>
                        </td>
                        <td><span class="type-pill">{c.type}</span></td>
                        <td class="mono">{c.totalImpressions}</td>
                        <td class="mono">{c.uniqueVisits}</td>
                        <td class="muted">
                          {new Date(c.createdAt).toISOString().slice(0, 10)}
                        </td>
                        <td>
                          <button
                            type="button"
                            class="danger-btn small"
                            onclick={() => deleteCard(u.id, c)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </Glass>
{/if}

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    margin: 16px 0 28px;
    flex-wrap: wrap;
  }
  .eyebrow {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-3);
    margin: 0 0 8px;
  }
  h1 {
    margin: 0;
    font-size: clamp(28px, 4vw, 40px);
    letter-spacing: -0.02em;
  }

  :global(.state) {
    color: var(--text-2);
    text-align: center;
  }
  :global(.state.error) {
    color: var(--danger);
  }
  :global(.empty) {
    max-width: 480px;
    margin: 32px auto;
    text-align: center;
  }
  :global(.empty h2) {
    margin: 0 0 8px;
    font-size: 20px;
  }
  :global(.users-block) {
    overflow: hidden;
  }

  .users-head,
  .user-row {
    display: grid;
    grid-template-columns: minmax(180px, 2fr) 110px 90px 120px auto;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
  }
  .users-head {
    font: 600 11px var(--font-sans);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
    border-bottom: 1px solid var(--ring-soft);
  }
  .users {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .users > li {
    border-bottom: 1px solid var(--ring-soft);
  }
  .users > li:last-child {
    border-bottom: 0;
  }
  .user-row.expanded {
    background: var(--glass-2);
  }
  .user-cell {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--glass-3);
    border: 1px solid var(--ring-soft);
    flex: 0 0 auto;
  }
  .who {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }
  .login {
    font-weight: 600;
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .self-badge {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent);
    border: 1px solid var(--ring-soft);
    border-radius: 999px;
    padding: 1px 6px;
  }
  .mono {
    font-family: var(--font-mono);
    color: var(--text-2);
    font-size: 13px;
  }
  .muted {
    color: var(--text-3);
    font-size: 13px;
  }
  .col-actions {
    display: inline-flex;
    justify-content: flex-end;
  }
  .link-btn {
    background: transparent;
    border: 1px solid var(--ring-soft);
    color: var(--text-1);
    border-radius: var(--radius-pill);
    padding: 3px 10px;
    font: 600 12px var(--font-sans);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .link-btn:hover {
    background: var(--glass-3);
  }
  .chev {
    transition: transform var(--dur-fast) var(--ease-glass);
    color: var(--text-3);
    font-size: 10px;
  }
  .chev.open {
    transform: rotate(180deg);
  }
  .danger-btn {
    background: transparent;
    border: 1px solid color-mix(in oklch, var(--danger) 50%, var(--ring-soft));
    color: var(--danger);
    border-radius: var(--radius-pill);
    padding: 4px 10px;
    font: 600 12px var(--font-sans);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease-glass);
  }
  .danger-btn:hover {
    background: color-mix(in oklch, var(--danger) 12%, transparent);
  }
  .danger-btn.small {
    padding: 2px 8px;
    font-size: 11px;
  }

  .cards-panel {
    padding: 4px 12px 14px;
    overflow-x: auto;
  }
  .cards-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .cards-table th,
  .cards-table td {
    text-align: left;
    padding: 6px 10px;
    border-bottom: 1px solid var(--ring-soft);
  }
  .cards-table th {
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 10px;
    font-weight: 600;
  }
  .cards-table tr:last-child td {
    border-bottom: 0;
  }
  .type-pill {
    display: inline-block;
    font: 600 11px var(--font-mono);
    background: var(--glass-3);
    border: 1px solid var(--ring-soft);
    border-radius: var(--radius-pill);
    padding: 1px 8px;
    color: var(--text-2);
  }
  .card-link {
    color: var(--text-1);
    text-decoration: none;
  }
  .card-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 720px) {
    .users-head {
      display: none;
    }
    .user-row {
      grid-template-columns: 1fr auto;
      grid-template-areas:
        'user actions'
        'meta meta';
      row-gap: 6px;
    }
    .user-cell {
      grid-area: user;
    }
    .col-actions {
      grid-area: actions;
    }
    .col-id,
    .col-cards,
    .col-joined {
      grid-area: meta;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .col-id::before {
      content: 'gh:';
      color: var(--text-3);
    }
    .col-joined::before {
      content: 'joined ';
      color: var(--text-3);
    }
  }
</style>
