import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DATA_PATH = resolve(
  "src/content/conference-league-sudamericana/2026-r16-window.json",
);
const API_ROOT = "https://www.sofascore.com/api/v1";
const RAPIDAPI_HOST = "sofascore.p.rapidapi.com";

export type SourceRow = {
  sourceUrl?: string;
  clubId?: string;
  homeClub?: string;
  awayClub?: string;
  sourceDate?: string;
  windowStart?: string;
  windowEnd?: string;
  status: "played" | "scheduled" | "tbd";
  isHome: boolean;
  goalsFor?: number | null;
  goalsAgainst?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
};

export type R16Document = {
  edition: number;
  extendedWindowEnd: string;
  matchSources: SourceRow[];
};
type GetJson = (url: string) => Promise<any>;

export function eventIdFromUrl(sourceUrl?: string): string | null {
  try {
    const url = new URL(sourceUrl ?? "");
    if (url.protocol !== "https:" || !["www.sofascore.com", "sofascore.com"].includes(url.hostname)) return null;
    return url.hash.match(/^#id:(\d+)$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function count(value: unknown): number | null {
  if (typeof value === "string" && /^\d+$/.test(value.trim())) value = Number(value);
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function hasSourceError(payload: any): boolean {
  return !!payload && typeof payload === "object" &&
    (Object.hasOwn(payload, "error") || Object.hasOwn(payload, "errors"));
}

function fullMatchStatistics(payload: any): any {
  if (hasSourceError(payload) || !Array.isArray(payload?.statistics)) return undefined;
  const all = payload.statistics.filter((period: any) => period?.period === "ALL");
  return all.length === 1 ? all[0] : undefined;
}

function populatedStatistics(all: any): boolean {
  const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  const displayValue = (value: unknown) => Number.isFinite(value) ||
    (typeof value === "string" && /^-?\d+(?:\.\d+)?(?:%| km|\/\d+ \(\d+%\))?$/.test(value.trim()));
  return Array.isArray(all?.groups) && all.groups.length > 0 && all.groups.every(
    (group: any) => text(group?.groupName) && Array.isArray(group?.statisticsItems) &&
      group.statisticsItems.length > 0 && group.statisticsItems.every((item: any) =>
        item && typeof item === "object" && !Array.isArray(item) &&
        (text(item.name) || text(item.key)) && ["home", "away"].every((side) => {
          const numericKey = `${side}Value`;
          if (Object.hasOwn(item, numericKey)) return Number.isFinite(item[numericKey]);
          return displayValue(item[side]);
        }),
      ),
  );
}

function statisticValue(
  payload: any,
  name: string,
  side: "home" | "away",
): number | null {
  const all = fullMatchStatistics(payload);
  const key = name === "Red cards" ? "redCards" : "yellowCards";
  for (const group of Array.isArray(all?.groups) ? all.groups : []) {
    const items = Array.isArray(group?.statisticsItems) ? group.statisticsItems : [];
    const item = items.find((entry: any) => entry?.name === name || entry?.key === key);
    if (item) {
      const numericKey = `${side}Value`;
      return count(Object.hasOwn(item, numericKey) ? item[numericKey] : item[side]);
    }
  }
  // User-approved convention: only absent reds in populated ALL statistics mean zero.
  // An explicit but invalid red item returns null above, never this fallback.
  return name === "Red cards" && populatedStatistics(all) ? 0 : null;
}

export function applyFinishedEvent(
  row: SourceRow,
  eventPayload: any,
  statisticsPayload: any,
  sourceDate = row.sourceDate,
): SourceRow {
  const event = eventPayload?.event;
  if (event?.status?.type !== "finished") return row;

  // Extra time / shootouts need a deliberate scoring policy, not scoreboard coercion.
  const scores = [event.homeScore, event.awayScore];
  if ((event.status.code != null && event.status.code !== 100) || scores.some(
    (score) => [score?.penalties, score?.extra1, score?.extra2, score?.overtime].some((value) => value != null),
  )) throw new Error("Extra time, shootout or non-standard result requires manual review");
  const hasNormalTime = scores.some((score) => score?.normaltime != null);
  const homeGoals = count(event?.homeScore?.[hasNormalTime ? "normaltime" : "current"]);
  const awayGoals = count(event?.awayScore?.[hasNormalTime ? "normaltime" : "current"]);
  if (homeGoals === null || awayGoals === null) throw new Error("Missing or invalid finished score");

  const side = row.isHome ? "home" : "away";
  const yellowCards = statisticValue(statisticsPayload, "Yellow cards", side);
  const redCards = statisticValue(statisticsPayload, "Red cards", side);

  const next: SourceRow = {
    ...row,
    status: "played",
    goalsFor: row.isHome ? homeGoals : awayGoals,
    goalsAgainst: row.isHome ? awayGoals : homeGoals,
    yellowCards,
    redCards,
    ...(sourceDate === undefined ? {} : { sourceDate }),
  };
  return Object.keys(next).every((key) => next[key as keyof SourceRow] === row[key as keyof SourceRow]) ? row : next;
}

export function createGetJson(rapidApiKey?: string, request: typeof fetch = fetch): GetJson {
  return async (url) => {
    const match = url.match(/^https:\/\/www\.sofascore\.com\/api\/v1\/event\/(\d+)(\/statistics)?$/);
    if (!match) throw new Error("Unsupported source request URL");
    const [, id, statistics] = match;
    const kind = statistics ? "statistics" : "detail";
    const configured = !!rapidApiKey?.trim();
    const target = configured
      ? `https://${RAPIDAPI_HOST}/matches/${statistics ? "get-statistics" : "detail"}?matchId=${id}`
      : url;
    const headers: Record<string, string> = { accept: "application/json" };
    if (configured) {
      headers["x-rapidapi-host"] = RAPIDAPI_HOST;
      headers["x-rapidapi-key"] = rapidApiKey!;
    }
    let response: Response;
    try {
      response = await request(target, {
        method: "GET", headers, signal: AbortSignal.timeout(15_000), redirect: "error",
      });
    } catch {
      // Transport errors can contain request headers; never print their raw messages.
      throw new Error(`Source request failed: event ${id} ${kind}`);
    }
    if (!response.ok) throw new Error(`Source HTTP ${response.status}: event ${id} ${kind}`);
    let payload: any;
    try {
      payload = await response.json();
    } catch {
      throw new Error(`Invalid source JSON: event ${id} ${kind}`);
    }
    if (hasSourceError(payload)) throw new Error(`Source error envelope: event ${id} ${kind}`);
    if (statistics ? !Array.isArray(payload?.statistics) : !payload?.event || typeof payload.event !== "object") {
      throw new Error(`Invalid source envelope: event ${id} ${kind}`);
    }
    return payload;
  };
}

const fetchJson = createGetJson();

const TIME_ZONES: Record<string, string> = {
  PE: "America/Lima", CO: "America/Bogota", EC: "America/Guayaquil",
  VE: "America/Caracas", PY: "America/Asuncion", UY: "America/Montevideo",
  CL: "America/Santiago", BO: "America/La_Paz",
};

function teamName(value?: string): string {
  const normalized = (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized === "racingclub" ? "racingdemontevideo" : normalized;
}

function matchesTeam(expected: string | undefined, team: any): boolean {
  return !!expected && [team?.name, team?.shortName, team?.fullName].some(
    (name) => typeof name === "string" && teamName(name) === teamName(expected),
  );
}

function verifiedDate(row: SourceRow, event: any, document: R16Document): string {
  const participant = row.isHome ? event?.homeTeam : event?.awayTeam;
  if (String(event?.id) !== eventIdFromUrl(row.sourceUrl) ||
      !matchesTeam(row.homeClub, event?.homeTeam) || !matchesTeam(row.awayClub, event?.awayTeam) ||
      !matchesTeam(row.clubId?.slice(3), participant) ||
      participant?.country?.alpha2 !== row.clubId?.slice(0, 2).toUpperCase() ||
      String(event?.season?.year) !== String(document.edition)) {
    throw new Error("Event identity, participants or season mismatch");
  }
  const country = event?.venue?.country?.alpha2 ?? event?.tournament?.category?.country?.alpha2;
  const timeZone = TIME_ZONES[country];
  if (!timeZone || !Number.isFinite(event.startTimestamp) || event.startTimestamp * 1000 > Date.now()) {
    throw new Error("Unverified timezone or kickoff timestamp");
  }
  const sourceDate = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(event.startTimestamp * 1000));
  if (!row.windowStart || !row.windowEnd || !document.extendedWindowEnd ||
      sourceDate < row.windowStart || sourceDate > document.extendedWindowEnd) {
    throw new Error(`Local fixture date ${sourceDate} is outside the approved window`);
  }
  return sourceDate;
}

export async function updateDocument(document: R16Document, getJson: GetJson = fetchJson) {
  const cache = new Map<string, { event?: any; statistics?: any; error?: string }>();
  const issues: string[] = [];
  let updated = 0;
  let pendingDiscipline = 0;
  const matchSources: SourceRow[] = [];

  for (const row of document.matchSources) {
    const eventId = eventIdFromUrl(row.sourceUrl);
    if (!eventId) {
      issues.push(`${row.clubId}: missing or unsupported source event URL`);
      matchSources.push(row);
      continue;
    }
    if (!cache.has(eventId)) {
      try {
        const event = await getJson(`${API_ROOT}/event/${eventId}`);
        let statistics;
        if (event?.event?.status?.type === "finished") {
          try {
            statistics = await getJson(`${API_ROOT}/event/${eventId}/statistics`);
          } catch (error) {
            issues.push(`${eventId}: statistics unavailable: ${String(error)}`);
          }
        }
        cache.set(eventId, { event, statistics });
      } catch (error) {
        cache.set(eventId, { error: String(error) });
        issues.push(`${eventId}: event unavailable: ${String(error)}`);
      }
    }
    const payload = cache.get(eventId)!;
    let next = row;
    if (!payload.error) {
      try {
        const event = payload.event?.event;
        if (!event?.status?.type) throw new Error("Missing event status");
        if (event.status.type === "finished") {
          next = applyFinishedEvent(row, payload.event, payload.statistics, verifiedDate(row, event, document));
        } else {
          issues.push(`${eventId}: ${event.status.type}; fixture requires review, row unchanged`);
        }
      } catch (error) {
        issues.push(`${eventId} / ${row.clubId}: ${String(error)}`);
      }
    }
    if (next !== row) updated++;
    if (next.status === "played" && (next.yellowCards == null || next.redCards == null)) {
      pendingDiscipline++;
      issues.push(`${eventId} / ${row.clubId}: discipline pending (unknown is not zero)`);
    }
    matchSources.push(next);
  }
  return { document: { ...document, matchSources }, updated, events: cache.size, pendingDiscipline, issues };
}

export async function runUpdate(dryRun: boolean, {
  read = async (): Promise<R16Document> => JSON.parse(await readFile(DATA_PATH, "utf8")),
  write = async (document: R16Document) => { await writeFile(DATA_PATH, `${JSON.stringify(document, null, 2)}\n`); },
  getJson = fetchJson,
  log = console.log,
  warn = console.error,
} = {}) {
  log(`${dryRun ? "Dry run" : "Update"}: reviewing every R16 source, including played rows.`);
  const result = await updateDocument(await read(), getJson);
  if (!dryRun && result.updated > 0) await write(result.document);
  for (const issue of result.issues) warn(issue);
  log(`${dryRun ? "Dry run: " : ""}${result.updated} changed rows; ${result.events} events; ${result.pendingDiscipline} played rows with discipline pending; ${result.issues.length} review issues.`);
  return result.issues.length > 0 ? 1 : 0;
}

export function isMainModule(moduleUrl: string, entryPath: string | undefined): boolean {
  return !!entryPath && moduleUrl === pathToFileURL(resolve(entryPath)).href;
}

if (isMainModule(import.meta.url, process.argv[1])) {
  process.exitCode = await runUpdate(process.argv.includes("--dry-run"), {
    getJson: createGetJson(process.env.RAPIDAPI_KEY),
  });
}
