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

const ND = "nuclear disarmament";

describe("motion parser: a short motion after a filler word", () => {
  it.each([
    ["UK motions for a mod caucus for 10 min on sanctions", { motion: "Moderated Caucus", delegation: "UK", topic: "sanctions", totalTime: 10 }],
    ["Japn moves for a mod cacus for 10 min", { motion: "Moderated Caucus", delegation: "Japan", totalTime: 10 }],
    ["Frnace motions for a moderatd caucus for 10 minuets on nuclear disarmament", { motion: "Moderated Caucus", delegation: "France", topic: ND, totalTime: 10 }],
    ["France motions for an unmod for 10 minutes", { motion: "Unmoderated Caucus", delegation: "France", totalTime: 10 }],
  ])("%s", (text, expected) => expectMeta(text, expected));
});

describe("motion parser: duration written before the motion", () => {
  it.each([
    [
      "The delegate of France motions for a 10 minute moderated caucus with 1 minute speaking time on nuclear disarmament",
      { motion: "Moderated Caucus", delegation: "France", topic: ND, speakingTime: 1, totalTime: 10 },
    ],
    [
      "France motions for a 10 minute mod with 30 second speaking time on maritime security",
      { motion: "Moderated Caucus", delegation: "France", topic: "maritime security", speakingTime: 0.5, totalTime: 10 },
    ],
    ["Motion for a 15 minute unmoderated caucus", { motion: "Unmoderated Caucus", totalTime: 15 }],
    ["Brazil motions for a 15-minute unmod", { motion: "Unmoderated Caucus", delegation: "Brazil", totalTime: 15 }],
    ["a 10 min mod with 30 sec each on cyber security", { motion: "Moderated Caucus", topic: "cyber security", speakingTime: 0.5, totalTime: 10 }],
  ])("%s", (text, expected) => expectMeta(text, expected));
});

describe("motion parser: which duration is the speaking time", () => {
  it.each([
    [
      "France motions for a moderated caucus on nuclear disarmament for 10 minutes with 1 minute speaking time",
      { motion: "Moderated Caucus", delegation: "France", topic: ND, speakingTime: 1, totalTime: 10 },
    ],
    ["Moderated caucus of 15 minutes, 45 seconds per speaker, on climate finance", { motion: "Moderated Caucus", topic: "climate finance", speakingTime: 0.75, totalTime: 15 }],
    ["mod caucus 12 min 60 sec speaking time on refugees", { motion: "Moderated Caucus", topic: "refugees", speakingTime: 1, totalTime: 12 }],
    [
      "Motion for a moderated caucus for a total time of 10 minutes and a speaking time of 1 minute on nuclear disarmament",
      { motion: "Moderated Caucus", topic: ND, speakingTime: 1, totalTime: 10 },
    ],
    ["moderated caucus for 10 minutes with 1 minute per delegate about nuclear disarmament", { motion: "Moderated Caucus", topic: ND, speakingTime: 1, totalTime: 10 }],
    ["moderated caucus for 10 minutes with 1 minute per speaker regarding nuclear disarmament", { motion: "Moderated Caucus", topic: ND, speakingTime: 1, totalTime: 10 }],
    ["moderated caucus, topic: nuclear disarmament, 10 min total, 1 min speaking", { motion: "Moderated Caucus", topic: ND, speakingTime: 1, totalTime: 10 }],
    ["moderated caucus for 10 minutes with 30 seconds each on nuclear disarmament", { motion: "Moderated Caucus", topic: ND, speakingTime: 0.5, totalTime: 10 }],
    ["moderated caucus with 1 minute speaking time for 10 minutes on nuclear disarmament", { motion: "Moderated Caucus", topic: ND, speakingTime: 1, totalTime: 10 }],
    [
      "moderated caucus for 1.5 minutes speaking time and 9 minutes total on nuclear disarmament",
      { motion: "Moderated Caucus", topic: ND, speakingTime: 1.5, totalTime: 9 },
    ],
  ])("%s", (text, expected) => expectMeta(text, expected));
});

