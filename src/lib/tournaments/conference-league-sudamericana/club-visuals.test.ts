import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CLUB_ACCENT_COLORS,
  rankPreliminarySeedsBySportCriterion,
} from './club-visuals';

describe('club visuals palette', () => {
  it('covers every clubId from Conference 2026 roster', () => {
    const clubsPath = resolve(process.cwd(), 'src/content/conference-league-sudamericana/2026-clubs.json');
    const clubsDoc = JSON.parse(readFileSync(clubsPath, 'utf8')) as {
      seeds: Array<{ clubId: string }>;
    };

    const missing = clubsDoc.seeds
      .map((seed) => seed.clubId)
      .filter((clubId) => !CLUB_ACCENT_COLORS[clubId]);

    expect(missing).toEqual([]);
  });
});

describe('rankPreliminarySeedsBySportCriterion', () => {
  it('prioritizes Libertadores F2 then F1 then Sudamericana F1 then base', () => {
    const ranked = rankPreliminarySeedsBySportCriterion([
      { name: 'Base', entryType: 'base', conmebolRank: 1 },
      { name: 'Sudamericana', entryType: 'sudamericana-f1', conmebolRank: 50 },
      { name: 'Lib F1', entryType: 'libertadores-f1', conmebolRank: 99 },
      { name: 'Lib F2', entryType: 'libertadores-f2', conmebolRank: 999 },
    ]);

    expect(ranked.map((entry) => entry.name)).toEqual([
      'Lib F2',
      'Lib F1',
      'Sudamericana',
      'Base',
    ]);
  });

  it('uses Conmebol rank before editorial tie order for equal entry type', () => {
    const ranked = rankPreliminarySeedsBySportCriterion(
      [
        {
          clubId: 'club-a',
          name: 'Club A',
          entryType: 'base',
          conmebolRank: 40,
        },
        {
          clubId: 'club-b',
          name: 'Club B',
          entryType: 'base',
          conmebolRank: 10,
        },
      ],
      {
        'club-a': 0,
        'club-b': 999,
      }
    );

    expect(ranked.map((entry) => entry.clubId)).toEqual(['club-b', 'club-a']);
  });
});
