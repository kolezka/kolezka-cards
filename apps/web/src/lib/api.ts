export interface Me {
  id: string;
  githubId: number;
  login: string;
  avatarUrl: string | null;
}

export interface CardSummary {
  id: string;
  slug: string;
  type: string;
  theme: string;
  config: Record<string, unknown>;
  ownerLogin: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsResult {
  range: '24h' | '7d' | '30d' | 'all';
  totals: {
    totalImpressions: number;
    uniqueVisits: number;
    directImpressions: number;
    camoImpressions: number;
  };
  series: Array<{ hourBucket: number; totalImpressions: number; uniqueVisits: number }>;
  referrers: Array<{ host: string | null; count: number }>;
  countries: Array<{ country: string | null; count: number }>;
  userAgents: Array<{ family: string | null; count: number }>;
  sources: Array<{ source: 'direct' | 'camo'; count: number }>;
  heatmap: number[][];
}

export class ApiError extends Error {
  status: number;
  code: string | null;
  constructor(status: number, code: string | null, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-By': 'web',
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) return null;
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let code: string | null = null;
    try {
      const parsed = JSON.parse(raw) as { error?: string };
      if (typeof parsed.error === 'string') code = parsed.error;
    } catch {
      // not JSON — leave code null
    }
    throw new ApiError(res.status, code, `${res.status} ${res.statusText}: ${raw}`);
  }
  if (res.status === 204) return null;
  return (await res.json()) as T;
}

export const api = {
  me: () => request<Me>('/api/me'),
  listCards: () => request<CardSummary[]>('/api/cards'),
  getCard: (id: string) => request<CardSummary>(`/api/cards/${id}`),
  createCard: (slug: string, config: Record<string, unknown>) =>
    request<CardSummary>('/api/cards', { method: 'POST', body: JSON.stringify({ slug, config }) }),
  patchCard: (id: string, patch: { slug?: string; config?: Record<string, unknown> }) =>
    request<CardSummary>(`/api/cards/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteCard: (id: string) => request<{ ok: true }>(`/api/cards/${id}`, { method: 'DELETE' }),
  analytics: (id: string, range: AnalyticsResult['range']) =>
    request<AnalyticsResult>(`/api/cards/${id}/analytics?range=${range}`),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
};
