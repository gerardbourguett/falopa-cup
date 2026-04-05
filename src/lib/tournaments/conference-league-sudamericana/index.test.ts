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
  it('applies win + away bonus + margin bonus', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 3, goalsAgainst: 1, isHome: false })
    );

    expect(score.basePoints).toBe(3);
    expect(score.bonusPoints).toBe(2);
    expect(score.penaltyPoints).toBe(0);
    expect(score.total).toBe(5);
  });

  it('applies -1 on home loss', () => {
    const score = computeFantasyScore(
      mk({ goalsFor: 0, goalsAgainst: 1, isHome: true })
    );

    expect(score.basePoints).toBe(0);
    expect(score.penaltyPoints).toBe(-1);
    expect(score.total).toBe(-1);
  });
});

describe('resolveKnockoutTie', () => {
  it('uses tiebreak order: goal diff, goals for, away condition', () => {
    const winner = resolveKnockoutTie(
      { clubId: 'a', total: 3, goalsFor: 2, goalsAgainst: 1, wonAway: false },
      { clubId: 'b', total: 3, goalsFor: 2, goalsAgainst: 1, wonAway: true }
    );

    expect(winner.winnerClubId).toBe('b');
    expect(winner.tiebreakReason).toBe('away-win-condition');
  });
});

describe('rankGroupStandings', () => {
  it('orders by points, fantasy diff, wins, goal diff and away points', () => {
    const standings: GroupStandingEntry[] = [
      { group: 'A', clubId: 'a', played: 1, wins: 1, draws: 0, losses: 0, points: 3, fantasyFor: 5, fantasyAgainst: 4, fantasyDiff: 1, goalsFor: 2, goalsAgainst: 1, awayBonusWins: 0 },
      { group: 'A', clubId: 'b', played: 1, wins: 1, draws: 0, losses: 0, points: 3, fantasyFor: 6, fantasyAgainst: 4, fantasyDiff: 2, goalsFor: 1, goalsAgainst: 0, awayBonusWins: 0 },
      { group: 'A', clubId: 'c', played: 1, wins: 1, draws: 0, losses: 0, points: 3, fantasyFor: 6, fantasyAgainst: 4, fantasyDiff: 2, goalsFor: 1, goalsAgainst: 0, awayBonusWins: 1 },
    ];

    const ranked = rankGroupStandings(standings);
    expect(ranked.map((s) => s.clubId)).toEqual(['c', 'b', 'a']);
  });
});
