import { beforeEach, describe, expect, it } from "vitest";
import ConferenceService from "./ConferenceService";
import demoConferences from "../data/demoConferences";

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
