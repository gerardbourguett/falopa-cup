import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { ChampionCard } from './ChampionCard';

describe('ChampionCard', () => {
  const props = {
    club: { name: 'Unión San Felipe' },
    tournament: 'COPA REDACTED',
    year: 2026,
    sinceDate: '26 sept 26',
    accentColor: 'burgundy' as const,
    href: '/copa-pablo-milad',
  };

  it('identifies the confirmed season champion without a next match', () => {
    const html = renderToStaticMarkup(createElement(ChampionCard, { ...props, seasonChampion: true }));
    expect(html).toContain('CAMPEÓN 2026');
    expect(html).toContain('Unión San Felipe');
    expect(html).not.toContain('Siguiente duelo');
  });

  it('does not infer a season champion from a missing next match', () => {
    const html = renderToStaticMarkup(createElement(ChampionCard, props));
    expect(html).toContain('CAMPEON ACTUAL');
    expect(html).not.toContain('CAMPEÓN 2026');
  });
});
