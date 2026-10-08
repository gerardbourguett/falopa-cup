import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { applyFinishedEvent, createGetJson, eventIdFromUrl, isMainModule, runUpdate, updateDocument, type R16Document, type SourceRow } from "./update-conference-r16";

const finishedEvent = {
  event: {
    status: { type: "finished" },
    homeScore: { current: 3 },
    awayScore: { current: 1 },
  },
};

const statistics = {
  statistics: [
    {
      period: "ALL",
      groups: [
        {
          statisticsItems: [
            { name: "Yellow cards", home: 4, away: 2 },
            { name: "Red cards", home: 0, away: 1 },
          ],
        },
      ],
    },
  ],
};

describe("Conference R16 updater", () => {
  it("reads real numeric values instead of rejecting display strings", () => {
    const payload = { statistics: [{ period: "ALL", groups: [{ statisticsItems: [
      { name: "Yellow cards", home: "4", away: "2", homeValue: 4, awayValue: 2 },
    ] }] }] };
    expect(applyFinishedEvent({ status: "scheduled", isHome: true }, finishedEvent, payload).yellowCards).toBe(4);
  });

  it("clears unverified old discipline when correcting a played score", () => {
    expect(applyFinishedEvent({ status: "played", isHome: true, yellowCards: 9, redCards: 1 }, finishedEvent, {}))
      .toMatchObject({ yellowCards: null, redCards: null });
  });

  it("uses ALL even when the first half comes first", () => {
    const period = (label: string, cards: number) => ({ period: label, groups: [{ statisticsItems: [
      { name: "Yellow cards", home: cards, away: 0 },
    ] }] });
    expect(applyFinishedEvent({ status: "scheduled", isHome: true }, finishedEvent, {
      statistics: [period("1ST", 1), period("ALL", 4)],
    }).yellowCards).toBe(4);
  });

  it("extracts the SofaScore event id", () => {
    expect(
      eventIdFromUrl("https://www.sofascore.com/match/foo#id:16280820"),
    ).toBe("16280820");
    expect(eventIdFromUrl()).toBeNull();
  });

  it("maps a finished home result and discipline to the participant", () => {
    expect(
      applyFinishedEvent(
        { status: "scheduled", isHome: true },
        finishedEvent,
        statistics,
      ),
    ).toMatchObject({
      status: "played",
      goalsFor: 3,
      goalsAgainst: 1,
      yellowCards: 4,
      redCards: 0,
    });
  });

  it("inverts the score and discipline for the away participant", () => {
    expect(
      applyFinishedEvent(
        { status: "scheduled", isHome: false },
        finishedEvent,
        statistics,
      ),
    ).toMatchObject({
      status: "played",
      goalsFor: 1,
      goalsAgainst: 3,
      yellowCards: 2,
      redCards: 1,
    });
  });

  it("does not modify a match that is not finished", () => {
    const row = { status: "scheduled" as const, isHome: true };
    expect(
      applyFinishedEvent(
        row,
        { event: { status: { type: "inprogress" } } },
        statistics,
      ),
    ).toBe(row);
  });

  it.each([null, undefined, "", " ", "-1", -1, 1.5, "1.5", Infinity, true, "2 cards"])(
    "keeps invalid card count %s unknown", (value) => {
      const payload = { statistics: [{ period: "ALL", groups: [{ statisticsItems: [
        { name: "Yellow cards", homeValue: value, home: "4" },
      ] }] }] };
      expect(applyFinishedEvent({ status: "scheduled", isHome: true }, finishedEvent, payload).yellowCards).toBeNull();
    },
  );

  it.each([0, "0", " 4 ", 4])("accepts legacy card count %s", (value) => {
    const payload = { statistics: [{ period: "ALL", groups: [{ statisticsItems: [
      { name: "Yellow cards", home: value },
    ] }] }] };
    expect(applyFinishedEvent({ status: "scheduled", isHome: true }, finishedEvent, payload).yellowCards).toBe(Number(value));
  });

  it("does not substitute the first half when ALL is absent", () => {
    const payload = structuredClone(statistics);
    payload.statistics[0].period = "1ST";
    expect(applyFinishedEvent({ status: "played", isHome: true, redCards: 0 }, finishedEvent, payload))
      .toMatchObject({ yellowCards: null, redCards: null });
  });

  it("uses normal-time goals and rejects ambiguous result formats", () => {
    const row = { status: "scheduled" as const, isHome: true };
    const event = { event: { ...finishedEvent.event, homeScore: { current: 5, normaltime: 2 }, awayScore: { current: 4, normaltime: 1 } } };
    expect(applyFinishedEvent(row, event, statistics).goalsFor).toBe(2);
    for (const score of [{ current: 5, penalties: 4 }, { current: 2, extra1: 1 }, { current: -1 }, { current: null }]) {
      expect(() => applyFinishedEvent(row, { event: { ...finishedEvent.event, homeScore: score } }, statistics)).toThrow();
    }
    expect(() => applyFinishedEvent(row, { event: { ...finishedEvent.event, status: { type: "finished", code: 120 } } }, statistics)).toThrow(/manual review/);
  });
});

