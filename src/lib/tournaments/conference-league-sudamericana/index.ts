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
