import { describe, expect, it } from "vitest";
import { initialSpeakersQueue, restoreSavedSession } from "./speakersQueue";

function delegate(country, countryCode, present) {
  return { id: countryCode, country, countryDisplay: country, countryCode, present };
}

const ROSTER = [
  delegate("United States", "USA", true),
  delegate("Algeria", "DZA", false),
  delegate("Brazil", "BRA", true),
  delegate("Russian Federation", "RUS", true),
  delegate("Netherlands", "NLD", true),
];

const countriesOf = (queue) => queue.map((entry) => entry.country);

describe("initialSpeakersQueue", () => {
  it("seeds only delegates marked present, alphabetically, once roll call has been taken", () => {
    expect(countriesOf(initialSpeakersQueue(ROSTER, { seedQueue: true }))).toEqual(["Brazil", "Netherlands", "Russia", "United States"]);
  });

  it("seeds the whole roster when nobody has been marked present yet", () => {
    const noRollCall = ROSTER.map((d) => ({ ...d, present: false }));
    expect(countriesOf(initialSpeakersQueue(noRollCall, { seedQueue: true }))).toEqual(["Algeria", "Brazil", "Netherlands", "Russia", "United States"]);
  });

  it.each([
    ["US", "United States"],
    ["USA", "United States"],
    ["united states", "United States"],
    ["Russian Federation", "Russia"],
    ["Holland", "Netherlands"],
    ["Brazil", "Brazil"],
  ])("seeds the mover named %j", (seedProposer, country) => {
    expect(countriesOf(initialSpeakersQueue(ROSTER, { seedProposer }))).toEqual([country]);
  });

  it("seeds nothing for a mover outside the committee, or with no seed at all", () => {
    expect(initialSpeakersQueue(ROSTER, { seedProposer: "France" })).toEqual([]);
    expect(initialSpeakersQueue(ROSTER, {})).toEqual([]);
  });

  it("keeps a delegation with no country code", () => {
    const press = { id: "press", country: "Press Corps", countryDisplay: "Press Corps", countryCode: null, present: true };
    expect(initialSpeakersQueue([press], { seedProposer: "press corps" })).toEqual([{ id: "press", country: "Press Corps", countryCode: null }]);
  });
});

describe("restoreSavedSession", () => {
  const saved = {
    queue: [{ id: "BRA", country: "Brazil" }, { id: "gone", country: "Atlantis" }],
    history: [{ id: "USA", country: "United States" }],
  };

  it("restores the queue and spoken history for delegates still on the roster", () => {
    expect(restoreSavedSession(saved, ROSTER)).toEqual({
      queue: [{ id: "BRA", country: "Brazil" }],
      history: [{ id: "USA", country: "United States" }],
    });
  });

  it("starts empty when nothing was saved or the save is unreadable", () => {
    expect(restoreSavedSession(null, ROSTER)).toEqual({ queue: [], history: [] });
    expect(restoreSavedSession({ queue: "oops" }, ROSTER)).toEqual({ queue: [], history: [] });
  });
});
