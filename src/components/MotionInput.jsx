import { useMemo, useRef } from "react";
import { MOTIONS, countries, historicalCountries, CONNECTIVE_WORDS, MEASUREMENT_WORDS } from "../constants";

const MOTION_PHRASES = MOTIONS.flatMap((motion) =>
  [motion.text, ...(motion.alias ?? [])].map((text) => ({
    text,
    lower: text.toLowerCase(),
    category: "motion",
    canonical: text,
    requireExactWordCount: motion.explicit === true,
    durationField: motion.durationField ?? null,
    requiresTopic: motion.topic === true,
  }))
);
const ALL_COUNTRIES = [...countries, ...historicalCountries];
const COUNTRY_BY_CODE = new Map(ALL_COUNTRIES.map((c) => [c.code, c]));

// canonical is each phrase's own text (name or alias), not always the
// country's primary name - a typo/completed match corrects to whichever of
// the name/aliases it's actually closest to (picked by findFuzzyMatch's edit
// distance), so "Hollnd" fixes to "Holland" rather than jumping to
// "Netherlands" just because that alias happens to belong to that country.
function countryPhrases(country) {
  return [country.name, ...(country.alias ?? [])].map((text) => ({
    text,
    lower: text.toLowerCase(),
    category: "delegation",
    canonical: text,
  }));
}

// `delegations` is the committee roster: [{ name, code }, ...]. Entries with
// a recognized country code get that country's full name + aliases (so "USA"
// still matches); entries with no code - press corps, NGOs, IGOs, and other
// non-country delegations a sheet might include - get just their own display
// name, since there's no alias list for those.
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
function buildPhraseIndex(delegations) {
  const allPhrases = [...MOTION_PHRASES, ...buildDelegationPhrases(delegations)].sort((a, b) => b.lower.length - a.lower.length);

  const byWordCount = new Map();
  for (const phrase of allPhrases) {
    const wordCount = phrase.lower.split(" ").length;
    if (!byWordCount.has(wordCount)) byWordCount.set(wordCount, []);
    byWordCount.get(wordCount).push(phrase);
  }

  return { allPhrases, byWordCount, maxWords: Math.max(...[...byWordCount.keys()]) };
}

