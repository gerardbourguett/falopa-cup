import { describe, expect, it } from 'vitest';
import {
  validateConferenceIntegrity,
  validateTournamentIntegrity,
  type ConferenceClubsDocument,
  type ConferenceGroupsDocument,
  type ConferenceStageDocument,
  type ConferenceWindowCutDocument,
} from './content-integrity';

describe('validateTournamentIntegrity', () => {
  it('flags invalid club ids and pending matches with score', () => {
    const issues = validateTournamentIntegrity([
      {
        path: 'falopa/2026.json',
        matches: [
          { type: 'match', date: '2026-01-01', holderId: 'a', challengerId: 'missing', scoreHolder: 1, scoreChallenger: 0, newHolderId: 'a' },
          { type: 'match', status: 'pending', date: '2026-01-02', holderId: 'a', challengerId: 'b', scoreHolder: 0 },
        ],
      },
    ], new Set(['a', 'b']));

    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});

describe('validateConferenceIntegrity', () => {
  const mkClubs = (): ConferenceClubsDocument => ({
    kind: 'clubs',
    edition: 2026,
    seeds: Array.from({ length: 53 }).map((_, i) => ({
      clubId: `c${i + 1}`,
      name: `Club ${i + 1}`,
      country: 'CL',
      entryType: i < 26 ? 'base' : 'libertadores-f1',
      conmebolRank: i + 1,
      conmebolCoefficient: i + 1,
      coefficientLabel: `${i + 1}.0`,
      directToMainStage: i < 11,
      allocationCategory: i < 11 ? 'league-direct' : i < 32 ? 'preliminary-pot-1' : 'preliminary-pot-2',
      pot: i < 16 ? 1 : 2,
    })),
  });

  const mkStage = (): ConferenceStageDocument => ({
    kind: 'stage',
    edition: 2026,
    directQualifiedIds: Array.from({ length: 11 }).map((_, i) => `c${i + 1}`),
    preliminaryPot1Ids: Array.from({ length: 21 }).map((_, i) => `c${12 + i * 2}`),
    preliminaryPot2Ids: Array.from({ length: 21 }).map((_, i) => `c${13 + i * 2}`),
    preliminaryTies: Array.from({ length: 21 }).map((_, i) => ({
      id: `PT-${String(i + 1).padStart(2, '0')}`,
      clubAId: `c${12 + i * 2}`,
      clubBId: `c${13 + i * 2}`,
      winnerClubId: `c${12 + i * 2}`,
      scoreA: 3,
      scoreB: 1,
      resolvedBy: 'fantasy-score',
    })),
    mainStageQualifiedIds: [
      ...Array.from({ length: 11 }).map((_, i) => `c${i + 1}`),
      ...Array.from({ length: 21 }).map((_, i) => `c${12 + i * 2}`),
    ],
  });

  const mkGroups = (): ConferenceGroupsDocument => ({
    kind: 'groups',
    edition: 2026,
    groups: [
      { group: 'A', clubIds: ['c1', 'c2', 'c3', 'c4'] },
    ],
    roundWindows: [
      {
        roundId: 'GS-R1',
        windowStart: '2026-04-01',
        windowEnd: '2026-04-14',
        extendedWindowEnd: '2026-04-17',
        windowMatchSources: [
          {
            id: 'src-1',
            clubId: 'c1',
            roundId: 'GS-R1',
            windowStart: '2026-04-01',
            windowEnd: '2026-04-14',
            sourceCompetitionType: 'local-league',
            sourceCompetition: 'Liga',
            sourceDate: '2026-04-02',
            homeClub: 'Club 1',
            awayClub: 'Club X',
            goalsFor: 2,
            goalsAgainst: 0,
            isHome: true,
            counted: true,
          },
        ],
        fantasyScores: [
          {
            clubId: 'c1',
            roundId: 'GS-R1',
            sourceMatchId: 'src-1',
            basePoints: 3,
            bonusPoints: 1,
            penaltyPoints: 0,
            total: 4,
            explanation: 'ok',
          },
        ],
      },
    ],
  });

  const mkWindowCut = (): ConferenceWindowCutDocument => ({
    kind: 'window-cut',
    edition: 2026,
    label: 'cut',
    windowStart: '2026-03-10',
    windowEnd: '2026-04-05',
    entries: Array.from({ length: 21 }).flatMap((_, i) => ([
      {
        clubId: `c${12 + i * 2}`,
        pot: 'Bombo 1',
        status: 'ok',
        total: 3,
        gd: 1,
        gf: 2,
        sourceDate: '2026-03-20',
        competition: 'Liga',
        opponent: 'X',
        homeAway: 'home',
        goalsFor: 2,
        goalsAgainst: 1,
        sourceUrl: 'https://example.com/match',
      },
      {
        clubId: `c${13 + i * 2}`,
        pot: 'Bombo 2',
        status: 'no-match',
        total: 0,
      },
    ])),
  });

  it('accepts valid 53->32 transition and score traceability', () => {
    const issues = validateConferenceIntegrity(mkClubs(), mkStage(), mkGroups(), mkWindowCut());
    expect(issues).toEqual([]);
  });

  it('flags broken main stage transition', () => {
    const clubs = mkClubs();
    const stage = mkStage();
    const groups = mkGroups();
    stage.mainStageQualifiedIds = stage.mainStageQualifiedIds.slice(0, 31);

    const issues = validateConferenceIntegrity(clubs, stage, groups);
    expect(issues.some((i) => i.includes('32'))).toBe(true);
  });

  it('flags inconsistent window-cut pot assignment', () => {
    const windowCut = mkWindowCut();
    windowCut.entries[0].pot = 'Bombo 2';
    const issues = validateConferenceIntegrity(mkClubs(), mkStage(), mkGroups(), windowCut);
    expect(issues.some((i) => i.includes('window-cut'))).toBe(true);
  });
});
