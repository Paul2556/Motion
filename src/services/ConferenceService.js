import ExcelJS from "exceljs";

class ConferenceService {
  constructor() {
    this.aliases = {
      delegation: [
        "country",
        "delegation",
        "allocation",
        "character",
        "agency",
        "news agency",
        "news agencies",
        "representative",
        "member state",
        "stance",
        "délégation"
      ],

      delegate: [
        "delegate",
        "name",
        "nom",
        "student",
        "participant"
      ],

      school: [
        "school",
        "lycée",
        "institution"
      ],

      email: [
        "email",
        "e-mail",
        "mail"
      ],

      position: [
        "#",
        "position",
        "number"
      ]
    };

    this.reset();
  }

  reset() {
    this.loaded = false;

    this.workbook = null;

    this.conference = {
      name: "",
      date: "",
      committees: {},
      activeCommittee: null
    };
  }

  async loadConference(file) {
    this.reset();

    this.workbook = new ExcelJS.Workbook();

    await this.workbook.xlsx.load(
      await file.arrayBuffer()
    );

    this.conference.name =
      file.name.replace(/\.xlsx$/i, "");

    this.workbook.eachSheet((worksheet) => {
      try {
        const committee = this.buildCommittee(worksheet);

        this.conference.committees[committee.id] = committee;
      } catch (error) {
        console.warn(
          `Skipping sheet "${worksheet.name}": ${error.message}`
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
    buildCommittee(worksheet) {
    const committee = {
      id: worksheet.name,

      sheetName: worksheet.name,

      committee: worksheet.name,

      topic: "",

      room: "",

      conference: "",

      date: "",

      format: null,

      chairs: [],

      delegates: [],

      columns: {}
    };

    // Read every row into memory

    const rows = [];

    for (let i = 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);

      rows.push({
        excelRow: i,
        values: row.values.map((cell) => {
          if (cell == null) return "";
          return String(cell).trim();
        }),
      });
    }
    
    // ---------- Metadata ----------

    rows.forEach(({ values }) => {
      const text = values.join(" ");
      const lower = text.toLowerCase();

      const last = values[values.length - 1];

      if (!committee.conference && lower.includes("mun")) {
        committee.conference = text;
      }

      if (lower.includes("committee")) {
        committee.committee = last || committee.committee;
      }

      if (lower.includes("topic")) {
        committee.topic = last;
      }

      if (lower.includes("room")) {
        committee.room = last;
      }

      if (lower.includes("head chair")) {
        committee.chairs.push({
          role: "Head Chair",
          name: last,
        });
      }

      if (lower.includes("co-chair") || lower.includes("co chair")) {
        committee.chairs.push({
          role: "Co-Chair",
          name: last,
        });
      }
    });

    // ---------- Detect header ----------

    const header = this.findHeader(rows);

    committee.columns = header.columns;

    committee.format =
      this.detectFormat(header.columns);

    // ---------- Delegates ----------

    committee.delegates =
      this.readDelegates(
        worksheet,
        header
      );

    return committee;
  }
    findHeader(rows) {
      let best = null;
      let bestScore = -1;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex].values;
        const columns = {};
        let score = 0;

        row.forEach((cell, columnIndex) => {
          const value = String(cell)
            .trim()
            .toLowerCase();

          Object.entries(this.aliases).forEach(([field, aliases]) => {
            if (aliases.includes(value)) {
              columns[field] = columnIndex + 1;
              score++;
            }
          });
        });

        if (score > bestScore) {
          bestScore = score;
          best = {
            row: rows[rowIndex].excelRow,
            columns,
          };
        }
      }

      if (!best || bestScore < 3) {
        throw new Error(
          "Unable to locate delegate table."
        );
      }

      console.log(
        "Header row:",
        best.row,
        rows.find(r => r.excelRow === best.row)?.values
      );

      return best;
    }

    detectFormat(columns) {
      if (
        columns.delegation !== undefined &&
        columns.delegate !== undefined
      ) {
        return "delegation";
      }

      if (
        columns.delegate !== undefined &&
        columns.committee !== undefined
      ) {
        return "committee";
      }

      if (
        columns.delegate !== undefined &&
        columns.email !== undefined
      ) {
        return "people";
      }

      return "unknown";
    }
    
    isDelegateRow(text) {
      if (!text) return false;

      const value = text.trim();

      // KMIDS/FWC numbering (#1 Australia)
      if (/^#\d+\s+/.test(value)) {
        return true;
      }

      const lower = value.toLowerCase();

      // Staff / metadata
      const blocked = [
        "head chair",
        "co-chair",
        "co chair",
        "assistant chair",
        "chair",
        "page",
        "topic",
        "room",
        "committee",
        "country",
        "allocation",
        "delegation",
        "name",
        "school",
        "email",
        "role"
      ];

      if (blocked.includes(lower)) {
        return false;
      }

      // Ignore empty or numeric-only values
      if (/^\d+$/.test(value)) {
        return false;
      }

      // If it contains at least one letter, treat it as an allocation.
      return /\p{L}/u.test(value);
    }

    readDelegates(worksheet, header) {
      const delegates = [];

      const { row: headerRow, columns } = header;

      let blankRows = 0;
      let started = false;
      let numberedMode = null;

      for (
        let rowNumber = headerRow + 1;
        rowNumber <= worksheet.rowCount;
        rowNumber++
      ) {
        const row = worksheet.getRow(rowNumber);

        const delegation =
            columns.delegation !== undefined
                ? row.getCell(columns.delegation).text.trim()
                : "";

        const delegate =
            columns.delegate !== undefined
                ? row.getCell(columns.delegate).text.trim()
                : "";

        const school =
            columns.school !== undefined
                ? row.getCell(columns.school).text.trim()
                : "";

        const email =
            columns.email !== undefined
                ? row.getCell(columns.email).text.trim()
                : "";

        const position =
          columns.position
            ? row.getCell(columns.position).text.trim()
            : "";

        // Completely blank row
        if (!delegation && !delegate) {
          blankRows++;

          if (started && blankRows >= 2) {
            break;
          }

          continue;
        }

        blankRows = 0;

        const lower = delegation.toLowerCase();

        // Skip committee staff
        if (
          lower === "head chair" ||
          lower === "co-chair" ||
          lower === "co chair" ||
          lower === "chair" ||
          lower === "assistant chair" ||
          lower === "page" ||
          lower === "secretariat"
        ) {
          continue;
        }

        // Determine workbook style
        if (numberedMode === null) {
          numberedMode = /^#\d+/.test(delegation);
        }

        // KMIDS workbook
        if (numberedMode) {
          if (!started) {
              if (
                  delegation &&
                  this.isDelegateRow(delegation)
              ) {
                  started = true;
              }

              else if (
                  !delegation &&
                  delegate &&
                  school
              ) {
                  started = true;
              }

              else {
                  continue;
              }
          }
        }

        // FWC workbook
        else {
          if (!started) {
            if (
              !delegation ||
              !delegate ||
              lower === "country" ||
              lower === "delegation"
            ) {
              continue;
            }

            started = true;
          }
        }

        delegates.push({
          id: crypto.randomUUID(),

          position,

          allocation: delegation,

          country:
            delegation
                ? delegation
                    .replace(/^#\d+\s*/, "")
                    .replace(/^[^\p{L}]+/u, "")
                    .trim()
                : "",

          delegate,

          school,

          email,

          present: false,
          voting: false,
          hasSpoken: false,
          speakingTime: 0,
          notes: "",
        });
      }

      return delegates;
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