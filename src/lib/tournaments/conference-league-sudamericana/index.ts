export type ConferenceEntryType =
  | 'base'
  | 'libertadores-f1'
  | 'libertadores-f2'
  | 'sudamericana-f1';

export interface ClubSeed {
  clubId: string;
  name: string;
  country: string;
  entryType: ConferenceEntryType;
  conmebolRank: number;
  conmebolCoefficient?: number | null;
  coefficientLabel?: string;
  directToMainStage: boolean;
  allocationCategory:
    | 'league-direct'
    | 'coefficient-direct'
    | 'preliminary-pot-1'
    | 'preliminary-pot-2';
  pot: 1 | 2 | 3 | 4;
}

export type SourceCompetitionType = 'local-league' | 'local-cup' | 'conmebol' | 'friendly';

export interface OfficialMatchSource {
  id: string;
  clubId: string;
  roundId: string;
  windowStart: string;
  windowEnd: string;
  sourceCompetitionType: SourceCompetitionType;
  sourceCompetition: string;
  sourceDate: string;
  homeClub: string;
  awayClub: string;
  goalsFor: number;
  goalsAgainst: number;
  isHome: boolean;
  counted: boolean;
  yellowCards?: number | null;
  redCards?: number | null;
}

export interface FantasyScoreResult {
  clubId: string;
  roundId: string;
  sourceMatchId: string;
  basePoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  total: number;
  explanation: string;
}

export interface SelectCountedMatchResult {
  policy: 'base-window' | 'extended-window' | 'no-match';
  match: OfficialMatchSource | null;
}

export interface KnockoutTieInput {
  clubId: string;
  total: number;
  goalsFor: number;
  goalsAgainst: number;
  playedAway?: boolean;
  yellowCards?: number | null;
  redCards?: number | null;
  conmebolRank?: number | null;
}

export interface KnockoutTieResult {
  winnerClubId: string;
  tiebreakReason:
    | 'fantasy-total'
    | 'card-deductions'
    | 'goals-for'
    | 'away-condition'
    | 'conmebol-rank'
    | 'administrative-draw';
}

export interface GroupStandingEntry {
  group: string;
  clubId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  fantasyFor: number;
  fantasyAgainst: number;
  fantasyDiff: number;
  goalsFor: number;
  goalsAgainst: number;
  awayBonusWins: number;
}

export interface FantasyClubTotals {
  played: number;
  base: number;
  bonus: number;
  penalty: number;
  total: number;
}

export interface RoundWindowData {
  roundId: string;
  fantasyScores?: FantasyScoreResult[];
  windowMatchSources?: OfficialMatchSource[];
}

export interface ConferenceGroupDefinition {
  group: string;
  clubIds: string[];
}

export interface WindowCutEntry {
  clubId: string;
  pot: 'Bombo 1' | 'Bombo 2';
  status: 'ok' | 'no-match';
  total: number;
  gd?: number | null;
  gf?: number | null;
  sourceDate?: string | null;
  competition?: string | null;
  opponent?: string | null;
  homeAway?: 'home' | 'away' | null;
  goalsFor?: number | null;
  goalsAgainst?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  sourceUrl?: string | null;
}

export interface WindowCutFantasyBreakdown {
  base: number;
  bonus: number;
  penalty: number;
  total: number;
  text: string;
}

const OFFICIAL_COMPETITIONS = new Set<SourceCompetitionType>([
  'local-league',
  'local-cup',
  'conmebol',
]);

// This planning policy is specific to the authorized 2026 quarterfinal window.
export const QUARTERFINAL_WINDOW = { start: '2026-09-24', end: '2026-10-15' } as const;
export const QUARTERFINAL_SELECTION_EXCEPTION = 'last-two-completed-before-2026-10-09' as const;
// A deliberate user exception for six identified games, never a global fallback.
const QF_EXCEPTION_MATCHES: Record<string, Array<{ date: string; eventId?: number; sourceUrl?: string; reusedR16SourceId?: string }>> = {
  'pe-alianza-lima': [
    { date: '2026-09-12', eventId: 16280820, reusedR16SourceId: 'KO-R16-pe-alianza-lima-1' },
    { date: '2026-09-18', eventId: 16280829, reusedR16SourceId: 'KO-R16-pe-alianza-lima-2' },
  ],
  'ec-orense': [
    { date: '2026-09-14', eventId: 15502691, reusedR16SourceId: 'KO-R16-ec-orense-2' },
    { date: '2026-09-21', sourceUrl: 'https://footballnation.eu/match/ligapro-serie-a/2026/812232/' },
  ],
  've-metropolitanos': [
    { date: '2026-09-16', eventId: 17093892, reusedR16SourceId: 'KO-R16-ve-metropolitanos-1' },
    { date: '2026-09-20', eventId: 16774716, reusedR16SourceId: 'KO-R16-ve-metropolitanos-2' },
  ],
};

