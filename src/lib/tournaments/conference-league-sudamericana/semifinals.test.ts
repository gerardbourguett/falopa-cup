import { describe, expect, it, vi } from 'vitest';
import type { z } from 'astro/zod';
import { collections } from '../../../content.config';
import sfData from '../../../content/conference-league-sudamericana/2026-sf-window.json';
import knockoutData from '../../../content/conference-league-sudamericana/2026-knockout.json';
import r16Data from '../../../content/conference-league-sudamericana/2026-r16-window.json';
import qfData from '../../../content/conference-league-sudamericana/2026-qf-window.json';
import { quarterfinalLocalDate } from './index';
import { selectSemifinalFixtures, semifinalPlanIssues, validateSemifinalIntegrity, type SemifinalFixture, type SemifinalWindowDocument } from './semifinals';
import type { KnockoutDocument } from '../../validation/content-integrity';

vi.mock('astro:content', async () => ({ z: (await import('astro/zod')).z, defineCollection: (definition: unknown) => definition }));
const schema = collections['conference-league-sudamericana'].schema as z.ZodType;
const window = sfData as SemifinalWindowDocument;
const knockout = knockoutData as KnockoutDocument;
const used = new Set([
  ...r16Data.matchSources.map((source) => Number(source.sourceUrl.match(/#id:(\d+)/)?.[1])),
  ...qfData.clubs.flatMap((club) => club.fixtures.map((fixture) => 'eventId' in fixture ? fixture.eventId ?? NaN : NaN)),
]);

describe('semifinal scheduling from October 9 without an end date', () => {
  it('loads exactly the four fixed semifinalists and eight unplayed slots', () => {
    expect(schema.safeParse(sfData).success).toBe(true);
    expect(validateSemifinalIntegrity(window, knockout, used)).toEqual([]);
    expect(window.clubs.map((club) => [club.clubId, club.tieId, club.sourceRef])).toEqual([
      ['pe-alianza-lima', 'SF-1', 'QF-1'], ['py-general-caballero', 'SF-1', 'QF-2'],
      ['ve-metropolitanos', 'SF-2', 'QF-3'], ['bo-nacional-potosi', 'SF-2', 'QF-4'],
    ]);
    const games = window.clubs.flatMap((club) => club.fixtures);
    expect(games).toHaveLength(8);
    expect(games.filter((game) => game.status === 'scheduled')).toHaveLength(7);
    expect(games.filter((game) => game.status === 'tbd')).toHaveLength(1);
    for (const game of games) expect([game.goalsFor, game.goalsAgainst, game.yellowCards, game.redCards]).toEqual([null, null, null, null]);
  });

  it('preserves all researched local dates, opponents and home/away conditions', () => {
    expect(window.clubs.map((club) => club.fixtures.map((game) => [game.sourceDate, game.isHome, game.isHome ? game.awayClub : game.homeClub]))).toEqual([
      [['2026-10-11', false, 'Cusco FC'], ['2026-10-17', true, 'Atlético Grau']],
      [['2026-10-11', true, 'Deportivo Santaní'], [null, false, 'Encarnación FC']],
      [['2026-10-10', true, 'Deportivo Rayo Zuliano'], ['2026-10-17', false, 'Estudiantes de Mérida']],
      [['2026-10-11', false, 'Aurora'], ['2026-10-18', true, 'Bolívar']],
    ]);
  });

  it('includes the start date and later official cup games without any artificial deadline', () => {
    const template = window.clubs[0].fixtures[0];
    const game = (date: string, opponent: string, type: SemifinalFixture['sourceCompetitionType'] = 'local-league') => ({ ...template, startTimestamp: undefined, sourceDate: date, homeClub: opponent, sourceCompetitionType: type });
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
    expect(times).toHaveLength(3);
    expect(times.map((game) => new Date(game.startTimestamp! * 1000).toISOString())).toEqual(['2026-10-11T23:30:00.000Z', '2026-10-18T01:30:00.000Z', '2026-10-11T13:00:00.000Z']);
    expect(window.clubs.slice(2).flatMap((club) => club.fixtures).every((game) => game.startTimestamp === undefined)).toBe(true);
  });

  it('keeps Encarnacion date, kickoff and venue unknown without fabricating a calendar value', () => {
    const game = window.clubs[1].fixtures[1];
    expect(game).toMatchObject({ sourceDate: null, status: 'tbd', selectionStatus: 'confirmed' });
    expect(game.startTimestamp).toBeUndefined();
    expect(game.venue).toBeUndefined();
    for (const replacement of [{ status: 'scheduled' }, { sourceDate: '2026-10-17' }, { startTimestamp: 1792263600 }]) {
      const changed = structuredClone(window);
      Object.assign(changed.clubs[1].fixtures[1], replacement);
      expect(schema.safeParse(changed).success).toBe(false);
      expect(validateSemifinalIntegrity(changed, knockout, used).length).toBeGreaterThan(0);
    }
  });

  it('marks Bolivar provisional because undated Copa Bolivia can interleave', () => {
    const potosi = window.clubs[3];
    expect(potosi.fixtures[1].selectionStatus).toBe('provisional');
    expect(potosi.pendingCompetition).toMatchObject({ opponent: 'Oriente Petrolero', isHome: false });
    expect(potosi.note).toContain('no segundo oficial definitivamente seleccionado');
    expect(potosi.fixtures[1].note).toContain('podría intercalarse');
    const changed = structuredClone(window);
    changed.clubs[3].fixtures[1].selectionStatus = 'confirmed';
    expect(schema.safeParse(changed).success).toBe(false);
    expect(validateSemifinalIntegrity(changed, knockout, used).join()).toContain('provisional second selection');
  });

  it('rejects any future goal, yellow, red or played status, including zero', () => {
    for (const replacement of [{ goalsFor: 0 }, { goalsAgainst: 1 }, { yellowCards: 0 }, { redCards: 0 }, { status: 'played' }]) {
      const changed = structuredClone(window);
      Object.assign(changed.clubs[0].fixtures[0], replacement);
      expect(schema.safeParse(changed).success).toBe(false);
      expect(validateSemifinalIntegrity(changed, knockout, used).length).toBeGreaterThan(0);
    }
  });

  it('rejects an end date, historical exception metadata and a premature completed phase', () => {
    for (const replacement of [{ windowEnd: '2026-10-31' }, { windowStart: '2026-10-10' }, { status: 'completed' }]) {
      const changed = { ...structuredClone(window), ...replacement } as SemifinalWindowDocument;
      expect(schema.safeParse(changed).success).toBe(false);
      expect(validateSemifinalIntegrity(changed, knockout, used).length).toBeGreaterThan(0);
    }
    const changed = structuredClone(window);
    Object.assign(changed.clubs[0], { selectionException: 'last-two-completed-before-2026-10-09' });
    Object.assign(changed.clubs[0].fixtures[0], { reusedR16SourceId: 'KO-R16-pe-alianza-lima-1' });
    expect(schema.safeParse(changed).success).toBe(false);
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
