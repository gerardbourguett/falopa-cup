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
