import { describe, expect, it } from "vitest";
import { adjustVoteGroups, buildInitialGroups, isCachedVoteUsable, toggleAbstainGroups } from "./voteGroups";
import { getVoteStatusLabel } from "./voteStatus";

const seats = (groups) => groups.map((g) => g.seats);

describe("adjustVoteGroups", () => {
  it("moves a delegate from Against to For and back", () => {
    const groups = buildInitialGroups(10, 0);
    const voted = adjustVoteGroups(groups, 0, 1);
    expect(seats(voted)).toEqual([1, 9]);
    expect(seats(adjustVoteGroups(voted, 0, -1))).toEqual([0, 10]);
  });

  it("ignores a selection pointing at an Abstain group that no longer exists", () => {
    const groups = buildInitialGroups(10, 0);
    expect(seats(adjustVoteGroups(groups, 2, 1))).toEqual([0, 10]);
    expect(seats(adjustVoteGroups(groups, 2, -1))).toEqual([0, 10]);
  });

  it("never moves an absent delegate's forced abstention", () => {
    const groups = buildInitialGroups(10, 5);
    expect(seats(adjustVoteGroups(groups, 2, -1))).toEqual([0, 10, 5]);
    const abstained = adjustVoteGroups(groups, 2, 2);
    expect(seats(abstained)).toEqual([0, 8, 7]);
    expect(seats(adjustVoteGroups(abstained, 2, -5))).toEqual([0, 10, 5]);
  });

  it("lets present delegates abstain and un-abstain once the toggle adds the group", () => {
    const withAbstain = toggleAbstainGroups(buildInitialGroups(10, 0));
    const abstained = adjustVoteGroups(withAbstain, 2, 3);
    expect(seats(abstained)).toEqual([0, 7, 3]);
    expect(seats(adjustVoteGroups(abstained, 2, -3))).toEqual([0, 10, 0]);
  });
});

describe("getVoteStatusLabel", () => {
  const tally = (forSeats, againstSeats) => [{ seats: forSeats }, { seats: againstSeats }];

  it.each([
    [6, 3, "Super Majority"],
    [2, 1, "Super Majority"],
    [4, 2, "Super Majority"],
    [5, 4, "Simple Majority"],
    [7, 3, "Super Majority"],
    [6, 4, "Simple Majority"],
    [5, 5, null],
    [10, 0, "Full House"],
  ])("For %i, Against %i reads %j", (forSeats, againstSeats, label) => {
    expect(getVoteStatusLabel(tally(forSeats, againstSeats))).toBe(label);
  });
});

describe("isCachedVoteUsable", () => {
  const cached = (presentCount, absentCount) => ({ groups: buildInitialGroups(presentCount, absentCount), absentCount });

  it("reuses a tally taken with the same attendance", () => {
    expect(isCachedVoteUsable(cached(20, 0), 20, 0)).toBe(true);
    expect(isCachedVoteUsable(cached(15, 5), 20, 5)).toBe(true);
  });

  it("drops a tally once roll call changes who is absent, even if the roster size matches", () => {
    expect(isCachedVoteUsable(cached(20, 0), 20, 5)).toBe(false);
  });

  it("drops a tally for a different roster size, or one saved before attendance was recorded", () => {
    expect(isCachedVoteUsable(cached(20, 0), 21, 0)).toBe(false);
    expect(isCachedVoteUsable({ groups: buildInitialGroups(20, 0) }, 20, 0)).toBe(false);
    expect(isCachedVoteUsable(null, 20, 0)).toBe(false);
  });
});
