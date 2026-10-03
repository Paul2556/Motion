import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearCommitteeCaches, generalVoteKey, motionVoteKey, speakersKey } from "./committeeCaches";
import { memoryStorage, storageKeys } from "./testUtils/memoryStorage";

describe("clearCommitteeCaches", () => {
  beforeEach(() => vi.stubGlobal("sessionStorage", memoryStorage()));

  it("drops every committee's saved vote, motion log, and speakers' list", () => {
    for (const id of ["UNSC", "DISEC"]) {
      sessionStorage.setItem(motionVoteKey(id), "{}");
      sessionStorage.setItem(generalVoteKey(id), "{}");
      sessionStorage.setItem(speakersKey(id), "{}");
    }
    clearCommitteeCaches();
    expect(sessionStorage.length).toBe(0);
  });

  it("keeps everything else in the tab", () => {
    sessionStorage.setItem("motion-conference-session", "{}");
    sessionStorage.setItem("motion-live-session", "abc");
    sessionStorage.setItem(motionVoteKey("UNSC"), "{}");
    clearCommitteeCaches();
    expect(storageKeys(sessionStorage).sort()).toEqual(["motion-conference-session", "motion-live-session"]);
  });
});