describe("motion parser: duration formats", () => {
  it.each([
    ["mod 10min 1min nuclear disarmament", { motion: "Moderated Caucus", topic: ND, speakingTime: 1, totalTime: 10 }],
    ["moderated caucus for 10 mins, 90s speaking time, on nuclear disarmament", { motion: "Moderated Caucus", topic: ND, speakingTime: 1.5, totalTime: 10 }],
    ["moderated caucus for 10 minutes with 1:30 speaking time on nuclear disarmament", { motion: "Moderated Caucus", topic: ND, speakingTime: 1.5, totalTime: 10 }],
    ["moderated caucus for ten minutes with one minute speaking time on nuclear disarmament", { motion: "Moderated Caucus", topic: ND, speakingTime: 1, totalTime: 10 }],
    ["moderated caucus for 10 minutes with a minute each on nuclear disarmament", { motion: "Moderated Caucus", topic: ND, speakingTime: 1, totalTime: 10 }],
    ["moderated caucus for fifteen minutes with forty-five seconds each on nuclear disarmament", { motion: "Moderated Caucus", topic: ND, speakingTime: 0.75, totalTime: 15 }],
    ["unmod for 10m", { motion: "Unmoderated Caucus", totalTime: 10 }],
    ["Motion to suspend the meeting for 1 hour", { motion: "Suspend Meeting", totalTime: 60 }],
    ["mod caucus 10/1 nuclear disarmament", { motion: "Moderated Caucus", topic: ND, speakingTime: 1, totalTime: 10 }],
    ["unmod 15", { motion: "Unmoderated Caucus", totalTime: 15 }],
  ])("%s", (text, expected) => expectMeta(text, expected));
});

describe("motion parser: topics", () => {
  it.each([
    ["Moderated caucus on nuclear disarmament", { motion: "Moderated Caucus", topic: ND }],
    [
      "moderated caucus for 10 minutes on how the US and the UK modernise their navies",
      { motion: "Moderated Caucus", topic: "how the US and the UK modernise their navies", totalTime: 10 },
    ],
    ["moderated caucus 10 minutes 1 minute speaking time, raised by Japan", { motion: "Moderated Caucus", delegation: "Japan", speakingTime: 1, totalTime: 10 }],
    ["mod caucus on sanctions for 10 minutes, proposed by China", { motion: "Moderated Caucus", delegation: "China", topic: "sanctions", totalTime: 10 }],
    ["moderated caucus for 10 minutes concerning water scarcity.", { motion: "Moderated Caucus", topic: "water scarcity", totalTime: 10 }],
  ])("%s", (text, expected) => expectMeta(text, expected));
});

describe("motion parser: everyday words that look like country codes", () => {
  it.each([
    ["let us discuss nuclear disarmament", {}],
    ["France asks us for an unmod for 10 minutes", { motion: "Unmoderated Caucus", delegation: "France", totalTime: 10 }],
  ])("%s", (text, expected) => expectMeta(text, expected));

  it("still reads an uppercase code as the country", () => {
    expectMeta("UK motions to adjourn the meeting", { motion: "Adjourn Meeting", delegation: "UK" });
  });
});

// What the textarea backdrop colors, as [category, highlighted text] pairs.
function highlights(text, options) {
  return parse(text, options).ranges.map((r) => [r.category, text.slice(r.start, r.end)]);
}

