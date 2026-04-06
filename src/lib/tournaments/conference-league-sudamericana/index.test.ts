import { describe, expect, it } from 'vitest';
import {
  computeFantasyScore,
  rankGroupStandings,
  resolveKnockoutTie,
  selectCountedMatch,
  type OfficialMatchSource,
  type GroupStandingEntry,
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
