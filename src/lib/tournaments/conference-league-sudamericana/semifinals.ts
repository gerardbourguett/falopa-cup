import { computeFantasyScore, quarterfinalLocalDate, quarterfinalParticipantIssue } from './index';
import type { KnockoutDocument } from '../../validation/content-integrity';

export const SEMIFINAL_WINDOW_START = '2026-10-09';
export interface SemifinalFixture {
  eventId?: number;
  sourceDate: string | null;
  startTimestamp?: number;
  timeZone: string;
  sourceCompetitionType: 'local-league' | 'local-cup' | 'conmebol';
  sourceCompetition: string;
  homeClub: string;
  awayClub: string;
  isHome: boolean;
  status: 'scheduled' | 'tbd' | 'played';
  selectionStatus: 'confirmed' | 'provisional';
  venue?: string;
  // Null means unknown or not played yet: an unverified card count is never a zero.
  goalsFor: number | null;
  goalsAgainst: number | null;
  yellowCards: number | null;
  redCards: number | null;
  sourceUrl: string;
  verificationSources: string[];
  note?: string;
}
export interface SemifinalClubPlan {
  clubId: string;
  tieId: string;
  sourceRef: string;
  scheduleSourceUrl: string;
  note: string;
  fixtures: SemifinalFixture[];
  pendingCompetition?: { sourceCompetition: string; opponent: string; isHome: boolean; sourceUrl: string; note: string };
}
export interface SemifinalWindowDocument {
  kind: 'sf-window';
  edition: number;
  roundId: 'KO-SF';
  status: 'planned' | 'in-progress';
  windowStart: string;
  selectionPolicy: 'next-two-official-local-dates';
  verifiedAt: string;
  note: string;
  clubs: SemifinalClubPlan[];
}

// This is the current published schedule, not proof that an unpublished cup
// fixture cannot interleave. Provisional selection is retained on the fixture.
export function selectSemifinalFixtures(fixtures: SemifinalFixture[]): Array<SemifinalFixture | null> {
  const seen = new Set<string>();
  const candidates = fixtures.filter((fixture) =>
    ['scheduled', 'tbd', 'played'].includes(fixture.status) &&
    ['local-league', 'local-cup', 'conmebol'].includes(fixture.sourceCompetitionType) &&
    (fixture.sourceDate === null ? fixture.status === 'tbd' : fixture.sourceDate >= SEMIFINAL_WINDOW_START))
    .sort((a, b) => (a.sourceDate ?? '9999-12-31').localeCompare(b.sourceDate ?? '9999-12-31') ||
      (a.startTimestamp ?? 0) - (b.startTimestamp ?? 0))
    .filter((fixture) => {
      const key = fixture.eventId != null ? `event:${fixture.eventId}` : `${fixture.sourceDate}|${fixture.homeClub}|${fixture.awayClub}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return [candidates[0] ?? null, candidates[1] ?? null];
}

const isCount = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Result and discipline rules for one semifinal fixture; `verifiedAt` bounds played dates when known. */
export function semifinalResultIssues(fixture: SemifinalFixture, verifiedAt?: string): string[] {
  if (fixture.status !== 'played') {
    return [fixture.goalsFor, fixture.goalsAgainst, fixture.yellowCards, fixture.redCards].some((value) => value !== null)
      ? ['Future semifinal result and discipline must remain null.'] : [];
  }
  const issues: string[] = [];
  if (!isCount(fixture.goalsFor) || !isCount(fixture.goalsAgainst)) issues.push('Played semifinal fixture requires final scores.');
  if ([fixture.yellowCards, fixture.redCards].some((value) => value !== null && !isCount(value))) issues.push('Discipline must be a nonnegative integer or unknown.');
  if (verifiedAt && fixture.sourceDate && fixture.sourceDate > verifiedAt) issues.push('Played semifinal fixture is after the verification date.');
  return issues;
}

export function semifinalFantasyScore(clubId: string, fixture: SemifinalFixture) {
  if (fixture.status !== 'played' || fixture.goalsFor == null || fixture.goalsAgainst == null) return null;
  return computeFantasyScore({
    ...fixture, id: `SF-${clubId}-${fixture.sourceDate}`, clubId, roundId: 'KO-SF',
    windowStart: SEMIFINAL_WINDOW_START, windowEnd: fixture.sourceDate ?? SEMIFINAL_WINDOW_START,
    sourceDate: fixture.sourceDate ?? SEMIFINAL_WINDOW_START,
    goalsFor: fixture.goalsFor, goalsAgainst: fixture.goalsAgainst, counted: true,
  });
}

/** Partial until both slots are played; unknown cards make a played total an upper bound, never a verified one. */
export function buildSemifinalClubTotal(club: Pick<SemifinalClubPlan, 'clubId' | 'fixtures'>) {
  const slots = selectSemifinalFixtures(club.fixtures);
  const played = slots.filter((fixture): fixture is SemifinalFixture => fixture?.status === 'played');
  const scores = played.map((fixture) => semifinalFantasyScore(club.clubId, fixture)).filter((score) => score != null);
  const disciplinePending = played.some((fixture) => fixture.yellowCards == null || fixture.redCards == null);
  return {
    slots,
    total: scores.length ? scores.reduce((sum, score) => sum + score.total, 0) : null,
    played: scores.length,
    missingSlots: slots.filter((fixture) => fixture == null).length,
    disciplinePending,
    kind: scores.length === 0 ? 'pending' : scores.length < 2 ? 'partial' : disciplinePending ? 'upper-bound' : 'verified',
  } as const;
}

export function semifinalPlanIssues(club: SemifinalClubPlan): string[] {
  const issues: string[] = [];
  const selected = selectSemifinalFixtures(club.fixtures).filter(Boolean);
  if (JSON.stringify(selected) !== JSON.stringify(club.fixtures)) issues.push('Invalid next-two official selection.');
  if (club.pendingCompetition && (!club.note || club.fixtures[1]?.selectionStatus !== 'provisional')) {
    issues.push('An undated competing cup requires a visible note and provisional second selection.');
  }
  for (const fixture of club.fixtures) {
    issues.push(...semifinalResultIssues(fixture));
    if ((fixture.sourceDate === null) !== (fixture.status === 'tbd')) issues.push('Unknown date must remain tbd; scheduled fixtures require a date.');
    if (!fixture.verificationSources?.length) issues.push('Schedule requires verification sources.');
    if (fixture.selectionStatus === 'provisional' && !fixture.note) issues.push('Provisional selection requires a visible explanation.');
    if (fixture.sourceDate && fixture.sourceDate < SEMIFINAL_WINDOW_START) issues.push('Semifinal fixture precedes the inclusive start date.');
    if (fixture.startTimestamp != null && (!Number.isSafeInteger(fixture.startTimestamp) || fixture.startTimestamp <= 0 || !fixture.sourceDate)) issues.push('Invalid confirmed kickoff timestamp.');
    try {
      new Intl.DateTimeFormat('sv-SE', { timeZone: fixture.timeZone });
      if (fixture.sourceDate && fixture.startTimestamp != null && quarterfinalLocalDate({ ...fixture, sourceDate: fixture.sourceDate }) !== fixture.sourceDate) issues.push('Kickoff must preserve the real venue date.');
      const participant = quarterfinalParticipantIssue(club.clubId, { ...fixture, sourceDate: fixture.sourceDate ?? SEMIFINAL_WINDOW_START });
      if (participant) issues.push(participant);
      if (fixture.eventId != null && !fixture.sourceUrl.endsWith(`#id:${fixture.eventId}`)) issues.push('Invalid exact event provenance.');
      if (fixture.eventId == null && /(^|\.)sofascore\.com$/i.test(new URL(fixture.sourceUrl).hostname)) issues.push('Sofascore fixtures require an exact event ID.');
    } catch { issues.push('Invalid venue time zone or source URL.'); }
  }
  return issues;
}

