import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { countries, historicalCountries, CONNECTIVE_WORDS, MEASUREMENT_WORDS, SECOND_WORDS, TOPIC_MARKER_PHRASE } from "../constants";
import { getMotions, canonicalLabel } from "../motionPresets";
import { formatDuration } from "../utils/duration";

function buildMotionPhrases(motions) {
  return motions.flatMap((motion) =>
    [motion.text, ...(motion.alias ?? [])].map((text) => ({
      text,
      lower: text.toLowerCase(),
      category: "motion",
      // Always the shortest alias, whichever variant matched: meta.motion is a
      // status label elsewhere, so it shouldn't carry the "Open a" verb filler
      // that only reads well in the chair's own typed sentence.
      canonical: canonicalLabel(motion),
      requireExactWordCount: motion.explicit === true,
      durationField: motion.durationField ?? null,
      requiresTopic: motion.topic === true,
    }))
  );
}
const ALL_COUNTRIES = [...countries, ...historicalCountries];
const COUNTRY_BY_CODE = new Map(ALL_COUNTRIES.map((c) => [c.code, c]));

// canonical is each phrase's own text, not the country's primary name, so
// "Hollnd" corrects to "Holland" rather than jumping to "Netherlands".
function countryPhrases(country) {
  return [country.name, ...(country.alias ?? [])].map((text) => ({
    text,
    lower: text.toLowerCase(),
    category: "delegation",
    canonical: text,
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
function buildPhraseIndex(delegations, motionPhrases) {
  const allPhrases = [...motionPhrases, ...buildDelegationPhrases(delegations)].sort((a, b) => b.lower.length - a.lower.length);

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

// Every word must be individually close to its counterpart, not just the
// aggregate distance, or unrelated text of similar length and word count
// ("12 minutes speaking time" vs "extend the speaking time") slips through
// at high fuzzy levels.
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

// Windows are checked against phrases up to 1 word shorter/longer, so a
// dropped word still matches. requireExactWordCount phrases are the
// exception, compared only against their own word count so a subset of their
// words can't match.
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

// Tight per-word fuzzy match, separate from the country fuzzy system: 3-4
// chars get a fixed 1-typo budget, 5+ scale with fuzzyLevel. Under 3 chars
// stays exact, since nearly every 2-letter word is one typo from another
// ("on" vs "of") and tolerance there broke "topic of" detection.
function isCloseToWord(word, target, fuzzyLevel) {
  const upper = word.toUpperCase();
  if (upper === target) return true;
  if (fuzzyLevel <= 0 || target.length < 3) return false;

  const budget = target.length < 5 ? TIGHT_TYPO_BUDGET : wordBudget(target.length, fuzzyLevel);
  if (Math.abs(upper.length - target.length) > budget) return false;
  return editDistance(upper, target) <= budget;
}

function isCloseToAny(word, wordSet, fuzzyLevel) {
  for (const candidate of wordSet) {
    if (isCloseToWord(word, candidate, fuzzyLevel)) return true;
  }
  return false;
}

const isConnectiveWord = (w, fuzzyLevel) => isCloseToAny(w, CONNECTIVE_WORDS, fuzzyLevel);
const isMeasurementWord = (w, fuzzyLevel) => isCloseToAny(w, MEASUREMENT_WORDS, fuzzyLevel);
const isSecondWord = (w, fuzzyLevel) => isCloseToAny(w, SECOND_WORDS, fuzzyLevel);

// The unit a word represents, or null - checked in this order so a word close to both (shouldn't
// normally happen given how distinct the two vocabularies are) prefers minutes.
function matchedUnit(word, fuzzyLevel) {
  if (isMeasurementWord(word, fuzzyLevel)) return "minute";
  if (isSecondWord(word, fuzzyLevel)) return "second";
  return null;
}

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


// Looks for a number's unit within 2 words either side. Shared by the narrow
// motion-adjacent search and the wide search used when a topic phrase sits
// between the motion and its number.
function resolveDurationAt(tokens, text, numberIndex, connectiveIndex, motionStartIndex, fuzzyLevel) {
  const minuteStart = Math.max(0, numberIndex - 2);
  let minuteIndex = -1;
  let unit = null;
  for (let i = minuteStart; i <= Math.min(numberIndex + 2, tokens.length - 1); i++) {
    if (i === numberIndex) continue;
    const found = matchedUnit(bareWord(text, tokens[i]), fuzzyLevel);
    if (found) {
      minuteIndex = i;
      unit = found;
      break;
    }
  }
  if (minuteIndex === -1) return null;

  const endIndex = Math.max(numberIndex, minuteIndex);
  const startIndex = connectiveIndex === -1 ? numberIndex : connectiveIndex;
  const rawAmount = Number(bareWord(text, tokens[numberIndex]));
  return {
    start: tokens[startIndex].start,
    end: tokens[endIndex].end,
    // Stored as minutes throughout the app (see src/utils/duration.js) - a value given in
    // seconds is converted here, at the point the unit was actually read.
    amount: unit === "second" ? rawAmount / 60 : rawAmount,
    label: explicitLabel(tokens, text, motionStartIndex, endIndex + 2),
  };
}

// Extends the highlight over a trailing "for 10 minutes" so it covers the
// whole duration phrase. The connective is optional, so "India mod 12 min"
// still works.
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

// A standalone "1 minute" with no motion nearby, i.e. the implicit
// per-speaker time in "...Caucus for 10 minutes, 1 minute each". Stops at
// `limit` so it never reaches into the next line.
function findBareDuration(tokens, text, fromIndex, limit, fuzzyLevel) {
  for (let i = fromIndex; i < tokens.length && tokens[i].start < limit; i++) {
    const word = bareWord(text, tokens[i]);
    if (!NUMBER_WORD.test(word)) continue;

    for (let j = Math.max(fromIndex, i - 2); j <= Math.min(i + 2, tokens.length - 1); j++) {
      if (j === i || tokens[j].start >= limit) continue;
      const unit = matchedUnit(bareWord(text, tokens[j]), fuzzyLevel);
      if (unit) {
        const lo = Math.min(i, j);
        const hi = Math.max(i, j);
        return {
          start: tokens[lo].start,
          end: tokens[hi].end,
          amount: unit === "second" ? Number(word) / 60 : Number(word),
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

// Each alternative phrasing (constants.js's TOPIC_MARKER_PHRASE, e.g. "ON
// THE TOPIC OF" or "DISCUSSING") split into its own word list.
const TOPIC_MARKER_PHRASES = TOPIC_MARKER_PHRASE.map((phrase) => phrase.split(" "));

// Finds any TOPIC_MARKER_PHRASE as a whole word-for-word sequence, each word
// tight-fuzzy-tolerant ("on da tpoic of"). The caller decides what its
// position implies.
function findTopicOf(tokens, text, fromIndex, toIndex, fuzzyLevel) {
  for (let i = fromIndex; i < toIndex; i++) {
    for (const words of TOPIC_MARKER_PHRASES) {
      const lastWordIndex = words.length - 1;
      if (i + lastWordIndex >= toIndex) continue;
      const matches = words.every(
        (word, k) => isCloseToWord(bareWord(text, tokens[i + k]), word, fuzzyLevel)
      );
      if (matches) return i + lastWordIndex;
    }
  }
  return null;
}

// An explicit "topic of" always wins wherever it falls, and the topic stops
// at the next number+unit so a trailing duration isn't swallowed. Without
// that marker it falls back to whatever trails the duration(s), requiring at
// least 2 words so a stray "each" isn't mistaken for a topic.
function finalizeTopic(text, rangeStart) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.split(/\s+/).length <= 1) return null;
  const start = rangeStart + (text.length - text.trimStart().length);
  return { text: trimmed, start, end: start + trimmed.length };
}

// Returns secondDuration alongside topic because an unlabeled duration can
// sit between the first duration and a "topic of" marker. The caller's cursor
// jumps over that gap afterward, so nothing else would ever see it.
function extractTopic(tokens, text, motionEndPos, lineEnd, motionStartIndex, duration, fuzzyLevel, needsSecondLookup) {
  const fromIndex = tokenIndexAtOrAfter(tokens, motionEndPos);
  if (fromIndex === -1) return { topic: null, secondDuration: null };
  const lineEndIndex = tokenIndexAtOrAfter(tokens, lineEnd);
  const endIndex = lineEndIndex === -1 ? tokens.length : lineEndIndex;

  const ofIndex = findTopicOf(tokens, text, fromIndex, endIndex, fuzzyLevel);
  if (ofIndex !== null) {
    let secondDuration = null;
    if (duration) {
      const afterFirstIndex = tokenIndexAtOrAfter(tokens, duration.end);
      if (afterFirstIndex !== -1 && afterFirstIndex < ofIndex) {
        secondDuration = findBareDuration(tokens, text, afterFirstIndex, tokens[ofIndex].start, fuzzyLevel);
      }
    }

    const boundaryDuration = findDurationInRange(tokens, text, ofIndex + 1, endIndex, motionStartIndex, fuzzyLevel);
    const boundaryPos = boundaryDuration ? boundaryDuration.start : lineEnd;
    const topic = finalizeTopic(text.slice(tokens[ofIndex].end, boundaryPos), tokens[ofIndex].end);
    return { topic, secondDuration };
  }

  if (!duration) return { topic: null, secondDuration: null };

  let trailStart = duration.end;
  if (needsSecondLookup) {
    const afterIndex = tokenIndexAtOrAfter(tokens, duration.end);
    const second = afterIndex === -1 ? null : findBareDuration(tokens, text, afterIndex, lineEnd, fuzzyLevel);
    if (second) trailStart = second.end;
  }
  trailStart = skipTrailingLabel(tokens, text, trailStart, lineEnd);

  return { topic: finalizeTopic(text.slice(trailStart, lineEnd), trailStart), secondDuration: null };
}

// An explicit "speaking"/"total" label always wins. Otherwise the first
// duration is the total and a second defaults to whichever role the first
// one didn't take.
function classifyDuration(lineState, label) {
  if (label) return label;
  if (!lineState.sawDuration) return "total-time";
  return lineState.firstRole === "speaking-time" ? "total-time" : "speaking-time";
}

// Exact whole-word matches first (longest phrase wins), falling back to a
// fuzzy word-window match where nothing exact fits. `meta` carries the first
// of each kind detected, for the summary below the input.
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

        // Pushed as separate ranges (motion phrase, duration, topic) rather
        // than one continuous span, and sorted by position before pushing -
        // a topic can land either before its duration ("on the topic of X
        // for 10 min") or after it ("for 10 min on the topic of X").
        const localRanges = [{ start: i, end: motionEndPos, category: "motion", canonical: match.canonical, fuzzy: !exact }];
        if (extended) {
          localRanges.push({ start: extended.start, end: extended.end, category: durationCategory, canonical: null, fuzzy: false });
        }

        if (match.requiresTopic && meta.topic === null) {
          const duration = extended ? { start: extended.start, end: extended.end } : null;
          const { topic, secondDuration } = extractTopic(
            tokens, text, motionEndPos, lineEndAt(text, i), motionStartIndex, duration, fuzzyLevel, !match.durationField
          );

          if (secondDuration) {
            const secondCategory = classifyDuration(lineState, secondDuration.label);
            const secondField = secondCategory === "speaking-time" ? "speakingTime" : "totalTime";
            if (meta[secondField] === null) meta[secondField] = secondDuration.amount;
            lineState.secondFound = true;
            localRanges.push({ start: secondDuration.start, end: secondDuration.end, category: secondCategory, canonical: null, fuzzy: false });
          }

          if (topic) {
            meta.topic = topic.text;
            localRanges.push({ start: topic.start, end: topic.end, category: "topic", canonical: null, fuzzy: false });
            // Advance past the whole topic span too, not just the duration -
            // otherwise the outer loop would keep scanning through free-form
            // topic prose for further motion/delegation matches, which could
            // land a second, overlapping range inside this one.
            end = Math.max(end, topic.end);
          }
        }

        localRanges.sort((a, b) => a.start - b.start);
        ranges.push(...localRanges);
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
  topic: "var(--accent-topic)",
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

// Highlights motions, delegations, and durations as the chair types, dashed
// underline for a typo-tolerant match. A plain textarea can't render colored
// spans, so a read-only highlighted backdrop sits behind a transparent
// textarea, preserving the real caret and selection.
const MotionInput = forwardRef(function MotionInput({ value, onChange, placeholder, rows = 8, className = "", fuzzyLevel = 0.3, delegations, onSubmit }, ref) {
  const textareaRef = useRef(null);
  const backdropRef = useRef(null);
  const [invalid, setInvalid] = useState(false);

  // Lets the dais keyboard shortcuts (Motions view's "M") focus the box from
  // outside without exposing anything else about its internals.
  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  const motionPhrases = useMemo(() => buildMotionPhrases(getMotions()), []);
  const phraseIndex = useMemo(() => buildPhraseIndex(delegations, motionPhrases), [delegations, motionPhrases]);
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

  // Plain Enter submits and clears; Shift+Enter inserts a newline. A
  // per-speaker time longer than the total is never valid, so it's rejected
  // with a flash and the offending span cut out for retyping.
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      if (!onSubmit || !value.trim()) return;
      event.preventDefault();

      if (meta.totalTime != null && meta.speakingTime != null && meta.speakingTime > meta.totalTime) {
        setInvalid(true);
        const el = event.target;
        const speakingRange = ranges.find((r) => r.category === "speaking-time");
        setTimeout(() => {
          setInvalid(false);
          if (speakingRange) {
            onChange(value.slice(0, speakingRange.start) + value.slice(speakingRange.end));
            requestAnimationFrame(() => el.setSelectionRange(speakingRange.start, speakingRange.start));
          }
        }, 300);
        return;
      }

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
      <div
        className={`relative border border-[var(--app-border)] bg-[var(--app-chip)] transition focus-within:border-[var(--app-border-focus)] ${invalid ? "motion-input-shake" : ""}`}
      >
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-4 text-sm text-[var(--app-text)]"
        >
          {segments.map((segment, i) => (
            <span
              key={i}
              style={
                invalid
                  ? { color: "#f87171" }
                  : segment.color
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
          className="relative w-full resize-none bg-transparent p-4 text-sm text-transparent caret-white outline-none placeholder:text-[var(--app-text-faint)]"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MetaStat label="Motion" value={meta.motion} />
        <MetaStat label="Country" value={meta.delegation} />
        <MetaStat label="Topic" value={meta.topic} />
        <MetaStat label="Speaking Time" value={formatDuration(meta.speakingTime)} />
        <MetaStat label="Total Time" value={formatDuration(meta.totalTime)} />
      </div>
    </div>
  );
});

export default MotionInput;

function MetaStat({ label, value }) {
  return (
    <div className="border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 truncate text-sm text-[var(--app-text)]">{value ?? "-"}</p>
    </div>
  );
}
