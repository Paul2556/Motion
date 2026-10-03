import {
  countries,
  historicalCountries,
  CONNECTIVE_WORDS,
  MEASUREMENT_WORDS,
  SECOND_WORDS,
  HOUR_WORDS,
  NUMBER_WORDS,
  SPEAKING_LABEL_WORDS,
  TOTAL_LABEL_WORDS,
  SPEAKER_NOUNS,
  MOVER_VERBS,
  TOPIC_MARKER_PHRASE,
} from "../constants";
import { canonicalLabel } from "../motionPresets";

export function buildMotionPhrases(motions) {
  return motions.flatMap((motion) =>
    [motion.text, ...(motion.alias ?? [])].map((text) => ({
      text,
      lower: text.toLowerCase(),
      category: "motion",
      // Always the shortest alias, whichever variant matched: meta.motion is a
      // status label elsewhere, so it shouldn't carry the "Open a" verb filler
      // that only reads well in the chair's own typed sentence.
      canonical: canonicalLabel(motion),
      durationField: motion.durationField ?? null,
      requiresTopic: motion.topic === true,
    }))
  );
}
const ALL_COUNTRIES = [...countries, ...historicalCountries];
const COUNTRY_BY_CODE = new Map(ALL_COUNTRIES.map((c) => [c.code, c]));

// canonical is each phrase's own text, not the country's primary name, so
// "Hollnd" corrects to "Holland" rather than jumping to "Netherlands". Short
// codes like "US" only match when typed in capitals, so "let us" isn't a country.
function countryPhrases(country) {
  return [country.name, ...(country.alias ?? [])].map((text) => ({
    text,
    lower: text.toLowerCase(),
    category: "delegation",
    canonical: text,
    caseSensitive: text.length <= 3 && text === text.toUpperCase(),
  }));
}

// Roster entries with a country code get that country's name + aliases; those
// without (press corps, NGOs) get only their display name, since no alias
// list exists for them.
function buildDelegationPhrases(delegations) {
  if (!delegations) return ALL_COUNTRIES.flatMap(countryPhrases);

  const seen = new Set();
  const phrases = [];
  for (const { name, code } of delegations) {
    const key = code ?? name;
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const country = code ? COUNTRY_BY_CODE.get(code) : null;
    if (country) {
      phrases.push(...countryPhrases(country));
    } else if (name) {
      phrases.push({ text: name, lower: name.toLowerCase(), category: "delegation", canonical: name });
    }
  }
  return phrases;
}

// Only the delegations actually in the loaded committee, not the full
// ~190-country list, so typos are matched against a much smaller,
// actually-relevant pool. Longest phrase first, so "Open a Moderated
// Caucus" wins over any shorter phrase that might match inside it.
export function buildPhraseIndex(delegations, motionPhrases) {
  const allPhrases = [...motionPhrases, ...buildDelegationPhrases(delegations)].sort((a, b) => b.lower.length - a.lower.length);

  const byWordCount = new Map();
  for (const phrase of allPhrases) {
    const wordCount = phrase.lower.split(" ").length;
    if (!byWordCount.has(wordCount)) byWordCount.set(wordCount, []);
    byWordCount.get(wordCount).push(phrase);
  }

  return { allPhrases, byWordCount, maxWords: Math.max(...[...byWordCount.keys()]) };
}

// Edit distance counting an adjacent-letter swap as one edit (not two), since
// that's the most common typo shape - makes "Frnace" register as one typo
// away from "France" instead of two.
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[a.length][b.length];
}

// How many typos we'll tolerate for a phrase this long, scaled by
// fuzzyLevel (0 disables fuzzy matching entirely). Short phrases (3 chars
// or under, e.g. "US"/"UK") are always excluded, since almost any short
// word is "close" to them and fuzzy-matching would be pure noise.
function fuzzyBudget(length, fuzzyLevel) {
  if (fuzzyLevel <= 0 || length <= 3) return 0;
  return Math.max(1, Math.floor(length * fuzzyLevel));
}

