import type { ConferenceEntryType, OfficialMatchSource } from '../tournaments/conference-league-sudamericana';

export interface TournamentFileInput {
  path: string;
  matches: Array<Record<string, unknown>>;
}

export interface ConferenceClubSeed {
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

export interface ConferenceClubsDocument {
  kind: 'clubs';
  edition: number;
  seeds: ConferenceClubSeed[];
}

export interface ConferencePreliminaryTie {
  id: string;
  clubAId: string;
  clubBId: string;
  winnerClubId: string;
  scoreA: number;
  scoreB: number;
  resolvedBy: 'fantasy-score' | 'card-deductions' | 'goals-for' | 'away-condition' | 'conmebol-rank' | 'administrative';
}

export interface ConferenceStageDocument {
  kind: 'stage';
  edition: number;
  directQualifiedIds: string[];
  preliminaryPot1Ids: string[];
  preliminaryPot2Ids: string[];
  preliminaryTies: ConferencePreliminaryTie[];
  mainStageQualifiedIds: string[];
}

export interface ConferenceRoundWindow {
  roundId: string;
  windowStart: string;
  windowEnd: string;
  extendedWindowEnd: string;
  windowMatchSources: OfficialMatchSource[];
  fantasyScores: Array<{
    clubId: string;
    roundId: string;
    sourceMatchId: string;
    basePoints: number;
    bonusPoints: number;
    penaltyPoints: number;
    total: number;
    explanation: string;
  }>;
}

export interface ConferenceGroupsDocument {
  kind: 'groups';
  edition: number;
  groups: Array<{
    group: string;
    clubIds: string[];
  }>;
  roundWindows: ConferenceRoundWindow[];
  standings?: Array<Record<string, unknown>>;
}

export interface ConferenceWindowCutDocument {
  kind: 'window-cut';
  edition: number;
  label: string;
  windowStart: string;
  windowEnd: string;
  entries: Array<{
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
  }>;
}

function isAscendingByDate(matches: Array<Record<string, unknown>>): boolean {
  for (let i = 1; i < matches.length; i += 1) {
    const previousTs = new Date(String(matches[i - 1].date)).getTime();
    const currentTs = new Date(String(matches[i].date)).getTime();
    if (currentTs < previousTs) return false;
  }
  return true;
}

function ensureClubId(
  issues: string[],
  path: string,
  index: number,
  key: 'holderId' | 'challengerId' | 'newHolderId',
  value: unknown,
  validClubIds: Set<string>
) {
  if (!value) return;
  if (!validClubIds.has(String(value))) {
    issues.push(`${path}#${index}: ${key}=${value} no existe en clubs`);
  }
}

export function validateTournamentIntegrity(
  files: TournamentFileInput[],
  validClubIds: Set<string>
): string[] {
  const issues: string[] = [];

  for (const file of files) {
    if (!isAscendingByDate(file.matches)) {
      issues.push(`${file.path}: partidos no están ordenados por fecha ascendente`);
    }

    file.matches.forEach((match, index) => {
      ensureClubId(issues, file.path, index, 'holderId', match.holderId, validClubIds);
      ensureClubId(issues, file.path, index, 'challengerId', match.challengerId, validClubIds);
      ensureClubId(issues, file.path, index, 'newHolderId', match.newHolderId, validClubIds);

      const isPending = match.status === 'pending';
      const isMatch = match.type === 'match';

      if (isPending) {
        if (match.scoreHolder !== undefined || match.scoreChallenger !== undefined || match.newHolderId !== undefined) {
          issues.push(`${file.path}#${index}: pending no debería tener score/newHolderId`);
        }
      } else if (isMatch) {
        if (match.scoreHolder === undefined || match.scoreChallenger === undefined || match.newHolderId === undefined) {
          issues.push(`${file.path}#${index}: match jugado incompleto (faltan score o newHolderId)`);
        }
      }

      if (isMatch && match.newHolderId !== undefined) {
        const holder = String(match.holderId ?? '');
        const challenger = String(match.challengerId ?? '');
        const newHolder = String(match.newHolderId);
        if (newHolder !== holder && newHolder !== challenger) {
          issues.push(`${file.path}#${index}: newHolderId=${newHolder} no coincide con holder/challenger`);
        }
      }
    });
  }

  return issues;
}

function setEquals(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

export function validateConferenceIntegrity(
  clubsDoc: ConferenceClubsDocument,
  stageDoc: ConferenceStageDocument,
  groupsDoc: ConferenceGroupsDocument,
  windowCutDoc?: ConferenceWindowCutDocument | null
): string[] {
  const issues: string[] = [];

  const clubIds = clubsDoc.seeds.map((seed) => seed.clubId);
  const clubSet = new Set(clubIds);

  if (clubsDoc.seeds.length !== 53) {
    issues.push(`conference/clubs: se esperaban 53 participantes, hay ${clubsDoc.seeds.length}`);
  }

  if (clubSet.size !== clubsDoc.seeds.length) {
    issues.push('conference/clubs: hay clubId duplicados en la nómina de participantes');
  }

  if (stageDoc.directQualifiedIds.length !== 11) {
    issues.push(`conference/stage: directQualifiedIds debe tener 11 clubes (hay ${stageDoc.directQualifiedIds.length})`);
  }

  if (stageDoc.preliminaryTies.length !== 21) {
    issues.push(`conference/stage: preliminaryTies debe tener 21 llaves (hay ${stageDoc.preliminaryTies.length})`);
  }

  if (stageDoc.preliminaryPot1Ids.length !== 21) {
    issues.push(`conference/stage: preliminaryPot1Ids debe tener 21 clubes (hay ${stageDoc.preliminaryPot1Ids.length})`);
  }

  if (stageDoc.preliminaryPot2Ids.length !== 21) {
    issues.push(`conference/stage: preliminaryPot2Ids debe tener 21 clubes (hay ${stageDoc.preliminaryPot2Ids.length})`);
  }

  if (stageDoc.mainStageQualifiedIds.length !== 32) {
    issues.push(`conference/stage: mainStageQualifiedIds debe tener 32 clubes (hay ${stageDoc.mainStageQualifiedIds.length})`);
  }

  const stageIds = new Set<string>([
    ...stageDoc.directQualifiedIds,
    ...stageDoc.preliminaryTies.map((tie) => tie.clubAId),
    ...stageDoc.preliminaryTies.map((tie) => tie.clubBId),
    ...stageDoc.preliminaryTies.map((tie) => tie.winnerClubId),
    ...stageDoc.mainStageQualifiedIds,
  ]);

  for (const id of stageIds) {
    if (!clubSet.has(id)) {
      issues.push(`conference/stage: clubId ${id} no existe en el padrón de 53 clubes`);
    }
  }

  const derivedMainStage = new Set([
    ...stageDoc.directQualifiedIds,
    ...stageDoc.preliminaryTies.map((tie) => tie.winnerClubId),
  ]);
  const declaredMainStage = new Set(stageDoc.mainStageQualifiedIds);

  if (!setEquals(derivedMainStage, declaredMainStage)) {
    issues.push('conference/stage: transición 53→32 inconsistente entre directos+ganadores y mainStageQualifiedIds');
  }

  const pot1Set = new Set(stageDoc.preliminaryPot1Ids);
  const pot2Set = new Set(stageDoc.preliminaryPot2Ids);
  const tiedClubSet = new Set(
    stageDoc.preliminaryTies.flatMap((tie) => [tie.clubAId, tie.clubBId])
  );

  for (const id of pot1Set) {
    if (pot2Set.has(id)) {
      issues.push(`conference/stage: club ${id} aparece en ambos bombos de previa`);
    }
  }

  for (const id of [...pot1Set, ...pot2Set]) {
    if (stageDoc.directQualifiedIds.includes(id)) {
      issues.push(`conference/stage: club ${id} está en bombos de previa y también clasificado directo`);
    }
  }

  if (!setEquals(new Set([...pot1Set, ...pot2Set]), tiedClubSet)) {
    issues.push('conference/stage: bombos de previa y clubes de llaves no coinciden');
  }

  if (windowCutDoc) {
    if (windowCutDoc.entries.length !== 42) {
      issues.push(`conference/window-cut: entries debe tener 42 clubes (hay ${windowCutDoc.entries.length})`);
    }

    const seen = new Set<string>();
    for (const entry of windowCutDoc.entries) {
      if (seen.has(entry.clubId)) {
        issues.push(`conference/window-cut: clubId duplicado en entries (${entry.clubId})`);
      }
      seen.add(entry.clubId);

      if (!clubSet.has(entry.clubId)) {
        issues.push(`conference/window-cut: clubId inexistente en padrón (${entry.clubId})`);
      }

      if (!tiedClubSet.has(entry.clubId)) {
        issues.push(`conference/window-cut: club ${entry.clubId} no pertenece a la fase previa`);
      }

      const expectedPot = pot1Set.has(entry.clubId) ? 'Bombo 1' : 'Bombo 2';
      if (entry.pot !== expectedPot) {
        issues.push(`conference/window-cut: club ${entry.clubId} tiene pot=${entry.pot} pero esperaba ${expectedPot}`);
      }

      if (entry.status === 'ok') {
        if (!entry.sourceDate || !entry.competition || !entry.opponent || !entry.homeAway) {
          issues.push(`conference/window-cut: status=ok incompleto para ${entry.clubId}`);
        }
      }

      if (entry.status === 'no-match' && entry.total !== 0) {
        issues.push(`conference/window-cut: status=no-match debe tener total=0 (${entry.clubId})`);
      }
    }
  }

  const groupedClubIds = groupsDoc.groups.flatMap((group) => group.clubIds);
  const groupedSet = new Set(groupedClubIds);

  for (const id of groupedSet) {
    if (!declaredMainStage.has(id)) {
      issues.push(`conference/groups: club ${id} aparece en grupos pero no clasificó a fase principal`);
    }
  }

  groupsDoc.roundWindows.forEach((roundWindow) => {
    const sourceIds = new Set(roundWindow.windowMatchSources.map((source) => source.id));

    roundWindow.windowMatchSources.forEach((source) => {
      if (!clubSet.has(source.clubId)) {
        issues.push(`conference/groups:${roundWindow.roundId} source ${source.id} usa clubId inexistente (${source.clubId})`);
      }
    });

    roundWindow.fantasyScores.forEach((score) => {
      if (!clubSet.has(score.clubId)) {
        issues.push(`conference/groups:${roundWindow.roundId} fantasy score usa clubId inexistente (${score.clubId})`);
      }
      if (!sourceIds.has(score.sourceMatchId)) {
        issues.push(`conference/groups:${roundWindow.roundId} fantasy score de ${score.clubId} no tiene sourceMatchId trazable (${score.sourceMatchId})`);
      }
    });
  });

  return issues;
}
