/**
 * Shared pure-function library for Falopa Cup tournament logic.
 * No Astro dependencies — usable from both Astro pages and Node CLI scripts.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PenaltyScore {
  holder: number;
  challenger: number;
}

export interface MatchEntry {
  type: 'seeding' | 'match';
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

export interface ClubData {
  id: string;
  name: string;
  shortName: string;
  stadium: string;
  logo: string;
}

export interface ResolvedClub {
  id: string | null;
  unresolvedName?: string;
}

export interface HolderChainEntry {
  holderId: string;
  since: string | Date;
  until: string | Date | null; // null = current holder
}

// ─── Functions ───────────────────────────────────────────────────────────────

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
    if (m.newHolderId) return { holderId: m.newHolderId, match: m };
    if (m.type === 'seeding' && m.holderId) return { holderId: m.holderId, match: m };
  }
  return null;
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