export function validateSemifinalIntegrity(window: SemifinalWindowDocument, knockout: KnockoutDocument, usedEventIds: ReadonlySet<number>): string[] {
  const issues: string[] = [];
  const report = (message: string) => issues.push(`conference/sf-window: ${message}`);
  if (window.edition !== 2026 || window.roundId !== 'KO-SF' || window.windowStart !== SEMIFINAL_WINDOW_START || window.selectionPolicy !== 'next-two-official-local-dates' || !['planned', 'in-progress'].includes(window.status) || 'windowEnd' in window) report('Unauthorized semifinal policy; no end date applies.');
  const sf = knockout.rounds.find((round) => round.id === 'KO-SF');
  if (!sf) return [...issues, 'conference/sf-window: Missing semifinal bracket.'];
  // Status follows the evidence: played fixtures start the round, and completion needs a verified winner this window cannot yet prove.
  const playedCount = window.clubs.reduce((sum, club) => sum + club.fixtures.filter((fixture) => fixture.status === 'played').length, 0);
  const expectedStatus = playedCount > 0 ? 'in-progress' : 'planned';
  if (window.status !== expectedStatus || sf.status !== expectedStatus) report('Semifinal round and window status must match the played fixtures (planned without results, in-progress with them).');
  const slots = sf.ties.flatMap((tie) => [tie.slotA, tie.slotB].map((slot) => ({ ...slot, tieId: tie.id })));
  if (window.clubs.length !== 4 || new Set(window.clubs.map((club) => club.clubId)).size !== 4) report('Exactly four distinct semifinalist plans are required.');
  for (const slot of slots) if (!window.clubs.some((club) => club.clubId === slot.clubId && club.tieId === slot.tieId && club.sourceRef === slot.sourceRef)) report('Missing or rewired semifinalist plan.');
  for (const club of window.clubs) {
    if (!slots.some((slot) => slot.clubId === club.clubId && slot.tieId === club.tieId && slot.sourceRef === club.sourceRef)) report('Club plan must follow the fixed QF winner slot.');
    if (club.fixtures.length !== 2) report(`${club.clubId}: Two upcoming slots are required; an unknown date is not a synthetic date.`);
    semifinalPlanIssues(club).forEach((issue) => report(`${club.clubId}: ${issue}`));
    for (const fixture of club.fixtures) {
      if (fixture.eventId != null && usedEventIds.has(fixture.eventId)) report('Historical R16/QF reuse is not authorized for semifinal scheduling.');
      if (fixture.status === 'played' && fixture.sourceDate && fixture.sourceDate > window.verifiedAt) report(`${club.clubId}: Played semifinal fixture is after the verification date.`);
    }
  }
  return issues;
}