export interface QuarterfinalFixture {
  eventId?: number;
  sourceDate: string;
  startTimestamp?: number;
  timeZone: string;
  sourceCompetitionType: SourceCompetitionType;
  sourceCompetition: string;
  homeClub: string;
  awayClub: string;
  isHome: boolean;
  status: string;
  sourceUrl: string;
  goalsFor: number | null;
  goalsAgainst: number | null;
  yellowCards: number | null;
  redCards: number | null;
  verificationSources?: string[];
  note?: string;
  reusedR16SourceId?: string;
  yellowCardReports?: Array<{ count: number; sourceUrl: string; kind: 'listed-events' | 'reported-total' }>;
}

export interface QuarterfinalClubPlan {
  clubId: string;
  tieId: string;
  sourceRef: string;
  qualification: 'confirmed' | 'conditional';
  scheduleSourceUrl: string;
  note?: string;
  fixtures: QuarterfinalFixture[];
  selectionException?: typeof QUARTERFINAL_SELECTION_EXCEPTION;
}

export function quarterfinalExceptionFixtureAllowed(club: Pick<QuarterfinalClubPlan, 'clubId' | 'selectionException'> | undefined, fixture: QuarterfinalFixture): boolean {
  return club?.selectionException === QUARTERFINAL_SELECTION_EXCEPTION && fixture.status === 'played' &&
    fixture.sourceCompetitionType !== 'friendly' && (QF_EXCEPTION_MATCHES[club.clubId] || []).some((entry) =>
      fixture.sourceDate === entry.date && fixture.eventId === entry.eventId &&
      (!entry.sourceUrl || fixture.sourceUrl === entry.sourceUrl) && fixture.reusedR16SourceId === entry.reusedR16SourceId);
}

// Exact source/seed aliases only; normalization follows the R16 updater convention.
const QUARTERFINAL_NAME_ALIASES = new Map<string, string[]>([
  ['pe-adt', ['Asociación Deportiva Tarma']],
  ['ec-orense', ['Orense SC']],
  ['py-general-caballero', ['General Caballero (JLM)']],
]);

export function quarterfinalParticipantIssue(clubId: string, fixture: QuarterfinalFixture): string | null {
  const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
  const names = [clubId.slice(3), ...(QUARTERFINAL_NAME_ALIASES.get(clubId) ?? [])].map(normalize);
  const participant = fixture.isHome ? fixture.homeClub : fixture.awayClub;
  const opponent = fixture.isHome ? fixture.awayClub : fixture.homeClub;
  const context = `${clubId}: event ${fixture.eventId}`;
  if (!names.includes(normalize(participant))) {
    return `${context}: ${fixture.isHome ? 'homeClub' : 'awayClub'} must identify the plan club; check participants and isHome.`;
  }
  if (!normalize(opponent) || names.includes(normalize(opponent))) {
    return `${context}: opponent must be a different club; check homeClub and awayClub.`;
  }
  return null;
}

export function quarterfinalLocalDate(fixture: Pick<QuarterfinalFixture, 'startTimestamp' | 'timeZone' | 'sourceDate'>): string {
  // Date-only evidence for the approved historical games does not invent a time.
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: fixture.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fixture.startTimestamp == null ? fixture.sourceDate : formatter.format(new Date(fixture.startTimestamp * 1000));
}

