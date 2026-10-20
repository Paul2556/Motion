import AllocationParser from "./AllocationParser";
import { clearCommitteeCaches } from "../committeeCaches";
import { isRollCallTaken } from "../utils/attendance";
import { randomId } from "../utils/randomId";

// sessionStorage (not localStorage) so a refresh or brief network hiccup
// doesn't lose the loaded conference, but closing the tab still leaves no
// trace, matching this app's in-memory-only design.
const STORAGE_KEY = "motion-conference-session";

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

// sessionStorage outlives a deploy, so a reload can hand this code a shape
// an older (or broken) build wrote. Anything unusable is treated as absent.
function isRestorableConference(conference) {
  if (!isPlainObject(conference) || !isPlainObject(conference.committees)) return false;
  return Object.values(conference.committees).every(
    (committee) => isPlainObject(committee) && Array.isArray(committee.delegates) && committee.delegates.every(isPlainObject)
  );
}

// Spreadsheet cells can hold numbers, dates, or unresolved formula/error
// objects; records only ever hold text, which every page can render and search.
function toText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

class ConferenceService {
  constructor() {
    this.reset();
    this.restore();
  }

  reset() {
    this.loaded = false;

    this.conference = {
      name: "",
      date: "",
      committees: {},
      activeCommittee: null
    };
  }