function isWordChar(ch) {
  return ch !== undefined && /[a-z0-9]/i.test(ch);
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

// Extra guard for requireExactWordCount phrases: every word in the window
// must be individually close to its counterpart in the phrase, not just the
// whole string's aggregate distance. Without this, unrelated text that
// happens to coincidentally land within the phrase's total length/word count
// budget (e.g. "12 minutes speaking time" vs "extend the speaking time" -
// both 4 words, similar total length) could still slip through at a high
// fuzzy level, even with no real word-for-word resemblance. A genuine typo
// of the real phrase still passes, since each word only differs slightly.
function perWordWithinBudget(windowLower, phraseLower, fuzzyLevel) {
  const windowWords = windowLower.split(" ");
  const phraseWords = phraseLower.split(" ");
  if (windowWords.length !== phraseWords.length) return false;
  return windowWords.every((word, k) => editDistance(word, phraseWords[k]) <= wordBudget(phraseWords[k].length, fuzzyLevel));
}

function tokenize(text) {
  const tokens = [];
  const re = /\S+/g;
  let match;
  while ((match = re.exec(text))) {
    tokens.push({ start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

// Best fuzzy match starting exactly at tokens[tokenIndex]. Each window length
// is checked against phrases up to 1 word shorter/longer than it (not just
// equal), so a dropped/extra word (e.g. missing "a") still matches the whole
// phrase, on top of in-word typos via character edit distance - except
// phrases flagged requireExactWordCount (constants.js's `explicit`), which
// are only ever compared against a window matching their own word count, so
// a subset of their words (e.g. "speaking time" missing "Extend") can never
// fuzzy-match them.
function findFuzzyMatch(tokens, tokenIndex, text, fuzzyLevel, phraseIndex) {
  let best = null;
  const maxWindow = phraseIndex.maxWords + 1;
  for (let wordCount = 1; wordCount <= maxWindow && tokenIndex + wordCount <= tokens.length; wordCount++) {
    const candidates = [wordCount - 1, wordCount, wordCount + 1]
      .flatMap((count) => phraseIndex.byWordCount.get(count) ?? [])
      .filter((phrase) => !phrase.requireExactWordCount || phrase.lower.split(" ").length === wordCount);
    if (candidates.length === 0) continue;

    const windowEnd = tokens[tokenIndex + wordCount - 1].end;
    const windowStart = tokens[tokenIndex].start;
    const windowLower = text.slice(windowStart, windowEnd).toLowerCase();

    for (const phrase of candidates) {
      const budget = fuzzyBudget(phrase.lower.length, fuzzyLevel);
      if (budget === 0) continue;
      if (Math.abs(windowLower.length - phrase.lower.length) > budget) continue;
      if (phrase.requireExactWordCount && !perWordWithinBudget(windowLower, phrase.lower, fuzzyLevel)) continue;

      const distance = editDistance(windowLower, phrase.lower);
      if (distance === 0 || distance > budget) continue;

      if (!best || distance < best.distance || (distance === best.distance && phrase.lower.length > best.phraseLength)) {
        best = {
          end: windowEnd,
          category: phrase.category,
          canonical: phrase.canonical,
          durationField: phrase.durationField ?? null,
          requiresTopic: phrase.requiresTopic === true,
          distance,
          phraseLength: phrase.lower.length,
        };
      }
    }
  }
  return best;
}

const NUMBER_WORD = /^\d+$/;
const TIGHT_TYPO_BUDGET = 1;

// Fuzzy match for connective/measurement words ("fro"/"wth"/"mintue"/
// "mon"->"min") - not the country/delegation fuzzy system (that's
// fuzzyBudget/wordBudget, untouched). Words 3-4 chars ("for", "with", "min")
// get a fixed, very tight 1-typo budget - too short for the usual
// proportional scaling to mean anything. Words 5+ chars ("minute",
// "minutes") scale with fuzzyLevel like everywhere else in the app. Words
// under 3 chars ("of") stay exact-only - practically every 2-letter word is
// 1 typo away from another one ("on" vs "of"), so any tolerance there is
// just noise (this is what broke "topic of" detection when "on" started
// matching "of").
function isCloseToAny(word, wordSet, fuzzyLevel) {
  const upper = word.toUpperCase();
  if (wordSet.has(upper)) return true;
  if (fuzzyLevel <= 0) return false;

  for (const candidate of wordSet) {
    if (candidate.length < 3) continue;
    const budget = candidate.length < 5 ? TIGHT_TYPO_BUDGET : wordBudget(candidate.length, fuzzyLevel);
    if (Math.abs(upper.length - candidate.length) > budget) continue;
    if (editDistance(upper, candidate) <= budget) return true;
  }
  return false;
}

const isConnectiveWord = (w, fuzzyLevel) => isCloseToAny(w, CONNECTIVE_WORDS, fuzzyLevel);
const isMeasurementWord = (w, fuzzyLevel) => isCloseToAny(w, MEASUREMENT_WORDS, fuzzyLevel);

// Strips leading/trailing punctuation a token might carry from adjacent text
// ("10," or "minutes.") so word matching isn't thrown off by it.
function bareWord(text, token) {
  return text.slice(token.start, token.end).replace(/^\W+|\W+$/g, "");
}

function findTokenWithin(tokens, text, startIndex, span, predicate) {
  for (let i = startIndex; i < Math.min(startIndex + span, tokens.length); i++) {
    if (predicate(bareWord(text, tokens[i]))) return i;
  }
  return -1;
}

function containsWord(tokens, text, fromIndex, toIndex, word) {
  for (let i = fromIndex; i <= toIndex; i++) {
    if (bareWord(text, tokens[i]).toUpperCase() === word) return true;
  }
  return false;
}

// Looks from fromIndex through toIndex (inclusive) for an explicit "speaking"
// or "total" wording label - "speaking" wins if both somehow appear. Used to
// tell "12 min speaking time" apart from "12 min total time" regardless of
// which one happens to come first on the line.
function explicitLabel(tokens, text, fromIndex, toIndex) {
  const lo = Math.max(0, fromIndex);
  const hi = Math.min(tokens.length - 1, toIndex);
  if (containsWord(tokens, text, lo, hi, "SPEAKING")) return "speaking-time";
  if (containsWord(tokens, text, lo, hi, "TOTAL")) return "total-time";
  return null;
}


// Given a number token already found at numberIndex, looks for its measurement
// unit within 2 words either side and builds the duration result - shared by
// extendWithDuration (narrow, motion-adjacent search) and findDurationInRange
// (wide search, for topic motions where the number can be arbitrarily far
// from the motion once a topic phrase sits in between).
function resolveDurationAt(tokens, text, numberIndex, connectiveIndex, motionStartIndex, fuzzyLevel) {
  const minuteStart = Math.max(0, numberIndex - 2);
  let minuteIndex = -1;
  for (let i = minuteStart; i <= Math.min(numberIndex + 2, tokens.length - 1); i++) {
    if (i === numberIndex) continue;
    if (isMeasurementWord(bareWord(text, tokens[i]), fuzzyLevel)) {
      minuteIndex = i;
      break;
    }
  }
  if (minuteIndex === -1) return null;

  const endIndex = Math.max(numberIndex, minuteIndex);
  const startIndex = connectiveIndex === -1 ? numberIndex : connectiveIndex;
  return {
    start: tokens[startIndex].start,
    end: tokens[endIndex].end,
    amount: Number(bareWord(text, tokens[numberIndex])),
    label: explicitLabel(tokens, text, motionStartIndex, endIndex + 2),
  };
}

// If a motion match is followed by "for <number> minute(s)" - e.g. "Moderated
// Caucus for 10 minutes" - within a couple words of slack at each step,
// extends the highlight to cover the whole duration phrase, not just the
// bare motion phrase. The connective ("for"/"of"/"with") is optional - a
// terse "India mod 12 min" (no connective at all) still works.
function extendWithDuration(tokens, text, motionStartIndex, afterIndex, fuzzyLevel) {
  const forIndex = findTokenWithin(tokens, text, afterIndex, 2, (w) => isConnectiveWord(w, fuzzyLevel));
  const numberSearchStart = forIndex === -1 ? afterIndex : forIndex + 1;

  const numberIndex = findTokenWithin(tokens, text, numberSearchStart, 2, (w) => NUMBER_WORD.test(w));
  if (numberIndex === -1) return null;

  return resolveDurationAt(tokens, text, numberIndex, forIndex, motionStartIndex, fuzzyLevel);
}

// Same as extendWithDuration, but scans the whole [fromIndex, toIndex) range
// for the first standalone number instead of just the 2 words right after
// the motion - needed for topic motions, since "on the topic of X" can push
// the actual duration arbitrarily far from the motion phrase itself.
function findDurationInRange(tokens, text, fromIndex, toIndex, motionStartIndex, fuzzyLevel) {
  for (let i = fromIndex; i < toIndex; i++) {
    if (!NUMBER_WORD.test(bareWord(text, tokens[i]))) continue;
    const connectiveIndex = i > fromIndex && isConnectiveWord(bareWord(text, tokens[i - 1]), fuzzyLevel) ? i - 1 : -1;
    const result = resolveDurationAt(tokens, text, i, connectiveIndex, motionStartIndex, fuzzyLevel);
    if (result) return result;
  }
  return null;
}

// A standalone "<number> minute(s)" with no motion/connective nearby - the
// implicit per-speaker (or total, if labeled "total") time in a line that
// already stated its counterpart, e.g. the "1 minute" in "...Caucus for 10
// minutes, 1 minute each". Stops at `limit` (the current line's end) so it
// never reaches into the next line.
function findBareDuration(tokens, text, fromIndex, limit, fuzzyLevel) {
  for (let i = fromIndex; i < tokens.length && tokens[i].start < limit; i++) {
    const word = bareWord(text, tokens[i]);
    if (!NUMBER_WORD.test(word)) continue;

    for (let j = Math.max(fromIndex, i - 2); j <= Math.min(i + 2, tokens.length - 1); j++) {
      if (j === i || tokens[j].start >= limit) continue;
      if (isMeasurementWord(bareWord(text, tokens[j]), fuzzyLevel)) {
        const lo = Math.min(i, j);
        const hi = Math.max(i, j);
        return {
          start: tokens[lo].start,
          end: tokens[hi].end,
          amount: Number(word),
          label: explicitLabel(tokens, text, Math.max(fromIndex, lo - 2), hi + 2),
        };
      }
    }
  }
  return null;
}

function tokenIndexAtOrAfter(tokens, pos) {
  return tokens.findIndex((t) => t.start >= pos);
}

function lineIndexAt(text, pos) {
  let count = 0;
  for (let k = 0; k < pos; k++) if (text[k] === "\n") count++;
  return count;
}

function lineEndAt(text, pos) {
  const nl = text.indexOf("\n", pos);
  return nl === -1 ? text.length : nl;
}

// If a "speaking"/"total (time)" label sits right after `pos`, skips past it
// too - so the topic starts after the label, not in the middle of it.
function skipTrailingLabel(tokens, text, pos, limit) {
  const idx = tokenIndexAtOrAfter(tokens, pos);
  if (idx === -1 || tokens[idx].start >= limit) return pos;

  const word = bareWord(text, tokens[idx]).toUpperCase();
  if (word !== "SPEAKING" && word !== "TOTAL") return pos;

  let next = idx + 1;
  if (next < tokens.length && tokens[next].start < limit && bareWord(text, tokens[next]).toUpperCase() === "TIME") next += 1;
  return next < tokens.length && tokens[next - 1].start < limit ? tokens[next - 1].end : pos;
}

// Finds "topic of" anywhere in [fromIndex, toIndex) and returns the token
// index of "of", or null. Doesn't care what's on either side - the caller
// decides what that implies (topic before or after the duration).
function findTopicOf(tokens, text, fromIndex, toIndex) {
  for (let i = fromIndex; i < toIndex; i++) {
    if (bareWord(text, tokens[i]).toUpperCase() !== "TOPIC") continue;
    const ofIndex = findTokenWithin(tokens, text, i + 1, 2, (w) => w.toUpperCase() === "OF");
    if (ofIndex !== -1 && ofIndex < toIndex) return ofIndex;
  }
  return null;
}

// Requires constants.js's `topic: true`. Captures the caucus's subject. An
// explicit "topic of" always wins, wherever it falls in the line - before
// the duration, after it, or even between two durations - and overrides the
// trailing-text fallback entirely. The topic runs from right after "of" up
// to the *next* number+unit found after that (or line end, if none) - so
// "on the topic of X with 12 min speaking time" stops right before "12 min"
// instead of swallowing the second duration as part of the topic. Only when
// "topic of" isn't said anywhere does it fall back to whatever trails the
// duration(s) instead. `needsSecondLookup` (dual-duration motions only)
// peeks ahead for a second bare number+unit in that fallback case, so it
// starts after BOTH durations, not between them.
// A single stray word (e.g. "each", left over from "1 minute each" with no
// real topic said) isn't a real topic - require at least 2 words.
function finalizeTopic(text) {
  const trimmed = text.trim();
  return trimmed && trimmed.split(/\s+/).length > 1 ? trimmed : null;
}

function extractTopic(tokens, text, motionEndPos, lineEnd, motionStartIndex, duration, fuzzyLevel, needsSecondLookup) {
  const fromIndex = tokenIndexAtOrAfter(tokens, motionEndPos);
  if (fromIndex === -1) return null;
  const lineEndIndex = tokenIndexAtOrAfter(tokens, lineEnd);
  const endIndex = lineEndIndex === -1 ? tokens.length : lineEndIndex;

  const ofIndex = findTopicOf(tokens, text, fromIndex, endIndex);
  if (ofIndex !== null) {
    const boundaryDuration = findDurationInRange(tokens, text, ofIndex + 1, endIndex, motionStartIndex, fuzzyLevel);
    const boundaryPos = boundaryDuration ? boundaryDuration.start : lineEnd;
    return finalizeTopic(text.slice(tokens[ofIndex].end, boundaryPos));
  }

  if (!duration) return null;

  let trailStart = duration.end;
  if (needsSecondLookup) {
    const afterIndex = tokenIndexAtOrAfter(tokens, duration.end);
    const second = afterIndex === -1 ? null : findBareDuration(tokens, text, afterIndex, lineEnd, fuzzyLevel);
    if (second) trailStart = second.end;
  }
  trailStart = skipTrailingLabel(tokens, text, trailStart, lineEnd);

  return finalizeTopic(text.slice(trailStart, lineEnd));
}

// A motion's duration is classified per line: an explicit "speaking"/"total"
// label always wins, wherever it appears. Otherwise the first duration found
// defaults to the total caucus time, and a second, later duration on the
// same line - with or without its own "for" - defaults to whichever role the
// first one *didn't* take (so if the first was explicitly speaking time, an
// unlabeled second one is assumed to be the total, and vice versa).
function classifyDuration(lineState, label) {
  if (label) return label;
  if (!lineState.sawDuration) return "total-time";
  return lineState.firstRole === "speaking-time" ? "total-time" : "speaking-time";
}

// Non-overlapping motion/country matches in text: exact whole-word matches
// first (longest phrase wins), falling back to a fuzzy word-window match
// (typo-tolerant, see editDistance/fuzzyBudget) wherever nothing exact fits.
// Also returns `meta` - the first motion/delegation/total-time/speaking-time
// detected, for a summary display below the input.
function findHighlightRanges(text, fuzzyLevel, phraseIndex) {
  const lower = text.toLowerCase();
  const tokens = tokenize(text);
  const tokenStarts = new Map(tokens.map((t, i) => [t.start, i]));
  const ranges = [];
  const meta = { motion: null, delegation: null, totalTime: null, speakingTime: null, topic: null };
  const lineState = { lineIndex: -1, sawDuration: false, firstRole: null, secondFound: false };

  let i = 0;
  while (i < text.length) {
    const currentLine = lineIndexAt(text, i);
    if (currentLine !== lineState.lineIndex) {
      lineState.lineIndex = currentLine;
      lineState.sawDuration = false;
      lineState.firstRole = null;
      lineState.secondFound = false;
    }

    const exact = phraseIndex.allPhrases.find((phrase) => {
      if (!lower.startsWith(phrase.lower, i)) return false;
      const end = i + phrase.lower.length;
      return !isWordChar(text[i - 1]) && !isWordChar(text[end]);
    });
    const tokenIndex = tokenStarts.get(i);
    const match = exact ?? (tokenIndex !== undefined ? findFuzzyMatch(tokens, tokenIndex, text, fuzzyLevel, phraseIndex) : null);

    if (match) {
      let end = exact ? i + exact.lower.length : match.end;
      const category = match.category;

      if (category === "delegation" && meta.delegation === null) meta.delegation = match.canonical;

      if (category === "motion") {
        if (meta.motion === null) meta.motion = match.canonical;
        const motionEndPos = end;
        const motionStartIndex = tokenIndex ?? tokenStarts.get(i);
        const afterIndex = tokenIndexAtOrAfter(tokens, end);
        let extended = null;
        if (motionStartIndex !== undefined && afterIndex !== -1) {
          if (match.requiresTopic) {
            // A topic can push the duration arbitrarily far from the motion
            // ("on the topic of X for 10 minutes"), so scan the whole line
            // instead of just the 2 words right after the motion.
            const lineEndIndex = tokenIndexAtOrAfter(tokens, lineEndAt(text, i));
            const scanLimit = lineEndIndex === -1 ? tokens.length : lineEndIndex;
            extended = findDurationInRange(tokens, text, afterIndex, scanLimit, motionStartIndex, fuzzyLevel);
          } else {
            extended = extendWithDuration(tokens, text, motionStartIndex, afterIndex, fuzzyLevel);
          }
        }

        let durationCategory = null;
        if (extended) {
          end = extended.end;

          if (match.durationField) {
            // Single-param motion (constants.js's durationField): always the
            // one fixed field, no total/speaking classification, and no
            // second-duration lookup - there's only ever one number to read.
            durationCategory = match.durationField === "speaking" ? "speaking-time" : "total-time";
            const field = match.durationField === "speaking" ? "speakingTime" : "totalTime";
            if (meta[field] === null) meta[field] = extended.amount;
          } else {
            durationCategory = classifyDuration(lineState, extended.label);
            if (durationCategory === "speaking-time" && meta.speakingTime === null) meta.speakingTime = extended.amount;
            if (durationCategory === "total-time" && meta.totalTime === null) meta.totalTime = extended.amount;
            if (!lineState.sawDuration) lineState.firstRole = durationCategory;
            lineState.sawDuration = true;
          }
        }

        if (match.requiresTopic && meta.topic === null) {
          const duration = extended ? { start: extended.start, end: extended.end } : null;
          const topic = extractTopic(
            tokens, text, motionEndPos, lineEndAt(text, i), motionStartIndex, duration, fuzzyLevel, !match.durationField
          );
          if (topic) meta.topic = topic;
        }

        // Pushed as two separate ranges (motion phrase, then duration) - not
        // one continuous span - so anything in between (a connective word, or
        // a whole topic phrase) stays plain/uncolored instead of getting
        // swept into the motion's highlight.
        ranges.push({ start: i, end: motionEndPos, category: "motion", canonical: match.canonical, fuzzy: !exact });
        if (extended) {
          ranges.push({ start: extended.start, end: extended.end, category: durationCategory, canonical: null, fuzzy: false });
        }
        i = end;
        continue;
      }

      ranges.push({ start: i, end, category, canonical: match.canonical, fuzzy: !exact });
      i = end;
      continue;
    }

    if (
      tokenIndex !== undefined &&
      lineState.sawDuration &&
      !lineState.secondFound &&
      (meta.totalTime === null || meta.speakingTime === null)
    ) {
      const bare = findBareDuration(tokens, text, tokenIndex, lineEndAt(text, i), fuzzyLevel);
      if (bare && bare.start === i) {
        const category = bare.label ?? (lineState.firstRole === "speaking-time" ? "total-time" : "speaking-time");
        const field = category === "speaking-time" ? "speakingTime" : "totalTime";
        lineState.secondFound = true;
        if (meta[field] === null) {
          meta[field] = bare.amount;
          ranges.push({ start: bare.start, end: bare.end, category, canonical: null, fuzzy: false });
          i = bare.end;
          continue;
        }
      }
    }

    i += 1;
  }
  return { ranges, meta };
}

const CATEGORY_COLOR = {
  motion: "var(--accent)",
  delegation: "var(--accent-alt)",
  "speaking-time": "var(--accent-time)",
  "total-time": "var(--accent-duration)",
};

function buildSegments(text, ranges) {
  const segments = [];
  let cursor = 0;
  for (const { start, end, category, fuzzy } of ranges) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), color: null });
    segments.push({ text: text.slice(start, end), color: CATEGORY_COLOR[category], fuzzy });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), color: null });
  return segments;
}

