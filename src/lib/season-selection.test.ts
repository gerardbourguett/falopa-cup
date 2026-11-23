import { describe, expect, it } from 'vitest';
import falopa2026 from '../content/falopa-cup/2026.json';
import falopa2027 from '../content/falopa-cup/2027.json';
import milad2026 from '../content/copa-pablo-milad/2026.json';
import milad2027 from '../content/copa-pablo-milad/2027.json';
import coloColo from '../content/clubs/colo-colo.json';
import trasandino from '../content/clubs/trasandino-de-los-andes.json';
import { countSeasonHolders, getSeasonHolderChain, getSeasonHolderId, selectCurrentSeason, type MatchEntry } from './tournament';
import { validateTournamentIntegrity } from './validation/content-integrity';

describe('season selection and undated initial holders', () => {
  const pending: MatchEntry = { type: 'match', status: 'pending', date: '2027-02-01' };
  const played: MatchEntry = { type: 'match', status: 'played', date: '2027-02-01', holderId: 'colo-colo', challengerId: 'other', scoreHolder: 0, scoreChallenger: 1, newHolderId: 'other' };

  it.each([
    [falopa2026, falopa2027, 'colo-colo'],
    [milad2026, milad2027, 'trasandino-de-los-andes'],
  ])('keeps the started edition current and records the next initial holder', (previous, next, holderId) => {
    expect(next.matches).toEqual([]);
    expect(next.initialHolderId).toBe(holderId);
    expect(selectCurrentSeason([next, previous as { year: number; matches: MatchEntry[] }])?.year).toBe(2026);
    expect(getSeasonHolderId(next)).toBe(holderId);
  });

  it('switches only on a played match and uses its recorded holder', () => {
    const old = { year: 2026, matches: [played] };
    const next = { year: 2027, initialHolderId: 'colo-colo', matches: [pending] };
    expect(selectCurrentSeason([next, old])?.year).toBe(2026);
    expect(getSeasonHolderId(next)).toBe('colo-colo');
    const started = { ...next, matches: [played] };
    expect(selectCurrentSeason([old, started])?.year).toBe(2027);
    expect(getSeasonHolderId(started)).toBe('other');
  });

  it('falls back to the newest season if no season has started', () => {
    expect(selectCurrentSeason([{ year: 2026, matches: [] }, { year: 2027, matches: [pending] }])?.year).toBe(2027);
    expect(selectCurrentSeason([])).toBeUndefined();
  });

  it('does not invent a reign start date when the initial holder defends', () => {
    const defense = { ...played, newHolderId: 'colo-colo' };
    const season = { initialHolderId: 'colo-colo', matches: [defense] };
    expect(getSeasonHolderChain(season)).toEqual([{ holderId: 'colo-colo', since: null, until: null }]);
    expect(getSeasonHolderChain({ ...season, matches: [defense, { ...played, date: '2027-03-01' }] })).toEqual([
      { holderId: 'colo-colo', since: null, until: '2027-03-01' },
      { holderId: 'other', since: '2027-03-01', until: null },
    ]);
    expect(getSeasonHolderChain({ initialHolderId: 'colo-colo', matches: [played] })).toEqual([
      { holderId: 'colo-colo', since: null, until: '2027-02-01' },
      { holderId: 'other', since: '2027-02-01', until: null },
    ]);
    expect(getSeasonHolderChain({ initialHolderId: 'colo-colo', matches: [pending] })).toEqual([
      { holderId: 'colo-colo', since: null, until: null },
    ]);
  });

  it('counts the initial holder once, including before the first match', () => {
    expect(countSeasonHolders({ initialHolderId: 'colo-colo', matches: [] })).toBe(1);
    expect(countSeasonHolders({ initialHolderId: 'colo-colo', matches: [{ ...played, newHolderId: 'colo-colo' }] })).toBe(1);
    expect(countSeasonHolders({ initialHolderId: 'colo-colo', matches: [played] })).toBe(2);
  });

  it('rejects a first played or pending match with a different initial holder', () => {
    const clubs = new Set(['colo-colo', 'other']);
    const file = { path: '2027.json', initialHolderId: 'colo-colo', matches: [{ ...played, holderId: 'other', challengerId: 'colo-colo' }] };
    expect(validateTournamentIntegrity([file], clubs)).toContain('2027.json#0: primer holderId debe coincidir con initialHolderId=colo-colo');
    expect(validateTournamentIntegrity([{ ...file, matches: [{ type: 'match', status: 'pending', date: '2027-01-01', holderId: 'other' }] }], clubs)).toContain('2027.json#0: primer holderId debe coincidir con initialHolderId=colo-colo');
    expect(validateTournamentIntegrity([{ ...file, matches: [{ ...played }] }], clubs)).toEqual([]);
  });

  it('validates the two initial club references without requiring invented club details', () => {
    const files = [falopa2027, milad2027].map((season) => ({ ...season, path: `${season.year}.json` }));
    expect(validateTournamentIntegrity(files, new Set([coloColo.id, trasandino.id]))).toEqual([]);
    expect(validateTournamentIntegrity(files, new Set([coloColo.id]))).toContain('2027.json: initialHolderId=trasandino-de-los-andes no existe en clubs');
    expect(trasandino).not.toHaveProperty('stadium');
    expect(trasandino.logo).toBe('/logos/trasandino.png');
  });
});