  // Called after every mutation below - storage access can throw (private
  // browsing, quota, disabled), so a failure here just skips the cache
  // rather than breaking the app.
  persist() {
    try {
      if (this.loaded) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.conference));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // no-op - falls back to in-memory-only for this tab
    }
  }

  restore() {
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      // corrupted or unavailable - start fresh instead of throwing
    }
    if (!isRestorableConference(saved)) return;

    const ids = Object.keys(saved.committees);
    const committees = Object.fromEntries(
      Object.entries(saved.committees).map(([id, committee]) => [
        id,
        { ...committee, delegates: committee.delegates.map((delegate) => this.restoreDelegate(delegate)) },
      ])
    );
    this.conference = {
      ...saved,
      committees,
      name: toText(saved.name),
      activeCommittee: ids.includes(saved.activeCommittee) ? saved.activeCommittee : (ids[0] ?? null),
    };
    this.loaded = true;
  }

  // Every rendered text field goes back through toText, so one bad value in
  // an old save can't crash each page that lists delegates.
  restoreDelegate(delegate) {
    return {
      ...delegate,
      country: toText(delegate.country),
      countryDisplay: toText(delegate.countryDisplay),
      delegate: toText(delegate.delegate),
      school: toText(delegate.school),
      email: toText(delegate.email),
      speakingTime: Number.isFinite(delegate.speakingTime) ? delegate.speakingTime : 0,
    };
  }

  async loadConference(file) {
    const conference = await this.parseConference(file);
    return this.commitConference(conference);
  }

  // Bundled sample conferences (src/data/demoConferences.js) are already shaped exactly like
  // AllocationParser's output, so demo.motionmun.com can load one without a file or the parser.
  loadDemoConference(demo) {
    return this.commitConference(this.prepareConference(demo.name, demo.committees));
  }

  async parseConference(file) {
    const parsed = await new AllocationParser().load(file);
    return this.prepareConference(parsed.name, parsed.committees);
  }

  // Builds a conference without touching the one in use, so HomePage can
  // show its committee picker and a Cancel there loses nothing. `sheets` is
  // AllocationParser's shape: { id, title, topic, chairs, delegates, pages }.
  prepareConference(name, sheets) {
    const committees = {};

    sheets.forEach((sheet) => {
      try {
        const committee = this.buildCommittee(sheet);

        committees[committee.id] = committee;
      } catch (error) {
        console.warn(
          `Skipping sheet "${sheet.id}": ${error.message}`
        );
      }
    });

    return { name, date: "", committees, activeCommittee: Object.keys(committees)[0] ?? null };
  }

  commitConference(conference, activeCommittee = conference.activeCommittee) {
    this.conference = { ...conference, activeCommittee };
    this.loaded = true;
    clearCommitteeCaches();
    this.persist();

    return this.conference;
  }

  // Reshapes one parsed committee from AllocationParser into the records this
  // service exposes, adding the session-tracking fields the parser has no
  // reason to know about.
  buildCommittee(sheet) {
    return {
      id: sheet.id,
      sheetName: sheet.id,
      committee: toText(sheet.title) || sheet.id,
      topic: toText(sheet.topic),
      chairs: sheet.chairs.map((person) => this.toStaffRecord(person)),
      pages: sheet.pages.map((person) => this.toStaffRecord(person)),
      delegates: sheet.delegates.map((person) => this.toDelegateRecord(person)),
    };
  }

  toStaffRecord(person) {
    return {
      role: toText(person.role),
      name: toText(person.name),
      email: toText(person.email),
      school: toText(person.school),
    };
  }

  toDelegateRecord(person) {
    return {
      id: randomId(),

      country: toText(person.country),
      countryDisplay: toText(person.countryDisplay ?? person.country),
      countryCode: person.countryCode ?? null,

      delegate: toText(person.name),

      school: toText(person.school),

      email: toText(person.email),

      stance: person.stance ?? null,

      present: false,
      voting: false,
      hasSpoken: false,
      speakingTime: 0,
      notes: "",
    };
  }
  // ============================================================
  // Conference
  // ============================================================

  isLoaded() {
    return this.loaded;
  }

  getConference() {
    return this.conference;
  }

  getConferenceName() {
    return this.conference.name;
  }

  getCommitteeNames() {
    return Object.keys(this.conference.committees);
  }

  getCommittees() {
    return Object.values(this.conference.committees);
  }

  getCommittee(id) {
    return this.conference.committees[id] ?? null;
  }

  // ============================================================
  // Active Committee
  // ============================================================

  getActiveCommittee() {
    return this.getCommittee(
      this.conference.activeCommittee
    );
  }

  getActiveCommitteeId() {
    return this.conference.activeCommittee;
  }

  setActiveCommittee(id) {
    if (!this.conference.committees[id]) {
      return false;
    }

    this.conference.activeCommittee = id;
    this.persist();

    return true;
  }

  // ============================================================
  // Active Motion
  // ============================================================

  // Stored on the committee record itself (not a separate top-level field)
  // so it persists/restores automatically alongside everything else in
  // `this.conference`, and naturally resets per-committee like attendance/
  // speaking-time already do. Drives the /session timer's motion badge.
  getActiveMotion() {
    return this.getActiveCommittee()?.activeMotion ?? null;
  }

  setActiveMotion(motion) {
    const committee = this.getActiveCommittee();
    if (!committee) return false;

    committee.activeMotion = motion;
    this.persist();

    return true;
  }

  // ============================================================
  // Delegates
  // ============================================================

  getDelegates() {
    const committee =
      this.getActiveCommittee();

    if (!committee) return [];

    return committee.delegates;
  }

  getDelegate(id) {
    return this.getDelegates().find(
      (delegate) => delegate.id === id
    );
  }

  searchDelegates(query = "") {
    if (!query) return this.getDelegates();

    const search = query.toLowerCase();

    return this.getDelegates().filter(
      (delegate) =>
        delegate.country
          .toLowerCase()
          .includes(search) ||

        delegate.delegate
          .toLowerCase()
          .includes(search) ||

        delegate.school
          .toLowerCase()
          .includes(search) ||

        delegate.email
          .toLowerCase()
          .includes(search)
    );
  }

  getAvailableDelegates(queue = []) {
    const queued = new Set(
      queue.map((speaker) => speaker.id)
    );

    return this.getDelegates().filter(
      (delegate) =>
        !queued.has(delegate.id)
    );
  }
    // ============================================================
  // Attendance
  // ============================================================

  markPresent(id, value = true) {
    const delegate = this.getDelegate(id);

    if (!delegate) return false;

    delegate.present = value;
    this.persist();

    return true;
  }

  togglePresent(id) {
    const delegate = this.getDelegate(id);

    if (!delegate) return false;

    delegate.present = !delegate.present;
    this.persist();

    return delegate.present;
  }

  // Roll call's 3-state model ("absent" | "present" | "voting", the last
  // meaning present-and-voting) collapses onto the existing present/voting
  // booleans rather than adding a third field - voting implies present.
  setAttendanceState(id, state) {
    const delegate = this.getDelegate(id);

    if (!delegate) return false;

    delegate.present = state !== "absent";
    delegate.voting = state === "voting";
    this.persist();

    return true;
  }

  setAllAttendanceState(state) {
    this.getDelegates().forEach((delegate) => {
      delegate.present = state !== "absent";
      delegate.voting = state === "voting";
    });
    this.persist();
  }

  resetAttendance() {
    this.getDelegates().forEach((delegate) => {
      delegate.present = false;
      delegate.voting = false;
    });
    this.persist();
  }

  // ============================================================
  // Speaking
  // ============================================================

  // Next on a timer that never ran (under a second) skips the delegate
  // rather than counting a 0-second speech.
  markSpoken(id, seconds = 0) {
    const delegate = this.getDelegate(id);

    if (!delegate || !(seconds >= 1)) return false;

    delegate.hasSpoken = true;
    delegate.speakingTime += seconds;
    this.persist();

    return true;
  }

  // Puts back a record snapshotted before markSpoken, so undoing a
  // "next speaker" doesn't leave the speech counted.
  restoreSpeaking(id, { hasSpoken, speakingTime }) {
    const delegate = this.getDelegate(id);

    if (!delegate) return false;

    delegate.hasSpoken = hasSpoken;
    delegate.speakingTime = speakingTime;
    this.persist();

    return true;
  }

  resetSpeakingHistory() {
    this.getDelegates().forEach((delegate) => {
      delegate.hasSpoken = false;
      delegate.speakingTime = 0;
    });
    this.persist();
  }

  // ============================================================
  // Statistics
  // ============================================================

  getStatistics() {
    const delegates = this.getDelegates();
    const rollCallTaken = isRollCallTaken(delegates);

    return {
      delegates: delegates.length,

      present: delegates.filter(
        (delegate) => delegate.present
      ).length,

      absent: delegates.filter(
        (delegate) => !delegate.present
      ).length,

      spoken: delegates.filter(
        (delegate) => delegate.hasSpoken
      ).length,

      remaining: delegates.filter(
        (delegate) => !delegate.hasSpoken && (!rollCallTaken || delegate.present)
      ).length,

      totalSpeakingTime: delegates.reduce(
        (sum, delegate) => sum + delegate.speakingTime,
        0
      ),

      averageSpeakingTime:
        delegates.filter((delegate) => delegate.hasSpoken).length === 0
          ? 0
          : Math.round(
              delegates.reduce(
                (sum, delegate) =>
                  sum + delegate.speakingTime,
                0
              ) /
                delegates.filter(
                  (delegate) => delegate.hasSpoken
                ).length
            ),
    };
  }

  // ============================================================
  // Utility
  // ============================================================

  clear() {
    this.reset();
    this.persist();
  }
    validateConference() {
    const issues = [];

    if (!this.loaded) {
      issues.push("No conference loaded.");
      return issues;
    }

    const committees = this.getCommittees();

    if (committees.length === 0) {
      issues.push("No committees detected.");
    }

    committees.forEach((committee) => {
      if (committee.delegates.length === 0) {
        issues.push(
          `"${committee.committee}" contains no delegates.`
        );
      }

      const seen = new Set();

      committee.delegates.forEach((delegate) => {
        if (!delegate.country) {
          issues.push(
            `Delegate missing delegation in "${committee.committee}".`
          );
        }

        if (!delegate.delegate) {
          issues.push(
            `Delegate missing name in "${committee.committee}".`
          );
        }

        const key = `${delegate.country}|${delegate.delegate}`;

        if (seen.has(key)) {
          issues.push(
            `Duplicate delegate "${delegate.country}" in "${committee.committee}".`
          );
        }

        seen.add(key);
      });
    });

    return issues;
  }

  sortDelegates(by = "country") {
    this.getDelegates().sort((a, b) =>
      String(a[by] ?? "").localeCompare(
        String(b[by] ?? "")
      )
    );
    this.persist();
  }

  filterPresent() {
    return this.getDelegates().filter(
      (delegate) => delegate.present
    );
  }

  filterAbsent() {
    return this.getDelegates().filter(
      (delegate) => !delegate.present
    );
  }

  filterSpoken() {
    return this.getDelegates().filter(
      (delegate) => delegate.hasSpoken
    );
  }

  filterRemaining() {
    return this.getDelegates().filter(
      (delegate) => !delegate.hasSpoken
    );
  }

  toJSON() {
    return JSON.parse(
      JSON.stringify(this.conference)
    );
  }
  }

const conferenceService = new ConferenceService();

export default conferenceService;