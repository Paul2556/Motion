// Extracts committee title/topic/chairs/delegates/pages/stance from a Model UN
// allocation sheet, tolerant of per-conference layout differences. Uses ExcelJS
// (already a dependency) rather than SheetJS, to avoid bundling two spreadsheet
// parsers.
import ExcelJS from "exceljs";
import { countries, historicalCountries, CHAIR_WORDS, PAGE_WORDS, SKIP_SHEETS, NAME_WORDS, EMAIL_WORDS, TOPIC_WORDS } from "../constants";

function firstNonNullIndex(row) {
  for (let i = 0; i < row.length; i++) if (row[i] !== null && row[i] !== "") return i;
  return -1;
}

function uniqueNonNull(row) {
  return [...new Set(row.filter(v => v !== null && v !== ""))];
}

function nonNullCount(row) {
  return row.filter(v => v !== null && v !== "").length;
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

// `display` deliberately keeps the sheet's own wording ("USA", "Deutschland")
// rather than the canonical name, since it has to match the delegate's physical
// placard. `code` is what drives flags and fuzzy matching underneath.
const matchesName = (c, name) =>
  c.name.toLowerCase() === name || c.alias?.some(a => a.toLowerCase() === name);

function lookupCountry(raw) {
  const cleaned = stripEmoji(raw).trim();
  const name = cleaned.toLowerCase();
  // Falls back to defunct states (USSR, Yugoslavia, etc.) for historical
  // crisis committees, after current countries so an active state always
  // wins a name collision.
  const match = countries.find(c => matchesName(c, name)) ?? historicalCountries.find(c => matchesName(c, name));

  return { name, display: cleaned, code: match ? match.code : null };
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

      const committee = this.parseWorksheet(ws, ws.name);

      // A sheet with nobody in any bucket is a leftover tab SKIP_SHEETS
      // doesn't name (e.g. a teacher's contact-list copy), not a committee.
      if (committee.chairs.length || committee.delegates.length || committee.pages.length) {
        conference.committees.push(committee);
      }
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
    // Set once a pre-header banner is matched to the sheet's own id (see the
    // EISMUN comment below) - freezes `committee.title` so a later banner in
    // the same block can't clobber it.
    let titleConfirmedById = false;

    for (const row of rows) {
      const uniq = uniqueNonNull(row);

      if (uniq.length === 1 && ["ANTI-COLONIAL","NEUTRAL","PRO-COLONIAL"].includes(String(uniq[0]).toUpperCase())) {
        lastStance = String(uniq[0]).trim();
        continue;
      }

      // A row collapsing to one repeated value (merged cells) is a banner:
      // the title, or a topic stated with no "Topic:" label. Require more
      // than one populated cell so a sparse data row isn't mistaken for one.
      if (uniq.length === 1 && nonNullCount(row) > 1) {
        const text = String(uniq[0]).trim();
        const norm = normalize(text);

        // EISMUN repeats each committee's own name a 3rd time as
        // "<Conference> <Committee> Chair Report" right before the header -
        // purely decorative, so ignore it rather than let it clobber the
        // real title captured from the banner above it.
        if (norm.includes("CHAIR REPORT")) continue;

        if (!header && norm.startsWith(normalize(sheetName))) {
          // Some templates restate the tab's own id as the title banner;
          // matching on sheet name tells it apart from the topic banner
          // that follows.
          committee.title = text;
          titleConfirmedById = true;
        } else if (!header && !titleConfirmedById) {
          // MUN101/KMIDS/HEXAMUN: a generic conference-wide banner (e.g.
          // "KMIDS MUN II | January 24, 2026") can precede the real
          // committee-name banner - keep overwriting so the LAST banner
          // before the header wins the real name.
          committee.title = text;
        } else if (!committee.topic) {
          // Either past the header (HISMUN: the topic banner sits between
          // the chairs table and the delegates table, no label) or we
          // already have an id-confirmed title (EISMUN: this is the very
          // next banner after it) - either way, this is the topic.
          committee.topic = text;
        }

        continue;
      }

      const idx = firstNonNullIndex(row);
      const first = idx === -1 ? "" : String(row[idx]).trim();

      if (TOPIC_WORDS.has(normalize(first))) {
        const rel = firstNonNullIndex(row.slice(idx + 1));
        committee.topic = rel === -1 ? null : row[idx + 1 + rel];
        continue;
      }

      // EISMUN appends a "Total Delegations: <n>" footer row right under
      // each committee's delegate table, in the same columns as real data -
      // it's a count, not a person, so skip it rather than let it become a
      // delegate with a bogus "country".
      if (normalize(first).startsWith("TOTAL")) continue;

      if (this.looksLikeHeader(row)) {
        header = row;
        mode = this.identifyHeader(row);
        lastStance = null;
        continue;
      }

      if (!header) continue;

      const { map, roleCandidate, nameCandidates } = this.makeMap(header);
      const obj = {};

      for (const [k,v] of Object.entries(map))
        obj[k] = row[v] ?? null;

      if (obj.name === undefined && nameCandidates.length) {
        const primary = map.role !== undefined ? row[map.role] : map.country !== undefined ? row[map.country] : undefined;
        for (const i of nameCandidates) {
          const v = row[i];
          if (v !== null && v !== undefined && v !== "" && v !== primary) { obj.name = v; break; }
        }
      }

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
        else if (roleCandidate !== undefined && row[roleCandidate]) roleSignal = normalize(row[roleCandidate]);

        if (roleSignal && CHAIR_WORDS.test(roleSignal)) {
          if (fromCountry) { obj.role = obj.country; delete obj.country; }
          else if (roleCandidate !== undefined && !obj.role) obj.role = row[roleCandidate];
          bucket = "chairs";
        } else if (roleSignal && PAGE_WORDS.has(roleSignal)) {
          if (fromCountry) { obj.role = obj.country; delete obj.country; }
          else if (roleCandidate !== undefined && !obj.role) obj.role = row[roleCandidate];
          bucket = "pages";
        }
      }

      // Chairs get real role text from their own column; pages and delegates
      // never do, so default those by bucket rather than leaving them blank.
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
    const roleIdxs=[];
    const countryIdxs=[];

    // First match wins: some sheets repeat a header word for an unrelated
    // mini-table sharing the same rows, and that later duplicate must not
    // clobber the real column already found for the primary table.
    header.forEach((h,i)=>{
      const t=normalize(h);

      if (t.includes("ROLE")||t.includes("POSITION")||CHAIR_WORDS.test(t)) {
        roleIdxs.push(i);
        if (map.role===undefined) map.role=i;
      }
      // ALLOCATION means the country column on some sheets and a chairs role
      // column on others. Mapping it to `country` is safe either way, since
      // the ambiguous-role fallback below reclassifies a chair/page word.
      else if (t.includes("COUNTRY")||t.includes("DELEGATION")||t.includes("NEWS")||t.includes("PAYS")||t.includes("AGENCY")||t.includes("NATION")||t.includes("MEMBER")||t.includes("PORTFOLIO")||t.includes("REPRESENTS")||t.includes("CHARACTER")||t.includes("ALLOCATION")) {
        countryIdxs.push(i);
        if (map.country===undefined) map.country=i;
      }
      else if (NAME_WORDS.has(t)) { if (map.name===undefined) map.name=i; }
      else if (t.includes("MAIL")||t.includes("CORREO")) { if (map.email===undefined) map.email=i; }
      else if (t.includes("SCHOOL")||t.includes("LYCEE")||t.includes("COLEGIO")) { if (map.school===undefined) map.school=i; }
      else if (t.includes("STANCE")) { if (map.stance===undefined) map.stance=i; }
      else if (t.includes("PAGE")||t.includes("COURSIER")||t.includes("MESSENGER")||t.includes("RUNNER")||t.includes("USHER")) { if (map.page===undefined) map.page=i; }
    });

    // Some templates label the name column with the same merged word as the
    // role/country column, and which extra column holds the real name flips
    // between chairs and delegates blocks. Surface every candidate;
    // parseWorksheet picks whichever value differs from the primary field.
    const nameCandidates = map.name===undefined
      ? [...roleIdxs.slice(1), ...countryIdxs.slice(1)]
      : [];

    // Some sheets leave the leading role column unlabeled, but others use
    // that same position for a bare row number. Only surface it as a
    // candidate; parseWorksheet promotes it to `role` only if the value
    // looks like a real chair/page word.
    let roleCandidate;
    if (map.role===undefined) {
      const labeled=Object.values(map);
      if (labeled.length) {
        const first=Math.min(...labeled);
        for (let i=0;i<first;i++) {
          if (header[i]===null||header[i]==="") { roleCandidate=i; break; }
        }
      }
    }

    return { map, roleCandidate, nameCandidates };
  }
}
