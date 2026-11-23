import { afterEach, describe, expect, it, vi } from 'vitest';

const prompts = vi.hoisted(() => ({
  select: vi.fn(), input: vi.fn(), number: vi.fn(), confirm: vi.fn(),
}));
vi.mock('@inquirer/prompts', () => prompts);

import { main } from './next-match';

const originalArgv = process.argv;
afterEach(() => {
  process.argv = originalArgv;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const prompt of Object.values(prompts)) prompt.mockReset();
});

describe('next match CLI', () => {
  it.each([0, 1])('uses the selected active or prepared season (choice %i)', async (choice) => {
    process.argv = ['node', 'next-match.ts', '--tournament', 'falopa-cup'];
    const output: string[] = [];
    const errors: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => { output.push(String(chunk)); return true; });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => { errors.push(String(chunk)); return true; });
    prompts.select.mockImplementation(async (options: { message: string; choices: Array<{ value: unknown }>; default?: unknown }) => {
      if (options.message.includes('temporada')) {
        expect(options.default).toBe(options.choices[0].value);
        return options.choices[choice].value;
      }
      return options.choices[0].value;
    });
    prompts.input.mockResolvedValueOnce('Test competition').mockResolvedValueOnce('2027-02-01');
    prompts.number.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await main();

    expect(output.join('')).toContain(`/falopa-cup/${choice === 0 ? '2026' : '2027'}.json`);
    if (choice === 1) {
      expect(output.join('')).toContain('"holderId": "colo-colo"');
      expect(errors.join('')).toContain('poseedor inicial');
    } else {
      expect(errors.join('')).toContain('Poseedor actual:');
      expect(errors.join('')).not.toContain('poseedor inicial');
    }
  });
});
