/**
 * Shared pure-function library for Falopa Cup tournament logic.
 * No Astro dependencies — usable from both Astro pages and Node CLI scripts.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PenaltyScore {
  holder: number;
  challenger: number;
}

/** Falopa transfers on a holder loss; REDACTED transfers on a holder win. */
export function computeNewHolder(
  tournament: 'falopa-cup' | 'copa-pablo-milad',
  holderId: string,
  challengerId: string,
  scoreHolder: number,
  scoreChallenger: number,
  penaltiesHolder?: number,
  penaltiesChallenger?: number,
): string {
  const usePenalties = scoreHolder === scoreChallenger &&
    penaltiesHolder !== undefined && penaltiesChallenger !== undefined;
  const difference = usePenalties
    ? penaltiesHolder! - penaltiesChallenger!
    : scoreHolder - scoreChallenger;
  const transfers = tournament === 'falopa-cup' ? difference < 0 : difference > 0;
  return transfers ? challengerId : holderId;
}

export interface MatchEntry {
  type: 'seeding' | 'match';
  status?: 'played' | 'pending';
  date: string | Date;
  competition?: string;
  reason?: string;
  holderId?: string;
  challengerId?: string;
  scoreHolder?: number;
  scoreChallenger?: number;
  penalties?: PenaltyScore;
  newHolderId?: string;
}

export interface HolderResult {
  holderId: string;
  match: MatchEntry;
}

export interface CurrentReignResult {
  holderId: string;
  since: string | Date;
  match: MatchEntry;
}

export interface ClubData {
  id: string;
  name: string;
  shortName: string;
  stadium?: string;
  logo?: string;
}

export interface ResolvedClub {
  id: string | null;
  unresolvedName?: string;
}

export interface HolderChainEntry {
  holderId: string;
  since: string | Date | null;
  until: string | Date | null; // null = current holder
}

// ─── Functions ───────────────────────────────────────────────────────────────

/** Select the newest season with a played match, or the newest season if none has started. */
export function selectCurrentSeason<T extends { year: number; matches: MatchEntry[] }>(seasons: T[]): T | undefined {
  const newest = [...seasons].sort((a, b) => b.year - a.year);
  return newest.find((season) => season.matches.some((match) => match.type === 'match' && match.status !== 'pending')) ?? newest[0];
}

export function getSeasonHolderId(season: { matches: MatchEntry[]; initialHolderId?: string }): string | undefined {
  return getCurrentHolder(season.matches)?.holderId ?? season.initialHolderId;
}

/** Preserve the initial reign, including its date when known. */
export function getSeasonHolderChain(season: { matches: MatchEntry[]; initialHolderId?: string; initialHolderDate?: string | Date }): HolderChainEntry[] {
  const chain = getHolderChain(season.matches);
  if (!season.initialHolderId) return chain;
  const seed = season.matches.find((match) => match.type === 'seeding' && match.status !== 'pending' && match.holderId === season.initialHolderId);
  const since = season.initialHolderDate ?? seed?.date ?? null;
  if (chain[0]?.holderId === season.initialHolderId) {
    chain[0].since = since;
    return chain;
  }
  return [{ holderId: season.initialHolderId, since, until: chain[0]?.since ?? null }, ...chain];
}

/** Avoid counting an initial holder twice when legacy seed data is present. */
export function getPalmaresInitialHolderIds(seasons: Array<{ initialHolderId?: string; matches: MatchEntry[] }>): string[] {
  return seasons.filter((season) => season.initialHolderId &&
    season.matches.some((match) => match.type === 'match' && match.status !== 'pending') &&
    !season.matches.some((match) => match.type === 'seeding' && match.status !== 'pending' && match.holderId === season.initialHolderId)
  ).map((season) => season.initialHolderId!);
}

export function countSeasonHolders(season: { matches: MatchEntry[]; initialHolderId?: string }): number {
  const ids = new Set(season.matches.filter((match) => match.status !== 'pending' && match.newHolderId).map((match) => match.newHolderId!));
  if (season.initialHolderId) ids.add(season.initialHolderId);
  return ids.size;
}

/**
 * Returns the current title holder from a list of match entries.
 * Sorted by date descending — first match with newHolderId wins;
 * falls back to seeding holderId.
 */
export function getCurrentHolder(matches: MatchEntry[]): HolderResult | null {
  const sorted = [...matches].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  for (const m of sorted) {
    if (m.status === 'pending') continue;
    if (m.newHolderId) return { holderId: m.newHolderId, match: m };
    if (m.type === 'seeding' && m.holderId) return { holderId: m.holderId, match: m };
  }
  return null;
}

/**
 * Returns the current holder and the exact date when the current reign began.
 * Uses the holder chain so retained defenses do not overwrite the reign start.
 */
export function getCurrentReign(matches: MatchEntry[]): CurrentReignResult | null {
  const currentHolder = getCurrentHolder(matches);
  if (!currentHolder) return null;

  const chain = getHolderChain(matches);
  const currentReign = chain[chain.length - 1];
  if (!currentReign) return null;

  return {
    holderId: currentReign.holderId,
    since: currentReign.since!,
    match: currentHolder.match,
  };
}

/**
 * Builds the ordered chain of unique consecutive holders from a list of matches.
 * Each entry represents a "reign": who held the title, from when, until when.
 * The last entry always has until=null (current holder).
 *
 * Matches are sorted chronologically. A new entry is created every time
 * the holderId changes (i.e. newHolderId differs from the previous holder).
 * Seeding entries establish the initial holder.
 */
export function getHolderChain(matches: MatchEntry[]): HolderChainEntry[] {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const chain: HolderChainEntry[] = [];

  for (const m of sorted) {
    if (m.status === 'pending') continue;
    const effectiveHolder = m.newHolderId || (m.type === 'seeding' ? m.holderId : undefined);
    if (!effectiveHolder) continue;

    const last = chain[chain.length - 1];

    if (!last) {
      // First entry
      chain.push({ holderId: effectiveHolder, since: m.date, until: null });
    } else if (last.holderId !== effectiveHolder) {
      // Holder changed — close previous reign, open new one
      last.until = m.date;
      chain.push({ holderId: effectiveHolder, since: m.date, until: null });
    }
    // Same holder keeps reigning — no new entry needed
  }

  return chain;
}

/**
 * Normalizes a string: strips accents and lowercases.
 */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Resolves an API-provided club name to a ClubData entry via three passes:
 *  1. Exact match on name
 *  2. Normalized match (strip accents + lowercase)
 *  3. Substring match (both directions, ≥4 chars)
 *
 * Returns { id: null, unresolvedName } if no match is found.
 */
export function resolveClub(apiName: string, clubs: ClubData[]): ResolvedClub {
  // Pass 1: exact match
  const exact = clubs.find((c) => c.name === apiName);
  if (exact) return { id: exact.id };

  // Pass 2: normalized match
  const normalizedInput = normalize(apiName);
  const normalized = clubs.find((c) => normalize(c.name) === normalizedInput);
  if (normalized) return { id: normalized.id };

  // Pass 3: substring match (≥4 chars)
  if (normalizedInput.length >= 4) {
    const substring = clubs.find(
      (c) =>
        normalize(c.name).includes(normalizedInput) ||
        normalizedInput.includes(normalize(c.name))
    );
    if (substring) return { id: substring.id };
  }

  return { id: null, unresolvedName: apiName };
}
