import { describe, expect, it } from "vitest";
import { MOTIONS } from "../constants";
import demoConferences from "../data/demoConferences";
import { buildMotionPhrases, buildPhraseIndex, findHighlightRanges } from "./motionParser";

// Same roster shape MotionPage.jsx passes in: the demo UNSC plus a delegation
// with no country code.
const UNSC = [
  ...demoConferences[0].committees[0].delegates.map((d) => ({ name: d.countryDisplay, code: d.countryCode })),
  { name: "Press Corps", code: null },
];

const MOTION_PHRASES = buildMotionPhrases(MOTIONS);
const UNSC_INDEX = buildPhraseIndex(UNSC, MOTION_PHRASES);
// LandingPage's demo input passes no roster, so every country is matchable.
const ALL_COUNTRIES_INDEX = buildPhraseIndex(undefined, MOTION_PHRASES);

function parse(text, { index = UNSC_INDEX, fuzzyLevel = 0.3 } = {}) {
  return findHighlightRanges(text, fuzzyLevel, index);
}

function meta(text, options) {
  return parse(text, options).meta;
}

// Fields left out of an expectation must come back null, so a case can't
// pass while the parser invents a value nobody asked for.
function expectMeta(text, expected, options) {
  expect(meta(text, options)).toEqual({
    motion: null,
    delegation: null,
    topic: null,
    speakingTime: null,
    totalTime: null,
    ...expected,
  });
}

describe("motion parser: phrasings that already worked", () => {
  it.each([
    [
      "Motion to open a moderated caucus for 10 minutes with 1 minute speaking time on the topic of nuclear disarmament",
      { motion: "Moderated Caucus", topic: "nuclear disarmament", speakingTime: 1, totalTime: 10 },
    ],
    [
      "Open a moderated caucus for 10 minutes, 1 minute each, on the topic of nuclear disarmament",
      { motion: "Moderated Caucus", topic: "nuclear disarmament", speakingTime: 1, totalTime: 10 },
    ],
    [
      "mod caucus 10 min 1 min each topic nuclear disarmament",
      { motion: "Moderated Caucus", topic: "nuclear disarmament", speakingTime: 1, totalTime: 10 },
    ],
    [
      "moderated caucus to discuss nuclear disarmament for 10 minutes with 1 minute speaking time",
      { motion: "Moderated Caucus", topic: "nuclear disarmament", speakingTime: 1, totalTime: 10 },
    ],
    [
      "mod caucus on the topic of protecting digital rights and freedom of expression for 10 minutes with 45 seconds speaking time",
      { motion: "Moderated Caucus", topic: "protecting digital rights and freedom of expression", speakingTime: 0.75, totalTime: 10 },
    ],
    [
      "Japan moves to open a moderated caucus for 8 minutes with 40 second speaking time on the topic of AI in warfare",
      { motion: "Moderated Caucus", delegation: "Japan", topic: "AI in warfare", speakingTime: 40 / 60, totalTime: 8 },
    ],
    [
      "mod caucus for 10 minutes on the topic of the role of the US in nuclear disarmament",
      { motion: "Moderated Caucus", topic: "the role of the US in nuclear disarmament", totalTime: 10 },
    ],
    ["Moderated caucus for 10 minutes", { motion: "Moderated Caucus", totalTime: 10 }],
    ["the delegation of China moves to open a moderated caucus for 10 minutes", { motion: "Moderated Caucus", delegation: "China", totalTime: 10 }],
    ["Press Corps motions to open a moderated caucus for 10 minutes", { motion: "Moderated Caucus", delegation: "Press Corps", totalTime: 10 }],
  ])("%s", (text, expected) => expectMeta(text, expected));

  it.each([
    ["unmod for 10 minutes", { motion: "Unmoderated Caucus", totalTime: 10 }],
    ["unmod 10 min", { motion: "Unmoderated Caucus", totalTime: 10 }],
    ["United Kingdom motions for an unmoderated caucus of 20 minutes", { motion: "Unmoderated Caucus", delegation: "United Kingdom", totalTime: 20 }],
    ["unmoderated caucus for 5 minutes to draft resolutions", { motion: "Unmoderated Caucus", totalTime: 5 }],
    ["The delegate of the United States motions for an unmod for 10 minutes", { motion: "Unmoderated Caucus", delegation: "United States", totalTime: 10 }],
    ["USA motions for an unmod for 10 minutes", { motion: "Unmoderated Caucus", delegation: "USA", totalTime: 10 }],
    ["US motions for an unmod for 10 minutes", { motion: "Unmoderated Caucus", delegation: "US", totalTime: 10 }],
    ["unmoderted caucus for 10 mintues", { motion: "Unmoderated Caucus", totalTime: 10 }],
  ])("%s", (text, expected) => expectMeta(text, expected));

  it.each([
    ["Motion to extend the moderated caucus by 5 minutes", { motion: "Extend the Mod Caucus", totalTime: 5 }],
    ["extend mod 5 min", { motion: "Extend the Mod Caucus", totalTime: 5 }],
    ["Motion to extend speaking time to 90 seconds", { motion: "Extend Speaking Time", speakingTime: 1.5 }],
    ["extend the speaking time by 30 seconds", { motion: "Extend Speaking Time", speakingTime: 0.5 }],
    ["Extend the speaker's list", { motion: "Extend the Speaker's List" }],
  ])("%s", (text, expected) => expectMeta(text, expected));

  it.each([
    ["Motion to adjourn the meeting", "Adjourn Meeting"],
    ["suspend the meeting", "Suspend Meeting"],
    ["move into voting procedure", "Move to Voting Procedure"],
    ["Motion to close debate", "Closure of Debate"],
    ["motion for closure of debate", "Closure of Debate"],
    ["Right to reply", "Right to Reply"],
    ["Appeal the decision of the chair", "Appeal the Chair"],
    ["Motion to divide the house", "Divide the House"],
    ["Motion to divide the question", "Divide the Question"],
    ["Introduce a draft resolution", "Introduce Draft Resolution"],
    ["Motion to open the GSL", "Open the GSL"],
    ["open the general speakers list", "Open the GSL"],
    ["Motion to change the agenda", "Change the Agenda"],
    ["table for incompetence", "Table for Incompetence"],
    ["explanation of vote", "Explanation of Vote"],
  ])("%s", (text, motion) => expectMeta(text, { motion }));

  it.each([
    ["united kingdom motions to adjourn the meeting", { motion: "Adjourn Meeting", delegation: "United Kingdom" }],
    ["Russian Federation motions to suspend the meeting", { motion: "Suspend Meeting", delegation: "Russian Federation" }],
    ["Motion to suspend the meeting for 15 minutes", { motion: "Suspend Meeting", totalTime: 15 }],
  ])("%s", (text, expected) => expectMeta(text, expected));

  it("matches countries outside the committee when no roster is given", () => {
    expectMeta("Holland motions to adjourn the meeting", { motion: "Adjourn Meeting", delegation: "Holland" }, { index: ALL_COUNTRIES_INDEX });
  });

  it.each(["hello", "10 minutes", ""])("finds nothing in %j", (text) => expectMeta(text, {}));
});
