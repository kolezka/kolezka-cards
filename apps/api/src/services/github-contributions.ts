export interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

export interface StreakStats {
  totalThisYear: number;
  currentStreak: number;
  longestStreak: number;
  currentStreakStart: string | null;
  longestStreakStart: string | null;
  longestStreakEnd: string | null;
}

const DAY_RE =
  /(?:<rect|<td)\b(?=[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})")(?=[^>]*\bdata-level="(\d+)")(?:[^>]*\bid="([^"]+)")?(?:[^>]*\bdata-count="(\d+)")?/g;

const TOOLTIP_RE =
  /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*?)(\d+|No)\s+contribution[^<]*<\/tool-tip>/g;

export function parseContributionDays(html: string): ContributionDay[] {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(TOOLTIP_RE)) {
    const forId = m[1];
    const numToken = m[3];
    if (!forId) continue;
    counts.set(forId, numToken && numToken !== 'No' ? Number.parseInt(numToken, 10) : 0);
  }

  const out: ContributionDay[] = [];
  for (const match of html.matchAll(DAY_RE)) {
    const [, date, levelStr, id, inlineCount] = match;
    if (!date || levelStr === undefined) continue;
    const level = Number.parseInt(levelStr, 10);
    let count = 0;
    if (inlineCount) {
      count = Number.parseInt(inlineCount, 10);
    } else if (id && counts.has(id)) {
      count = counts.get(id) ?? 0;
    }
    out.push({ date, count, level });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

function toUtcDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return toUtcDateKey(d);
}

export function computeStreakStats(days: ContributionDay[], now: Date = new Date()): StreakStats {
  if (days.length === 0) {
    return {
      totalThisYear: 0,
      currentStreak: 0,
      longestStreak: 0,
      currentStreakStart: null,
      longestStreakStart: null,
      longestStreakEnd: null,
    };
  }

  const byDate = new Map(days.map((d) => [d.date, d]));
  const year = now.getUTCFullYear();
  let totalThisYear = 0;
  for (const d of days) {
    if (Number(d.date.slice(0, 4)) === year) totalThisYear += d.count;
  }

  let currentStreak = 0;
  let currentStreakStart: string | null = null;
  const todayKey = toUtcDateKey(now);
  const todayDay = byDate.get(todayKey);
  const todayHasContribution = Boolean(todayDay && (todayDay.count > 0 || todayDay.level > 0));
  let cursor = todayHasContribution ? todayKey : previousDay(todayKey);
  while (true) {
    const day = byDate.get(cursor);
    if (!day || (day.count <= 0 && day.level <= 0)) break;
    currentStreak += 1;
    currentStreakStart = cursor;
    cursor = previousDay(cursor);
  }

  let longestStreak = 0;
  let longestStart: string | null = null;
  let longestEnd: string | null = null;
  let runLen = 0;
  let runStart: string | null = null;
  for (const day of days) {
    if (day.count > 0 || day.level > 0) {
      if (runLen === 0) runStart = day.date;
      runLen += 1;
      if (runLen > longestStreak) {
        longestStreak = runLen;
        longestStart = runStart;
        longestEnd = day.date;
      }
    } else {
      runLen = 0;
      runStart = null;
    }
  }

  return {
    totalThisYear,
    currentStreak,
    longestStreak,
    currentStreakStart,
    longestStreakStart: longestStart,
    longestStreakEnd: longestEnd,
  };
}

export interface FetchContributionsOptions {
  fetcher?: typeof fetch;
}

export async function fetchContributions(
  login: string,
  opts: FetchContributionsOptions = {},
): Promise<ContributionDay[] | null> {
  const fetcher = opts.fetcher ?? fetch;
  const res = await fetcher(`https://github.com/users/${encodeURIComponent(login)}/contributions`, {
    headers: {
      'User-Agent': 'kolezka-cards',
      Accept: 'text/html',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`github contributions ${login}: ${res.status}`);
  const html = await res.text();
  return parseContributionDays(html);
}
