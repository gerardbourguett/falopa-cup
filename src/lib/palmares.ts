import type { MatchEntry } from './tournament';

export interface ClubStats {
  id: string;
  reigns: number;
  defenses: number;
  conquests: number;
  losses: number;
  matchesAsHolder: number;
}

export function calculatePalmares(allMatches: MatchEntry[], initialHolderIds: string[]): ClubStats[] {
  const stats = new Map<string, ClubStats>();
  function ensure(id: string): ClubStats {
    if (!stats.has(id)) stats.set(id, { id, reigns: 0, defenses: 0, conquests: 0, losses: 0, matchesAsHolder: 0 });
    return stats.get(id)!;
  }
  for (const id of initialHolderIds) ensure(id).reigns++;
  for (const match of allMatches) {
    if (match.status === 'pending') continue;
    if (match.type === 'seeding' && match.holderId) ensure(match.holderId).reigns++;
    if (match.type === 'match' && match.holderId) {
      const holder = ensure(match.holderId);
      holder.matchesAsHolder++;
      if (match.newHolderId === match.holderId) holder.defenses++;
      else if (match.newHolderId) {
        holder.losses++;
        const winner = ensure(match.newHolderId);
        winner.conquests++;
        winner.reigns++;
      }
    }
  }
  return [...stats.values()].sort((a, b) => b.reigns - a.reigns || b.defenses - a.defenses || b.conquests - a.conquests);
}
