import { describe, expect, it, vi } from 'vitest';
import type { z } from 'astro/zod';
import {
  buildFantasyByClub,
  buildFantasyStandingsByGroup,
  buildMatchSourceMap,
  buildRoundScoreMap,
  buildTieResolutionDetail,
  buildWindowCutFantasyBreakdown,
  buildWindowCutRanking,
  buildWindowCutReviewBuckets,
  buildWindowCutWithFantasy,
  computeFantasyScore,
  getRoundOf16Status,
  getWindowCutCardDeductions,
  rankGroupStandings,
  resolveKnockoutTie,
  selectCountedMatch,
  selectQuarterfinalFixtures,
  buildQuarterfinalClubTotal,
  quarterfinalFantasyScore,
  quarterfinalFixtureIssues,
  resolveQuarterfinalWinner,
  resolveQuarterfinalResult,
  QUARTERFINAL_SELECTION_EXCEPTION,
  type QuarterfinalFixture,
  type OfficialMatchSource,
  type GroupStandingEntry,
  type RoundWindowData,
  type WindowCutEntry,
} from './index';
import knockoutData from '../../../content/conference-league-sudamericana/2026-knockout.json';
import r16Window from '../../../content/conference-league-sudamericana/2026-r16-window.json';
import qfWindowData from '../../../content/conference-league-sudamericana/2026-qf-window.json';
import { validateQuarterfinalIntegrity, type KnockoutDocument, type QuarterfinalWindowDocument } from '../../validation/content-integrity';
import { collections } from '../../../content.config';

// Supply Astro's virtual collection wrapper while testing the real content schema.
vi.mock('astro:content', async () => ({
  z: (await import('astro/zod')).z,
  defineCollection: (definition: unknown) => definition,
}));

const knockout = knockoutData as KnockoutDocument;
const conferenceSchema = collections['conference-league-sudamericana'].schema as z.ZodType;

const mk = (overrides: Partial<OfficialMatchSource>): OfficialMatchSource => ({
  id: 'm1',
  clubId: 'club-a',
  roundId: 'r1',
  windowStart: '2026-04-01',
  windowEnd: '2026-04-14',
  sourceCompetitionType: 'local-league',
  sourceCompetition: 'Liga',
  sourceDate: '2026-04-02',
  homeClub: 'Club A',
  awayClub: 'Club B',
  goalsFor: 1,
  goalsAgainst: 0,
  isHome: true,
  counted: true,
  yellowCards: 0,
  redCards: 0,
  ...overrides,
});

describe('selectCountedMatch', () => {
  it('selects the first valid official match inside base window', () => {
    const matches = [
      mk({ id: 'x-friendly', sourceCompetitionType: 'friendly' as any, sourceDate: '2026-04-01' }),
      mk({ id: 'b', sourceCompetitionType: 'local-cup', sourceDate: '2026-04-04' }),
      mk({ id: 'c', sourceCompetitionType: 'conmebol', sourceDate: '2026-04-06' }),
    ];

    const result = selectCountedMatch(matches, '2026-04-01', '2026-04-14');
    expect(result.policy).toBe('base-window');
    expect(result.match?.id).toBe('b');
  });

  it('uses extended window (+3 days) when base window has no official match', () => {
    const matches = [
      mk({ id: 'late', sourceDate: '2026-04-16', sourceCompetitionType: 'conmebol' }),
    ];

    const result = selectCountedMatch(matches, '2026-04-01', '2026-04-14');
    expect(result.policy).toBe('extended-window');
    expect(result.match?.id).toBe('late');
  });

  it('returns no-match policy when no valid match is found', () => {
    const matches = [mk({ id: 'too-late', sourceDate: '2026-04-20', sourceCompetitionType: 'local-league' })];
    const result = selectCountedMatch(matches, '2026-04-01', '2026-04-14');

    expect(result.policy).toBe('no-match');
    expect(result.match).toBeNull();
  });
});

describe('computeFantasyScore', () => {
  it('bonus de margen es progresivo: ganar por 2 da +1', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 3, goalsAgainst: 1, isHome: false, yellowCards: 0, redCards: 0 })
    );
    expect(score.basePoints).toBe(3);
    expect(score.bonusPoints).toBe(1); // diff=2 → margin=1
    expect(score.penaltyPoints).toBe(0);
    expect(score.total).toBe(4);
  });

  it('bonus de margen es progresivo: ganar por 3 da +2', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 5, goalsAgainst: 2, isHome: false, yellowCards: 0, redCards: 0 })
    );
    expect(score.basePoints).toBe(3);
    expect(score.bonusPoints).toBe(2); // diff=3 → margin=2
    expect(score.penaltyPoints).toBe(0);
    expect(score.total).toBe(5);
  });

  it('bonus de margen es progresivo: ganar por 4 da +3', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 4, goalsAgainst: 0, isHome: true, yellowCards: 0, redCards: 0 })
    );
    expect(score.basePoints).toBe(3);
    expect(score.bonusPoints).toBe(4); // diff=4 → margin=3, CS=1
    expect(score.penaltyPoints).toBe(0);
    expect(score.total).toBe(7);
  });

  it('ganar por 1 no da bonus de margen', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 2, goalsAgainst: 1, isHome: false, yellowCards: 0, redCards: 0 })
    );
    expect(score.bonusPoints).toBe(0);
    expect(score.total).toBe(3);
  });

  it('aplica clean sheet (+1 bonus) cuando goalsAgainst === 0', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 1, goalsAgainst: 0, isHome: false, yellowCards: 0, redCards: 0 })
    );
    expect(score.basePoints).toBe(3);
    expect(score.bonusPoints).toBe(1); // clean sheet
    expect(score.penaltyPoints).toBe(0);
    expect(score.total).toBe(4);
  });

  it('acumula margin (+1 por diff=2) + clean sheet al ganar 2-0', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 2, goalsAgainst: 0, isHome: true, yellowCards: 0, redCards: 0 })
    );
    expect(score.basePoints).toBe(3);
    expect(score.bonusPoints).toBe(2); // margin=1 (diff=2) + clean sheet=1
    expect(score.penaltyPoints).toBe(0);
    expect(score.total).toBe(5);
  });

  it('aplica -1 penalty por derrota amplia (3+ goles de diferencia)', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 0, goalsAgainst: 3, isHome: false, yellowCards: 0, redCards: 0 })
    );
    expect(score.basePoints).toBe(0);
    expect(score.bonusPoints).toBe(0);
    expect(score.penaltyPoints).toBe(-1);
    expect(score.total).toBe(-1);
  });

  it('no aplica penalty si la derrota es de menos de 3 goles', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 0, goalsAgainst: 2, isHome: true, yellowCards: 0, redCards: 0 })
    );
    expect(score.penaltyPoints).toBe(0);
    expect(score.total).toBe(0);
  });

  it('no aplica penalty por perder de local (regla eliminada)', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 0, goalsAgainst: 1, isHome: true, yellowCards: 0, redCards: 0 })
    );
    expect(score.penaltyPoints).toBe(0);
    expect(score.total).toBe(0);
  });

  it('descuenta -0.25 por tarjeta amarilla', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 2, goalsAgainst: 0, isHome: true, yellowCards: 2, redCards: 0 })
    );
    expect(score.basePoints).toBe(3);
    expect(score.bonusPoints).toBe(2); // margin + clean sheet
    expect(score.penaltyPoints).toBeCloseTo(-0.5);
    expect(score.total).toBeCloseTo(4.5);
  });

  it('descuenta -1 por tarjeta roja', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 2, goalsAgainst: 0, isHome: false, yellowCards: 0, redCards: 1 })
    );
    expect(score.penaltyPoints).toBe(-1);
    expect(score.total).toBe(4); // 3+2-1
  });

  it('acumula penalty de derrota amplia + tarjetas', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 0, goalsAgainst: 3, isHome: false, yellowCards: 3, redCards: 0 })
    );
    expect(score.penaltyPoints).toBeCloseTo(-1.75); // -1 wide + 3*-0.25
    expect(score.total).toBeCloseTo(-1.75);
  });

  it('trata yellowCards null como 0', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 1, goalsAgainst: 0, isHome: true, yellowCards: null, redCards: null })
    );
    expect(score.penaltyPoints).toBe(0);
    expect(score.total).toBe(4); // 3 + 1 CS
  });
});

