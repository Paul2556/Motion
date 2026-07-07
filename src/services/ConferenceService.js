import AllocationParser from "./AllocationParser";

class ConferenceService {
  constructor() {
    this.reset();
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

    return true;
  }

  togglePresent(id) {
    const delegate = this.getDelegate(id);

    if (!delegate) return false;

    delegate.present = !delegate.present;

    return delegate.present;
  }

  resetAttendance() {
    this.getDelegates().forEach((delegate) => {
      delegate.present = false;
      delegate.voting = false;
    });
  }

  // ============================================================
  // Speaking
  // ============================================================

  markSpoken(id, seconds = 0) {
    const delegate = this.getDelegate(id);

    if (!delegate) return false;

    delegate.hasSpoken = true;
    delegate.speakingTime += seconds;

    return true;
  }

  resetSpeakingHistory() {
    this.getDelegates().forEach((delegate) => {
      delegate.hasSpoken = false;
      delegate.speakingTime = 0;
    });
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