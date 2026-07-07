// Ported from the standalone excelToJson tool (parser.js). Replaces
// SpreadsheetAnalyzer.js, which only detected generic rectangular table
// blocks (and never actually implemented column detection — detectColumns()
// was a stub returning {}). This does the real job: extracting committee
// title/topic/chairs/delegates/pages/stance from a Model UN allocation sheet,
// tolerant of the structural differences between different conferences'
// Excel templates (see excelToJson/claude_info.md for the full rationale).
//
// Uses ExcelJS (already a dependency here, via ConferenceService) rather than
// the SheetJS library the standalone tool switched to — adding a second
// spreadsheet-parsing library to this app's bundle would undo the bundle-size
// benefit SheetJS was chosen for there. If ConferenceService ever moves to
// SheetJS too, port extractRows() the same way and drop exceljs entirely.
import ExcelJS from "exceljs";
import { countries, CHAIR_WORDS, PAGE_WORDS, SKIP_SHEETS, NAME_WORDS, EMAIL_WORDS, TOPIC_WORDS } from "../constants";

function firstNonNullIndex(row) {
  for (let i = 0; i < row.length; i++) if (row[i] !== null && row[i] !== "") return i;
  return -1;
}

function uniqueNonNull(row) {
  return [...new Set(row.filter(v => v !== null && v !== ""))];
}

