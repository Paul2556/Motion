import { describe, expect, it } from "vitest";
import { attendanceChanges, getDelegateState } from "./attendance";

const absent = { id: "a", present: false, voting: false };
const present = { id: "p", present: true, voting: false };
const voting = { id: "v", present: true, voting: true };

describe("getDelegateState", () => {
  it("reads the three roll call states", () => {
    expect([absent, present, voting].map(getDelegateState)).toEqual(["absent", "present", "voting"]);
  });
});

describe("attendanceChanges", () => {
  it("lists only delegates whose state would change, with what to undo to", () => {
    expect(attendanceChanges([absent, present, voting], "voting")).toEqual([
      { id: "a", previousState: "absent" },
      { id: "p", previousState: "present" },
    ]);
  });

  it("is empty when the click wouldn't change anything", () => {
    expect(attendanceChanges([voting], "voting")).toEqual([]);
    expect(attendanceChanges([absent, absent], "absent")).toEqual([]);
  });
});
