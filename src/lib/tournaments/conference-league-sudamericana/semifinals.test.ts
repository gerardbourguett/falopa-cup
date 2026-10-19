import { describe, expect, it, vi } from 'vitest';
import type { z } from 'astro/zod';
import { collections } from '../../../content.config';
import sfData from '../../../content/conference-league-sudamericana/2026-sf-window.json';
import knockoutData from '../../../content/conference-league-sudamericana/2026-knockout.json';
import r16Data from '../../../content/conference-league-sudamericana/2026-r16-window.json';
import qfData from '../../../content/conference-league-sudamericana/2026-qf-window.json';
import { quarterfinalLocalDate } from './index';
import { buildSemifinalClubTotal, resolveSemifinalResult, selectSemifinalFixtures, semifinalFantasyScore, semifinalPlanIssues, validateSemifinalIntegrity, type SemifinalFixture, type SemifinalWindowDocument } from './semifinals';
import { validateQuarterfinalIntegrity, type KnockoutDocument, type QuarterfinalWindowDocument } from '../../validation/content-integrity';

vi.mock('astro:content', async () => ({ z: (await import('astro/zod')).z, defineCollection: (definition: unknown) => definition }));
const schema = collections['conference-league-sudamericana'].schema as z.ZodType;
const window = sfData as SemifinalWindowDocument;
const knockout = knockoutData as KnockoutDocument;
const used = new Set([
  ...r16Data.matchSources.map((source) => Number(source.sourceUrl.match(/#id:(\d+)/)?.[1])),
  ...qfData.clubs.flatMap((club) => club.fixtures.map((fixture) => 'eventId' in fixture ? fixture.eventId ?? NaN : NaN)),
]);

describe('semifinal scheduling from October 9 without an end date', () => {
  it('loads exactly the four fixed semifinalists, seven played slots and one pending one', () => {
    expect(schema.safeParse(sfData).success).toBe(true);
    expect(validateSemifinalIntegrity(window, knockout, used)).toEqual([]);
    expect(window.clubs.map((club) => [club.clubId, club.tieId, club.sourceRef])).toEqual([
      ['pe-alianza-lima', 'SF-1', 'QF-1'], ['py-general-caballero', 'SF-1', 'QF-2'],
      ['ve-metropolitanos', 'SF-2', 'QF-3'], ['bo-nacional-potosi', 'SF-2', 'QF-4'],
    ]);
    const games = window.clubs.flatMap((club) => club.fixtures);
    expect(games).toHaveLength(8);
    expect(games.filter((game) => game.status === 'played')).toHaveLength(7);
    expect(games.filter((game) => game.status === 'scheduled')).toHaveLength(1);
    expect(games.filter((game) => game.status === 'tbd')).toHaveLength(0);
    for (const game of games.filter((game) => game.status !== 'played')) expect([game.goalsFor, game.goalsAgainst, game.yellowCards, game.redCards]).toEqual([null, null, null, null]);
  });

  it('records the four played results with cards cross-checked in two independent sources', () => {
    expect(window.status).toBe('in-progress');
    expect(knockout.rounds.find((round) => round.id === 'KO-SF')!.status).toBe('in-progress');
    expect(window.clubs.map((club) => club.fixtures[0])).toMatchObject([
      { status: 'played', sourceDate: '2026-10-11', homeClub: 'Cusco FC', awayClub: 'Alianza Lima', goalsFor: 2, goalsAgainst: 1 },
      { status: 'played', sourceDate: '2026-10-11', homeClub: 'General Caballero', awayClub: 'Deportivo Santaní', goalsFor: 2, goalsAgainst: 1 },
      { status: 'played', sourceDate: '2026-10-10', homeClub: 'Metropolitanos', awayClub: 'Deportivo Rayo Zuliano', goalsFor: 4, goalsAgainst: 0 },
      { status: 'played', sourceDate: '2026-10-11', homeClub: 'Aurora', awayClub: 'Nacional Potosí', goalsFor: 2, goalsAgainst: 2 },
    ]);
    expect(window.clubs.map((club) => [club.fixtures[0].yellowCards, club.fixtures[0].redCards])).toEqual([[1, 0], [1, 0], [0, 0], [4, 0]]);
    expect(window.clubs.map((club) => club.fixtures[0].eventId)).toEqual([16280833, 17266233, 16774729, 17255656]);
    for (const club of window.clubs) {
      const game = club.fixtures[0];
      expect(game.sourceUrl.endsWith(`#id:${game.eventId}`)).toBe(true);
      expect(game.verificationSources.filter((url) => url.includes('365scores')).length).toBe(1);
      expect(game.verificationSources.length).toBeGreaterThanOrEqual(3);
      expect(game.note).toContain('Tarjetas:');
    }
    expect(window.clubs[1].fixtures[1].status).toBe('scheduled');
    // Metropolitanos drew 2-2 at Mérida (3 yellows) and Potosí lost 0-1 to Bolívar (1 yellow), both confirmed twice.
    expect(window.clubs[2].fixtures[1]).toMatchObject({ status: 'played', goalsFor: 2, goalsAgainst: 2, yellowCards: 3, redCards: 0 });
    expect(window.clubs[3].fixtures[1]).toMatchObject({ status: 'played', goalsFor: 0, goalsAgainst: 1, yellowCards: 1, redCards: 0 });
    // Alianza completed both slots (3-1 over Grau, 4 yellows, 0 reds) confirmed by Sofascore and 365Scores.
    expect(window.clubs[0].fixtures[1]).toMatchObject({ status: 'played', eventId: 16280841, goalsFor: 3, goalsAgainst: 1, yellowCards: 4, redCards: 0 });
    // Sofascore has no card data for Caballero: its count rests on 365Scores plus ABC Color, and the note says so.
    expect(window.clubs[1].fixtures[0].note).toContain('Sofascore no publica tarjetas');
    // Potosí's conflicting expulsion report is documented, not loaded.
    expect(window.clubs[3].fixtures[0].note).toContain('Damián Villalba');
    expect(window.clubs[3].fixtures[0].note).toContain('no se carga');
  });

  it('scores each played slot as a partial total that cannot decide a tie', () => {
    const totals = window.clubs.map((club) => buildSemifinalClubTotal(club));
    expect(totals.map((total) => total.total)).toEqual([5.75, 2.75, 7.25, -0.25]);
    for (const i of [0, 2, 3]) expect(totals[i]).toMatchObject({ played: 2, disciplinePending: false, kind: 'verified' });
    expect(totals[1]).toMatchObject({ played: 1, missingSlots: 0, disciplinePending: false, kind: 'partial' });
    // 3-1 win with 4 yellows = 3 + 1 margin - 1.
    // 2-1 win = 3 - 0.25 (1 yellow); 4-0 win = 3 + 3 margin + 1 clean sheet; 2-2 draw = 1 - 4 yellows * 0.25.
    expect(window.clubs.map((club) => semifinalFantasyScore(club.clubId, club.fixtures[0])?.total)).toEqual([2.75, 2.75, 7, 0]);
    // 2-2 draw with 3 yellows = 0.25; 0-1 loss with 1 yellow = -0.25.
    expect(window.clubs.map((club) => semifinalFantasyScore(club.clubId, club.fixtures[1])?.total)).toEqual([3, undefined, 0.25, -0.25]);
    // Unknown cards would make the same slot a provisional maximum instead.
    const unknown = structuredClone(window.clubs[1]);
    Object.assign(unknown.fixtures[0], { yellowCards: null, redCards: null });
    expect(buildSemifinalClubTotal(unknown)).toMatchObject({ total: 3, disciplinePending: true, kind: 'partial' });
    expect(semifinalFantasyScore(window.clubs[1].clubId, window.clubs[1].fixtures[1])).toBeNull();
    expect(semifinalFantasyScore('pe-alianza-lima', window.clubs[0].fixtures[1])?.total).toBe(3);
    expect(buildSemifinalClubTotal({ clubId: 'x', fixtures: [] })).toMatchObject({ total: null, played: 0, kind: 'pending', missingSlots: 2 });
    const known = structuredClone(window.clubs[1]);
    Object.assign(known.fixtures[0], { yellowCards: 2, redCards: 1 });
    expect(buildSemifinalClubTotal(known)).toMatchObject({ total: 1.5, disciplinePending: false, kind: 'partial' });
    Object.assign(known.fixtures[1], { status: 'played', goalsFor: 0, goalsAgainst: 0, yellowCards: 0, redCards: 0 });
    expect(buildSemifinalClubTotal(known)).toMatchObject({ total: 1.5 + 2, played: 2, disciplinePending: false, kind: 'verified' });
    Object.assign(known.fixtures[1], { yellowCards: null });
    expect(buildSemifinalClubTotal(known)).toMatchObject({ played: 2, disciplinePending: true, kind: 'upper-bound' });
  });

  it('preserves all researched local dates, opponents and home/away conditions', () => {
    expect(window.clubs.map((club) => club.fixtures.map((game) => [game.sourceDate, game.isHome, game.isHome ? game.awayClub : game.homeClub]))).toEqual([
      [['2026-10-11', false, 'Cusco FC'], ['2026-10-17', true, 'Atlético Grau']],
      [['2026-10-11', true, 'Deportivo Santaní'], ['2026-10-19', false, 'Encarnación FC']],
      [['2026-10-10', true, 'Deportivo Rayo Zuliano'], ['2026-10-18', false, 'Estudiantes de Mérida']],
      [['2026-10-11', false, 'Aurora'], ['2026-10-18', true, 'Bolívar']],
    ]);
  });

  it('includes the start date and later official cup games without any artificial deadline', () => {
    const template = window.clubs[0].fixtures[1]; // a scheduled fixture without a provider event ID
    const game = (date: string, opponent: string, type: SemifinalFixture['sourceCompetitionType'] = 'local-league') => ({ ...template, startTimestamp: undefined, eventId: undefined, sourceDate: date, homeClub: opponent, sourceCompetitionType: type });
    const start = game('2026-10-09', 'Club A');
    const far = game('2027-02-01', 'Club B', 'local-cup');
    const later = game('2027-03-01', 'Club C', 'conmebol');
    const friendly = { ...game('2026-10-10', 'Club D'), sourceCompetitionType: 'friendly' } as unknown as SemifinalFixture;
    expect(selectSemifinalFixtures([later, far, game('2026-10-08', 'Club E'), friendly, start, start])).toEqual([start, far]);
    expect(selectSemifinalFixtures([])).toEqual([null, null]);
  });

  it('retains the October 17 local kickoff when Alianza plays on October 18 UTC', () => {
    const alianza = window.clubs[0];
    expect(quarterfinalLocalDate({ ...alianza.fixtures[1], sourceDate: alianza.fixtures[1].sourceDate! })).toBe('2026-10-17');
    const times = window.clubs.flatMap((club) => club.fixtures).filter((game) => game.startTimestamp != null);
    expect(times).toHaveLength(8);
    expect(times.map((game) => new Date(game.startTimestamp! * 1000).toISOString())).toEqual([
      '2026-10-11T23:30:00.000Z', '2026-10-18T01:30:00.000Z', '2026-10-11T13:00:00.000Z', '2026-10-19T19:30:00.000Z',
      '2026-10-10T23:30:00.000Z', '2026-10-18T19:30:00.000Z', '2026-10-11T21:15:00.000Z', '2026-10-18T19:00:00.000Z',
    ]);
  });

  it('dates Encarnacion from a single source without inventing a venue', () => {
    const game = window.clubs[1].fixtures[1];
    expect(game).toMatchObject({ sourceDate: '2026-10-19', status: 'scheduled', eventId: 17329347 });
    expect(game.venue).toBeUndefined();
    expect(game.note).toContain('sin segunda fuente');
    // An undated slot must still be `tbd`, and a dated one cannot be `tbd`.
    for (const replacement of [{ status: 'tbd' }, { sourceDate: null }]) {
      const changed = structuredClone(window);
      Object.assign(changed.clubs[1].fixtures[1], replacement);
      expect(schema.safeParse(changed).success).toBe(false);
      expect(validateSemifinalIntegrity(changed, knockout, used).length).toBeGreaterThan(0);
    }
  });

  it('confirms Bolivar as second official because Copa Bolivia is now dated after it', () => {
    const potosi = window.clubs[3];
    expect(potosi.pendingCompetition).toBeUndefined();
    expect(potosi.fixtures[1]).toMatchObject({ sourceDate: '2026-10-18', selectionStatus: 'confirmed' });
    expect(potosi.note).toContain('21 de octubre');
    expect(potosi.fixtures[1].verificationSources.join()).toContain('diez.bo');
    // An undated competing cup must still force a provisional, explained second selection.
    const changed = structuredClone(window);
    changed.clubs[3].pendingCompetition = { sourceCompetition: 'Copa Bolivia', opponent: 'Oriente Petrolero', isHome: false, sourceUrl: 'https://example.com/copa', note: 'Sin fecha.' };
    expect(schema.safeParse(changed).success).toBe(false);
    expect(validateSemifinalIntegrity(changed, knockout, used).join()).toContain('provisional second selection');
    changed.clubs[3].fixtures[1].selectionStatus = 'provisional';
    expect(schema.safeParse(changed).success).toBe(true);
    expect(semifinalPlanIssues(changed.clubs[3])).toEqual([]);
  });

  it('rejects any future goal, yellow, red or played status without a score, including zero', () => {
    for (const replacement of [{ goalsFor: 0 }, { goalsAgainst: 1 }, { yellowCards: 0 }, { redCards: 0 }, { status: 'played' }]) {
      const changed = structuredClone(window);
      Object.assign(changed.clubs[1].fixtures[1], replacement);
      expect(schema.safeParse(changed).success).toBe(false);
      expect(validateSemifinalIntegrity(changed, knockout, used).length).toBeGreaterThan(0);
    }
  });

  it('rejects malformed, unsourced or post-cutoff played results', () => {
    for (const replacement of [{ goalsFor: null }, { goalsAgainst: null }, { goalsFor: -1 }, { goalsFor: 1.5 }, { yellowCards: -1 }, { redCards: 0.5 }, { verificationSources: [] }]) {
      const changed = structuredClone(window);
      Object.assign(changed.clubs[0].fixtures[0], replacement);
      expect(schema.safeParse(changed).success).toBe(false);
    }
    const early = { ...structuredClone(window), verifiedAt: '2026-10-10' };
    expect(schema.safeParse(early).success).toBe(false);
    expect(validateSemifinalIntegrity(early, knockout, used).join()).toContain('after the verification date');
    const verified = structuredClone(window);
    Object.assign(verified.clubs[0].fixtures[0], { yellowCards: 2, redCards: 0 });
    expect(schema.safeParse(verified).success).toBe(true);
    expect(validateSemifinalIntegrity(verified, knockout, used)).toEqual([]);
  });

  it('ties round status to the evidence and completes only with both verified winners', () => {
    const planned = { ...structuredClone(window), status: 'planned' } as SemifinalWindowDocument;
    expect(validateSemifinalIntegrity(planned, knockout, used).join()).toContain('must match the evidence');
    const hidden = structuredClone(knockout);
    hidden.rounds.find((round) => round.id === 'KO-SF')!.status = 'planned';
    expect(validateSemifinalIntegrity(window, hidden, used).join()).toContain('must match the evidence');
    const closed = { ...structuredClone(window), status: 'completed' } as SemifinalWindowDocument;
    expect(validateSemifinalIntegrity(closed, knockout, used).join()).toContain('must match the evidence');
    const early = structuredClone(knockout);
    early.rounds.find((round) => round.id === 'KO-SF')!.status = 'completed';
    expect(validateQuarterfinalIntegrity(qfData as unknown as QuarterfinalWindowDocument, early, r16Data.matchSources)).toEqual([]);
    expect(validateSemifinalIntegrity(window, early, used).join()).toContain('must match the evidence');
  });

  it('resolves only verified two-match totals and records SF-2 for Metropolitanos', () => {
    const [alianza, caballero, metropolitanos, potosi] = window.clubs;
    expect(resolveSemifinalResult(metropolitanos, potosi)).toEqual({ winnerClubId: 've-metropolitanos', basis: 'verified-total' });
    expect(resolveSemifinalResult(potosi, metropolitanos)).toEqual({ winnerClubId: 've-metropolitanos', basis: 'verified-total' });
    // Caballero has one slot played: Alianza's 5.75 cannot decide SF-1 yet.
    expect(resolveSemifinalResult(alianza, caballero)).toEqual({ winnerClubId: null, basis: null });
    expect(resolveSemifinalResult(undefined, caballero)).toEqual({ winnerClubId: null, basis: null });
    // Equal totals are unresolved, and an unknown card on the leader makes it an upper bound that cannot decide.
    const level = (club: typeof potosi) => {
      const copy = structuredClone(club);
      copy.fixtures.forEach((f) => Object.assign(f, { goalsFor: 2, goalsAgainst: 2, yellowCards: 0, redCards: 0 }));
      return copy;
    };
    expect(resolveSemifinalResult(level(metropolitanos), level(potosi))).toEqual({ winnerClubId: null, basis: null });
    const unknown = structuredClone(metropolitanos);
    unknown.fixtures[1].yellowCards = null;
    expect(resolveSemifinalResult(unknown, potosi)).toEqual({ winnerClubId: null, basis: null });
    // The stored data match the resolution, and fabrications are rejected.
    const sf = knockout.rounds.find((round) => round.id === 'KO-SF')!;
    expect(sf.ties.map((tie) => [tie.winnerClubId ?? null, tie.winnerBasis ?? null])).toEqual([[null, null], ['ve-metropolitanos', 'verified-total']]);
    for (const [index, replacement] of [[0, { winnerClubId: 'pe-alianza-lima', winnerBasis: 'verified-total' }], [0, { scoreA: 3 }], [1, { winnerClubId: 'bo-nacional-potosi' }], [1, { winnerBasis: 'reported-discipline-scenarios' }]] as const) {
      const invented = structuredClone(knockout);
      Object.assign(invented.rounds.find((round) => round.id === 'KO-SF')!.ties[index], replacement);
      expect(validateSemifinalIntegrity(window, invented, used).length).toBeGreaterThan(0);
    }
    const missing = structuredClone(knockout);
    delete missing.rounds.find((round) => round.id === 'KO-SF')!.ties[1].winnerClubId;
    expect(validateSemifinalIntegrity(window, missing, used).join()).toContain('Winner must match');
    const wrongFinal = structuredClone(knockout);
    wrongFinal.rounds.find((round) => round.id === 'KO-F')!.ties[0].slotA.clubId = 'pe-alianza-lima';
    expect(validateSemifinalIntegrity(window, wrongFinal, used).join()).toContain('Final slots');
  });

  it('rejects duplicate, reversed, pre-start and mismatched kickoff evidence', () => {
    for (const mutation of ['duplicate', 'reverse', 'before', 'timestamp', 'zone', 'participant']) {
      const changed = structuredClone(window);
      const club = changed.clubs[0];
      if (mutation === 'duplicate') club.fixtures[1] = structuredClone(club.fixtures[0]);
      if (mutation === 'reverse') club.fixtures.reverse();
      if (mutation === 'before') club.fixtures[0].sourceDate = '2026-10-08';
      if (mutation === 'timestamp') club.fixtures[1].sourceDate = '2026-10-18';
      if (mutation === 'zone') club.fixtures[0].timeZone = 'Invalid/Zone';
      if (mutation === 'participant') club.fixtures[0].awayClub = 'Alianza Lima B';
      expect(schema.safeParse(changed).success).toBe(false);
      expect(validateSemifinalIntegrity(changed, knockout, used).length).toBeGreaterThan(0);
    }
  });

  it('rejects reused historical IDs and rewired semifinalist plans', () => {
    const changed = structuredClone(window);
    changed.clubs[0].fixtures[0].eventId = 16280820;
    changed.clubs[0].fixtures[0].sourceUrl = 'https://www.sofascore.com/football/match/test#id:16280820';
    expect(validateSemifinalIntegrity(changed, knockout, used).join()).toContain('Historical R16/QF reuse');
    changed.clubs[0].sourceRef = 'QF-3';
    expect(validateSemifinalIntegrity(changed, knockout, used).join()).toContain('fixed QF winner slot');
    expect(semifinalPlanIssues(window.clubs[3])).toEqual([]);
  });
});
