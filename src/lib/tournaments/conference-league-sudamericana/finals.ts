import {
  buildSemifinalClubTotal,
  resolveSemifinalResult,
  semifinalPlanIssues,
  type SemifinalClubPlan,
} from './semifinals';
import type { KnockoutDocument } from '../../validation/content-integrity';

/**
 * The final reuses the semifinal rules on a new window: each finalist counts its
 * next two official matches from this date (inclusive, no end date), the day after
 * the last semifinal match, and the higher verified fantasy total takes the title.
 */
export const FINAL_WINDOW_START = '2026-10-20';

export type FinalClubPlan = SemifinalClubPlan;
export interface FinalWindowDocument {
  kind: 'f-window';
  edition: number;
  roundId: 'KO-F';
  status: 'planned' | 'in-progress' | 'completed';
  windowStart: string;
  selectionPolicy: 'next-two-official-local-dates';
  verifiedAt: string;
  note: string;
  clubs: FinalClubPlan[];
}

export const finalPlanIssues = (club: FinalClubPlan) => semifinalPlanIssues(club, FINAL_WINDOW_START);
export const buildFinalClubTotal = (club: Pick<FinalClubPlan, 'clubId' | 'fixtures'>) => buildSemifinalClubTotal(club, FINAL_WINDOW_START);
export const resolveFinalResult = (
  clubA: Pick<FinalClubPlan, 'clubId' | 'fixtures'> | undefined,
  clubB: Pick<FinalClubPlan, 'clubId' | 'fixtures'> | undefined,
) => resolveSemifinalResult(clubA, clubB, FINAL_WINDOW_START);

export function validateFinalIntegrity(window: FinalWindowDocument, knockout: KnockoutDocument, usedEventIds: ReadonlySet<number>): string[] {
  const issues: string[] = [];
  const report = (message: string) => issues.push(`conference/f-window: ${message}`);
  if (window.edition !== 2026 || window.roundId !== 'KO-F' || window.windowStart !== FINAL_WINDOW_START ||
      window.selectionPolicy !== 'next-two-official-local-dates' || !['planned', 'in-progress', 'completed'].includes(window.status) ||
      'windowEnd' in window) report('Unauthorized final policy; no end date applies.');
  const sf = knockout.rounds.find((round) => round.id === 'KO-SF');
  const final = knockout.rounds.find((round) => round.id === 'KO-F');
  if (!sf || !final || final.ties.length !== 1 || final.ties[0].id !== 'F-1') return [...issues, 'conference/f-window: Missing semifinal round or single F-1 tie.'];
  const tie = final.ties[0];
  const semifinalWinners = [tie.slotA, tie.slotB].map((slot) => sf.ties.find((source) => source.id === slot.sourceRef)?.winnerClubId ?? null);
  if (semifinalWinners.some((winner) => !winner)) report('The final window requires both semifinals to be decided.');
  if (tie.slotA.clubId !== semifinalWinners[0] || tie.slotB.clubId !== semifinalWinners[1]) report('Final slots must hold exactly the semifinal winners.');
  if (window.clubs.length !== 2 || new Set(window.clubs.map((club) => club.clubId)).size !== 2) report('Exactly two distinct finalist plans are required.');
  for (const [index, slot] of [tie.slotA, tie.slotB].entries()) {
    const club = window.clubs.find((candidate) => candidate.clubId === slot.clubId);
    if (!club || club.tieId !== 'F-1' || club.sourceRef !== slot.sourceRef) report(`Finalist plan ${index + 1} must follow the fixed semifinal winner slot.`);
  }
  for (const club of window.clubs) {
    if (club.fixtures.length !== 2) report(`${club.clubId}: Two slots are required; an unknown date is not a synthetic date.`);
    finalPlanIssues(club).forEach((issue) => report(`${club.clubId}: ${issue}`));
    for (const fixture of club.fixtures) {
      if (fixture.eventId != null && usedEventIds.has(fixture.eventId)) report(`${club.clubId}: Earlier-phase events cannot be reused in the final.`);
      if (fixture.status === 'played' && fixture.sourceDate && fixture.sourceDate > window.verifiedAt) report(`${club.clubId}: Played final fixture is after the verification date.`);
    }
  }
  const [planA, planB] = [tie.slotA, tie.slotB].map((slot) => window.clubs.find((club) => club.clubId === slot.clubId));
  const result = resolveFinalResult(planA, planB);
  const playedCount = window.clubs.reduce((sum, club) => sum + club.fixtures.filter((fixture) => fixture.status === 'played').length, 0);
  const expectedStatus = result.winnerClubId ? 'completed' : playedCount > 0 ? 'in-progress' : 'planned';
  if (window.status !== expectedStatus || final.status !== expectedStatus) report('Final round and window status must match the evidence (planned without results, in-progress with them, completed with a winner).');
  if ((tie.winnerClubId ?? null) !== result.winnerClubId) report('F-1: Champion must match the verified final resolution.');
  if (tie.winnerClubId && tie.winnerBasis !== result.basis) report('F-1: Winner basis must be verified-total.');
  for (const [score, plan] of [[tie.scoreA, planA], [tie.scoreB, planB]] as const) {
    if (score !== undefined && (!plan || buildFinalClubTotal(plan).total !== score)) report('F-1: Stored score must equal the computed total.');
  }
  return issues;
}
