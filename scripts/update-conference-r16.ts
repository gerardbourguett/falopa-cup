import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DATA_PATH = resolve(
  "src/content/conference-league-sudamericana/2026-r16-window.json",
);
const API_ROOT = "https://www.sofascore.com/api/v1";

type SourceRow = {
  sourceUrl?: string;
  status: "played" | "scheduled" | "tbd";
  isHome: boolean;
  goalsFor?: number;
  goalsAgainst?: number;
  yellowCards?: number;
  redCards?: number;
};

type R16Document = { matchSources: SourceRow[] };

export function eventIdFromUrl(sourceUrl?: string): string | null {
  return sourceUrl?.match(/#id:(\d+)/)?.[1] ?? null;
}

function statisticValue(
  payload: any,
  name: string,
  side: "home" | "away",
): number | null {
  for (const period of payload?.statistics || []) {
    for (const group of period?.groups || []) {
      const item = group?.statisticsItems?.find(
        (entry: any) => entry.name === name,
      );
      if (item && Number.isFinite(item[side])) return item[side];
    }
  }
  return null;
}

export function applyFinishedEvent(
  row: SourceRow,
  eventPayload: any,
  statisticsPayload: any,
): SourceRow {
  const event = eventPayload?.event;
  if (event?.status?.type !== "finished") return row;

  const homeGoals = event?.homeScore?.current;
  const awayGoals = event?.awayScore?.current;
  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return row;

  const side = row.isHome ? "home" : "away";
  const yellowCards = statisticValue(statisticsPayload, "Yellow cards", side);
  const redCards = statisticValue(statisticsPayload, "Red cards", side);

  return {
    ...row,
    status: "played",
    goalsFor: row.isHome ? homeGoals : awayGoals,
    goalsAgainst: row.isHome ? awayGoals : homeGoals,
    ...(yellowCards == null ? {} : { yellowCards }),
    ...(redCards == null ? {} : { redCards }),
  };
}

async function getJson(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const document = JSON.parse(await readFile(DATA_PATH, "utf8")) as R16Document;
  const cache = new Map<string, { event: any; statistics: any }>();
  const failed = new Set<string>();
  let updated = 0;

  for (const row of document.matchSources) {
    const eventId = eventIdFromUrl(row.sourceUrl);
    if (!eventId || row.status === "played" || failed.has(eventId)) continue;

    if (!cache.has(eventId)) {
      try {
        const [event, statistics] = await Promise.all([
          getJson(`${API_ROOT}/event/${eventId}`),
          getJson(`${API_ROOT}/event/${eventId}/statistics`).catch(() => ({
            statistics: [],
          })),
        ]);
        cache.set(eventId, { event, statistics });
      } catch (error) {
        failed.add(eventId);
        console.error(
          `No se pudo consultar el evento ${eventId}: ${String(error)}`,
        );
        continue;
      }
    }

    const payload = cache.get(eventId)!;
    const next = applyFinishedEvent(row, payload.event, payload.statistics);
    if (next !== row) {
      Object.assign(row, next);
      updated += 1;
    }
  }

  if (!dryRun && updated > 0) {
    await writeFile(DATA_PATH, `${JSON.stringify(document, null, 2)}\n`);
  }

  console.log(
    `${dryRun ? "Dry run: " : ""}${updated} filas actualizadas desde ${cache.size} eventos; ${failed.size} consultas fallidas.`,
  );
  if (failed.size > 0) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
