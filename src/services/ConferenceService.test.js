import { beforeEach, describe, expect, it, vi } from "vitest";
import ConferenceService from "./ConferenceService";
import demoConferences from "../data/demoConferences";
import { memoryStorage } from "../testUtils/memoryStorage";

describe("ConferenceService speaking record", () => {
  let delegate;

  beforeEach(() => {
    ConferenceService.loadDemoConference(demoConferences[0]);
    delegate = ConferenceService.getDelegates()[0];
  });

  it("undoing a recorded speech removes it from the statistics", () => {
    const before = { hasSpoken: delegate.hasSpoken, speakingTime: delegate.speakingTime };

    ConferenceService.markSpoken(delegate.id, 45);
    ConferenceService.restoreSpeaking(delegate.id, before);
    ConferenceService.markSpoken(delegate.id, 45);

    const stats = ConferenceService.getStatistics();
    expect(stats.spoken).toBe(1);
    expect(stats.totalSpeakingTime).toBe(45);
  });
});

describe("ConferenceService loading a conference", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", memoryStorage());
    ConferenceService.loadDemoConference(demoConferences[0]);
  });

  it("prepares a conference without replacing the one in use", () => {
    const before = ConferenceService.getConference();
    const prepared = ConferenceService.prepareConference(demoConferences[1].name, demoConferences[1].committees);

    expect(Object.keys(prepared.committees).length).toBeGreaterThan(0);
    expect(ConferenceService.getConference()).toBe(before);
  });

  it("switches over, with the chosen committee active, only once committed", () => {
    const prepared = ConferenceService.prepareConference(demoConferences[1].name, demoConferences[1].committees);
    const chosen = Object.keys(prepared.committees).at(-1);

    ConferenceService.commitConference(prepared, chosen);

    expect(ConferenceService.getConference().name).toBe(demoConferences[1].name);
    expect(ConferenceService.getActiveCommittee().id).toBe(chosen);
  });

  it("forgets the old conference's saved votes and queues once a new one is committed", () => {
    const id = ConferenceService.getActiveCommittee().id;
    sessionStorage.setItem(`motion-vote-${id}`, "{}");
    sessionStorage.setItem(`general-vote-${id}`, "{}");
    sessionStorage.setItem(`motion-speakers-${id}`, "{}");

    const prepared = ConferenceService.prepareConference(demoConferences[0].name, demoConferences[0].committees);
    expect(sessionStorage.getItem(`motion-vote-${id}`)).toBe("{}");

    ConferenceService.commitConference(prepared, id);
    expect(sessionStorage.getItem(`motion-vote-${id}`)).toBeNull();
    expect(sessionStorage.getItem(`general-vote-${id}`)).toBeNull();
    expect(sessionStorage.getItem(`motion-speakers-${id}`)).toBeNull();
  });
});

describe("ConferenceService statistics", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", memoryStorage());
    ConferenceService.loadDemoConference(demoConferences[0]);
  });

  it("doesn't count a delegate skipped before the timer ran as having spoken", () => {
    const [first] = ConferenceService.getDelegates();

    expect(ConferenceService.markSpoken(first.id, 0)).toBe(false);

    const stats = ConferenceService.getStatistics();
    expect(stats.spoken).toBe(0);
    expect(ConferenceService.getDelegate(first.id).hasSpoken).toBe(false);
  });

  it("counts everyone as remaining before roll call", () => {
    const stats = ConferenceService.getStatistics();
    expect(stats.remaining).toBe(stats.delegates);
  });

  it("leaves absent delegates out of remaining once roll call is taken", () => {
    const [absent, spoke, ...rest] = ConferenceService.getDelegates();
    ConferenceService.setAttendanceState(absent.id, "absent");
    for (const delegate of [spoke, ...rest]) ConferenceService.setAttendanceState(delegate.id, "present");
    ConferenceService.markSpoken(spoke.id, 30);

    expect(ConferenceService.getStatistics().remaining).toBe(rest.length);
  });
});

describe("ConferenceService restoring after a reload", () => {
  const KEY = "motion-conference-session";

  beforeEach(() => vi.stubGlobal("sessionStorage", memoryStorage()));

  function reloadWith(raw) {
    sessionStorage.setItem(KEY, raw);
    ConferenceService.reset();
    ConferenceService.restore();
  }

  it("brings back the conference that was in use", () => {
    ConferenceService.loadDemoConference(demoConferences[0]);
    const id = ConferenceService.getActiveCommittee().id;

    ConferenceService.reset();
    ConferenceService.restore();

    expect(ConferenceService.isLoaded()).toBe(true);
    expect(ConferenceService.getActiveCommittee().id).toBe(id);
  });

  // sessionStorage outlives a deploy, so a reload can hand new code an old or broken shape.
  it("starts empty instead of crashing when the saved conference is unusable", () => {
    for (const raw of ["null", "[]", '"x"', '{"committees":"x"}', '{"committees":{"A":{"id":"A"}}}', '{"committees":{"A":null}}']) {
      reloadWith(raw);
      expect(ConferenceService.isLoaded()).toBe(false);
      expect(ConferenceService.getActiveCommittee()).toBeNull();
      expect(ConferenceService.getDelegates()).toEqual([]);
    }
  });

  it("restores delegate names as text even if the save holds something else", () => {
    reloadWith(JSON.stringify({ name: "X", activeCommittee: "A", committees: { A: { id: "A", delegates: [{ id: "d1", country: "france", countryDisplay: { broken: true }, delegate: 7 }] } } }));
    expect(ConferenceService.getDelegates()[0]).toMatchObject({ id: "d1", country: "france", countryDisplay: "", delegate: "7" });
  });

  it("falls back to the first committee when the saved active one is gone", () => {
    reloadWith(JSON.stringify({ name: "X", committees: { A: { id: "A", delegates: [] } }, activeCommittee: "B" }));
    expect(ConferenceService.getActiveCommittee().id).toBe("A");
  });
});

describe("ConferenceService delegate records", () => {
  it("stores every text field as text, whatever the spreadsheet cell held", () => {
    const prepared = ConferenceService.prepareConference("X", [
      {
        id: "A",
        title: "A",
        chairs: [{ name: 7, email: { formula: "A1" } }],
        pages: [],
        delegates: [{ country: "france", countryDisplay: "France", name: 42, school: { error: "#REF!" }, email: null }],
      },
    ]);

    const [delegate] = prepared.committees.A.delegates;
    expect(delegate).toMatchObject({ country: "france", countryDisplay: "France", delegate: "42", school: "", email: "" });
    expect(prepared.committees.A.chairs[0]).toMatchObject({ name: "7", email: "" });
  });
});
