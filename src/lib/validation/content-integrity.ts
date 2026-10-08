import type { ConferenceEntryType, OfficialMatchSource } from '../tournaments/conference-league-sudamericana';
import {
  QUARTERFINAL_WINDOW,
  quarterfinalLocalDate,
  quarterfinalParticipantIssue,
  selectQuarterfinalFixtures,
  type QuarterfinalClubPlan,
} from '../tournaments/conference-league-sudamericana';

export interface QuarterfinalWindowDocument {
  kind: 'qf-window';
  edition: number;
  roundId: string;
  status: string;
  windowStart: string;
  windowEnd: string;
  selectionPolicy: string;
  clubs: QuarterfinalClubPlan[];
}

export interface KnockoutDocument {
  rounds: Array<{
    id: string;
    status: string;
    ties: Array<{
      id: string;
      slotA: { sourceRef: string; clubId: string | null };
      slotB: { sourceRef: string; clubId: string | null };
      winnerClubId?: string | null;
      tiebreakReason?: string;
      scoreA?: number;
      scoreB?: number;
    }>;
  }>;
}

export function validateQuarterfinalIntegrity(
  window: QuarterfinalWindowDocument,
  knockout: KnockoutDocument,
  r16Sources: Array<{ sourceUrl?: string }>,
): string[] {
  const issues: string[] = [];
  const report = (message: string) => issues.push(`conference/qf-window: ${message}`);
  if (window.edition !== 2026 || window.roundId !== 'KO-QF' || window.status !== 'planned' ||
      window.windowStart !== QUARTERFINAL_WINDOW.start || window.windowEnd !== QUARTERFINAL_WINDOW.end ||
      window.selectionPolicy !== 'first-two-official-local-dates') report('Unauthorized planning window or policy.');
  const r16 = knockout.rounds.find((round) => round.id === 'KO-R16');
  const qf = knockout.rounds.find((round) => round.id === 'KO-QF');
  if (!r16 || !qf) return [...issues, 'conference/qf-window: Missing R16 or QF bracket.'];
  if (qf.status !== 'planned') report('Quarterfinals must remain planned.');
  const fixedSources = new Map<string, [string, string]>([
    ['QF-1', ['R16-1', 'R16-2']],
    ['QF-2', ['R16-3', 'R16-4']],
    ['QF-3', ['R16-5', 'R16-6']],
    ['QF-4', ['R16-7', 'R16-8']],
  ]);
  if (qf.ties.length !== 4) report(`Fixed bracket requires exactly four QF ties; found ${qf.ties.length}.`);
  for (const id of fixedSources.keys()) {
    const count = qf.ties.filter((tie) => tie.id === id).length;
    if (count !== 1) report(`Fixed bracket requires exactly one ${id}; found ${count}.`);
  }
  const used = new Set(r16Sources.map((source) => Number(source.sourceUrl?.match(/#id:(\d+)/)?.[1])));
  if (new Set(window.clubs.map((club) => club.clubId)).size !== window.clubs.length) report('Duplicate club plan.');
  for (const tie of qf.ties) {
    const expectedSources = fixedSources.get(tie.id);
    if (!expectedSources) {
      report(`${tie.id}: Unknown QF tie; expected QF-1 through QF-4.`);
    } else if (tie.slotA.sourceRef !== expectedSources[0] || tie.slotB.sourceRef !== expectedSources[1]) {
      report(`${tie.id}: Fixed bracket requires slotA=${expectedSources[0]}, slotB=${expectedSources[1]}.`);
    }
    if (tie.winnerClubId || tie.scoreA !== undefined || tie.scoreB !== undefined) report(`${tie.id}: Future result.`);
    for (const slot of [tie.slotA, tie.slotB]) {
      const source = r16.ties.find((source) => source.id === slot.sourceRef);
      if (!source || slot.clubId !== (source.winnerClubId ?? null)) report(`${tie.id}: Inconsistent source winner.`);
      const expected = source?.winnerClubId ? [source.winnerClubId] : [source?.slotA.clubId, source?.slotB.clubId];
      for (const clubId of expected) {
        if (!window.clubs.some((club) => club.clubId === clubId && club.tieId === tie.id && club.sourceRef === slot.sourceRef)) {
          report(`${tie.id}: Missing plan for ${clubId}.`);
        }
      }
    }
  }
  for (const club of window.clubs) {
    const source = r16.ties.find((tie) => tie.id === club.sourceRef);
    const target = qf.ties.find((tie) => tie.id === club.tieId);
    const slot = target && [target.slotA, target.slotB].find((slot) => slot.sourceRef === club.sourceRef);
    const confirmed = club.qualification === 'confirmed';
    if (!source || !slot || (confirmed
      ? source.winnerClubId !== club.clubId || slot.clubId !== club.clubId
      : !!source.winnerClubId || slot.clubId !== null || ![source.slotA.clubId, source.slotB.clubId].includes(club.clubId))) {
      report(`${club.clubId}: Invalid qualification or conditional activation.`);
    }
    try {
      const selected = selectQuarterfinalFixtures(club.fixtures, used).filter(Boolean);
      if (JSON.stringify(selected) !== JSON.stringify(club.fixtures)) report(`${club.clubId}: Invalid first-two selection.`);
      for (const fixture of club.fixtures) {
        const participantIssue = quarterfinalParticipantIssue(club.clubId, fixture);
        if (participantIssue) report(participantIssue);
        if (fixture.sourceDate !== quarterfinalLocalDate(fixture) || !fixture.sourceUrl.endsWith(`#id:${fixture.eventId}`)) {
          report(`${club.clubId}: Invalid local date or event provenance.`);
        }
        if ([fixture.goalsFor, fixture.goalsAgainst, fixture.yellowCards, fixture.redCards].some((value) => value !== null)) {
          report(`${club.clubId}: Future result or discipline must remain null.`);
        }
      }
    } catch {
      report(`${club.clubId}: Invalid fixture data.`);
    }
  }
  return issues;
}

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