export function selectQuarterfinalFixtures(
  candidates: QuarterfinalFixture[],
  previouslyUsedEventIds: ReadonlySet<number> = new Set(),
  club?: Pick<QuarterfinalClubPlan, 'clubId' | 'selectionException'>,
): [QuarterfinalFixture | null, QuarterfinalFixture | null] {
  const seen = new Set<string>([...previouslyUsedEventIds].map((id) => `event:${id}`));
  const selectedKeys = new Set<string>();
  const eligible = [...candidates]
    .filter((match) => ['scheduled', 'played'].includes(match.status) && OFFICIAL_COMPETITIONS.has(match.sourceCompetitionType))
    .filter((match) => {
      if (club?.selectionException) return quarterfinalExceptionFixtureAllowed(club, match);
      if (match.startTimestamp == null) return false;
      const date = quarterfinalLocalDate(match);
      return date >= QUARTERFINAL_WINDOW.start && date <= QUARTERFINAL_WINDOW.end;
    })
    .sort((a, b) => quarterfinalLocalDate(a).localeCompare(quarterfinalLocalDate(b)) ||
      (a.startTimestamp ?? 0) - (b.startTimestamp ?? 0) || (a.eventId ?? 0) - (b.eventId ?? 0))
    .filter((match) => {
      // Official schedules can identify a fixture without publishing a provider ID.
      const key = match.eventId != null ? `event:${match.eventId}`
        : `${match.sourceDate}|${match.homeClub}|${match.awayClub}`;
      if (seen.has(key) && !quarterfinalExceptionFixtureAllowed(club, match)) return false;
      // A reused R16 game is allowed once, not twice within QF.
      if (selectedKeys.has(key)) return false;
      selectedKeys.add(key);
      seen.add(key);
      return true;
    });
  // Missing published fixtures are unknown, not a no-match scoring decision.
  return [eligible[0] ?? null, eligible[1] ?? null];
}

