import { selectCurrentSeason, type MatchEntry } from '../src/lib/tournament.js';

export interface SeasonFile {
  year: number;
  matches: MatchEntry[];
  initialHolderId?: string;
  file: string;
}

export function seasonChoices(seasons: SeasonFile[]): { active: SeasonFile; choices: SeasonFile[] } {
  const active = selectCurrentSeason(seasons);
  if (!active) throw new Error('No seasons available');
  const future = seasons.filter((season) => season.year > active.year).sort((a, b) => a.year - b.year);
  return { active, choices: [active, ...future] };
}