describe('conference view-model helpers', () => {
  const roundWindows: RoundWindowData[] = [
    {
      roundId: 'GS-F1',
      fantasyScores: [
        {
          clubId: 'club-a',
          roundId: 'GS-F1',
          sourceMatchId: 'm1',
          basePoints: 3,
          bonusPoints: 1,
          penaltyPoints: -0.25,
          total: 3.75,
          explanation: 'x',
        },
        {
          clubId: 'club-b',
          roundId: 'GS-F1',
          sourceMatchId: 'm2',
          basePoints: 1,
          bonusPoints: 0,
          penaltyPoints: 0,
          total: 1,
          explanation: 'y',
        },
      ],
      windowMatchSources: [
        mk({ id: 'm1', clubId: 'club-a', roundId: 'GS-F1' }),
        mk({ id: 'm2', clubId: 'club-b', roundId: 'GS-F1' }),
      ],
    },
    {
      roundId: 'GS-F2',
      fantasyScores: [
        {
          clubId: 'club-a',
          roundId: 'GS-F2',
          sourceMatchId: 'm3',
          basePoints: 0,
          bonusPoints: 0,
          penaltyPoints: -1,
          total: -1,
          explanation: 'z',
        },
      ],
      windowMatchSources: [
        mk({ id: 'm3', clubId: 'club-a', roundId: 'GS-F2', goalsFor: 0, goalsAgainst: 3 }),
      ],
    },
  ];

  it('buildFantasyByClub accumulates totals per club across windows', () => {
    const totals = buildFantasyByClub(roundWindows);

    expect(totals.get('club-a')).toEqual({
      played: 2,
      base: 3,
      bonus: 1,
      penalty: -1.25,
      total: 2.75,
    });
    expect(totals.get('club-b')).toEqual({
      played: 1,
      base: 1,
      bonus: 0,
      penalty: 0,
      total: 1,
    });
  });

  it('buildFantasyStandingsByGroup orders clubs by total, bonus and base', () => {
    const totals = buildFantasyByClub(roundWindows);
    const standings = buildFantasyStandingsByGroup(
      [{ group: 'A', clubIds: ['club-b', 'club-a', 'club-c'] }],
      totals,
      (clubId) => ({ name: clubId.toUpperCase() })
    );

    expect(standings.get('A')?.map((row) => row.clubId)).toEqual(['club-a', 'club-b', 'club-c']);
    expect(standings.get('A')?.[2]).toMatchObject({ clubId: 'club-c', total: 0, played: 0 });
  });

  it('buildRoundScoreMap indexes scores by round and club', () => {
    const scoreMap = buildRoundScoreMap(roundWindows);

    expect(scoreMap.get('GS-F1')?.get('club-a')?.sourceMatchId).toBe('m1');
    expect(scoreMap.get('GS-F2')?.get('club-a')?.total).toBe(-1);
  });

  it('buildMatchSourceMap groups match sources by round and club', () => {
    const sourceMap = buildMatchSourceMap(roundWindows);

    expect(sourceMap.get('GS-F1')?.get('club-a')?.[0].id).toBe('m1');
    expect(sourceMap.get('GS-F2')?.get('club-a')?.[0].id).toBe('m3');
  });

  it('buildWindowCutFantasyBreakdown computes audit text and totals', () => {
    const breakdown = buildWindowCutFantasyBreakdown({
      clubId: 'club-a',
      pot: 'Bombo 1',
      status: 'ok',
      total: 0,
      goalsFor: 2,
      goalsAgainst: 0,
      yellowCards: 2,
      redCards: 0,
    });

    expect(breakdown).toMatchObject({ base: 3, bonus: 2, penalty: -0.5, total: 4.5 });
    expect(breakdown.text).toContain('victoria');
  });

  it('buildWindowCutRanking orders by total, gd, gf and sourceDate', () => {
    const rows: WindowCutEntry[] = [
      { clubId: 'b', pot: 'Bombo 1', status: 'ok', total: 3, gd: 1, gf: 2, sourceDate: '2026-04-11' },
      { clubId: 'a', pot: 'Bombo 1', status: 'ok', total: 3, gd: 2, gf: 1, sourceDate: '2026-04-10' },
      { clubId: 'c', pot: 'Bombo 1', status: 'no-match', total: 0 },
    ];

    expect(buildWindowCutRanking(rows).map((row) => row.clubId)).toEqual(['a', 'b']);
  });

  it('buildWindowCutWithFantasy attaches fantasy breakdowns', () => {
    const rows = buildWindowCutWithFantasy([
      { clubId: 'x', pot: 'Bombo 2', status: 'no-match', total: 0 } as WindowCutEntry,
    ]);

    expect(rows[0].fantasy.total).toBe(0);
    expect(rows[0].fantasy.text).toContain('no-match');
  });

  it('buildTieResolutionDetail and getWindowCutCardDeductions use audit tiebreak order', () => {
    const clubA: WindowCutEntry = {
      clubId: 'a', pot: 'Bombo 1', status: 'ok', total: 3, gf: 2, homeAway: 'home', yellowCards: 1, redCards: 0,
    };
    const clubB: WindowCutEntry = {
      clubId: 'b', pot: 'Bombo 1', status: 'ok', total: 3, gf: 2, homeAway: 'away', yellowCards: 3, redCards: 0,
    };

    expect(getWindowCutCardDeductions(clubA)).toBe(0.25);
    expect(buildTieResolutionDetail(clubA, clubB)).toBe('Desempate: menos tarjetas');
  });

  it('buildWindowCutReviewBuckets groups no-match, non-ESPN and missing cards', () => {
    const buckets = buildWindowCutReviewBuckets([
      { clubId: 'a', pot: 'Bombo 1', status: 'no-match', total: 0 },
      { clubId: 'b', pot: 'Bombo 2', status: 'ok', total: 2, sourceUrl: 'https://example.com/report', yellowCards: 1, redCards: 0 },
      { clubId: 'c', pot: 'Bombo 2', status: 'ok', total: 1, sourceUrl: 'https://www.espn.com/x', yellowCards: null, redCards: 0 },
    ] as WindowCutEntry[]);

    expect(buckets.noMatch.map((row) => row.clubId)).toEqual(['a']);
    expect(buckets.nonEspn.map((row) => row.clubId)).toEqual(['b']);
    expect(buckets.missingCards.map((row) => row.clubId)).toEqual(['c']);
  });
});

