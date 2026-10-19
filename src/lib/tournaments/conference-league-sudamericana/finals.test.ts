import { describe, expect, it, vi } from 'vitest';
import type { z } from 'astro/zod';
import { collections } from '../../../content.config';
import fData from '../../../content/conference-league-sudamericana/2026-f-window.json';
import sfData from '../../../content/conference-league-sudamericana/2026-sf-window.json';
import knockoutData from '../../../content/conference-league-sudamericana/2026-knockout.json';
import r16Data from '../../../content/conference-league-sudamericana/2026-r16-window.json';
import qfData from '../../../content/conference-league-sudamericana/2026-qf-window.json';
import { FINAL_WINDOW_START, buildFinalClubTotal, resolveFinalResult, validateFinalIntegrity, type FinalWindowDocument } from './finals';
import type { KnockoutDocument } from '../../validation/content-integrity';

vi.mock('astro:content', async () => ({ z: (await import('astro/zod')).z, defineCollection: (definition: unknown) => definition }));
const schema = collections['conference-league-sudamericana'].schema as z.ZodType;
const window = fData as unknown as FinalWindowDocument;
const knockout = knockoutData as unknown as KnockoutDocument;
const eventIds = (clubs: Array<{ fixtures: Array<{ eventId?: number | null }> }>) => clubs.flatMap((club) => club.fixtures.map((fixture) => fixture.eventId ?? NaN));
const used = new Set([
  ...r16Data.matchSources.map((source) => Number(source.sourceUrl.match(/#id:(\d+)/)?.[1])),
  ...eventIds(qfData.clubs as never),
  ...eventIds(sfData.clubs as never),
]);

// A fully played final: Alianza 2-0 twice (5 each), Metropolitanos 1-1 twice (1 each), cards known.
function playedFinal() {
  const doc = structuredClone(window);
  doc.verifiedAt = '2026-10-31';
  doc.clubs.forEach((club, clubIndex) => club.fixtures.forEach((fixture) => {
    Object.assign(fixture, clubIndex === 0
      ? { status: 'played', goalsFor: 2, goalsAgainst: 0, yellowCards: 0, redCards: 0 }
      : { status: 'played', goalsFor: 1, goalsAgainst: 1, yellowCards: 0, redCards: 0 });
  }));
  Object.assign(doc.clubs[1].fixtures[1], { sourceDate: '2026-10-24', startTimestamp: undefined });
  const ko = structuredClone(knockout);
  const final = ko.rounds.find((round) => round.id === 'KO-F')!;
  return { doc, ko, final };
}

describe('final window from October 20 without an end date', () => {
  it('loads the two finalists, four unplayed slots and a valid schema', () => {
    expect(schema.safeParse(fData).success).toBe(true);
    expect(validateFinalIntegrity(window, knockout, used)).toEqual([]);
    expect(window).toMatchObject({ status: 'planned', windowStart: FINAL_WINDOW_START });
    expect(window.clubs.map((club) => [club.clubId, club.tieId, club.sourceRef])).toEqual([
      ['pe-alianza-lima', 'F-1', 'SF-1'], ['ve-metropolitanos', 'F-1', 'SF-2'],
    ]);
    const games = window.clubs.flatMap((club) => club.fixtures);
    expect(games).toHaveLength(4);
    for (const game of games) {
      expect(game.status).not.toBe('played');
      expect([game.goalsFor, game.goalsAgainst, game.yellowCards, game.redCards]).toEqual([null, null, null, null]);
    }
    expect(knockout.rounds.find((round) => round.id === 'KO-F')!.status).toBe('planned');
  });

  it('keeps the researched dates and never invents the unconfirmed Metropolitanos opponent', () => {
    expect(window.clubs.map((club) => club.fixtures.map((game) => [game.sourceDate, game.status, game.selectionStatus]))).toEqual([
      [['2026-10-25', 'scheduled', 'confirmed'], ['2026-10-29', 'scheduled', 'confirmed']],
      [['2026-10-22', 'scheduled', 'confirmed'], [null, 'tbd', 'provisional']],
    ]);
    const tbd = window.clubs[1].fixtures[1];
    expect(tbd.startTimestamp).toBeUndefined();
    expect(tbd.homeClub).toContain('por confirmar');
    expect(window.clubs[1].pendingCompetition).toMatchObject({ sourceCompetition: expect.stringContaining('Copa Venezuela') });
    // The official Liga 1 time (13:00 Lima) is used instead of Sofascore's 13:15.
    expect(new Date(window.clubs[0].fixtures[0].startTimestamp! * 1000).toISOString()).toBe('2026-10-25T18:00:00.000Z');
    // A dated slot cannot be tbd and an undated one cannot be scheduled.
    for (const [club, game, replacement] of [[1, 1, { status: 'scheduled' }], [0, 0, { status: 'tbd' }], [0, 1, { sourceDate: null }]] as const) {
      const changed = structuredClone(window);
      Object.assign(changed.clubs[club].fixtures[game], replacement);
      expect(schema.safeParse(changed).success).toBe(false);
      expect(validateFinalIntegrity(changed, knockout, used).length).toBeGreaterThan(0);
    }
  });

  it('shows no points before a played match and rejects pre-window, reused or future results', () => {
    expect(window.clubs.map((club) => buildFinalClubTotal(club))).toMatchObject([{ total: null, played: 0, kind: 'pending' }, { total: null, played: 0, kind: 'pending' }]);
    expect(resolveFinalResult(window.clubs[0], window.clubs[1])).toEqual({ winnerClubId: null, basis: null });
    const early = structuredClone(window);
    early.clubs[0].fixtures[0].sourceDate = '2026-10-19';
    expect(validateFinalIntegrity(early, knockout, used).join()).toContain('precedes the inclusive start date');
    const reused = structuredClone(window);
    reused.clubs[0].fixtures[0].eventId = 16280841;
    reused.clubs[0].fixtures[0].sourceUrl = 'https://www.sofascore.com/football/match/test#id:16280841';
    expect(validateFinalIntegrity(reused, knockout, used).join()).toContain('cannot be reused');
    for (const replacement of [{ goalsFor: 0 }, { yellowCards: 0 }, { status: 'played' }]) {
      const changed = structuredClone(window);
      Object.assign(changed.clubs[0].fixtures[1], replacement);
      expect(schema.safeParse(changed).success).toBe(false);
    }
    const extra = { ...structuredClone(window), windowEnd: '2026-12-31' } as unknown as FinalWindowDocument;
    expect(validateFinalIntegrity(extra, knockout, used).length).toBeGreaterThan(0);
  });

  it('requires both semifinal winners and exactly those finalists', () => {
    const open = structuredClone(knockout);
    delete open.rounds.find((round) => round.id === 'KO-SF')!.ties[0].winnerClubId;
    expect(validateFinalIntegrity(window, open, used).join()).toContain('requires both semifinals');
    const swapped = structuredClone(knockout);
    const final = swapped.rounds.find((round) => round.id === 'KO-F')!;
    [final.ties[0].slotA.clubId, final.ties[0].slotB.clubId] = [final.ties[0].slotB.clubId, final.ties[0].slotA.clubId];
    expect(validateFinalIntegrity(window, swapped, used).join()).toContain('semifinal winners');
  });

  it('resolves a champion only from two verified totals and ties status to the evidence', () => {
    const { doc, ko, final } = playedFinal();
    expect(doc.clubs.map((club) => buildFinalClubTotal(club))).toMatchObject([{ total: 10, kind: 'verified' }, { total: 2, kind: 'verified' }]);
    expect(resolveFinalResult(doc.clubs[0], doc.clubs[1])).toEqual({ winnerClubId: 'pe-alianza-lima', basis: 'verified-total' });
    // Complete and consistent: a champion with a completed window and round.
    doc.status = 'completed';
    final.status = 'completed';
    Object.assign(final.ties[0], { winnerClubId: 'pe-alianza-lima', winnerBasis: 'verified-total' });
    expect(validateFinalIntegrity(doc, ko, used)).toEqual([]);
    // Fabricated or missing champions, wrong status and wrong scores are all rejected.
    for (const mutate of [
      (_d: FinalWindowDocument, k: KnockoutDocument) => { k.rounds.find((round) => round.id === 'KO-F')!.ties[0].winnerClubId = 've-metropolitanos'; },
      (_d: FinalWindowDocument, k: KnockoutDocument) => { delete k.rounds.find((round) => round.id === 'KO-F')!.ties[0].winnerClubId; },
      (d: FinalWindowDocument) => { d.status = 'in-progress'; },
      (_d: FinalWindowDocument, k: KnockoutDocument) => { k.rounds.find((round) => round.id === 'KO-F')!.status = 'in-progress'; },
      (_d: FinalWindowDocument, k: KnockoutDocument) => { k.rounds.find((round) => round.id === 'KO-F')!.ties[0].scoreA = 99; },
      (d: FinalWindowDocument) => { d.verifiedAt = '2026-10-23'; },
    ]) {
      const changedDoc = structuredClone(doc);
      const changedKo = structuredClone(ko);
      mutate(changedDoc, changedKo);
      expect(validateFinalIntegrity(changedDoc, changedKo, used).length).toBeGreaterThan(0);
    }
    // One match played per club: in progress, no champion, even when one total leads.
    const half = structuredClone(doc);
    half.clubs.forEach((club) => Object.assign(club.fixtures[1], { status: 'scheduled', goalsFor: null, goalsAgainst: null, yellowCards: null, redCards: null }));
    expect(resolveFinalResult(half.clubs[0], half.clubs[1])).toEqual({ winnerClubId: null, basis: null });
    // Equal totals leave the final unresolved.
    const tied = structuredClone(doc);
    tied.clubs[0].fixtures.forEach((fixture) => Object.assign(fixture, { goalsFor: 1, goalsAgainst: 1 }));
    expect(resolveFinalResult(tied.clubs[0], tied.clubs[1])).toEqual({ winnerClubId: null, basis: null });
  });
});