describe("motion parser: highlighted ranges", () => {
  it("colors each part of a full motion once, in reading order", () => {
    expect(highlights("France motions for a moderated caucus on nuclear disarmament for 10 minutes with 1 minute speaking time")).toEqual([
      ["delegation", "France"],
      ["motion", "moderated caucus"],
      ["topic", "nuclear disarmament"],
      ["total-time", "for 10 minutes"],
      ["speaking-time", "with 1 minute speaking time"],
    ]);
  });

  it("colors a duration written before the motion", () => {
    expect(highlights("a 10 minute mod with 30 seconds each on cyber security")).toEqual([
      ["total-time", "10 minute"],
      ["motion", "mod"],
      ["speaking-time", "with 30 seconds each"],
      ["topic", "cyber security"],
    ]);
  });

  it("keeps a leading label with its duration", () => {
    expect(highlights("mod caucus for a total time of 10 minutes and a speaking time of 1 minute")).toEqual([
      ["motion", "mod caucus"],
      ["total-time", "total time of 10 minutes"],
      ["speaking-time", "speaking time of 1 minute"],
    ]);
  });

  it("marks a typo-corrected phrase as fuzzy", () => {
    const { ranges } = parse("Frnace motions to adjourn the meeting");
    expect(ranges.map((r) => [r.canonical, r.fuzzy])).toEqual([["France", true], ["Adjourn Meeting", false]]);
  });

  it("parses each line on its own", () => {
    const text = "unmod for 10 minutes\nChina motions for a mod caucus on sanctions for 5 min with 30 sec each";
    expect(meta(text)).toEqual({ motion: "Unmoderated Caucus", delegation: "China", topic: "sanctions", speakingTime: 0.5, totalTime: 10 });
    expect(highlights(text).map(([category]) => category)).toEqual([
      "motion", "total-time", "delegation", "motion", "topic", "total-time", "speaking-time",
    ]);
  });
});

const WS = "water security";