// Uppercase + strip accents, so "Président"/"Délégation" match the same
// keywords as "President"/"Delegation" without listing every accented form.
function normalize(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function stripEmoji(s) {
  return String(s ?? "")
    .replace(/\p{Extended_Pictographic}|\p{Regional_Indicator}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Cleans a raw country cell (flag emoji + "Afghanistan" -> "afghanistan") and
// looks it up against the countries list to attach a stable id a UI can use to
// render the actual flag SVG (e.g. `/flags/${countryCode}.svg`).
// `countries` only has English names, so non-English cells (e.g. a French
// sheet's "Allemagne") intentionally resolve to code: null rather than
// guessing - no flag is shown for those rather than a wrong/broken one.
// Returns both `name` (lowercase - the canonical key used for matching/
// search/sort) and `display` (the properly-cased form for showing in a UI:
// the canonical name when matched, otherwise the original cell text as-is -
// deliberately not "corrected" via title-casing, since real cells are
// legitimately either mixed-case ("BSAA Director") or intentional
// abbreviations ("UK", "USA") that title-casing would mangle into "Uk"/"Usa").
function lookupCountry(raw) {
  const cleaned = stripEmoji(raw).trim();
  const name = cleaned.toLowerCase();
  const match = countries.find(c => c.name.toLowerCase() === name);

  const display = match ? match.name : cleaned;

  return { name, display, code: match ? match.code : null };
}

export default class AllocationParser {
  // `file` is a browser File object (e.g. from an <input type="file">
  // onChange event), matching ConferenceService.loadConference()'s signature.
  async load(file) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());

    const conference = {
      name: file.name.replace(/\.xlsx$/i, ""),
      committees: []
    };

    workbook.eachSheet(ws => {
      if (SKIP_SHEETS.has(ws.name.toLowerCase())) return;
      conference.committees.push(this.parseWorksheet(ws, ws.name));
    });

    return conference;
  }

  parseWorksheet(ws, sheetName) {
    const rows = this.extractRows(ws);

    const committee = {
      id: sheetName,
      title: null,
      topic: null,
      chairs: [],
      delegates: [],
      pages: []
    };

    let mode = "none";
    let header = null;
    let lastStance = null;

    for (const row of rows) {
      const uniq = uniqueNonNull(row);

      if (!header && uniq.length === 1) {
        committee.title = String(uniq[0]).trim();
        continue;
      }

      const idx = firstNonNullIndex(row);
      const first = idx === -1 ? "" : String(row[idx]).trim();

      if (TOPIC_WORDS.has(normalize(first))) {
        const rel = firstNonNullIndex(row.slice(idx + 1));
        committee.topic = rel === -1 ? null : row[idx + 1 + rel];
        continue;
      }

      if (uniq.length === 1 && ["ANTI-COLONIAL","NEUTRAL","PRO-COLONIAL"].includes(String(uniq[0]).toUpperCase())) {
        lastStance = String(uniq[0]).trim();
        continue;
      }

      if (this.looksLikeHeader(row)) {
        header = row;
        mode = this.identifyHeader(row);
        lastStance = null;
        continue;
      }

      if (!header) continue;

      const map = this.makeMap(header);
      const obj = {};

      for (const [k,v] of Object.entries(map))
        obj[k] = row[v] ?? null;

      if (map.stance !== undefined) {
        if (obj.stance !== null && obj.stance !== "") lastStance = obj.stance;
        else obj.stance = lastStance;
      } else if (lastStance) {
        obj.stance = lastStance;
      }

      let bucket = "delegates";

      if (mode === "chairs") {
        bucket = "chairs";
      } else if (mode === "pages") {
        bucket = "pages";
      } else {
        let roleSignal = null, fromCountry = false;
        if (obj.role) roleSignal = normalize(obj.role);
        else if (obj.country) { roleSignal = normalize(obj.country); fromCountry = true; }

        if (roleSignal && CHAIR_WORDS.test(roleSignal)) {
          if (fromCountry) { obj.role = obj.country; delete obj.country; }
          bucket = "chairs";
        } else if (roleSignal && PAGE_WORDS.has(roleSignal)) {
          if (fromCountry) { obj.role = obj.country; delete obj.country; }
          bucket = "pages";
        }
      }

      // Give every entry a role label for consistent display. Chairs already
      // have real descriptive text from their own header column ("Head
      // Chair", "Co-Chair") or from being promoted out of `country` above;
      // pages from a dedicated PAGE/COURSIER column only ever hold a row
      // number there (nothing to promote), and delegates never had a role
      // column at all - default both by bucket instead of leaving them blank.
      if (!obj.role) obj.role = bucket === "pages" ? "Page" : bucket === "chairs" ? "Chair" : "Delegate";

      if (obj.country) {
        const { name, display, code } = lookupCountry(obj.country);
        obj.country = name;
        obj.countryDisplay = display;
        obj.countryCode = code;
      }

      committee[bucket].push(obj);
    }

    return committee;
  }

  extractRows(ws) {
    const rows = [];

    ws.eachRow({includeEmpty:true}, row => {
      const out = [];

      for (let c=1;c<=row.cellCount;c++) {
        const cell = row.getCell(c);

        let v = cell.master !== cell ? cell.master.value : cell.value;

        if (v && typeof v === "object") {
          if (v.text) v = v.text;
          else if (v.richText) v = v.richText.map(x=>x.text).join("");
          else if ("result" in v) v = v.result;
        }

        if (typeof v === "string") v = v.trim();

        out.push(v ?? null);
      }

      while (out.length && (out[out.length-1]===null || out[out.length-1]===""))
        out.pop();

      if (out.length) rows.push(out);
    });

    return rows;
  }

  looksLikeHeader(row){
    const t=row.map(x=>normalize(x));
    return t.some(x=>NAME_WORDS.has(x)||EMAIL_WORDS.has(x));
  }

  identifyHeader(row){
    const t=row.map(x=>normalize(x));

    if (t.includes("ROLE") || t.includes("POSITION"))
      return "mixed";

    if (t.some(x=>CHAIR_WORDS.test(x)))
      return "chairs";

    if (t.some(x=>x.includes("PAGE")||x.includes("COURSIER")||x.includes("MESSENGER")||x.includes("RUNNER")||x.includes("USHER")))
      return "pages";

    return "delegates";
  }

  makeMap(header){
    const map={};

    header.forEach((h,i)=>{
      const t=normalize(h);

      if (t.includes("ROLE")||t.includes("POSITION")||CHAIR_WORDS.test(t)) map.role=i;
      else if (t.includes("COUNTRY")||t.includes("DELEGATION")||t.includes("NEWS")||t.includes("PAYS")||t.includes("AGENCY")||t.includes("NATION")||t.includes("MEMBER")||t.includes("PORTFOLIO")||t.includes("REPRESENTS")||t.includes("CHARACTER")) map.country=i;
      else if (NAME_WORDS.has(t)) map.name=i;
      else if (t.includes("MAIL")||t.includes("CORREO")) map.email=i;
      else if (t.includes("SCHOOL")||t.includes("LYCEE")||t.includes("COLEGIO")) map.school=i;
      else if (t.includes("STANCE")) map.stance=i;
      else if (t.includes("PAGE")||t.includes("COURSIER")||t.includes("MESSENGER")||t.includes("RUNNER")||t.includes("USHER")) map.page=i;
    });

    return map;
  }
}
