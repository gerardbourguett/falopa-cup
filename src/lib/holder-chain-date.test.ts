import { describe, expect, it } from 'vitest';
import { formatHolderChainDate } from './holder-chain-date';
import milad2027 from '../content/copa-pablo-milad/2027.json';

describe('holder chain date formatting', () => {
  it('includes the calendar year when it differs from the season', () => {
    const short = formatHolderChainDate(milad2027.initialHolderDate);
    expect(formatHolderChainDate(milad2027.initialHolderDate, 2027)).toBe(`${short} 2026`);
    expect(formatHolderChainDate(new Date('2026-11-22T00:00:00Z'), 2027)).toBe(`${short} 2026`);
  });

  it('keeps the existing short format for dates in the season', () => {
    expect(formatHolderChainDate('2027-02-01', 2027)).toBe(formatHolderChainDate('2027-02-01'));
  });
});
