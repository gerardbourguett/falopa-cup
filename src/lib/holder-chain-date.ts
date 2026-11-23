/** Format dates in UTC, adding the year when it differs from the season. */
export function formatHolderChainDate(value: string | Date, seasonYear?: number): string {
  const date = value instanceof Date ? value : new Date(value);
  const formatted = date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return seasonYear !== undefined && date.getUTCFullYear() !== seasonYear
    ? `${formatted} ${date.getUTCFullYear()}`
    : formatted;
}
