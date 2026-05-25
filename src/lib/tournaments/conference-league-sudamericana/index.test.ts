import { describe, expect, it } from 'vitest';
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
  type OfficialMatchSource,
  type GroupStandingEntry,
  type RoundWindowData,
  type WindowCutEntry,
} from './index';

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
