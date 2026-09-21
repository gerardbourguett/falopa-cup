import { describe, expect, it } from "vitest";

import { applyFinishedEvent, eventIdFromUrl } from "./update-conference-r16";

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
});
