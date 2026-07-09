import AllocationParser from "./AllocationParser";

// sessionStorage (not localStorage) so a refresh or brief network hiccup
// doesn't lose the loaded conference, but closing the tab still leaves no
// trace, matching this app's in-memory-only design.
const STORAGE_KEY = "motion-conference-session";

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
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      this.conference = JSON.parse(raw);
      this.loaded = true;
    } catch {
      // corrupted or unavailable - start fresh instead of throwing
    }
  }

  async loadConference(file) {
    this.reset();

    const parser = new AllocationParser();
    const parsed = await parser.load(file);

    this.conference.name = parsed.name;

    parsed.committees.forEach((sheet) => {
      try {
        const committee = this.buildCommittee(sheet);

        this.conference.committees[committee.id] = committee;
      } catch (error) {
        console.warn(
          `Skipping sheet "${sheet.id}": ${error.message}`
        );
      }
    });

    const committees =
      Object.keys(this.conference.committees);

    if (committees.length) {
      this.conference.activeCommittee =
        committees[0];
    }

    this.loaded = true;
    this.persist();

    return this.conference;
  }

  // `sheet` is one parsed committee from AllocationParser:
  // { id, title, topic, chairs, delegates, pages }. This just reshapes it
  // into the committee/delegate records the rest of this service (and its
  // consumers) expect, adding the session-tracking fields (present/voting/
  // hasSpoken/speakingTime/notes) AllocationParser has no reason to know about.
  buildCommittee(sheet) {
    return {
      id: sheet.id,
      sheetName: sheet.id,
      committee: sheet.title || sheet.id,
      topic: sheet.topic || "",
      chairs: sheet.chairs.map((person) => this.toStaffRecord(person)),
      pages: sheet.pages.map((person) => this.toStaffRecord(person)),
      delegates: sheet.delegates.map((person) => this.toDelegateRecord(person)),
    };
  }

  toStaffRecord(person) {
    return {
      role: person.role ?? "",
      name: person.name ?? "",
      email: person.email ?? "",
      school: person.school ?? "",
    };
  }

  toDelegateRecord(person) {
    return {
      id: crypto.randomUUID(),

      country: person.country ?? "",
      countryDisplay: person.countryDisplay ?? person.country ?? "",
      countryCode: person.countryCode ?? null,

      delegate: person.name ?? "",

      school: person.school ?? "",

      email: person.email ?? "",

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

  markSpoken(id, seconds = 0) {
    const delegate = this.getDelegate(id);

    if (!delegate) return false;

    delegate.hasSpoken = true;
    delegate.speakingTime += seconds;
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
        (delegate) => !delegate.hasSpoken
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