import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChampionCard } from './ChampionCard';

describe('ChampionCard', () => {
  it('labels an unknown initial date instead of displaying an empty date', () => {
    const html = renderToStaticMarkup(createElement(ChampionCard, {
      club: { name: 'Colo-Colo' }, tournament: 'Falopa Cup', year: 2027,
      sinceDate: '', accentColor: 'gold', href: '/falopa-cup',
    }));
    expect(html).toContain('Fecha inicial desconocida');
    expect(html).not.toContain('Desde ');
  });
});