// Same idea as fuzzyBudget but never zero for a short word - a 3-letter word
// still deserves 1 tolerated typo when checked individually (fuzzyBudget's
// zero-for-short-phrases rule exists to stop noise matching a whole short
// phrase like "US", which doesn't apply to one word inside a longer one).
function wordBudget(length, fuzzyLevel) {
  if (fuzzyLevel <= 0) return 0;
  return Math.max(1, Math.round(length * fuzzyLevel));
}

// Every word must be individually close to its counterpart, not just the
// aggregate distance, or a filler word can be absorbed into a typo ("a mod
// caucus" is two edits from "unmod caucus").
function perWordWithinBudget(windowLower, phraseLower, fuzzyLevel) {
  const windowWords = windowLower.split(" ");
  const phraseWords = phraseLower.split(" ");
  if (windowWords.length !== phraseWords.length) return false;
  return windowWords.every((word, k) => editDistance(word, phraseWords[k]) <= wordBudget(phraseWords[k].length, fuzzyLevel));
}

const TIGHT_TYPO_BUDGET = 1;

// Tight per-word fuzzy match for vocabulary words: 3-4 chars get a fixed
// 1-typo budget, 5+ scale with fuzzyLevel. Under 3 chars stays exact, since
// nearly every 2-letter word is one typo from another ("on" vs "of").
function isCloseToWord(word, target, fuzzyLevel) {
  if (word === target) return true;
  if (fuzzyLevel <= 0 || target.length < 3) return false;

  const budget = target.length < 5 ? TIGHT_TYPO_BUDGET : wordBudget(target.length, fuzzyLevel);
  if (Math.abs(word.length - target.length) > budget) return false;
  return editDistance(word, target) <= budget;
}

function isCloseToAny(word, wordSet, fuzzyLevel) {
  for (const candidate of wordSet) {
    if (isCloseToWord(word, candidate, fuzzyLevel)) return true;
  }
  return false;
}

// Minutes per unit word, or null. Durations are stored as minutes throughout
// the app (see src/utils/duration.js). Single letters ("10m", "90s") are exact.
function unitMinutes(word, fuzzyLevel) {
  if (word === "M") return 1;
  if (word === "S") return 1 / 60;
  if (word === "H") return 60;
  if (isCloseToAny(word, MEASUREMENT_WORDS, fuzzyLevel)) return 1;
  if (isCloseToAny(word, SECOND_WORDS, fuzzyLevel)) return 1 / 60;
  if (isCloseToAny(word, HOUR_WORDS, fuzzyLevel)) return 60;
  return null;
}

// Division for seconds rather than multiplying by 1/60, so 40 seconds is
// exactly 40 / 60.
function toMinutes(amount, perUnit) {
  return perUnit < 1 ? amount / Math.round(1 / perUnit) : amount * perUnit;
}

// "1.5", ".5", and the European "1,5" (a comma with 1-2 digits, so "1,000"
// isn't read as one).
const DIGITS = /^(?:\d+(?:\.\d+|,\d{1,2})?|\.\d+)$/;

function readAmount(word) {
  if (DIGITS.test(word)) return Number(word.replace(",", "."));
  return NUMBER_WORDS.get(word) ?? null;
}