const sourceUrl = "https://www.sofascore.com/football/match/adt-alianza/lWshlJc#id:16280829";
const row: SourceRow = {
  sourceUrl, clubId: "pe-alianza-lima", homeClub: "Alianza Lima", awayClub: "ADT",
  sourceDate: "2026-09-19", windowStart: "2026-08-28", windowEnd: "2026-09-20",
  status: "played", isHome: true, goalsFor: 9, goalsAgainst: 9, yellowCards: 9, redCards: 9,
};
const eventPayload = {
  event: {
    id: 16280829, status: { type: "finished", code: 100 }, season: { year: "2026" },
    startTimestamp: 1789779600, venue: { country: { alpha2: "PE" } },
    homeTeam: { name: "Alianza Lima", country: { alpha2: "PE" } },
    awayTeam: { name: "Asociación Deportiva Tarma", shortName: "ADT", country: { alpha2: "PE" } },
    homeScore: { current: 2, normaltime: 2 }, awayScore: { current: 0, normaltime: 0 },
  },
};
const realStatistics = { statistics: [{ period: "ALL", groups: [{ groupName: "Match overview", statisticsItems: [
  { name: "Yellow cards", home: "0", away: "1", homeValue: 0, awayValue: 1 },
  { name: "Red cards", home: "0", away: "1", homeValue: 0, awayValue: 1 },
] }] }] };
const makeDocument = (rows = [row]): R16Document => ({ edition: 2026, extendedWindowEnd: "2026-09-20", matchSources: structuredClone(rows) });
const getJson = async (url: string) => url.endsWith("/statistics") ? realStatistics : eventPayload;