describe('resolveKnockoutTie', () => {
  it('resuelve por fantasy-total cuando los puntajes difieren', () => {
    const winner = resolveKnockoutTie(
      { clubId: 'a', total: 4.5, goalsFor: 2, goalsAgainst: 0, yellowCards: 2, redCards: 0 },
      { clubId: 'b', total: 4, goalsFor: 2, goalsAgainst: 0, yellowCards: 0, redCards: 1 }
    );
    expect(winner.winnerClubId).toBe('a');
    expect(winner.tiebreakReason).toBe('fantasy-total');
  });

  it('desempata por card-deductions cuando totales iguales y tarjetas difieren', () => {
    const winner = resolveKnockoutTie(
      { clubId: 'a', total: 3, goalsFor: 2, goalsAgainst: 1, yellowCards: 1, redCards: 0 },
      { clubId: 'b', total: 3, goalsFor: 2, goalsAgainst: 1, yellowCards: 3, redCards: 0 }
    );
    expect(winner.winnerClubId).toBe('a'); // menos tarjetas
    expect(winner.tiebreakReason).toBe('card-deductions');
  });

  it('desempata por goals-for cuando totales y tarjetas iguales', () => {
    const winner = resolveKnockoutTie(
      { clubId: 'a', total: 3, goalsFor: 3, goalsAgainst: 1, yellowCards: 1, redCards: 0 },
      { clubId: 'b', total: 3, goalsFor: 2, goalsAgainst: 0, yellowCards: 1, redCards: 0 }
    );
    expect(winner.winnerClubId).toBe('a');
    expect(winner.tiebreakReason).toBe('goals-for');
  });

  it('desempata por away-condition cuando el visitante tiene ventaja', () => {
    const winner = resolveKnockoutTie(
      { clubId: 'a', total: 3, goalsFor: 2, goalsAgainst: 1, yellowCards: 1, redCards: 0, playedAway: false },
      { clubId: 'b', total: 3, goalsFor: 2, goalsAgainst: 1, yellowCards: 1, redCards: 0, playedAway: true }
    );
    expect(winner.winnerClubId).toBe('b');
    expect(winner.tiebreakReason).toBe('away-condition');
  });

  it('desempata por conmebol-rank cuando coeficiente menor gana', () => {
    const winner = resolveKnockoutTie(
      { clubId: 'a', total: 3, goalsFor: 2, goalsAgainst: 1, yellowCards: 1, redCards: 0, playedAway: false, conmebolRank: 5 },
      { clubId: 'b', total: 3, goalsFor: 2, goalsAgainst: 1, yellowCards: 1, redCards: 0, playedAway: false, conmebolRank: 12 }
    );
    expect(winner.winnerClubId).toBe('a');
    expect(winner.tiebreakReason).toBe('conmebol-rank');
  });

  it('cae a administrative-draw cuando todos los criterios deportivos son iguales', () => {
    const winner = resolveKnockoutTie(
      { clubId: 'a', total: 3, goalsFor: 2, goalsAgainst: 1 },
      { clubId: 'b', total: 3, goalsFor: 2, goalsAgainst: 1 }
    );
    expect(winner.winnerClubId).toBe('a');
    expect(winner.tiebreakReason).toBe('administrative-draw');
  });
});

describe('rankGroupStandings', () => {
  it('orders by points, fantasy diff, wins, goal diff y criterio administrativo', () => {
    const standings: GroupStandingEntry[] = [
      { group: 'A', clubId: 'a', played: 1, wins: 1, draws: 0, losses: 0, points: 3, fantasyFor: 5, fantasyAgainst: 4, fantasyDiff: 1, goalsFor: 2, goalsAgainst: 1, awayBonusWins: 0 },
      { group: 'A', clubId: 'b', played: 1, wins: 1, draws: 0, losses: 0, points: 3, fantasyFor: 6, fantasyAgainst: 4, fantasyDiff: 2, goalsFor: 1, goalsAgainst: 0, awayBonusWins: 0 },
      { group: 'A', clubId: 'c', played: 1, wins: 1, draws: 0, losses: 0, points: 3, fantasyFor: 6, fantasyAgainst: 4, fantasyDiff: 2, goalsFor: 1, goalsAgainst: 0, awayBonusWins: 1 },
    ];

    const ranked = rankGroupStandings(standings);
    expect(ranked.map((s) => s.clubId)).toEqual(['b', 'c', 'a']);
  });
});

