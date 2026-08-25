// Bundled sample conferences for demo.motionmun.com - lets a demo visitor try every feature
// without needing a real conference .xlsx. Shaped exactly like AllocationParser's parsed output
// ({ name, committees: [{ id, title, topic, chairs, pages, delegates }] }), so
// ConferenceService.loadDemoConference can feed it straight into buildCommittee with no parser
// involved. All delegate/chair names below are fictional placeholders, not real people.

const NAME_POOL = [
  "Jordan Ellis", "Morgan Blake", "Riley Chen", "Casey Novak", "Avery Kim",
  "Quinn Torres", "Harper Lang", "Rowan Patel", "Sasha Reyes", "Devon Marsh",
  "Emerson Cole", "Skyler Voss", "Finley Grant", "Reese Dumont", "Kai Andrade",
  "Micah Sorensen", "Elliot Vance", "Ashton Ferro", "Blair Whitfield", "Tatum Bryce",
  "Noor Haddad", "Lior Ben-Ami", "Priya Nandan", "Wren Castellano", "Dylan Okafor",
  "Ines Moreau", "Theo Lindqvist", "Zara Malhotra", "Callum Reid", "Junho Baek",
];

function nameFor(index) {
  return NAME_POOL[index % NAME_POOL.length];
}

function delegate(country, code, index) {
  return {
    name: nameFor(index),
    country,
    countryDisplay: country,
    countryCode: code,
    school: "Demo Delegation",
    email: "",
    stance: null,
  };
}

const UNSC_COUNTRIES = [
  ["United States", "USA"],
  ["United Kingdom", "GBR"],
  ["France", "FRA"],
  ["Russia", "RUS"],
  ["China", "CHN"],
  ["Brazil", "BRA"],
  ["India", "IND"],
  ["Japan", "JPN"],
  ["Germany", "DEU"],
  ["Kenya", "KEN"],
  ["Ecuador", "ECU"],
  ["Malta", "MLT"],
  ["Mozambique", "MOZ"],
  ["Switzerland", "CHE"],
  ["Algeria", "DZA"],
];

const SOCHUM_COUNTRIES = [
  ["Canada", "CAN"],
  ["Mexico", "MEX"],
  ["Nigeria", "NGA"],
  ["South Africa", "ZAF"],
  ["Egypt", "EGY"],
  ["Saudi Arabia", "SAU"],
  ["Indonesia", "IDN"],
  ["Australia", "AUS"],
  ["Sweden", "SWE"],
  ["Norway", "NOR"],
  ["Poland", "POL"],
  ["Turkey", "TUR"],
  ["Argentina", "ARG"],
  ["Chile", "CHL"],
  ["Thailand", "THA"],
  ["Vietnam", "VNM"],
  ["South Korea", "KOR"],
  ["Netherlands", "NLD"],
];

const demoConferences = [
  {
    id: "demo-unsc",
    name: "Motion Demo: United Nations Security Council",
    committees: [
      {
        id: "demo-unsc",
        title: "United Nations Security Council",
        topic: "Maintaining Peace and Security in Contested Maritime Zones",
        chairs: [{ role: "Chair", name: "Demo Chair", email: "", school: "" }],
        pages: [],
        delegates: UNSC_COUNTRIES.map(([country, code], index) => delegate(country, code, index)),
      },
    ],
  },
  {
    id: "demo-sochum",
    name: "Motion Demo: General Assembly Third Committee",
    committees: [
      {
        id: "demo-sochum",
        title: "General Assembly Third Committee (SOCHUM)",
        topic: "Protecting Digital Rights and Freedom of Expression",
        chairs: [{ role: "Chair", name: "Demo Chair", email: "", school: "" }],
        pages: [],
        delegates: SOCHUM_COUNTRIES.map(([country, code], index) => delegate(country, code, index)),
      },
    ],
  },
];

export default demoConferences;