describe("Approved ADT rescheduling exception (offline)", () => {
  const source = {
    ...row, id: "KO-R16-pe-adt-1", tieId: "R16-2", roundId: "KO-R16",
    clubId: "pe-adt", homeClub: "ADT", awayClub: "Cienciano",
    sourceDate: "2026-09-23", sourceUrl: "https://www.sofascore.com/es/football/match/asociacion-deportiva-tarma-cienciano/bWshlJc#id:17059625",
  };
  const approvedDocument = () => ({ ...makeDocument([source]), roundId: "KO-R16" });
  const event = {
    ...eventPayload.event, id: 17059625,
    startTimestamp: Date.parse("2026-09-23T20:00:00Z") / 1000,
    homeTeam: eventPayload.event.awayTeam,
    awayTeam: { name: "Cienciano", country: { alpha2: "PE" } },
    awayScore: { current: 1, normaltime: 1 },
  };
  const cards = { statistics: [{ period: "ALL", groups: [{ groupName: "Match overview", statisticsItems: [
    { name: "Yellow cards", home: 3, away: 4 },
    { name: "Red cards", home: 0, away: 0 },
  ] }] }] };

  it("refreshes only the approved fixture without extending the R16 window", async () => {
    const document = approvedDocument();
    const before = structuredClone(document);
    const result = await updateDocument(document, async (url) => url.endsWith("/statistics") ? cards : { event });
    expect(result).toMatchObject({ updated: 1, issues: [], pendingDiscipline: 0 });
    expect(result.document.matchSources[0]).toMatchObject({ sourceDate: "2026-09-23", goalsFor: 2, goalsAgainst: 1, yellowCards: 3, redCards: 0, windowEnd: "2026-09-20" });
    expect(result.document.extendedWindowEnd).toBe("2026-09-20");
    expect(document).toEqual(before);
  });

  it.each([
    "date", "event", "team", "opponent", "season", "round", "row-round", "club", "tie", "row-id", "side", "country", "window", "arbitrary-flag",
  ])("rejects an unapproved %s even with otherwise matching source identity", async (change) => {
    const document = approvedDocument();
    const fixture = structuredClone(event);
    const candidate = document.matchSources[0];
    if (change === "date") fixture.startTimestamp += 86400;
    if (change === "event" || change === "arbitrary-flag") {
      fixture.id = 17059626;
      candidate.sourceUrl = source.sourceUrl.replace("17059625", "17059626");
      Object.assign(candidate, { approved: true });
    }
    if (change === "team" || change === "club") {
      candidate.clubId = "pe-cusco"; candidate.homeClub = "Cusco";
      fixture.homeTeam = { name: "Cusco", shortName: "Cusco", country: { alpha2: "PE" } };
    }
    if (change === "opponent") { candidate.awayClub = "Alianza Lima"; fixture.awayTeam.name = "Alianza Lima"; }
    if (change === "season") { document.edition = 2025; fixture.season.year = "2025"; }
    if (change === "round") document.roundId = "KO-QF";
    if (change === "row-round") Object.assign(candidate, { roundId: "KO-QF" });
    if (change === "tie") Object.assign(candidate, { tieId: "R16-3" });
    if (change === "row-id") Object.assign(candidate, { id: "KO-R16-pe-adt-2" });
    if (change === "side") candidate.isHome = false;
    if (change === "country") fixture.venue.country.alpha2 = "CO";
    if (change === "window") candidate.windowEnd = "2026-09-21";
    const result = await updateDocument(document, async (url) => url.endsWith("/statistics") ? cards : { event: fixture });
    expect(result.updated).toBe(0);
    expect(result.document).toEqual(document);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("R16 update pipeline", () => {
  it("repairs played rows, shares cached events, and is idempotent without mutating its input", async () => {
    const document = makeDocument([row, { ...row, clubId: "pe-adt", isHome: false }]);
    const before = structuredClone(document);
    const fetcher = vi.fn(getJson);
    const result = await updateDocument(document, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ updated: 2, events: 1, pendingDiscipline: 0, issues: [] });
    expect(result.document.matchSources[0]).toMatchObject({ goalsFor: 2, goalsAgainst: 0, yellowCards: 0, redCards: 0, sourceDate: "2026-09-18" });
    expect(result.document.matchSources[1]).toMatchObject({ goalsFor: 0, goalsAgainst: 2, yellowCards: 1, redCards: 1 });
    expect(document).toEqual(before);
    expect((await updateDocument(result.document, getJson)).updated).toBe(0);
  });

  it("reports failed statistics and clears both old card counts", async () => {
    const result = await updateDocument(makeDocument(), async (url) => {
      if (url.endsWith("/statistics")) throw new Error("404 statistics");
      return eventPayload;
    });
    expect(result.document.matchSources[0]).toMatchObject({ goalsFor: 2, yellowCards: null, redCards: null });
    expect(result.pendingDiscipline).toBe(1);
    expect(result.issues.join(" ")).toContain("404 statistics");
    expect(result.issues.join(" ")).toContain("discipline pending");
  });

  it("uses zero for omitted reds only in populated full-match statistics", async () => {
    const partial = structuredClone(realStatistics);
    partial.statistics[0].groups[0].statisticsItems.pop();
    const result = await updateDocument(makeDocument(), async (url) => url.endsWith("/statistics") ? partial : eventPayload);
    expect(result.document.matchSources[0]).toMatchObject({ yellowCards: 0, redCards: 0 });
    expect(result.pendingDiscipline).toBe(0);
  });

  it("does not apply the red omission convention to yellow cards", () => {
    const payload = { statistics: [{ period: "ALL", groups: [{ groupName: "Match overview", statisticsItems: [
      { name: "Ball possession", home: "50%", away: "50%", homeValue: 50, awayValue: 50 },
    ] }] }] };
    expect(applyFinishedEvent(row, eventPayload, payload)).toMatchObject({ yellowCards: null, redCards: 0 });
  });

  it("does not infer zero from error bodies, absent ALL or empty/malformed statistics", () => {
    const invalidPayloads = [
      {}, { error: "unavailable", ...realStatistics }, { statistics: [] },
      { statistics: [{ ...realStatistics.statistics[0], period: "1ST" }] },
      { statistics: [{ period: "ALL", groups: [] }] },
      { statistics: [{ period: "ALL", groups: [{}] }] },
      { statistics: [{ period: "ALL", groups: [{ groupName: "Match overview", statisticsItems: [] }] }] },
      { statistics: [{ period: "ALL", groups: [{ groupName: "Match overview", statisticsItems: null }] }] },
      { statistics: [{ period: "ALL", groups: [{ groupName: "Match overview", statisticsItems: [null] }] }] },
      { statistics: [{ period: "ALL", groups: [{ groupName: "Match overview", statisticsItems: [{ name: "Shots", home: "4" }] }] }] },
      { statistics: [{ period: "ALL", groups: [{ groupName: "Match overview", statisticsItems: [{ name: "Shots", home: "4", away: "" }] }] }] },
      { statistics: [{ period: "ALL", groups: [{ groupName: "Match overview", statisticsItems: [{ name: "Shots", home: "unavailable", away: "unavailable" }] }] }] },
    ];
    for (const payload of invalidPayloads) {
      expect(applyFinishedEvent(row, eventPayload, payload).redCards).toBeNull();
    }
  });

  it("keeps malformed explicit reds unknown, even if other statistics are valid", () => {
    for (const value of [null, undefined, "", -1, 1.5, "invalid"]) {
      const payload = structuredClone(realStatistics);
      Object.assign(payload.statistics[0].groups[0].statisticsItems[1], { homeValue: value });
      expect(applyFinishedEvent(row, eventPayload, payload).redCards).toBeNull();
    }
    const keyed = structuredClone(realStatistics);
    Object.assign(keyed.statistics[0].groups[0].statisticsItems[1], { name: "", key: "redCards", homeValue: null });
    expect(applyFinishedEvent(row, eventPayload, keyed).redCards).toBeNull();
  });

  it("does not infer omitted reds from an otherwise valid group plus a malformed group", () => {
    const populated = { ...realStatistics.statistics[0].groups[0], statisticsItems: [realStatistics.statistics[0].groups[0].statisticsItems[0]] };
    const payload = { statistics: [{ period: "ALL", groups: [populated, { groupName: "Shots", statisticsItems: [] }] }] };
    expect(applyFinishedEvent(row, eventPayload, payload).redCards).toBeNull();
  });

  it("caches event failures and never writes an unverified correction", async () => {
    const fetcher = vi.fn(async () => { throw new Error("403 event"); });
    const document = makeDocument([row, row]);
    const result = await updateDocument(document, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.document).toEqual(document);
    expect(result.updated).toBe(0);
    expect(result.issues).toEqual(["16280829: event unavailable: Error: 403 event"]);
  });

  it.each([
    { id: 99 }, { season: { year: "2025" } },
    { homeTeam: eventPayload.event.awayTeam, awayTeam: eventPayload.event.homeTeam },
    { startTimestamp: Date.parse("2026-09-23T20:00:00Z") / 1000 },
    { venue: { country: { alpha2: "XX" } } },
  ])("rejects mismatched identity, season, date or timezone: %j", async (change) => {
    const result = await updateDocument(makeDocument(), async (url) => url.endsWith("/statistics") ? realStatistics : { event: { ...eventPayload.event, ...change } });
    expect(result.updated).toBe(0);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("rejects a participant assigned to the wrong side", async () => {
    const result = await updateDocument(makeDocument([{ ...row, isHome: false }]), getJson);
    expect(result.updated).toBe(0);
    expect(result.issues[0]).toContain("mismatch");
  });

  it("retains unfinished fixtures and reports their source status", async () => {
    const fetcher = vi.fn(async () => ({ event: { ...eventPayload.event, status: { type: "postponed", code: 60 } } }));
    const document = makeDocument([{ ...row, status: "scheduled", goalsFor: null, goalsAgainst: null, yellowCards: null, redCards: null }]);
    const result = await updateDocument(document, fetcher);
    expect(result.document).toEqual(document);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.issues[0]).toContain("postponed");
  });

  it("uses the Colombian local date for a late UTC kickoff", async () => {
    const source = { ...row, clubId: "co-atletico-nacional", homeClub: "Llaneros FC", awayClub: "Atlético Nacional", isHome: false };
    const event = { ...eventPayload.event, startTimestamp: 1789953300, venue: { country: { alpha2: "CO" } },
      homeTeam: { name: "Llaneros FC", country: { alpha2: "CO" } }, awayTeam: { name: "Atlético Nacional", country: { alpha2: "CO" } } };
    const result = await updateDocument(makeDocument([source]), async (url) => url.endsWith("/statistics") ? realStatistics : { event });
    expect(result.document.matchSources[0].sourceDate).toBe("2026-09-20");
    expect(result.updated).toBe(1);
  });

  it.each([true, false])("honors dryRun=%s and counts only actual changes", async (dryRun) => {
    const write = vi.fn(async (_document: R16Document) => {});
    const log = vi.fn();
    const options = { read: async () => makeDocument(), write, getJson, log, warn: vi.fn() };
    expect(await runUpdate(dryRun, options)).toBe(0);
    expect(write).toHaveBeenCalledTimes(dryRun ? 0 : 1);
    expect(log.mock.calls.flat().join(" ")).toContain("1 changed rows");
    const updated = (await updateDocument(makeDocument(), getJson)).document;
    write.mockClear();
    await runUpdate(false, { ...options, read: async () => updated });
    expect(write).not.toHaveBeenCalled();
  });

  it("returns a nonzero exit status for incomplete verification", async () => {
    expect(await runUpdate(true, { read: async () => makeDocument(), getJson: async () => { throw new Error("offline"); }, log: vi.fn(), warn: vi.fn() })).toBe(1);
  });

  it("rejects unsupported source URLs", () => {
    expect(eventIdFromUrl("https://example.com/#id:1")).toBeNull();
    expect(eventIdFromUrl("https://www.sofascore.com/#id:1junk")).toBeNull();
  });
});

describe("Optional provider routing (offline)", () => {
  const fakeKey = "test-only-placeholder";
  const root = "https://www.sofascore.com/api/v1/event/16280829";

  it("routes only documented endpoints with authentication in headers", async () => {
    const request = vi.fn<typeof fetch>(async (input) => new Response(JSON.stringify(
      String(input).includes("get-statistics") ? realStatistics : eventPayload,
    )));
    const get = createGetJson(fakeKey, request);
    expect(await get(root)).toEqual(eventPayload);
    expect(await get(`${root}/statistics`)).toEqual(realStatistics);
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      "https://sofascore.p.rapidapi.com/matches/detail?matchId=16280829",
      "https://sofascore.p.rapidapi.com/matches/get-statistics?matchId=16280829",
    ]);
    for (const [url, options] of request.mock.calls) {
      expect(String(url)).not.toContain(fakeKey);
      expect(options?.headers).toMatchObject({ "x-rapidapi-host": "sofascore.p.rapidapi.com", "x-rapidapi-key": fakeKey });
      expect(options?.signal).toBeInstanceOf(AbortSignal);
      expect(options?.redirect).toBe("error");
      expect(options?.method).toBe("GET");
    }
  });

  it("uses the public endpoint without a configured key and never forwards authentication", async () => {
    const request = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(eventPayload)));
    await createGetJson(undefined, request)(root);
    expect(request.mock.calls[0][0]).toBe(root);
    expect(request.mock.calls[0][1]?.headers).toEqual({ accept: "application/json" });
  });

  it("rejects unknown destinations and undocumented endpoint shapes without a request", async () => {
    const request = vi.fn<typeof fetch>();
    const get = createGetJson(fakeKey, request);
    await expect(get("https://example.com/api/v1/event/1")).rejects.toThrow("Unsupported source request URL");
    await expect(get(`${root}/incidents`)).rejects.toThrow("Unsupported source request URL");
    expect(request).not.toHaveBeenCalled();
  });

  it("sanitizes transport, HTTP, JSON and semantic errors without retry/failover", async () => {
    const adapters: Array<typeof fetch> = [
      async () => { throw new Error(fakeKey); },
      async () => new Response(fakeKey, { status: 429, statusText: fakeKey }),
      async () => new Response(fakeKey),
      async () => new Response(JSON.stringify({ error: fakeKey })),
      async () => new Response(JSON.stringify({ message: fakeKey })),
    ];
    for (const adapter of adapters) {
      const request = vi.fn(adapter);
      const error = await createGetJson(fakeKey, request)(`${root}/statistics`).catch((caught: Error) => caught);
      expect(error).toBeInstanceOf(Error);
      expect(String(error)).not.toContain(fakeKey);
      expect(String(error)).toContain("16280829");
      expect(request).toHaveBeenCalledTimes(1);
    }
  });

  it("reports HTTP 200 error envelopes as missing discipline, not verified zero", async () => {
    const request = vi.fn<typeof fetch>(async (input) => new Response(JSON.stringify(
      String(input).includes("get-statistics") ? { error: fakeKey } : eventPayload,
    )));
    const result = await updateDocument(makeDocument(), createGetJson(fakeKey, request));
    expect(result.document.matchSources[0]).toMatchObject({ yellowCards: null, redCards: null });
    expect(result.issues.join(" ")).toContain("Source error envelope");
    expect(result.issues.join(" ")).not.toContain(fakeKey);
    expect(result.pendingDiscipline).toBe(1);
  });
});