// Skips short lowercase delegation aliases like "us"/"uk" - almost always the
// English word, not the country, so auto-expanding would be more annoying
// than helpful. Only ever called for delegation matches (see handleKeyDown).
function shouldAutoExpand(matchedText, canonical) {
  if (matchedText === canonical) return false;
  if (matchedText.length <= 3 && matchedText !== matchedText.toUpperCase()) return false;
  return true;
}

// Textarea that highlights recognized parliamentary motions (constants.js's
// MOTIONS, accent color), delegation names/aliases (a second accent color),
// and a motion's duration - total caucus time vs. per-speaker "speaking
// time" (a third accent color, see classifyDuration) - as the chair types,
// underlined dashed for a close (typo-tolerant) match rather than an exact
// one. A summary row below shows the current motion/country/speaking time/
// total time at a glance. Pass delegations ([{ name, code }, ...] from the
// committee roster) to scope matching to that roster - including non-country
// delegations like press corps/NGOs - instead of every ISO country. Pass
// onSubmit to let plain Enter (Shift+Enter for a real newline) hand the
// current parsed meta up to the caller and clear the box for the next motion
// - e.g. to log it in a list rendered below (see MotionLog). A plain
// textarea can't render colored spans, so a read-only backdrop with the
// highlighted text sits behind a transparent textarea, keeping the real caret/selection.
export default function MotionInput({ value, onChange, placeholder, rows = 8, className = "", fuzzyLevel = 0.3, delegations, onSubmit }) {
  const textareaRef = useRef(null);
  const backdropRef = useRef(null);

  const phraseIndex = useMemo(() => buildPhraseIndex(delegations), [delegations]);
  const { ranges, meta } = useMemo(
    () => findHighlightRanges(value, fuzzyLevel, phraseIndex),
    [value, fuzzyLevel, phraseIndex]
  );

  function syncScroll() {
    if (backdropRef.current && textareaRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }

  // Plain Enter (no shift) submits the current motion - passes today's
  // parsed meta up to the caller and clears the box for the next one.
  // Shift+Enter still inserts a real newline, for a motion that spans
  // multiple lines.
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      if (!onSubmit || !value.trim()) return;
      event.preventDefault();
      onSubmit(meta);
      onChange("");
      return;
    }

    if (event.key !== " ") return;
    const el = event.target;
    if (el.selectionStart !== el.selectionEnd) return;
    const cursorPos = el.selectionStart;

    const match = ranges.find((r) => r.end === cursorPos && r.category === "delegation");
    if (!match) return;

    const matchedText = value.slice(match.start, match.end);
    if (!shouldAutoExpand(matchedText, match.canonical)) return;

    event.preventDefault();
    const newValue = `${value.slice(0, match.start)}${match.canonical} ${value.slice(match.end)}`;
    onChange(newValue);

    const newPos = match.start + match.canonical.length + 1;
    requestAnimationFrame(() => el.setSelectionRange(newPos, newPos));
  }

  const segments = buildSegments(value, ranges);

  return (
    <div className={className}>
      <div className="relative border border-white/10 bg-white/5 transition focus-within:border-white/30">
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-4 text-sm text-white"
        >
          {segments.map((segment, i) => (
            <span
              key={i}
              style={
                segment.color
                  ? { color: segment.color, textDecoration: segment.fuzzy ? "underline dashed" : undefined }
                  : undefined
              }
            >
              {segment.text}
            </span>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          placeholder={placeholder}
          rows={rows}
          className="relative w-full resize-none bg-transparent p-4 text-sm text-transparent caret-white outline-none placeholder:text-white/30"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MetaStat label="Motion" value={meta.motion} />
        <MetaStat label="Country" value={meta.delegation} />
        <MetaStat label="Topic" value={meta.topic} />
        <MetaStat label="Speaking Time" value={meta.speakingTime != null ? `${meta.speakingTime} min` : null} />
        <MetaStat label="Total Time" value={meta.totalTime != null ? `${meta.totalTime} min` : null} />
      </div>
    </div>
  );
}

function MetaStat({ label, value }) {
  return (
    <div className="border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1 truncate text-sm text-white">{value ?? "—"}</p>
    </div>
  );
}
