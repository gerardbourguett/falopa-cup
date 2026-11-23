import { describe, expect, it } from 'vitest';
import { seasonChoices, type SeasonFile } from './season-choice';

describe('CLI season choices', () => {
  const old: SeasonFile = { year: 2026, file: '2026.json', matches: [{ type: 'match', date: '2026-03-01' }] };
  const next: SeasonFile = { year: 2027, file: '2027.json', initialHolderId: 'colo-colo', matches: [] };

  it('defaults to the active season while offering the prepared edition', () => {
    expect(seasonChoices([next, old])).toEqual({ active: old, choices: [old, next] });
  });

  it('uses the new edition after a played match and preserves its source filename', () => {
    const started = { ...next, matches: [{ type: 'match' as const, date: '2027-02-01' }] };
    expect(seasonChoices([old, started])).toEqual({ active: started, choices: [started] });
    expect(seasonChoices([{ ...old, file: '2026-1.json' }]).active.file).toBe('2026-1.json');
  });
});