// A leading "." stays when it starts a number (".5 min"); a trailing
// apostrophe stays only on a plural possessive ("speakers'").
function pushToken(tokens, raw, start) {
  const lead = raw.match(/^(?:[^\p{L}\p{N}.]|\.(?!\d))*/u)[0].length;
  let trail = lead === raw.length ? 0 : raw.match(/[^\p{L}\p{N}']*$/u)[0].length;
  const kept = raw.slice(lead, raw.length - trail);
  const apostrophes = kept.match(/'+$/)?.[0].length ?? 0;
  if (apostrophes && !/s'$/i.test(kept)) trail += apostrophes;
  tokens.push({
    start,
    end: start + raw.length,
    bareStart: start + lead,
    bareEnd: start + raw.length - trail,
    word: raw.slice(lead, raw.length - trail).toUpperCase(),
    tail: raw.slice(raw.length - trail),
  });
}

// Each line splits into whitespace tokens. `word` is the uppercased token
// without surrounding punctuation ("minutes," reads as MINUTES), `tail` is
// that trailing punctuation, and bareStart/bareEnd are offsets in the full
// text. "min/speaker" splits at the slash; "10/1" stays whole.
function tokenizeLine(text, lineStart, lineEnd) {
  const tokens = [];
  const re = /\S+/g;
  re.lastIndex = lineStart;
  let match;
  while ((match = re.exec(text)) && match.index < lineEnd) {
    const raw = match[0];
    if (!raw.includes("/") || /^\d+\/\d+\W*$/.test(raw)) {
      pushToken(tokens, raw, match.index);
      continue;
    }
    let offset = 0;
    for (const part of raw.split("/")) {
      if (part) pushToken(tokens, part, match.index + offset);
      offset += part.length + 1;
    }
  }
  return tokens;
}

// A duration starting at token i: "10 minutes", "10min", "15-minute",
// "a minute", "half a minute", "1:30", or the "10/1" total/speaking shorthand.
// Returns its amount in minutes and the index of its last token.
function readDuration(tokens, i, fuzzyLevel) {
  const word = tokens[i].word;
  const next = tokens[i + 1]?.word;

  const clock = word.match(/^(\d+):(\d{2})$/);
  if (clock) {
    const last = next !== undefined && unitMinutes(next, fuzzyLevel) === 1 ? i + 1 : i;
    return { amount: Number(clock[1]) + Number(clock[2]) / 60, last };
  }

  const pair = word.match(/^(\d+)\/(\d+)$/);
  if (pair) return { pair: { total: Number(pair[1]), speaking: Number(pair[2]) }, last: i };

  const minutesSeconds = word.match(/^(\d+)M(\d+)S?$/);
  if (minutesSeconds) return { amount: Number(minutesSeconds[1]) + Number(minutesSeconds[2]) / 60, last: i };

  // Digits can carry their unit ("10min", "90s"); a number word needs the
  // hyphen ("fifteen-minute"), or "as" would read as "a" + "s".
  const attached = word.match(/^(\d+(?:\.\d+)?)-?([A-Z]+)$/) ?? word.match(/^([A-Z]+)-([A-Z]+)$/);
  if (attached && readAmount(attached[1]) !== null) {
    const perUnit = unitMinutes(attached[2], fuzzyLevel);
    if (perUnit) return { amount: toMinutes(readAmount(attached[1]), perUnit), last: i };
  }

  if (word === "HALF" && (next === "A" || next === "AN") && tokens[i + 2]) {
    const perUnit = unitMinutes(tokens[i + 2].word, fuzzyLevel);
    if (perUnit) return { amount: toMinutes(0.5, perUnit), last: i + 2 };
  }

  const amount = readAmount(word);
  if (amount === null || next === undefined) return null;

  // "one and a half minutes"
  if (next === "AND" && tokens[i + 2]?.word === "A" && tokens[i + 3]?.word === "HALF" && tokens[i + 4]) {
    const perUnit = unitMinutes(tokens[i + 4].word, fuzzyLevel);
    if (perUnit) return { amount: toMinutes(amount + 0.5, perUnit), last: i + 4 };
  }

  const perUnit = unitMinutes(next, fuzzyLevel);
  // "for a second time" is not a one-second duration.
  if (!perUnit || ((word === "A" || word === "AN") && perUnit < 1)) return null;
  const minutes = toMinutes(amount, perUnit);

  // "1 minute and 30 seconds" is one duration; without the "and", "10 min 30
  // sec" stays two (a total and a speaking time).
  if (perUnit === 1 && tokens[i + 2]?.word === "AND" && tokens[i + 3] && tokens[i + 4]) {
    const seconds = readAmount(tokens[i + 3].word);
    const secondUnit = unitMinutes(tokens[i + 4].word, fuzzyLevel);
    if (seconds !== null && secondUnit !== null && secondUnit < 1) {
      return { amount: minutes + seconds / 60, last: i + 4 };
    }
  }
  return { amount: minutes, last: i + 1 };
}

// A label straight after a duration: "speaking time", "each", "per speaker",
// "for each delegate", "total", "in total". Returns the role and the index of
// the label's last token.
function readLabelAfter(tokens, i) {
  const word = tokens[i]?.word;
  if (word === undefined) return null;
  const next = tokens[i + 1]?.word;

  if (SPEAKING_LABEL_WORDS.has(word)) {
    let last = i;
    if (next === "TIME") last = i + 1;
    else if (word === "EACH" && SPEAKER_NOUNS.has(next)) last = i + 1;
    return { role: "speaking-time", last };
  }
  if (word === "PER" && SPEAKER_NOUNS.has(next)) return { role: "speaking-time", last: i + 1 };
  if (word === "FOR" && next === "EACH") {
    return { role: "speaking-time", last: SPEAKER_NOUNS.has(tokens[i + 2]?.word) ? i + 2 : i + 1 };
  }
  if (TOTAL_LABEL_WORDS.has(word)) return { role: "total-time", last: next === "TIME" ? i + 1 : i };
  if (word === "IN" && next === "TOTAL") return { role: "total-time", last: i + 1 };
  return null;
}

// Words allowed between a leading label and its number: "a speaking time of
// 1 minute", "total time: 10 min". No "for", so in "1 minute speaking time
// for 10 minutes" the label stays with the 1 minute.
const LABEL_GAP_WORDS = new Set(["TIME", "OF", "IS", "AT", "A", "AN", ""]);

// A label just before a duration, walking back over gap words only, so "on
// speaking rights for 10 minutes" stays unlabeled. Never looks past `floor`.
function readLabelBefore(tokens, first, floor) {
  for (let k = first - 1; k >= floor; k--) {
    const word = tokens[k].word;
    if (SPEAKING_LABEL_WORDS.has(word) && word !== "EACH" && word !== "APIECE") return { role: "speaking-time", first: k };
    if (TOTAL_LABEL_WORDS.has(word)) return { role: "total-time", first: k };
    if (!LABEL_GAP_WORDS.has(word)) return null;
  }
  return null;
}

// Every duration on the line, left to right, with any label right after it.
// A label after a duration is its own unless a comma separates them ("10
// minutes, speaking time 1 minute") or it leads straight into the next
// duration ("10 minutes speaking time 1 minute").
function trailingLabel(tokens, found, fuzzyLevel) {
  if (found.pair || tokens[found.last].tail.includes(",")) return null;
  const label = readLabelAfter(tokens, found.last + 1);
  if (!label) return null;
  let next = label.last + 1;
  while (next < tokens.length && LABEL_GAP_WORDS.has(tokens[next].word) && !tokens[next - 1].tail.includes(",")) next++;
  const leadsIntoDuration = next < tokens.length && !tokens[next - 1].tail.includes(",") && readDuration(tokens, next, fuzzyLevel);
  return leadsIntoDuration ? null : label;
}

function findDurations(tokens, fuzzyLevel) {
  const durations = [];
  for (let i = 0; i < tokens.length; i++) {
    const found = readDuration(tokens, i, fuzzyLevel);
    if (!found) continue;
    const label = trailingLabel(tokens, found, fuzzyLevel);
    durations.push({ ...found, first: i, role: label?.role ?? null, end: label ? label.last : found.last });
    i = label ? label.last : found.last;
  }
  return durations;
}

function windowText(text, tokens, from, to) {
  return text.slice(tokens[from].bareStart, tokens[to].bareEnd).replace(/\s+/g, " ");
}

// Exact phrases first (longest wins), then a typo-tolerant match whose every
// word lines up with the phrase's words. Windows never cross a duration.
function matchPhraseAt(text, tokens, i, blocked, fuzzyLevel, phraseIndex) {
  let maxWindow = 0;
  while (maxWindow < phraseIndex.maxWords && i + maxWindow < tokens.length && !blocked[i + maxWindow]) maxWindow++;
  if (maxWindow === 0 || tokens[i].word === "") return null;

  for (let count = maxWindow; count >= 1; count--) {
    const window = windowText(text, tokens, i, i + count - 1);
    // "France's motion" names France.
    for (const original of new Set([window, window.replace(/'s$/i, "")])) {
      const lower = original.toLowerCase();
      const exact = (phraseIndex.byWordCount.get(count) ?? []).find((phrase) =>
        phrase.caseSensitive ? original === phrase.text : lower === phrase.lower
      );
      if (exact) return { phrase: exact, last: i + count - 1, fuzzy: false };
    }
  }

  let best = null;
  for (let count = 1; count <= maxWindow; count++) {
    const lower = windowText(text, tokens, i, i + count - 1).toLowerCase();
    for (const phrase of phraseIndex.byWordCount.get(count) ?? []) {
      const budget = fuzzyBudget(phrase.lower.length, fuzzyLevel);
      if (budget === 0 || Math.abs(lower.length - phrase.lower.length) > budget) continue;
      if (!perWordWithinBudget(lower, phrase.lower, fuzzyLevel)) continue;
      const distance = editDistance(lower, phrase.lower);
      if (distance > budget) continue;
      if (!best || distance < best.distance || (distance === best.distance && phrase.lower.length > best.phrase.lower.length)) {
        best = { phrase, last: i + count - 1, fuzzy: true, distance };
      }
    }
  }
  return best;
}

function findPhrases(text, tokens, blocked, fuzzyLevel, phraseIndex) {
  const hits = [];
  for (let i = 0; i < tokens.length; i++) {
    if (blocked[i]) continue;
    const hit = matchPhraseAt(text, tokens, i, blocked, fuzzyLevel, phraseIndex);
    if (!hit) continue;
    hits.push({ ...hit, first: i });
    i = hit.last;
  }
  return hits;
}

// Explicit labels win. Otherwise one unlabeled duration takes whichever role
// is still free, and two unlabeled ones split by size (bigger is the total).
function classifyDurations(durations, motion) {
  if (motion.durationField) {
    const role = motion.durationField === "speaking" ? "speaking-time" : "total-time";
    for (const d of durations) d.role = role;
    return;
  }

  const unlabeled = durations.filter((d) => !d.role);
  const taken = new Set(durations.map((d) => d.role).filter(Boolean));
  if (unlabeled.length >= 2 && taken.size === 0) {
    const [a, b] = unlabeled;
    a.role = a.amount >= b.amount ? "total-time" : "speaking-time";
    b.role = a.role === "total-time" ? "speaking-time" : "total-time";
  }
  for (const d of durations) {
    if (d.role) continue;
    d.role = taken.has("total-time") && !taken.has("speaking-time") ? "speaking-time" : "total-time";
    taken.add(d.role);
  }
}

// Longest marker first, so "on the topic of" wins over plain "on".
const TOPIC_MARKERS = TOPIC_MARKER_PHRASE.map((phrase) => phrase.split(" ")).sort((a, b) => b.length - a.length);

function findTopicMarker(tokens, from, to, blocked, fuzzyLevel) {
  for (let i = from; i < to; i++) {
    if (blocked[i]) continue;
    for (const words of TOPIC_MARKERS) {
      if (i + words.length > to) continue;
      if (words.every((word, k) => !blocked[i + k] && isCloseToWord(tokens[i + k].word, word, fuzzyLevel))) {
        return i + words.length;
      }
    }
  }
  return null;
}

// "raised by Japan", "proposed by China": names the mover, so the topic stops there.
function isMoverClause(tokens, i) {
  return MOVER_VERBS.has(tokens[i].word) && tokens[i + 1]?.word === "BY";
}

const LEADING_FILLER = new Set(["BEING", "IS", ""]);
const TRAILING_FILLER = new Set(["FOR", "WITH", "AND", "OF", "A", "AN", "THE", "AT", "AS", "LASTING", "BY", ""]);

// A country set off at the end ("piracy - Malta", "piracy (Malta)") is the
// mover, not part of the topic.
function trailingMover(text, tokens, last, hits) {
  const hit = hits.find((h) => h.phrase.category === "delegation" && h.last === last);
  if (!hit || hit.first === 0) return null;
  return tokens[hit.first - 1].word === "" || text[tokens[hit.first].start] === "(" ? hit : null;
}

// The topic runs from `start` to the first duration, mover clause, or line
// end, minus dangling filler ("on refugees for" reads as "refugees").
// `stop` is where the scan ended, so a caller can look past it.
function readTopic(text, tokens, start, blocked, hits, minWords) {
  while (start < tokens.length && !blocked[start] && LEADING_FILLER.has(tokens[start].word)) start++;
  let stop = start;
  while (stop < tokens.length && !blocked[stop] && !isMoverClause(tokens, stop)) stop++;

  let last = stop - 1;
  while (last >= start && TRAILING_FILLER.has(tokens[last].word)) last--;
  const mover = last >= start ? trailingMover(text, tokens, last, hits) : null;
  if (mover) {
    last = mover.first - 1;
    while (last >= start && TRAILING_FILLER.has(tokens[last].word)) last--;
  }

  const atMover = stop < tokens.length && isMoverClause(tokens, stop);
  if (last < start || last - start + 1 < minWords) return { topic: null, stop, atMover };
  const topic = { start: tokens[start].bareStart, end: tokens[last].bareEnd, text: text.slice(tokens[start].bareStart, tokens[last].bareEnd) };
  return { topic, stop, atMover };
}

// With no marker, the topic is the first run of 2+ words after the motion,
// so "mod caucus: climate change, 10 mins" and "mod 10 min climate change"
// both work. Anything after a mover clause is the mover.
function findUnmarkedTopic(text, tokens, from, blocked, hits) {
  let position = from;
  while (position < tokens.length) {
    if (blocked[position]) {
      position++;
      continue;
    }
    const { topic, stop, atMover } = readTopic(text, tokens, position, blocked, hits, 2);
    if (topic || atMover) return topic;
    position = Math.max(stop, position + 1);
  }
  return null;
}

// "unmod 15": a lone number shortly after the motion reads as minutes. Two
// in a row after a caucus ("mod 10 1") are its total and speaking time, like "10/1".
function findBareMinutes(tokens, motion, blocked) {
  const isMinutes = (k) => k < tokens.length && !blocked[k] && /^\d+$/.test(tokens[k].word) && Number(tokens[k].word) > 0 && Number(tokens[k].word) <= 180;
  for (let i = motion.last + 1; i < Math.min(tokens.length, motion.last + 4); i++) {
    if (blocked[i]) return null;
    const word = tokens[i].word;
    if (/^\d+$/.test(word)) {
      if (!isMinutes(i)) return null;
      if (!motion.durationField && isMinutes(i + 1) && Number(tokens[i + 1].word) <= Number(word)) {
        return { pair: { total: Number(word), speaking: Number(tokens[i + 1].word) }, first: i, last: i + 1, end: i + 1 };
      }
      return { amount: Number(word), first: i, last: i, end: i, role: "total-time" };
    }
    if (!CONNECTIVE_WORDS.has(word) && word !== "") return null;
  }
  return null;
}

function parseLine(text, tokens, fuzzyLevel, phraseIndex) {
  const blocked = new Array(tokens.length).fill(false);
  const block = (from, to) => {
    for (let k = from; k <= to; k++) blocked[k] = true;
  };

  const durations = findDurations(tokens, fuzzyLevel);
  for (const d of durations) block(d.first, d.end);

  const hits = findPhrases(text, tokens, blocked, fuzzyLevel, phraseIndex);
  const motionHit = hits.find((hit) => hit.phrase.category === "motion");
  if (!motionHit) {
    return { ranges: hits.map(phraseRange), meta: { delegation: hits[0]?.phrase.canonical ?? null } };
  }
  const motion = { ...motionHit.phrase, last: motionHit.last };

  // Pairs only make sense for a caucus with both a total and a speaking time.
  const usable = durations.filter((d) => !d.pair || !motion.durationField);
  if (usable.length === 0 && motion.durationField !== "speaking") {
    const bare = findBareMinutes(tokens, motion, blocked);
    if (bare) {
      usable.push(bare);
      block(bare.first, bare.last);
    }
  }

  // A leading label ("a speaking time of 1 minute") can only reach back to
  // the motion or the previous duration, never into them.
  let floor = 0;
  for (const d of usable) {
    const motionFloor = motionHit.last < d.first ? motionHit.last + 1 : 0;
    const leading = d.role || d.pair ? null : readLabelBefore(tokens, d.first, Math.max(floor, motionFloor));
    if (leading) {
      d.role = leading.role;
      d.first = leading.first;
      block(leading.first, d.end);
    }
    const connective = d.first - 1;
    if (connective >= Math.max(floor, motionFloor) && CONNECTIVE_WORDS.has(tokens[connective].word) && !blocked[connective]) {
      d.first = connective;
      blocked[connective] = true;
    }
    floor = d.end + 1;
  }

  const timed = usable.filter((d) => !d.pair);
  classifyDurations(timed, motion);

  const meta = { motion: motion.canonical, speakingTime: null, totalTime: null, topic: null, delegation: null };
  const ranges = [];
  for (const d of usable) {
    const range = { start: tokens[d.first].bareStart, end: tokens[d.end].bareEnd, canonical: null, fuzzy: false };
    if (d.pair) {
      meta.totalTime ??= d.pair.total;
      meta.speakingTime ??= d.pair.speaking;
      ranges.push({ ...range, category: "total-time" });
      continue;
    }
    const field = d.role === "speaking-time" ? "speakingTime" : "totalTime";
    meta[field] ??= d.amount;
    ranges.push({ ...range, category: d.role });
  }

  let topic = null;
  if (motion.requiresTopic) {
    const markerEnd = findTopicMarker(tokens, motion.last + 1, tokens.length, blocked, fuzzyLevel);
    topic = markerEnd !== null
      ? readTopic(text, tokens, markerEnd, blocked, hits, 1).topic
      : findUnmarkedTopic(text, tokens, motion.last + 1, blocked, hits);
  }
  if (topic) {
    meta.topic = topic.text;
    ranges.push({ start: topic.start, end: topic.end, category: "topic", canonical: null, fuzzy: false });
  }

  // Countries named inside the topic are its subject, not the mover.
  const outsideTopic = hits.filter((hit) => !topic || tokens[hit.first].bareStart < topic.start || tokens[hit.first].bareStart >= topic.end);
  meta.delegation = outsideTopic.find((hit) => hit.phrase.category === "delegation")?.phrase.canonical ?? null;
  ranges.push(...outsideTopic.map(phraseRange));

  return { ranges, meta };

  function phraseRange(hit) {
    return {
      start: tokens[hit.first].bareStart,
      end: tokens[hit.last].bareEnd,
      category: hit.phrase.category,
      canonical: hit.phrase.canonical,
      fuzzy: hit.fuzzy,
    };
  }
}

// Each line is its own motion; `meta` keeps the first value of each field
// across lines, for the summary below the input.
export function findHighlightRanges(text, fuzzyLevel, phraseIndex) {
  const ranges = [];
  const meta = { motion: null, delegation: null, totalTime: null, speakingTime: null, topic: null };

  let lineStart = 0;
  while (lineStart <= text.length) {
    const newline = text.indexOf("\n", lineStart);
    const lineEnd = newline === -1 ? text.length : newline;
    const tokens = tokenizeLine(text, lineStart, lineEnd);
    if (tokens.length > 0) {
      const line = parseLine(text, tokens, fuzzyLevel, phraseIndex);
      ranges.push(...line.ranges);
      for (const key of Object.keys(meta)) meta[key] ??= line.meta[key] ?? null;
    }
    if (newline === -1) break;
    lineStart = newline + 1;
  }

  ranges.sort((a, b) => a.start - b.start);
  return { ranges, meta };
}

// Skips short lowercase delegation aliases like "us"/"uk" - almost always the
// English word, not the country, so auto-expanding would be more annoying
// than helpful. Only ever called for delegation matches (see handleKeyDown).
export function shouldAutoExpand(matchedText, canonical) {
  if (matchedText === canonical) return false;
  if (matchedText.length <= 3 && matchedText !== matchedText.toUpperCase()) return false;
  return true;
}