describe("motion parser: round two", () => {
  it.each([
    ["Mod caucus - 10 min - 1 min each - climate change", { motion: "Moderated Caucus", topic: "climate change", speakingTime: 1, totalTime: 10 }],
    ["mod caucus: climate change, 10 mins, 1 min", { motion: "Moderated Caucus", topic: "climate change", speakingTime: 1, totalTime: 10 }],
    ["mod caucus nuclear disarmament 10 min 1 min", { motion: "Moderated Caucus", topic: ND, speakingTime: 1, totalTime: 10 }],
    ["mod caucus on 'nuclear disarmament' for 10 min", { motion: "Moderated Caucus", topic: ND, totalTime: 10 }],
    ["moderated caucus for 10 minutes with .5 min speaking time on water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 0.5, totalTime: 10 }],
    ["moderated caucus for 10 minutes with 1,5 minutes speaking time on water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 1.5, totalTime: 10 }],
    ["moderated caucus for 10 minutes with 1m30s speaking time on water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 1.5, totalTime: 10 }],
    ["moderated caucus for 10 minutes with 1 minute and 30 seconds speaking time on water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 1.5, totalTime: 10 }],
    ["moderated caucus for 10 minutes with one and a half minutes speaking time on water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 1.5, totalTime: 10 }],
    ["moderated caucus for 10 minutes with 1 min/speaker on water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 1, totalTime: 10 }],
    ["moderated caucus for 10 minutes with 1min/speaker on water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 1, totalTime: 10 }],
    ["moderated caucus for 10 minutes, speaking time 1 minute, on water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 1, totalTime: 10 }],
    ["moderated caucus total time 10 minutes speaking time 1 minute topic water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 1, totalTime: 10 }],
    ["France's motion for an unmod for 10 minutes", { motion: "Unmoderated Caucus", delegation: "France", totalTime: 10 }],
    ["Russia's delegation motions for an unmod for 10 minutes", { motion: "Unmoderated Caucus", delegation: "Russia", totalTime: 10 }],
    ["mod caucus 10 min 1 min on piracy - Malta", { motion: "Moderated Caucus", delegation: "Malta", topic: "piracy", speakingTime: 1, totalTime: 10 }],
    ["mod caucus 10 min 1 min on piracy (Malta)", { motion: "Moderated Caucus", delegation: "Malta", topic: "piracy", speakingTime: 1, totalTime: 10 }],
    ["moderated caucus with the topic being maritime security for 10 minutes", { motion: "Moderated Caucus", topic: "maritime security", totalTime: 10 }],
    ["moderated caucus for the purpose of discussing maritime security for 10 minutes", { motion: "Moderated Caucus", topic: "maritime security", totalTime: 10 }],
    ["mod caucus for 10 minutes on sanctions as suggested by Japn", { motion: "Moderated Caucus", delegation: "Japan", topic: "sanctions", totalTime: 10 }],
    ["Motion to open the speakers list", { motion: "Open the GSL" }],
    ["open GSL", { motion: "Open the GSL" }],
  ])("%s", (text, expected) => expectMeta(text, expected));

  it.each([
    // Pinned so the round-two fixes can't undo them.
    ["Moderated caucus (10 min, 1 min each) on climate change", { motion: "Moderated Caucus", topic: "climate change", speakingTime: 1, totalTime: 10 }],
    ["moderated caucus for 10:00 with 1:00 speaking time on water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 1, totalTime: 10 }],
    ["moderated caucus for 10 minutes with half a minute each on water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 0.5, totalTime: 10 }],
    ["moderated caucus for 10 minutes with 45 second speeches on water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 0.75, totalTime: 10 }],
    ["moderated caucus with individual speaking time of 45 seconds for 12 minutes on water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 0.75, totalTime: 12 }],
    ["mod caucus 1 min 10 min water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 1, totalTime: 10 }],
    ["Motion to suspend the meeting for half an hour", { motion: "Suspend Meeting", totalTime: 30 }],
    ["unmod for 2 hours", { motion: "Unmoderated Caucus", totalTime: 120 }],
    ["fifteen minute unmod", { motion: "Unmoderated Caucus", totalTime: 15 }],
    ["unmod for ten-minute", { motion: "Unmoderated Caucus", totalTime: 10 }],
    ["Motion to extend the mod caucus by an additional 3 minutes", { motion: "Extend the Mod Caucus", totalTime: 3 }],
    ["Motion to extend the speaking time to one minute", { motion: "Extend Speaking Time", speakingTime: 1 }],
    ["Open a moderated caucus as proposed by France for 10 minutes on maritime security", { motion: "Moderated Caucus", delegation: "France", topic: "maritime security", totalTime: 10 }],
    ["moderated caucus regarding the US-China trade war for 10 minutes", { motion: "Moderated Caucus", topic: "the US-China trade war", totalTime: 10 }],
    ["moderated caucus on one china policy for 10 minutes", { motion: "Moderated Caucus", topic: "one china policy", totalTime: 10 }],
    ["moderated caucus on 10 years of the Paris Agreement for 10 minutes", { motion: "Moderated Caucus", topic: "10 years of the Paris Agreement", totalTime: 10 }],
    ["Is there a motion for a moderated caucus for 10 minutes on climate change?", { motion: "Moderated Caucus", topic: "climate change", totalTime: 10 }],
    ["FRANCE MOTIONS FOR A MOD CAUCUS FOR 10 MINUTES WITH 1 MINUTE SPEAKING TIME ON CLIMATE CHANGE", { motion: "Moderated Caucus", delegation: "France", topic: "CLIMATE CHANGE", speakingTime: 1, totalTime: 10 }],
  ])("%s", (text, expected) => expectMeta(text, expected));
});

describe("motion parser: bare numbers", () => {
  it.each([
    ["mod caucus 10 1 water security", { motion: "Moderated Caucus", topic: WS, speakingTime: 1, totalTime: 10 }],
    ["unmod 15 10", { motion: "Unmoderated Caucus", totalTime: 15 }],
    ["mod caucus on the 2030 agenda", { motion: "Moderated Caucus", topic: "the 2030 agenda" }],
    ["unmod 2030", { motion: "Unmoderated Caucus" }],
  ])("%s", (text, expected) => expectMeta(text, expected));
});