describe('quarterfinal planning', () => {
  const fixture = (overrides: Partial<QuarterfinalFixture> = {}): QuarterfinalFixture => ({
    eventId: 1,
    sourceDate: '2026-09-24',
    startTimestamp: 1790292600,
    timeZone: 'America/Santiago',
    sourceCompetitionType: 'local-cup',
    sourceCompetition: 'Copa Chile',
    homeClub: 'Everton',
    awayClub: 'Universidad de Chile',
    isHome: false,
    status: 'scheduled',
    sourceUrl: 'https://www.sofascore.com/football/match/everton-de-vina-del-mar-universidad-de-chile/lnbsHac#id:1',
    goalsFor: null, goalsAgainst: null, yellowCards: null, redCards: null,
    ...overrides,
  });

  it('includes both local date endpoints without extending the window', () => {
    const end = fixture({ eventId: 2, sourceDate: '2026-10-15', startTimestamp: Date.parse('2026-10-15T20:00:00Z') / 1000, timeZone: 'America/Lima' });
    const before = fixture({ eventId: 3, sourceDate: '2026-09-23', startTimestamp: 1790193600, timeZone: 'America/Lima' });
    const after = fixture({ eventId: 4, sourceDate: '2026-10-16', startTimestamp: Date.parse('2026-10-16T20:00:00Z') / 1000, timeZone: 'America/Lima' });
    expect(selectQuarterfinalFixtures([after, end, before, fixture()]).map((m) => m?.eventId)).toEqual([1, 2]);
  });

  it('sorts and deduplicates official games, including cups before later league games', () => {
    const later = fixture({ eventId: 2, sourceDate: '2026-09-27', startTimestamp: 1790541000, sourceCompetitionType: 'local-league' });
    const third = fixture({ eventId: 3, sourceDate: '2026-10-08', startTimestamp: 1791489600 });
    const ignored = ['postponed', 'canceled', 'tbd'].map((status, i) => fixture({ eventId: 10 + i, status }));
    expect(selectQuarterfinalFixtures([
      ...ignored, fixture({ eventId: 20, sourceCompetitionType: 'friendly' }),
      third, later, fixture(), fixture(),
    ]).map((m) => m?.eventId)).toEqual([1, 2]);
  });

  it('represents missing fixtures as pending slots, never synthetic matches or points', () => {
    expect(selectQuarterfinalFixtures([])).toEqual([null, null]);
    expect(selectQuarterfinalFixtures([fixture()])).toEqual([fixture(), null]);
    expect(selectQuarterfinalFixtures([fixture()], new Set([1]))).toEqual([null, null]);
  });

  it('uses venue dates rather than UTC dates or unverified date labels', () => {
    // 02:00 UTC on September 24 is still September 23 in Peru.
    const before = fixture({ sourceDate: '2026-09-24', startTimestamp: Date.parse('2026-09-24T02:00:00Z') / 1000, timeZone: 'America/Lima' });
    // 02:00 UTC on October 16 is still October 15 in Peru.
    const end = fixture({ eventId: 2, sourceDate: '2026-10-15', startTimestamp: Date.parse('2026-10-16T02:00:00Z') / 1000, timeZone: 'America/Lima' });
    expect(selectQuarterfinalFixtures([before, end]).map((m) => m?.eventId ?? null)).toEqual([2, null]);
  });

  const qfWindow = qfWindowData as QuarterfinalWindowDocument;
  it('limits the historical exception to six identified games and five explicit R16 reuses', () => {
    const exceptions = qfWindow.clubs.filter((club) => club.selectionException);
    expect(exceptions.map((club) => club.clubId)).toEqual(['pe-alianza-lima', 'ec-orense', 've-metropolitanos']);
    const games = exceptions.flatMap((club) => club.fixtures);
    expect(games).toHaveLength(6);
    expect(games.map((game) => game.sourceDate).sort()).toEqual(['2026-09-12', '2026-09-14', '2026-09-16', '2026-09-18', '2026-09-20', '2026-09-21']);
    expect(games.filter((game) => game.reusedR16SourceId)).toHaveLength(5);
    for (const club of exceptions) {
      expect(selectQuarterfinalFixtures(club.fixtures)).toEqual([null, null]);
      expect(selectQuarterfinalFixtures([...club.fixtures, club.fixtures[0]], new Set(), club)).toEqual(club.fixtures);
      const changed = structuredClone(qfWindow);
      delete changed.clubs.find((candidate) => candidate.clubId === club.clubId)!.selectionException;
      expect(conferenceSchema.safeParse(changed).success).toBe(false);
      expect(validateQuarterfinalIntegrity(changed, knockout, r16Window.matchSources).join()).toContain('Invalid first-two selection');
    }
    const borrowed = { ...qfWindow.clubs.find((club) => club.clubId === 'pe-adt')!, selectionException: QUARTERFINAL_SELECTION_EXCEPTION, fixtures: exceptions[0].fixtures };
    expect(selectQuarterfinalFixtures(borrowed.fixtures, new Set(), borrowed)).toEqual([null, null]);
  });

  it('rejects altered dates, incomplete exception sets and unauthorized reuse identifiers', () => {
    for (const mutation of ['date', 'missing', 'reuse', 'scheduled', 'reverse']) {
      const changed = structuredClone(qfWindow);
      const club = changed.clubs[0];
      if (mutation === 'date') club.fixtures[0].sourceDate = '2026-09-11';
      if (mutation === 'missing') club.fixtures.pop();
      if (mutation === 'reuse') delete club.fixtures[0].reusedR16SourceId;
      if (mutation === 'scheduled') club.fixtures[0].status = 'scheduled';
      if (mutation === 'reverse') club.fixtures.reverse();
      expect(conferenceSchema.safeParse(changed).success).toBe(false);
      expect(validateQuarterfinalIntegrity(changed, knockout, r16Window.matchSources).join()).toContain('Invalid first-two selection');
    }
    const dateOnly = fixture();
    delete dateOnly.startTimestamp;
    expect(selectQuarterfinalFixtures([dateOnly])).toEqual([null, null]);
    expect(quarterfinalFixtureIssues(dateOnly, qfWindow.verifiedAt).join()).toContain('specific authorized selection exception');
  });

  it('preserves the original evidence of each reused R16 fixture, including the opponent', () => {
    for (const replacement of [{ goalsFor: 7 }, { yellowCards: 0 }, { awayClub: 'Otro club' }]) {
      const changed = structuredClone(qfWindow);
      Object.assign(changed.clubs[0].fixtures[0], replacement);
      expect(validateQuarterfinalIntegrity(changed, knockout, r16Window.matchSources).join()).toContain('Reused R16 source must preserve');
    }
  });

  it('preserves sourced uncertainty support without using an upper bound alone to qualify a club', () => {
    const caballero = structuredClone(qfWindow.clubs.find((club) => club.clubId === 'py-general-caballero')!);
    const orense = qfWindow.clubs.find((club) => club.clubId === 'ec-orense')!;
    caballero.fixtures.forEach((game) => { game.yellowCards = null; });
    expect(buildQuarterfinalClubTotal(caballero)).toMatchObject({ total: 5, kind: 'upper-bound', reportedTotals: null });
    expect(resolveQuarterfinalResult(caballero, orense)).toEqual({ winnerClubId: null, basis: null });
    caballero.fixtures[0].yellowCardReports = [
      { count: 2, sourceUrl: 'https://example.com/report-1', kind: 'listed-events' },
      { count: 4, sourceUrl: 'https://example.com/report-2', kind: 'reported-total' },
    ];
    caballero.fixtures[1].yellowCardReports = [
      { count: 1, sourceUrl: 'https://example.com/report-3', kind: 'listed-events' },
      { count: 2, sourceUrl: 'https://example.com/report-4', kind: 'reported-total' },
    ];
    expect(buildQuarterfinalClubTotal(caballero).reportedTotals).toEqual([3.5, 3.75, 4, 4.25]);
    expect(resolveQuarterfinalResult(caballero, orense)).toEqual({ winnerClubId: 'py-general-caballero', basis: 'reported-discipline-scenarios' });
    caballero.fixtures[0].yellowCardReports[1].count = 30;
    expect(resolveQuarterfinalWinner(caballero, orense)).toBeNull();
    caballero.fixtures[0].yellowCardReports[1].count = 4;
    caballero.fixtures[1].redCards = null;
    expect(resolveQuarterfinalWinner(caballero, orense)).toBeNull();
    expect(quarterfinalFixtureIssues(caballero.fixtures[1], qfWindow.verifiedAt).join()).toContain('known reds');
  });

  it('rejects coordinated semifinal rewiring and any fabricated semifinal scores or winners', () => {
    const changed = structuredClone(knockout);
    const sf = changed.rounds.find((round) => round.id === 'KO-SF')!;
    [sf.ties[0].slotB, sf.ties[1].slotA] = [sf.ties[1].slotA, sf.ties[0].slotB];
    expect(validateQuarterfinalIntegrity(qfWindow, changed, r16Window.matchSources).join()).toContain('Fixed semifinal source refs');
    for (const replacement of [{ scoreA: 3 }, { winnerClubId: 'pe-alianza-lima' }]) {
      const invented = structuredClone(knockout);
      Object.assign(invented.rounds.find((round) => round.id === 'KO-SF')!.ties[0], replacement);
      expect(validateQuarterfinalIntegrity(qfWindow, invented, r16Window.matchSources).join()).toContain('Future semifinal result');
    }
    const final = knockout.rounds.find((round) => round.id === 'KO-F')!;
    expect(final.status).toBe('planned');
    expect(final.ties.flatMap((tie) => [tie.slotA.clubId, tie.slotB.clubId])).toEqual([null, null]);
  });

  it('rejects an incorrect home/away flag or fixtures belonging to another club', () => {
    const flipped = structuredClone(qfWindow);
    flipped.clubs[0].fixtures[0].isHome = false;
    expect(validateQuarterfinalIntegrity(flipped, knockout, r16Window.matchSources).join())
      .toContain('pe-alianza-lima: event 16280820');
    expect(conferenceSchema.safeParse(flipped).success).toBe(false);
    const wrongClub = structuredClone(qfWindow);
    wrongClub.clubs[0].fixtures = structuredClone(qfWindow.clubs.find((club) => club.clubId === 'cl-universidad-de-chile')!.fixtures);
    expect(validateQuarterfinalIntegrity(wrongClub, knockout, r16Window.matchSources).join())
      .toContain('pe-alianza-lima: event 16997888');
    expect(conferenceSchema.safeParse(wrongClub).success).toBe(false);
  });

  it('rejects a participant as its own opponent, including a known alias', () => {
    const changed = structuredClone(qfWindow);
    const adt = changed.clubs.find((club) => club.clubId === 'pe-adt')!;
    adt.fixtures[0].awayClub = 'Asociación Deportiva Tarma';
    expect(validateQuarterfinalIntegrity(changed, knockout, r16Window.matchSources).join())
      .toContain('opponent must be a different club');
    expect(conferenceSchema.safeParse(changed).success).toBe(false);
  });

  it('accepts current club names and only exact verified naming aliases in both validation paths', () => {
    expect(conferenceSchema.safeParse(qfWindowData).success).toBe(true);
    expect(validateQuarterfinalIntegrity(qfWindow, knockout, r16Window.matchSources)).toEqual([]);
    const aliases: Record<string, string> = {
      'pe-adt': 'Asociación Deportiva Tarma',
      'ec-orense': 'Orense SC',
      'py-general-caballero': 'General Caballero (JLM)',
    };
    const changed = structuredClone(qfWindow);
    for (const club of changed.clubs.filter((club) => aliases[club.clubId])) {
      for (const fixture of club.fixtures) {
        fixture[fixture.isHome ? 'homeClub' : 'awayClub'] = aliases[club.clubId];
      }
    }
    expect(conferenceSchema.safeParse(changed).success).toBe(true);
    expect(validateQuarterfinalIntegrity(changed, knockout, r16Window.matchSources)).toEqual([]);
    const lookalike = structuredClone(qfWindow);
    lookalike.clubs[0].fixtures[0].homeClub = 'Alianza Lima B';
    expect(conferenceSchema.safeParse(lookalike).success).toBe(false);
    expect(validateQuarterfinalIntegrity(lookalike, knockout, r16Window.matchSources).join())
      .toContain('homeClub must identify the plan club');
  });

  it('rejects coordinated QF source rewiring even when club plans follow the rewired slots', () => {
    const changed = structuredClone(knockout);
    const qf = changed.rounds.find((round) => round.id === 'KO-QF')!;
    [qf.ties[1].slotB, qf.ties[2].slotB] = [qf.ties[2].slotB, qf.ties[1].slotB];
    const plans = structuredClone(qfWindow);
    plans.clubs.find((club) => club.sourceRef === 'R16-4')!.tieId = 'QF-3';
    plans.clubs.find((club) => club.sourceRef === 'R16-6')!.tieId = 'QF-2';
    const issues = validateQuarterfinalIntegrity(plans, changed, r16Window.matchSources).join();
    expect(issues).toContain('QF-2: Fixed bracket requires slotA=R16-3, slotB=R16-4');
    expect(issues).toContain('QF-3: Fixed bracket requires slotA=R16-5, slotB=R16-6');
    const reversed = structuredClone(knockout);
    const first = reversed.rounds.find((round) => round.id === 'KO-QF')!.ties[0];
    [first.slotA, first.slotB] = [first.slotB, first.slotA];
    expect(validateQuarterfinalIntegrity(qfWindow, reversed, r16Window.matchSources).join())
      .toContain('QF-1: Fixed bracket requires slotA=R16-1, slotB=R16-2');
  });

  it('requires exactly four distinct fixed QF ties, rejecting missing, duplicate and unknown IDs', () => {
    for (const mutation of ['missing', 'duplicate', 'replacement', 'unknown']) {
      const changed = structuredClone(knockout);
      const qf = changed.rounds.find((round) => round.id === 'KO-QF')!;
      if (mutation === 'missing') qf.ties.pop();
      if (mutation === 'duplicate') qf.ties.push(structuredClone(qf.ties[0]));
      if (mutation === 'replacement') qf.ties[3] = structuredClone(qf.ties[0]);
      if (mutation === 'unknown') qf.ties[3].id = 'QF-5';
      expect(validateQuarterfinalIntegrity(qfWindow, changed, r16Window.matchSources).join())
        .toContain('Fixed bracket requires exactly one');
    }
  });

  it('confirms eight QF plans with ADT instead of the eliminated Zamora alternative', () => {
    expect(validateQuarterfinalIntegrity(qfWindow, knockout, r16Window.matchSources)).toEqual([]);
    expect(qfWindow.clubs.filter((club) => club.qualification === 'confirmed')).toHaveLength(8);
    expect(qfWindow.clubs.filter((club) => club.qualification === 'conditional')).toEqual([]);
    expect(qfWindow.clubs.some((club) => club.clubId === 've-zamora')).toBe(false);
    const qf = knockout.rounds.find((round) => round.id === 'KO-QF')!;
    const active = qf.ties.flatMap((tie) => [tie.slotA.clubId, tie.slotB.clubId]);
    expect(active).not.toContain('ve-zamora');
    expect(qf.ties[0]).toMatchObject({ slotA: { clubId: 'pe-alianza-lima' }, slotB: { clubId: 'pe-adt', sourceRef: 'R16-2' } });
    expect(qfWindow.clubs.flatMap((club) => club.fixtures)).toHaveLength(16);
  });

  it('retains the researched slots with only the explicitly authorized historical replacements', () => {
    const expected: Record<string, Array<number | string | null>> = {
      'pe-alianza-lima': [16280820, 16280829], 'ec-orense': [15502691, '2026-09-21'],
      'py-general-caballero': [17146932, 17146922], 've-metropolitanos': [17093892, 16774716],
      'co-atletico-bucaramanga': [16390759, 16390774],
      'cl-universidad-de-chile': [16997888, 16997892], 'bo-nacional-potosi': [16767470, 16767482],
      'pe-adt': [17034085, '2026-10-01'],
    };
    const used = new Set(r16Window.matchSources.map((source) => Number(source.sourceUrl.match(/#id:(\d+)/)?.[1])));
    for (const club of qfWindow.clubs) {
      expect(selectQuarterfinalFixtures(club.fixtures, used, club).map((fixture) => fixture?.eventId ?? fixture?.sourceDate ?? null)).toEqual(expected[club.clubId]);
      for (const fixture of club.fixtures) {
        if (fixture.status === 'scheduled') {
          expect([fixture.goalsFor, fixture.goalsAgainst, fixture.yellowCards, fixture.redCards]).toEqual([null, null, null, null]);
          expect(quarterfinalFantasyScore(club.clubId, fixture)).toBeNull();
        } else {
          expect(fixture.status).toBe('played');
          expect(fixture.goalsFor).not.toBeNull();
          expect(fixture.goalsAgainst).not.toBeNull();
          expect(fixture.verificationSources?.length).toBeGreaterThan(0);
        }
        expect(fixture.eventId).not.toBe(17059625);
        expect(fixture.eventId != null && used.has(fixture.eventId)).toBe(Boolean(fixture.reusedR16SourceId));
      }
    }
  });

  it('rejects activating either candidate before R16-2 is resolved', () => {
    const unresolved = structuredClone(knockout);
    const source = unresolved.rounds.find((round) => round.id === 'KO-R16')!.ties.find((tie) => tie.id === 'R16-2')!;
    source.winnerClubId = null;
    unresolved.rounds.find((round) => round.id === 'KO-QF')!.ties[0].slotB.clubId = null;
    for (const clubId of ['ve-zamora', 'pe-adt']) {
      const changed = structuredClone(qfWindow);
      changed.clubs.find((club) => club.clubId === 'pe-adt')!.clubId = clubId;
      expect(validateQuarterfinalIntegrity(changed, unresolved, r16Window.matchSources).join()).toContain('conditional activation');
    }
  });

  it('rejects retaining an eliminated conditional plan after qualification is settled', () => {
    const changed = structuredClone(qfWindow);
    changed.clubs.push({ ...changed.clubs.find((club) => club.clubId === 'pe-adt')!, clubId: 've-zamora', qualification: 'conditional', fixtures: [] });
    expect(validateQuarterfinalIntegrity(changed, knockout, r16Window.matchSources).join()).toContain('conditional activation');
  });

  it('rejects slot remapping, missing candidate plans and invented QF results', () => {
    const changed = structuredClone(knockout);
    const qf = changed.rounds.find((round) => round.id === 'KO-QF')!;
    qf.ties[0].slotA.clubId = 've-zamora';
    qf.ties[0].winnerClubId = 've-zamora';
    expect(validateQuarterfinalIntegrity(qfWindow, changed, r16Window.matchSources).join()).toContain('Inconsistent source winner');
    expect(validateQuarterfinalIntegrity(qfWindow, changed, r16Window.matchSources).join()).toContain('Future result');
    const missing = structuredClone(qfWindow);
    missing.clubs = missing.clubs.filter((club) => club.clubId !== 'pe-adt');
    expect(validateQuarterfinalIntegrity(missing, knockout, r16Window.matchSources).join()).toContain('Missing plan for pe-adt');
  });

  it('rejects altered window, duplicate, unsorted, postponed, outside-window and reused fixtures', () => {
    const validate = (data: QuarterfinalWindowDocument) => validateQuarterfinalIntegrity(data, knockout, r16Window.matchSources);
    const wrongWindow = structuredClone(qfWindow);
    wrongWindow.windowEnd = '2026-10-11';
    expect(validate(wrongWindow).join()).toContain('Unauthorized');
    const fixtures = qfWindow.clubs.find((club) => club.clubId === 'cl-universidad-de-chile')!.fixtures;
    for (const invalid of [
      [fixtures[0], fixtures[0]], [...fixtures].reverse(),
      [{ ...fixtures[0], status: 'postponed' }],
      [{ ...fixtures[0], startTimestamp: Date.parse('2026-10-16T20:00:00Z') / 1000 }],
      [{ ...fixtures[0], eventId: 16280829 }],
    ]) {
      const changed = structuredClone(qfWindow);
      changed.clubs[0].fixtures = invalid;
      expect(validate(changed).join()).toContain('Invalid first-two selection');
    }
    const third = structuredClone(qfWindow);
    third.clubs[0].fixtures = [...fixtures, ...third.clubs[0].fixtures];
    expect(validate(third).join()).toContain('Invalid first-two selection');
  });

  it('rejects mismatched source dates, provenance, invalid zones and fabricated future discipline', () => {
    for (const replacement of [
      { sourceDate: '2026-09-24' }, { sourceUrl: 'https://example.com/event#id:123' },
      { timeZone: 'Invalid/Zone' }, { yellowCards: 0 },
    ]) {
      const changed = structuredClone(qfWindow);
      Object.assign(changed.clubs[0].fixtures[0], replacement);
      expect(validateQuarterfinalIntegrity(changed, knockout, r16Window.matchSources).length).toBeGreaterThan(0);
    }
  });

  it('records eight confirmed R16 advancements and preserves the fixed QF source refs', () => {
    const r16 = knockout.rounds.find((r) => r.id === 'KO-R16')!;
    const qf = knockout.rounds.find((r) => r.id === 'KO-QF')!;
    expect(r16.status).toBe('completed');
    expect(r16.ties.filter((t) => t.winnerClubId)).toHaveLength(8);
    expect(r16.ties.find((t) => t.id === 'R16-2')).toMatchObject({ winnerClubId: 'pe-adt', scoreA: -1.5, scoreB: 1 });
    expect(qf.status).toBe('completed');
    qf.ties.forEach((tie, i) => {
      expect(tie.winnerClubId).toBe(['pe-alianza-lima', 'py-general-caballero', 've-metropolitanos', 'bo-nacional-potosi'][i]);
      expect(tie.winnerBasis).toBe('verified-total');
      expect(tie.scoreA).toBeUndefined();
      expect(tie.scoreB).toBeUndefined();
      [tie.slotA, tie.slotB].forEach((slot, j) => {
        expect(slot.sourceRef).toBe(`R16-${i * 2 + j + 1}`);
        expect(slot.clubId).toBe(r16.ties.find((t) => t.id === slot.sourceRef)?.winnerClubId ?? null);
      });
    });
  });

  it('calculates all eight QF totals with Caballero discipline supplied by the user', () => {
    const expected: Record<string, [number | null, number, string]> = {
      'pe-alianza-lima': [4.5, 2, 'verified'], 'pe-adt': [-1.75, 2, 'verified'],
      'ec-orense': [-1.5, 2, 'verified'], 'py-general-caballero': [3.75, 2, 'verified'],
      've-metropolitanos': [8.5, 2, 'verified'], 'co-atletico-bucaramanga': [5.25, 2, 'verified'],
      'cl-universidad-de-chile': [3.5, 2, 'verified'], 'bo-nacional-potosi': [13, 2, 'verified'],
    };
    for (const club of qfWindow.clubs) {
      const result = buildQuarterfinalClubTotal(club);
      expect([result.total, result.played, result.kind]).toEqual(expected[club.clubId]);
    }
    expect(qfWindow.clubs.flatMap((club) => club.fixtures).filter((fixture) => fixture.status === 'played')).toHaveLength(16);
    expect(qfWindow.clubs.reduce((sum, club) => sum + buildQuarterfinalClubTotal(club).missingSlots, 0)).toBe(0);
    const caballero = qfWindow.clubs.find((club) => club.clubId === 'py-general-caballero')!;
    expect(caballero.fixtures.map((f) => [f.yellowCards, f.redCards])).toEqual([[3, 0], [2, 0]]);
    expect(caballero.fixtures.map((f) => quarterfinalFantasyScore(caballero.clubId, f)?.total)).toEqual([-0.75, 4.5]);
    expect(caballero.fixtures.every((f) => f.note?.includes('usuario') && !f.yellowCardReports)).toBe(true);
  });

  it('resolves four QF ties and fills only the fixed semifinal participants', () => {
    const qf = knockout.rounds.find((round) => round.id === 'KO-QF')!;
    for (const tie of qf.ties) {
      const a = qfWindow.clubs.find((club) => club.clubId === tie.slotA.clubId);
      const b = qfWindow.clubs.find((club) => club.clubId === tie.slotB.clubId);
      expect(resolveQuarterfinalWinner(a, b)).toBe(tie.winnerClubId);
    }
    const sf = knockout.rounds.find((round) => round.id === 'KO-SF')!;
    expect(sf.status).toBe('planned');
    expect(sf.ties.flatMap((tie) => [tie.slotA.clubId, tie.slotB.clubId])).toEqual(['pe-alianza-lima', 'py-general-caballero', 've-metropolitanos', 'bo-nacional-potosi']);
    expect(sf.ties.flatMap((tie) => [tie.slotA.sourceRef, tie.slotB.sourceRef])).toEqual(['QF-1', 'QF-2', 'QF-3', 'QF-4']);
    expect(sf.ties.every((tie) => !tie.winnerClubId && tie.scoreA === undefined && tie.scoreB === undefined)).toBe(true);
    const invented = structuredClone(knockout);
    invented.rounds.find((round) => round.id === 'KO-SF')!.ties[0].slotA.clubId = 'pe-adt';
    expect(validateQuarterfinalIntegrity(qfWindow, invented, r16Window.matchSources).join()).toContain('Inconsistent QF source winner');
    const missing = structuredClone(knockout);
    missing.rounds.find((round) => round.id === 'KO-QF')!.ties[3].winnerClubId = null;
    expect(validateQuarterfinalIntegrity(qfWindow, missing, r16Window.matchSources).join()).toContain('Missing verified winner');
    const closed = structuredClone(qfWindow);
    closed.status = 'in-progress';
    expect(validateQuarterfinalIntegrity(closed, knockout, r16Window.matchSources).join()).toContain('cannot anticipate');
  });

  it('distinguishes partial results from upper bounds and never qualifies a club on an incomplete round', () => {
    const a = structuredClone(qfWindow.clubs.find((club) => club.clubId === 'bo-nacional-potosi')!);
    const b = structuredClone(qfWindow.clubs.find((club) => club.clubId === 'cl-universidad-de-chile')!);
    a.fixtures.pop();
    expect(buildQuarterfinalClubTotal(a)).toMatchObject({ total: 12, played: 1, kind: 'partial', missingSlots: 1 });
    expect(resolveQuarterfinalWinner(a, b)).toBeNull();
    b.fixtures[0].yellowCards = null;
    expect(buildQuarterfinalClubTotal(b)).toMatchObject({ total: 4.5, kind: 'upper-bound' });
    const fullA = qfWindow.clubs.find((club) => club.clubId === 'bo-nacional-potosi')!;
    expect(resolveQuarterfinalWinner(fullA, b)).toBe('bo-nacional-potosi');
    const unknownA = structuredClone(fullA);
    unknownA.fixtures[0].yellowCards = null;
    expect(resolveQuarterfinalWinner(unknownA, b)).toBeNull();
    const equalA = structuredClone(b);
    equalA.clubId = 'test-other';
    equalA.fixtures.forEach((f) => { f.yellowCards = 0; f.redCards = 0; });
    const equalB = structuredClone(equalA);
    equalB.clubId = 'test-equal';
    expect(resolveQuarterfinalWinner(equalA, equalB)).toBeNull();
  });

  it('requires played scores and evidence but rejects even sourced future results', () => {
    for (const replacement of [
      { status: 'played', goalsFor: 1, goalsAgainst: 0, yellowCards: 0, redCards: 0 },
      { status: 'played', goalsFor: null, goalsAgainst: 0, verificationSources: ['https://example.com/acta'] },
    ]) {
      const changed = structuredClone(qfWindow);
      delete changed.clubs[0].selectionException;
      changed.clubs[0].fixtures = [fixture({ eventId: 16280833, sourceDate: '2026-10-11', startTimestamp: Date.parse('2026-10-11T20:00:00Z') / 1000, homeClub: 'Cusco FC', awayClub: 'Alianza Lima', sourceUrl: 'https://www.sofascore.com/football/match/cusco-alianza/a#id:16280833', ...replacement })];
      expect(conferenceSchema.safeParse(changed).success).toBe(false);
      expect(validateQuarterfinalIntegrity(changed, knockout, r16Window.matchSources).join()).toContain('Played');
    }
    const changed = structuredClone(qfWindow);
    const game = fixture({ sourceDate: '2026-10-11', startTimestamp: Date.parse('2026-10-11T20:00:00Z') / 1000, homeClub: 'Cusco FC', awayClub: 'Alianza Lima' });
    delete changed.clubs[0].selectionException;
    changed.clubs[0].fixtures = [game];
    Object.assign(game, { status: 'played', goalsFor: 1, goalsAgainst: 0, yellowCards: 0, redCards: 0, verificationSources: ['https://example.com/acta'] });
    expect(quarterfinalFixtureIssues(game, changed.verifiedAt).join()).toContain('after the verification date');
    expect(conferenceSchema.safeParse(changed).success).toBe(false);
    const noEvidence = structuredClone(qfWindow);
    delete noEvidence.clubs.find((club) => club.clubId === 'pe-adt')!.fixtures[1].verificationSources;
    expect(conferenceSchema.safeParse(noEvidence).success).toBe(false);
  });

  it('accepts exact external matches without fabricating or reusing Sofascore IDs', () => {
    const adt = qfWindow.clubs.find((club) => club.clubId === 'pe-adt')!;
    expect(adt.fixtures.map((game) => game.eventId)).toEqual([17034085, undefined]);
    expect(quarterfinalFixtureIssues(adt.fixtures[1], qfWindow.verifiedAt)).toEqual([]);
    const incorrect = { ...adt.fixtures[1], sourceUrl: adt.fixtures[0].sourceUrl };
    expect(quarterfinalFixtureIssues(incorrect, qfWindow.verifiedAt).join()).toContain('exact event ID');
    expect(selectQuarterfinalFixtures([adt.fixtures[1], adt.fixtures[1]])).toEqual([adt.fixtures[1], null]);
    expect(adt.fixtures.some((game) => game.eventId === 16281140 || game.eventId === 17059625)).toBe(false);
  });

  it('keeps player discipline separate from staff sanctions in the scored records', () => {
    const chile = qfWindow.clubs.find((club) => club.clubId === 'cl-universidad-de-chile')!;
    const buca = qfWindow.clubs.find((club) => club.clubId === 'co-atletico-bucaramanga')!;
    expect(chile.fixtures[1]).toMatchObject({ yellowCards: 2, redCards: 0 });
    expect(chile.fixtures[1].note).toContain('cuerpo técnico');
    expect(buca.fixtures[0]).toMatchObject({ yellowCards: 5, redCards: 0 });
    expect(buca.fixtures[0].note).toContain('Javier Tetes');
    expect(buca.fixtures[1]).toMatchObject({ yellowCards: 2, redCards: 1 });
    expect(quarterfinalFantasyScore(buca.clubId, buca.fixtures[1])?.total).toBe(2.5);
  });

  it('backs all eight advancements with verified winner totals above loser upper bounds', () => {
    const r16 = knockout.rounds.find((r) => r.id === 'KO-R16')!;
    for (const tie of r16.ties.filter((t) => t.winnerClubId)) {
      const rows = r16Window.matchSources.filter((m) => m.tieId === tie.id);
      expect(rows).toHaveLength(4);
      expect(rows.every((m) => m.status === 'played')).toBe(true);
      const total = (clubId: string) => rows.filter((m) => m.clubId === clubId)
        .reduce((sum, m) => sum + computeFantasyScore(m as OfficialMatchSource).total, 0);
      const loser = tie.winnerClubId === tie.slotA.clubId ? tie.slotB.clubId : tie.slotA.clubId;
      expect(rows.filter((m) => m.clubId === tie.winnerClubId)
        .every((m) => m.yellowCards != null && m.redCards != null)).toBe(true);
      expect(total(tie.winnerClubId!)).toBeGreaterThan(total(loser!));
    }
    expect(r16Window.matchSources.filter((m) => m.yellowCards == null || m.redCards == null)
      .map((m) => m.id).sort()).toEqual(['KO-R16-ec-universidad-catolica-1', 'KO-R16-uy-racing-club-1']);
    const unknown = r16Window.matchSources.find((m) => m.sourceUrl.endsWith('#id:16923847'))!;
    expect(unknown.yellowCards).toBeNull();
    expect(unknown.redCards).toBe(1);
    expect(computeFantasyScore(unknown as OfficialMatchSource).total).toBe(3);
    const potosi = r16.ties.find((t) => t.id === 'R16-8')!;
    expect(potosi.winnerClubId).toBe('bo-nacional-potosi');
    expect(potosi.scoreA).toBeUndefined();
    expect(potosi.tiebreakReason).toContain('máximo de 6');
    const racing = r16Window.matchSources.find((m) => m.sourceUrl.endsWith('#id:16873750'))!;
    expect(racing).toMatchObject({ goalsFor: 2, goalsAgainst: 4, yellowCards: null, redCards: 0 });
    expect(computeFantasyScore(racing as OfficialMatchSource).total).toBe(0);
    expect(r16.ties.find((t) => t.id === 'R16-6')!.tiebreakReason).toContain('máximo de 2.75');
    expect(r16Window.matchSources.find((m) => m.id === 'KO-R16-pe-adt-1')).toMatchObject({
      status: 'played', goalsFor: 2, goalsAgainst: 1, yellowCards: 3, redCards: 0,
      sourceDate: '2026-09-23', sourceUrl: expect.stringContaining('#id:17059625'),
    });
  });

  it('reconciles the five audited scores and discipline without changing selected events', () => {
    const expected = [
      ['15502678', 4, 3, 2, 0, 2.5],
      ['17032436', 2, 1, 2, 0, 2.5],
      ['16873750', 2, 4, null, 0, 0],
      ['16923847', 1, 0, null, 1, 3],
      ['16767455', 2, 0, 1, 0, 4.75],
    ];
    for (const [id, goalsFor, goalsAgainst, yellowCards, redCards, total] of expected) {
      const source = r16Window.matchSources.find((m) => m.sourceUrl.endsWith(`#id:${id}`))!;
      expect(source).toMatchObject({ goalsFor, goalsAgainst, yellowCards, redCards });
      expect(computeFantasyScore(source as OfficialMatchSource).total).toBe(total);
    }
    const total = (clubId: string) => r16Window.matchSources.filter((m) => m.clubId === clubId)
      .reduce((sum, m) => sum + computeFantasyScore(m as OfficialMatchSource).total, 0);
    expect(total('ec-orense')).toBe(1.75);
    expect(total('py-general-caballero')).toBe(5);
    expect(total('uy-racing-club')).toBe(2.75); // Upper bound while yellows are unknown.
    expect(total('ec-universidad-catolica')).toBe(6); // Includes the confirmed red.
    expect(total('bo-nacional-potosi')).toBe(10.5);
  });

  it('closes R16 by qualification, not by assuming all discipline has been verified', () => {
    const ties = knockout.rounds.find((r) => r.id === 'KO-R16')!.ties;
    expect(getRoundOf16Status(ties, 32)).toBe('completed');
    expect(getRoundOf16Status(ties.slice(0, 7), 32)).toBe('in-progress');
    const pending = structuredClone(ties);
    pending[1].winnerClubId = null;
    expect(getRoundOf16Status(pending, 32)).toBe('in-progress');
    pending[1].winnerClubId = 'pe-alianza-lima';
    expect(getRoundOf16Status(pending, 32)).toBe('in-progress');
    expect(getRoundOf16Status([], 0)).toBe('planned');
  });

  it('scores the approved ADT exception without changing the general window or counting it in QF', () => {
    const rows = r16Window.matchSources.filter((source) => source.tieId === 'R16-2');
    const totals = (clubId: string) => rows.filter((source) => source.clubId === clubId)
      .map((source) => computeFantasyScore(source as OfficialMatchSource).total);
    expect(totals('pe-adt')).toEqual([2.25, -1.25]);
    expect(totals('ve-zamora')).toEqual([-0.5, -1]);
    expect(r16Window.windowEnd).toBe('2026-09-20');
    expect(r16Window.extendedWindowEnd).toBe('2026-09-20');
    expect(rows.every((source) => source.windowEnd === '2026-09-20')).toBe(true);
    expect(r16Window.note).toContain('confirmadas expresamente por el usuario');
    const rescheduled = fixture({ eventId: 17059625, sourceDate: '2026-09-23',
      startTimestamp: Date.parse('2026-09-23T20:00:00Z') / 1000, timeZone: 'America/Lima' });
    expect(selectQuarterfinalFixtures([rescheduled])).toEqual([null, null]);
    expect(selectQuarterfinalFixtures([{ ...rescheduled, startTimestamp: Date.parse('2026-09-24T20:00:00Z') / 1000 }], new Set([17059625])))
      .toEqual([null, null]);
  });
});
