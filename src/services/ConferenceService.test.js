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
