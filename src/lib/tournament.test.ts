import { describe, it, expect } from 'vitest';
import {
  getCurrentReign,
  getCurrentHolder,
  getHolderChain,
  resolveClub,
  type MatchEntry,
  type ClubData,
} from './tournament';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const seeding = (holderId: string, date = '2025-01-01'): MatchEntry => ({
  type: 'seeding',
  date,
  holderId,
  reason: 'Seeding',
  newHolderId: holderId,
});

const match = (
  holderId: string,
  challengerId: string,
  scoreHolder: number,
  scoreChallenger: number,
  newHolderId: string,
  date = '2025-06-01',
  competition = 'Liga de Primera · Fecha 1'
): MatchEntry => ({
  type: 'match',
  date,
  holderId,
  challengerId,
  scoreHolder,
  scoreChallenger,
  newHolderId,
  competition,
});

const pendingMatch = (
  holderId: string,
  challengerId: string,
  date = '2025-06-08',
  competition = 'Liga de Primera · Fecha 2'
): MatchEntry => ({
  type: 'match',
  status: 'pending',
  date,
  holderId,
  challengerId,
  competition,
});

const clubs: ClubData[] = [
  { id: 'coqu', name: 'Coquimbo Unido', shortName: 'CQU', stadium: 'La Punta', logo: '' },
  { id: 'udec', name: 'Universidad de Concepción', shortName: 'UDC', stadium: 'Ester Roa', logo: '' },
  { id: 'nuble', name: 'Ñublense', shortName: 'ÑUB', stadium: 'Nelson Oyarzún', logo: '' },
];

// ─── getCurrentHolder ─────────────────────────────────────────────────────────

describe('getCurrentHolder', () => {
  it('returns null for empty list', () => {
    expect(getCurrentHolder([])).toBeNull();
  });

  it('returns holder from seeding when no matches', () => {
    const result = getCurrentHolder([seeding('coqu')]);
    expect(result?.holderId).toBe('coqu');
  });

  it('returns the last newHolderId chronologically', () => {
    const matches: MatchEntry[] = [
      seeding('coqu', '2025-01-01'),
      match('coqu', 'udec', 0, 1, 'udec', '2025-03-01'),
      match('udec', 'nuble', 0, 1, 'nuble', '2025-04-01'),
    ];
    expect(getCurrentHolder(matches)?.holderId).toBe('nuble');
  });

  it('ignores order in input — always uses latest date', () => {
    const matches: MatchEntry[] = [
      match('udec', 'nuble', 0, 1, 'nuble', '2025-04-01'),
      seeding('coqu', '2025-01-01'),
      match('coqu', 'udec', 0, 1, 'udec', '2025-03-01'),
    ];
    expect(getCurrentHolder(matches)?.holderId).toBe('nuble');
  });

  it('holder wins — retains title', () => {
    const matches: MatchEntry[] = [
      seeding('coqu', '2025-01-01'),
      match('coqu', 'udec', 2, 0, 'coqu', '2025-03-01'),
    ];
    expect(getCurrentHolder(matches)?.holderId).toBe('coqu');
  });

  it('ignores pending matches when determining the current holder', () => {
    const matches: MatchEntry[] = [
      seeding('coqu', '2025-01-01'),
      match('coqu', 'udec', 0, 1, 'udec', '2025-03-01'),
      pendingMatch('udec', 'nuble', '2025-03-08'),
    ];

    expect(getCurrentHolder(matches)?.holderId).toBe('udec');
  });
});

// ─── getCurrentReign ──────────────────────────────────────────────────────────

describe('getCurrentReign', () => {
  it('returns null for empty list', () => {
    expect(getCurrentReign([])).toBeNull();
  });

  it('keeps the original reign start when current holder defended later', () => {
    const matches: MatchEntry[] = [
      seeding('coqu', '2025-01-01'),
      match('coqu', 'udec', 0, 1, 'udec', '2025-02-01'),
      match('udec', 'nuble', 2, 1, 'udec', '2025-03-30'),
    ];

    const reign = getCurrentReign(matches);

    expect(reign?.holderId).toBe('udec');
    expect(reign?.since).toBe('2025-02-01');
    expect(reign?.match.date).toBe('2025-03-30');
  });

  it('uses seeding date when no title change happened', () => {
    const matches: MatchEntry[] = [
      seeding('coqu', '2025-01-01'),
      match('coqu', 'udec', 2, 0, 'coqu', '2025-03-01'),
    ];

    const reign = getCurrentReign(matches);

    expect(reign?.holderId).toBe('coqu');
    expect(reign?.since).toBe('2025-01-01');
  });
});

