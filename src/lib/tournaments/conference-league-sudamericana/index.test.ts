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
  getWindowCutCardDeductions,
  rankGroupStandings,
  resolveKnockoutTie,
  selectCountedMatch,
  selectQuarterfinalFixtures,
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

const knockout: KnockoutDocument = knockoutData;
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
    const end = fixture({ eventId: 2, sourceDate: '2026-10-08', startTimestamp: 1791489600, timeZone: 'America/Lima' });
    const before = fixture({ eventId: 3, sourceDate: '2026-09-23', startTimestamp: 1790193600, timeZone: 'America/Lima' });
    const after = fixture({ eventId: 4, sourceDate: '2026-10-09', startTimestamp: 1791576000, timeZone: 'America/Lima' });
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
    // 02:00 UTC on October 9 is still October 8 in Peru.
    const end = fixture({ eventId: 2, sourceDate: '2026-10-08', startTimestamp: Date.parse('2026-10-09T02:00:00Z') / 1000, timeZone: 'America/Lima' });
    expect(selectQuarterfinalFixtures([before, end]).map((m) => m?.eventId ?? null)).toEqual([2, null]);
  });

  const qfWindow = qfWindowData as QuarterfinalWindowDocument;
  it('rejects an incorrect home/away flag or fixtures belonging to another club', () => {
    const flipped = structuredClone(qfWindow);
    flipped.clubs[0].fixtures[0].isHome = true;
    expect(validateQuarterfinalIntegrity(flipped, knockout, r16Window.matchSources).join())
      .toContain('pe-alianza-lima: event 16280833');
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
      // Orense has no published fixtures; use an in-memory fixture to exercise its known alias.
      if (!club.fixtures.length) club.fixtures = [structuredClone(qfWindow.clubs[0].fixtures[0])];
      for (const fixture of club.fixtures) {
        fixture[fixture.isHome ? 'homeClub' : 'awayClub'] = aliases[club.clubId];
      }
    }
    expect(conferenceSchema.safeParse(changed).success).toBe(true);
    expect(validateQuarterfinalIntegrity(changed, knockout, r16Window.matchSources)).toEqual([]);
    const lookalike = structuredClone(qfWindow);
    lookalike.clubs[0].fixtures[0].awayClub = 'Alianza Lima B';
    expect(conferenceSchema.safeParse(lookalike).success).toBe(false);
    expect(validateQuarterfinalIntegrity(lookalike, knockout, r16Window.matchSources).join())
      .toContain('awayClub must identify the plan club');
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

  it('validates the actual planning data and keeps alternatives out of the confirmed bracket', () => {
    expect(validateQuarterfinalIntegrity(qfWindow, knockout, r16Window.matchSources)).toEqual([]);
    expect(qfWindow.clubs.filter((club) => club.qualification === 'confirmed')).toHaveLength(7);
    expect(qfWindow.clubs.filter((club) => club.qualification === 'conditional').map((club) => club.clubId))
      .toEqual(['ve-zamora', 'pe-adt']);
    const qf = knockout.rounds.find((round) => round.id === 'KO-QF')!;
    const active = qf.ties.flatMap((tie) => [tie.slotA.clubId, tie.slotB.clubId]);
    expect(active).not.toContain('ve-zamora');
    expect(active).not.toContain('pe-adt');
    expect(qfWindow.clubs.flatMap((club) => club.fixtures)).toHaveLength(12);
  });

  it('retains exactly the researched slots, not outside-window replacements or future scores', () => {
    const expected: Record<string, Array<number | null>> = {
      'pe-alianza-lima': [16280833, null], 'ec-orense': [null, null],
      'py-general-caballero': [17146932, 17146922], 've-metropolitanos': [null, null],
      'co-atletico-bucaramanga': [16390759, 16390774],
      'cl-universidad-de-chile': [16997888, 16997892], 'bo-nacional-potosi': [16767470, 16767482],
      've-zamora': [16787579, null], 'pe-adt': [16281140, 17034085],
    };
    const used = new Set(r16Window.matchSources.map((source) => Number(source.sourceUrl.match(/#id:(\d+)/)?.[1])));
    for (const club of qfWindow.clubs) {
      expect(selectQuarterfinalFixtures(club.fixtures, used).map((fixture) => fixture?.eventId ?? null)).toEqual(expected[club.clubId]);
      for (const fixture of club.fixtures) {
        expect(fixture.status).toBe('scheduled');
        expect([fixture.goalsFor, fixture.goalsAgainst, fixture.yellowCards, fixture.redCards]).toEqual([null, null, null, null]);
        expect(fixture.eventId).not.toBe(17059625);
        expect(used.has(fixture.eventId)).toBe(false);
      }
    }
  });

  it('rejects activating either candidate before R16-2 is resolved', () => {
    for (const clubId of ['ve-zamora', 'pe-adt']) {
      const changed = structuredClone(qfWindow);
      changed.clubs.find((club) => club.clubId === clubId)!.qualification = 'confirmed';
      expect(validateQuarterfinalIntegrity(changed, knockout, r16Window.matchSources).join()).toContain('conditional activation');
    }
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
      [{ ...fixtures[0], startTimestamp: Date.parse('2026-10-09T20:00:00Z') / 1000 }],
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

  it('records only seven confirmed R16 advancements and preserves the fixed QF source refs', () => {
    const r16 = knockout.rounds.find((r) => r.id === 'KO-R16')!;
    const qf = knockout.rounds.find((r) => r.id === 'KO-QF')!;
    expect(r16.status).toBe('in-progress');
    expect(r16.ties.filter((t) => t.winnerClubId)).toHaveLength(7);
    expect(r16.ties.find((t) => t.id === 'R16-2')?.winnerClubId).toBeFalsy();
    expect(qf.status).toBe('planned');
    qf.ties.forEach((tie, i) => {
      expect(tie.winnerClubId).toBeUndefined();
      expect(tie.scoreA).toBeUndefined();
      expect(tie.scoreB).toBeUndefined();
      [tie.slotA, tie.slotB].forEach((slot, j) => {
        expect(slot.sourceRef).toBe(`R16-${i * 2 + j + 1}`);
        expect(slot.clubId).toBe(r16.ties.find((t) => t.id === slot.sourceRef)?.winnerClubId ?? null);
      });
    });
  });

  it('backs the seven advancements with complete results or the Potosi upper bound', () => {
    const r16 = knockout.rounds.find((r) => r.id === 'KO-R16')!;
    for (const tie of r16.ties.filter((t) => t.winnerClubId)) {
      const rows = r16Window.matchSources.filter((m) => m.tieId === tie.id);
      expect(rows).toHaveLength(4);
      expect(rows.every((m) => m.status === 'played')).toBe(true);
      const total = (clubId: string) => rows.filter((m) => m.clubId === clubId)
        .reduce((sum, m) => sum + computeFantasyScore(m as OfficialMatchSource).total, 0);
      const loser = tie.winnerClubId === tie.slotA.clubId ? tie.slotB.clubId : tie.slotA.clubId;
      expect(total(tie.winnerClubId!)).toBeGreaterThan(total(loser!));
      if (tie.id !== 'R16-8') expect(rows.every((m) => m.yellowCards != null && m.redCards != null)).toBe(true);
    }
    const unknown = r16Window.matchSources.find((m) => m.sourceUrl.endsWith('#id:16923847'))!;
    expect(unknown.yellowCards).toBeNull();
    expect(unknown.redCards).toBeNull();
    expect(computeFantasyScore(unknown as OfficialMatchSource).total).toBe(4);
    const potosi = r16.ties.find((t) => t.id === 'R16-8')!;
    expect(potosi.winnerClubId).toBe('bo-nacional-potosi');
    expect(potosi.scoreA).toBeUndefined();
    expect(potosi.tiebreakReason).toContain('7');
    expect(r16Window.matchSources.find((m) => m.id === 'KO-R16-pe-adt-1')).toMatchObject({
      status: 'tbd', goalsFor: null, goalsAgainst: null,
      sourceUrl: expect.stringContaining('#id:16978899'),
    });
  });
});