export function quarterfinalReportsHaveDistinctSources(reports: NonNullable<QuarterfinalFixture['yellowCardReports']>): boolean {
  if (reports.length < 2) return false;
  try {
    const sources = reports.map((report) => {
      const url = new URL(report.sourceUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported report source.');
      // Fragment, trailing slash, protocol and www variants are one report,
      // even if its count or kind is duplicated with a different value.
      url.searchParams.sort();
      return `${url.hostname.replace(/^www\./, '')}:${url.port}${url.pathname.replace(/\/+$/, '')}${url.search}`;
    });
    return new Set(sources).size === reports.length;
  } catch { return false; }
}

export function quarterfinalFixtureIssues(fixture: QuarterfinalFixture, verifiedAt: string, club?: Pick<QuarterfinalClubPlan, 'clubId' | 'selectionException'>): string[] {
  const issues: string[] = [];
  const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  if (fixture.startTimestamp == null && !quarterfinalExceptionFixtureAllowed(club, fixture)) issues.push('Date-only evidence requires the specific authorized selection exception.');
  if (fixture.reusedR16SourceId && !quarterfinalExceptionFixtureAllowed(club, fixture)) issues.push('Unauthorized R16 reuse.');
  if (fixture.eventId != null && !fixture.sourceUrl.endsWith(`#id:${fixture.eventId}`)) {
    issues.push('Invalid local date or event provenance.');
  }
  if (fixture.eventId == null && /(^|\.)sofascore\.com$/i.test(new URL(fixture.sourceUrl).hostname)) {
    issues.push('Sofascore fixtures require an exact event ID.');
  }
  if (fixture.status === 'scheduled') {
    if ([fixture.goalsFor, fixture.goalsAgainst, fixture.yellowCards, fixture.redCards].some((value) => value !== null)) {
      issues.push('Future result or discipline must remain null.');
    }
  } else if (fixture.status === 'played') {
    if (!count(fixture.goalsFor) || !count(fixture.goalsAgainst)) issues.push('Played fixture requires final scores.');
    if (fixture.sourceDate > verifiedAt) issues.push('Played fixture is after the verification date.');
    if (!fixture.verificationSources?.length) issues.push('Played fixture requires result verification sources.');
  } else {
    issues.push('Unsupported fixture status.');
  }
  if ([fixture.yellowCards, fixture.redCards].some((value) => value !== null && !count(value))) {
    issues.push('Discipline must be a nonnegative integer or unknown.');
  }
  if (fixture.yellowCardReports && (fixture.status !== 'played' || fixture.yellowCards !== null || !count(fixture.redCards) ||
      !quarterfinalReportsHaveDistinctSources(fixture.yellowCardReports) || fixture.yellowCardReports.some((report) => !count(report.count) ||
        !['listed-events', 'reported-total'].includes(report.kind) || !/^https?:\/\//.test(report.sourceUrl)))) {
    issues.push('Reported discipline scenarios require unknown yellows, known reds and at least two distinct sourced reports without duplicates.');
  }
  return issues;
}

export function quarterfinalFantasyScore(clubId: string, fixture: QuarterfinalFixture) {
  if (fixture.status !== 'played' || fixture.goalsFor == null || fixture.goalsAgainst == null) return null;
  return computeFantasyScore({
    ...fixture, id: `QF-${fixture.eventId ?? fixture.sourceDate}`, clubId, roundId: 'KO-QF',
    windowStart: QUARTERFINAL_WINDOW.start, windowEnd: QUARTERFINAL_WINDOW.end,
    goalsFor: fixture.goalsFor, goalsAgainst: fixture.goalsAgainst, counted: true,
  });
}

export function buildQuarterfinalClubTotal(club: QuarterfinalClubPlan, used: ReadonlySet<number> = new Set()) {
  const slots = selectQuarterfinalFixtures(club.fixtures, used, club);
  const played = slots.filter((fixture): fixture is QuarterfinalFixture => fixture?.status === 'played');
  const scores = played.map((fixture) => quarterfinalFantasyScore(club.clubId, fixture)).filter((score) => score != null);
  const disciplinePending = played.some((fixture) => fixture.yellowCards == null || fixture.redCards == null);
  const perMatchReports = played.map((fixture) => {
    if (fixture.redCards == null) return null;
    const yellows = fixture.yellowCards != null ? [fixture.yellowCards] : fixture.yellowCardReports?.map((report) => report.count);
    if (!yellows?.length || quarterfinalFixtureIssues(fixture, '9999-12-31', club).length) return null;
    return yellows.map((yellowCards) => quarterfinalFantasyScore(club.clubId, { ...fixture, yellowCards })?.total ?? null);
  });
  const reportedTotals = scores.length === 2 && perMatchReports.every((reports) => reports && reports.every((score) => score != null))
    ? [...new Set(perMatchReports[0]!.flatMap((a) => perMatchReports[1]!.map((b) => a! + b!)))].sort((a, b) => a - b)
    : null;
  return {
    slots,
    total: scores.length ? scores.reduce((sum, score) => sum + score.total, 0) : null,
    played: scores.length,
    missingSlots: slots.filter((fixture) => fixture == null).length,
    disciplinePending,
    reportedTotals,
    kind: scores.length === 0 ? 'pending' : scores.length < 2 ? 'partial' : disciplinePending ? 'upper-bound' : 'verified',
  } as const;
}

/** Missing matches are unbounded; unknown cards only bound two played matches. */
export function resolveQuarterfinalResult(
  clubA: QuarterfinalClubPlan | undefined,
  clubB: QuarterfinalClubPlan | undefined,
  used: ReadonlySet<number> = new Set(),
): { winnerClubId: string | null; basis: 'verified-total' | 'reported-discipline-scenarios' | null } {
  const unresolved = { winnerClubId: null, basis: null };
  if (!clubA || !clubB) return unresolved;
  const a = buildQuarterfinalClubTotal(clubA, used);
  const b = buildQuarterfinalClubTotal(clubB, used);
  if (a.played !== 2 || b.played !== 2 || a.total == null || b.total == null) return unresolved;
  if (a.kind === 'verified' && a.total > b.total) return { winnerClubId: clubA.clubId, basis: 'verified-total' };
  if (b.kind === 'verified' && b.total > a.total) return { winnerClubId: clubB.clubId, basis: 'verified-total' };
  // These are reported scenarios, not bounds on every possible future acta.
  if (a.reportedTotals && b.reportedTotals) {
    if (Math.min(...a.reportedTotals) > Math.max(...b.reportedTotals)) return { winnerClubId: clubA.clubId, basis: 'reported-discipline-scenarios' };
    if (Math.min(...b.reportedTotals) > Math.max(...a.reportedTotals)) return { winnerClubId: clubB.clubId, basis: 'reported-discipline-scenarios' };
  }
  // Equal totals and overlapping discipline bounds do not authorize a winner.
  return unresolved;
}

export function resolveQuarterfinalWinner(clubA: QuarterfinalClubPlan | undefined, clubB: QuarterfinalClubPlan | undefined, used: ReadonlySet<number> = new Set()): string | null {
  return resolveQuarterfinalResult(clubA, clubB, used).winnerClubId;
}

function parseDate(value: string): number {
  return new Date(value).getTime();
}

export function selectCountedMatch(
  candidates: OfficialMatchSource[],
  windowStart: string,
  windowEnd: string,
  extensionDays = 3
): SelectCountedMatchResult {
  const startTs = parseDate(windowStart);
  const endTs = parseDate(windowEnd);
  const extensionEndTs = endTs + extensionDays * 24 * 60 * 60 * 1000;

  const valid = [...candidates]
    .filter((m) => m.counted)
    .filter((m) => OFFICIAL_COMPETITIONS.has(m.sourceCompetitionType))
    .sort((a, b) => parseDate(a.sourceDate) - parseDate(b.sourceDate));

  const inBaseWindow = valid.find((m) => {
    const ts = parseDate(m.sourceDate);
    return ts >= startTs && ts <= endTs;
  });

  if (inBaseWindow) return { policy: 'base-window', match: inBaseWindow };

  const inExtendedWindow = valid.find((m) => {
    const ts = parseDate(m.sourceDate);
    return ts > endTs && ts <= extensionEndTs;
  });

  if (inExtendedWindow) {
    return { policy: 'extended-window', match: inExtendedWindow };
  }

  return { policy: 'no-match', match: null };
}

// Qualification can be settled by an upper bound while discipline remains unknown.
export function getRoundOf16Status(ties: Array<{
  winnerClubId?: string | null;
  slotA: { clubId: string | null };
  slotB: { clubId: string | null };
}>, playedCount: number): 'planned' | 'in-progress' | 'completed' {
  const resolved = ties.filter((tie) => tie.winnerClubId &&
    [tie.slotA.clubId, tie.slotB.clubId].includes(tie.winnerClubId)).length;
  if (ties.length === 8 && resolved === 8) return 'completed';
  return playedCount > 0 || resolved > 0 ? 'in-progress' : 'planned';
}

export function computeFantasyScore(match: OfficialMatchSource): Omit<FantasyScoreResult, 'sourceMatchId'> {
  let basePoints = 0;
  let bonusPoints = 0;
  let penaltyPoints = 0;

  const isWin = match.goalsFor > match.goalsAgainst;
  const isDraw = match.goalsFor === match.goalsAgainst;
  const isLoss = match.goalsFor < match.goalsAgainst;

  if (isWin) basePoints = 3;
  if (isDraw) basePoints = 1;

  if (isWin) bonusPoints += Math.max(0, (match.goalsFor - match.goalsAgainst) - 1);
  if (match.goalsAgainst === 0) bonusPoints += 1;
  if (isLoss && match.goalsAgainst - match.goalsFor >= 3) penaltyPoints -= 1;
  penaltyPoints -= (match.yellowCards ?? 0) * 0.25;
  penaltyPoints -= (match.redCards ?? 0) * 1;

  const total = basePoints + bonusPoints + penaltyPoints;
  const explanation = `base=${basePoints} bonus=${bonusPoints} penalty=${penaltyPoints}`;

  return {
    clubId: match.clubId,
    roundId: match.roundId,
    basePoints,
    bonusPoints,
    penaltyPoints,
    total,
    explanation,
  };
}

export function buildFantasyByClub(roundWindows: RoundWindowData[]): Map<string, FantasyClubTotals> {
  const fantasyByClub = new Map<string, FantasyClubTotals>();

  for (const rw of roundWindows) {
    for (const fs of rw.fantasyScores || []) {
      const prev = fantasyByClub.get(fs.clubId) || {
        played: 0,
        base: 0,
        bonus: 0,
        penalty: 0,
        total: 0,
      };
      prev.played += 1;
      prev.base += fs.basePoints;
      prev.bonus += fs.bonusPoints;
      prev.penalty += fs.penaltyPoints;
      prev.total += fs.total;
      fantasyByClub.set(fs.clubId, prev);
    }
  }

  return fantasyByClub;
}

export function buildFantasyStandingsByGroup<TClubMeta extends Record<string, unknown>>(
  groups: ConferenceGroupDefinition[],
  fantasyByClub: Map<string, FantasyClubTotals>,
  getClubMeta: (clubId: string) => TClubMeta
): Map<string, Array<TClubMeta & { clubId: string } & FantasyClubTotals>> {
  const standingsByGroup = new Map<string, Array<TClubMeta & { clubId: string } & FantasyClubTotals>>();

  for (const group of groups) {
    const rows = group.clubIds.map((clubId) => {
      const totals = fantasyByClub.get(clubId) || {
        played: 0,
        base: 0,
        bonus: 0,
        penalty: 0,
        total: 0,
      };

      return {
        ...getClubMeta(clubId),
        clubId,
        ...totals,
      };
    });

    rows.sort((a, b) => b.total - a.total || b.bonus - a.bonus || b.base - a.base);
    standingsByGroup.set(group.group, rows);
  }

  return standingsByGroup;
}

export function buildRoundScoreMap(roundWindows: RoundWindowData[]): Map<string, Map<string, FantasyScoreResult>> {
  const roundScoreMap = new Map<string, Map<string, FantasyScoreResult>>();

  for (const rw of roundWindows) {
    const scoresByClub = new Map<string, FantasyScoreResult>();
    for (const fs of rw.fantasyScores || []) {
      scoresByClub.set(fs.clubId, fs);
    }
    roundScoreMap.set(rw.roundId, scoresByClub);
  }

  return roundScoreMap;
}

export function buildMatchSourceMap(roundWindows: RoundWindowData[]): Map<string, Map<string, OfficialMatchSource[]>> {
  const matchSourceMap = new Map<string, Map<string, OfficialMatchSource[]>>();

  for (const rw of roundWindows) {
    const matchSourcesByClub = new Map<string, OfficialMatchSource[]>();
    for (const ms of rw.windowMatchSources || []) {
      if (!matchSourcesByClub.has(ms.clubId)) matchSourcesByClub.set(ms.clubId, []);
      matchSourcesByClub.get(ms.clubId)!.push(ms);
    }
    matchSourceMap.set(rw.roundId, matchSourcesByClub);
  }

  return matchSourceMap;
}

export function buildWindowCutRanking<T extends WindowCutEntry>(entries: T[]): T[] {
  return [...entries]
    .filter((entry) => entry.status === 'ok')
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if ((b.gd ?? -999) !== (a.gd ?? -999)) return (b.gd ?? -999) - (a.gd ?? -999);
      if ((b.gf ?? -999) !== (a.gf ?? -999)) return (b.gf ?? -999) - (a.gf ?? -999);
      return String(a.sourceDate || '').localeCompare(String(b.sourceDate || ''));
    });
}

export function buildWindowCutFantasyBreakdown(entry: WindowCutEntry): WindowCutFantasyBreakdown {
  if (entry.status !== 'ok') {
    return { base: 0, bonus: 0, penalty: 0, total: 0, text: 'Sin partido oficial (no-match) ⇒ 0' };
  }

  const goalsFor = Number(entry.goalsFor ?? 0);
  const goalsAgainst = Number(entry.goalsAgainst ?? 0);
  const isWin = goalsFor > goalsAgainst;
  const isDraw = goalsFor === goalsAgainst;
  const isLoss = goalsFor < goalsAgainst;
  const base = isWin ? 3 : isDraw ? 1 : 0;
  const cleanSheet = goalsAgainst === 0 ? 1 : 0;
  const margin = isWin ? Math.max(0, (goalsFor - goalsAgainst) - 1) : 0;
  const bonus = cleanSheet + margin;
  const wideLoss = isLoss && goalsAgainst - goalsFor >= 3 ? -1 : 0;
  const yellowPenalty = -(Number(entry.yellowCards ?? 0) * 0.25);
  const redPenalty = -(Number(entry.redCards ?? 0));
  const penalty = wideLoss + yellowPenalty + redPenalty;
  const total = base + bonus + penalty;
  const chunks: string[] = [`base ${base} (${isWin ? 'victoria' : isDraw ? 'empate' : 'derrota'})`];
  if (cleanSheet) chunks.push('+1 arco en cero');
  if (margin) chunks.push(`+${margin} margen`);
  if (wideLoss) chunks.push('-1 derrota amplia');
  if (yellowPenalty < 0) chunks.push(`${yellowPenalty} amarillas`);
  if (redPenalty < 0) chunks.push(`${redPenalty} rojas`);
  chunks.push(`= ${total}`);

  return { base, bonus, penalty, total, text: chunks.join(' · ') };
}

export function getWindowCutCardDeductions(entry?: Pick<WindowCutEntry, 'yellowCards' | 'redCards'> | null): number | null {
  if (!entry) return null;
  if (entry.yellowCards === undefined || entry.yellowCards === null) return null;
  if (entry.redCards === undefined || entry.redCards === null) return null;
  return (entry.yellowCards * 0.25) + (entry.redCards * 1);
}

export function buildWindowCutWithFantasy<T extends WindowCutEntry>(entries: T[]): Array<T & { fantasy: WindowCutFantasyBreakdown }> {
  return entries.map((entry) => ({
    ...entry,
    fantasy: buildWindowCutFantasyBreakdown(entry),
  }));
}

export function buildTieResolutionDetail(
  clubA?: WindowCutEntry | null,
  clubB?: WindowCutEntry | null
): string {
  if (!clubA || !clubB) return 'Sin datos de ventana';
  if (clubA.total !== clubB.total) return 'Desempate: total fantasy';
  const deductA = getWindowCutCardDeductions(clubA);
  const deductB = getWindowCutCardDeductions(clubB);
  if (deductA !== null && deductB !== null && deductA !== deductB) return 'Desempate: menos tarjetas';
  if ((clubA.gf ?? -999) !== (clubB.gf ?? -999)) return 'Desempate: goles marcados';
  const awayA = clubA.homeAway === 'away';
  const awayB = clubB.homeAway === 'away';
  if (awayA !== awayB) return 'Desempate: condición visita';
  return 'Desempate: criterio administrativo';
}

export function buildWindowCutReviewBuckets<T extends WindowCutEntry>(entries: T[]) {
  return {
    noMatch: entries.filter((entry) => entry.status === 'no-match'),
    nonEspn: entries.filter((entry) => entry.status === 'ok' && entry.sourceUrl && !String(entry.sourceUrl).includes('espn.com')),
    missingCards: entries.filter(
      (entry) =>
        entry.status === 'ok' &&
        (entry.yellowCards === null || entry.yellowCards === undefined || entry.redCards === null || entry.redCards === undefined)
    ),
  };
}

function cardDeductions(entry: Pick<KnockoutTieInput, 'yellowCards' | 'redCards'>): number | null {
  if (entry.yellowCards === undefined || entry.yellowCards === null) return null;
  if (entry.redCards === undefined || entry.redCards === null) return null;
  return (entry.yellowCards * 0.25) + (entry.redCards * 1);
}

export function resolveKnockoutTie(
  clubA: KnockoutTieInput,
  clubB: KnockoutTieInput
): KnockoutTieResult {
  if (clubA.total !== clubB.total) {
    return {
      winnerClubId: clubA.total > clubB.total ? clubA.clubId : clubB.clubId,
      tiebreakReason: 'fantasy-total',
    };
  }

  const deductA = cardDeductions(clubA);
  const deductB = cardDeductions(clubB);
  if (deductA !== null && deductB !== null && deductA !== deductB) {
    return {
      winnerClubId: deductA < deductB ? clubA.clubId : clubB.clubId,
      tiebreakReason: 'card-deductions',
    };
  }

  if (clubA.goalsFor !== clubB.goalsFor) {
    return {
      winnerClubId: clubA.goalsFor > clubB.goalsFor ? clubA.clubId : clubB.clubId,
      tiebreakReason: 'goals-for',
    };
  }

  const awayA = clubA.playedAway ?? false;
  const awayB = clubB.playedAway ?? false;
  if (awayA !== awayB) {
    return {
      winnerClubId: awayA ? clubA.clubId : clubB.clubId,
      tiebreakReason: 'away-condition',
    };
  }

  const rankA = clubA.conmebolRank ?? null;
  const rankB = clubB.conmebolRank ?? null;
  if (rankA !== null && rankB !== null && rankA !== rankB) {
    return {
      winnerClubId: rankA < rankB ? clubA.clubId : clubB.clubId,
      tiebreakReason: 'conmebol-rank',
    };
  }

  return {
    winnerClubId: [clubA.clubId, clubB.clubId].sort()[0],
    tiebreakReason: 'administrative-draw',
  };
}

export function rankGroupStandings(entries: GroupStandingEntry[]): GroupStandingEntry[] {
  return [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.fantasyDiff !== a.fantasyDiff) return b.fantasyDiff - a.fantasyDiff;
    if (b.wins !== a.wins) return b.wins - a.wins;

    const goalDiffA = a.goalsFor - a.goalsAgainst;
    const goalDiffB = b.goalsFor - b.goalsAgainst;
    if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;

    return a.clubId.localeCompare(b.clubId);
  });
}
