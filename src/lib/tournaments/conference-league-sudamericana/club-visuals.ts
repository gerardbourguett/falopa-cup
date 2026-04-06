export const CLUB_ACCENT_COLORS: Record<string, string> = {
  'ar-argentinos-juniors': '#d71920',
  'ar-independiente': '#c8102e',
  'bo-aurora': '#44b8f3',
  'bo-guabira': '#1f8a4c',
  'bo-gv-san-jose': '#1b4fa2',
  'bo-real-tomayapo': '#2a9d5b',
  'bo-san-antonio-bulo-bulo': '#d99a1f',
  'bo-the-strongest': '#f4b400',
  'br-bahia': '#0057b8',
  'br-vitoria': '#cf2027',
  'cl-cobresal': '#e96b10',
  'cl-colo-colo': '#1e1e1e',
  'cl-deportes-limache': '#2f9e44',
  'cl-huachipato': '#0a5db8',
  'cl-nublense': '#d91f26',
  'cl-universidad-de-chile': '#0c56a8',
  'co-alianza': '#183c8f',
  'co-atletico-bucaramanga': '#f2b705',
  'co-atletico-nacional': '#0f8a4b',
  'co-fortaleza': '#cc2f2f',
  'co-once-caldas': '#2a2a2a',
  'ec-aucas': '#bf1e2e',
  'ec-delfin': '#f29f05',
  'ec-emelec': '#1f4fa3',
  'ec-libertad': '#f2c94c',
  'ec-orense': '#1f9d55',
  'ec-universidad-catolica': '#1e88e5',
  'pe-adt': '#2b6cb0',
  'pe-alianza-lima': '#1b3f95',
  'pe-deportivo-garcilaso': '#5b3cc4',
  'pe-los-chankas': '#d4a017',
  'pe-melgar': '#d62828',
  'pe-sport-huancayo': '#cc1f2f',
  'py-2-de-mayo': '#1155cc',
  'py-general-caballero': '#c53030',
  'py-guarani': '#f4b400',
  'py-nacional': '#1246a8',
  'py-sportivo-ameliano': '#2f6fd6',
  'py-sportivo-luqueno': '#1f5aa6',
  'py-sportivo-trinidense': '#2b7a78',
  'uy-cerro': '#5b8def',
  'uy-cerro-largo': '#173f8a',
  'uy-danubio': '#202020',
  'uy-defensor-sporting': '#6a1b9a',
  'uy-liverpool': '#1f1f1f',
  'uy-nacional': '#1f4ea0',
  'uy-racing-club': '#4fa3ff',
  've-anzoategui': '#f59e0b',
  've-deportivo-tachira': '#f4c430',
  've-metropolitanos': '#7b2cbf',
  've-monagas': '#113f8c',
  've-rayo-zuliano': '#ef6c00',
  've-zamora': '#111111',
};

export const ENTRY_TYPE_SPORT_WEIGHT: Record<string, number> = {
  'libertadores-f2': 400,
  'libertadores-f1': 300,
  'sudamericana-f1': 200,
  base: 100,
};

export const ENTRY_TYPE_SPORT_LABEL: Record<string, string> = {
  'libertadores-f2': 'Eliminado Libertadores F2',
  'libertadores-f1': 'Eliminado Libertadores F1',
  'sudamericana-f1': 'Eliminado Sudamericana F1',
  base: 'Cupo base',
};

export function getClubAccentColor(clubId: string): string {
  return CLUB_ACCENT_COLORS[clubId] || '#64748b';
}

export function getSportWeight(entryType?: string): number {
  return ENTRY_TYPE_SPORT_WEIGHT[entryType || 'base'] || 0;
}

export function getEntryTypeSportLabel(entryType?: string): string {
  return ENTRY_TYPE_SPORT_LABEL[entryType || 'base'] || 'Cupo base';
}

export function rankPreliminarySeedsBySportCriterion<T extends { entryType?: string; conmebolRank?: number; name?: string }>(
  seeds: T[],
  tieBreakerOrderByClubId?: Record<string, number>
): T[] {
  return [...seeds].sort((a, b) => {
    const wA = getSportWeight(a.entryType);
    const wB = getSportWeight(b.entryType);
    if (wB !== wA) return wB - wA;

    const rankA = a.conmebolRank ?? 999;
    const rankB = b.conmebolRank ?? 999;
    if (rankA !== rankB) return rankA - rankB;

    const keyA = String((a as any).clubId || '');
    const keyB = String((b as any).clubId || '');
    const orderA = tieBreakerOrderByClubId?.[keyA];
    const orderB = tieBreakerOrderByClubId?.[keyB];
    if (orderA !== undefined && orderB !== undefined && orderA !== orderB) {
      return orderA - orderB;
    }

    return String(a.name || '').localeCompare(String(b.name || ''), 'es');
  });
}