// ─── getHolderChain ───────────────────────────────────────────────────────────

describe('getHolderChain', () => {
  it('returns empty array for empty input', () => {
    expect(getHolderChain([])).toEqual([]);
  });

  it('single seeding produces one entry with until=null', () => {
    const chain = getHolderChain([seeding('coqu', '2025-01-01')]);
    expect(chain).toHaveLength(1);
    expect(chain[0].holderId).toBe('coqu');
    expect(chain[0].until).toBeNull();
  });

  it('consecutive wins by same holder = single chain entry', () => {
    const matches: MatchEntry[] = [
      seeding('coqu', '2025-01-01'),
      match('coqu', 'udec', 2, 0, 'coqu', '2025-03-01'),
      match('coqu', 'nuble', 3, 1, 'coqu', '2025-04-01'),
    ];
    const chain = getHolderChain(matches);
    expect(chain).toHaveLength(1);
    expect(chain[0].holderId).toBe('coqu');
    expect(chain[0].until).toBeNull();
  });

  it('title change creates two entries', () => {
    const matches: MatchEntry[] = [
      seeding('coqu', '2025-01-01'),
      match('coqu', 'udec', 0, 1, 'udec', '2025-03-01'),
    ];
    const chain = getHolderChain(matches);
    expect(chain).toHaveLength(2);
    expect(chain[0].holderId).toBe('coqu');
    expect(chain[0].until).not.toBeNull();
    expect(chain[1].holderId).toBe('udec');
    expect(chain[1].until).toBeNull();
  });

  it('multiple title changes = correct chain length', () => {
    const matches: MatchEntry[] = [
      seeding('coqu', '2025-01-01'),
      match('coqu', 'udec', 0, 1, 'udec', '2025-02-01'),
      match('udec', 'nuble', 0, 1, 'nuble', '2025-03-01'),
      match('nuble', 'coqu', 0, 1, 'coqu', '2025-04-01'),
    ];
    const chain = getHolderChain(matches);
    expect(chain).toHaveLength(4);
    expect(chain.map((e) => e.holderId)).toEqual(['coqu', 'udec', 'nuble', 'coqu']);
    expect(chain[3].until).toBeNull();
  });

  it('Copa Pablo Milad: holder wins = NO new entry (defender wins = keeps title)', () => {
    // In Copa Pablo Milad, when defender wins, they keep the title = same holderId
    const matches: MatchEntry[] = [
      seeding('coqu', '2025-01-01'),
      // Defender (coqu) wins — newHolderId stays coqu
      match('coqu', 'udec', 2, 0, 'coqu', '2025-03-01'),
    ];
    const chain = getHolderChain(matches);
    expect(chain).toHaveLength(1);
    expect(chain[0].holderId).toBe('coqu');
  });

  it('ignores pending matches when building the holder chain', () => {
    const matches: MatchEntry[] = [
      seeding('coqu', '2025-01-01'),
      match('coqu', 'udec', 0, 1, 'udec', '2025-02-01'),
      pendingMatch('udec', 'nuble', '2025-02-08'),
    ];

    const chain = getHolderChain(matches);

    expect(chain).toHaveLength(2);
    expect(chain[1].holderId).toBe('udec');
    expect(chain[1].until).toBeNull();
  });
});

// ─── resolveClub ─────────────────────────────────────────────────────────────

describe('resolveClub', () => {
  it('resolves exact match', () => {
    expect(resolveClub('Coquimbo Unido', clubs)).toEqual({ id: 'coqu' });
  });

  it('resolves normalized match (strips accents)', () => {
    // "Ñublense" → "nublense" matches "Ñublense"
    expect(resolveClub('Nublense', clubs)).toEqual({ id: 'nuble' });
  });

  it('resolves via substring when input contains club name', () => {
    expect(resolveClub('Club Universidad de Concepción', clubs)).toEqual({ id: 'udec' });
  });

  it('resolves via substring when club name contains input', () => {
    expect(resolveClub('Coquimbo', clubs)).toEqual({ id: 'coqu' });
  });

  it('returns null id with unresolvedName for unknown club', () => {
    const result = resolveClub('Deportes Fantasma FC', clubs);
    expect(result.id).toBeNull();
    expect(result.unresolvedName).toBe('Deportes Fantasma FC');
  });

  it('does not substring-match strings shorter than 4 chars', () => {
    const result = resolveClub('UCo', clubs);
    expect(result.id).toBeNull();
  });
});