describe("CLI boundary (offline)", () => {
  const entry = resolve("scripts/update-conference-r16.ts");
  const data = resolve("src/content/conference-league-sudamericana/2026-r16-window.json");

  it("compares standard file URLs, including encoded paths", () => {
    const withSpace = resolve("directory with space/updater.ts");
    expect(isMainModule(pathToFileURL(withSpace).href, withSpace)).toBe(true);
    expect(isMainModule(pathToFileURL(entry).href, undefined)).toBe(false);
    expect(isMainModule(pathToFileURL(entry).href, data)).toBe(false);
  });

  it("runs the actual entrypoint in dry-run without network or file writes, but not on import", () => {
    const before = readFileSync(data);
    const url = JSON.stringify(pathToFileURL(entry).href);
    const run = (prefix: string) => spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
      `${prefix}; process.env.RAPIDAPI_KEY = ''; globalThis.fetch = async () => new Response('offline test', {status: 503}); await import(${url});`,
    ], { encoding: "utf8", timeout: 20_000 });
    const imported = run("process.argv = ['node']");
    expect(imported.status).toBe(0);
    expect(imported.stdout).toBe("");
    const cli = run(`process.argv = ['node', ${JSON.stringify(entry)}, '--dry-run']`);
    expect(cli.status).toBe(1);
    expect(cli.stdout).toContain("Dry run: reviewing every R16 source");
    expect(cli.stdout).toContain("0 changed rows");
    expect(cli.stderr).toContain("503");
    expect(readFileSync(data)).toEqual(before);
  });
});
