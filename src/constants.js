// Common parliamentary motions raised on the floor of an MUN committee,
// phrased the way a chair would read them aloud. `alias` (when present)
// lists the shorthand delegates actually say on the floor instead. `explicit`
// (when true) requires fuzzy matching to see all of this phrase's words, not
// just wordCount-1 of them (see MotionInput's requireExactWordCount) - without
// it, "12 minutes speaking time" would fuzzy-match the 2 words "speaking
// time" against this 3-word alias missing just "Extend", misreading an
// ordinary per-speaker time mention as this motion.
export const MOTIONS = [
  { text: "Open a Moderated Caucus", alias: ["Moderated Caucus", "Mod Caucus", "Mod"] },
  { text: "Open an Unmoderated Caucus", alias: ["Unmoderated Caucus", "Unmod Caucus", "Unmod"] },
  { text: "Open the General Speaker's List", alias: ["Open the GSL", "Open Speaker's List"] },
  { text: "Close the General Speaker's List", alias: ["Close the GSL", "Close Speaker's List"] },
  { text: "Extend the Speaking Time", alias: ["Extend Speaking Time"], explicit: true },
  { text: "Extend the Moderated Caucus", alias: ["Extend the Mod Caucus", "Extend Mod"] },
  { text: "Introduce a Draft Resolution", alias: ["Introduce Draft Resolution", "Introduce a Draft Res"] },
  { text: "Introduce an Amendment", alias: ["Introduce Amendment"] },
  { text: "Move into Voting Procedure", alias: ["Move to Voting Procedure", "Voting Procedure"] },
  { text: "Suspend the Meeting", alias: ["Suspend Meeting"] },
  { text: "Adjourn the Meeting", alias: ["Adjourn Meeting"] },
];

// Ported from excelToJson/assets/constants.js — kept in sync by hand, not by
// a build step. If you change the word lists there, mirror the change here.
// Official ISO 3166-1 alpha-3 codes (cross-checked against the ISO OBP and
// Wikipedia's mirror of it). `name` is the display name; `alias` (when
// present) lists other names MUN allocation sheets use for the same country
// - official long form, informal/former names, and the French short name
// (English and French are the UN's two working languages, and some
// conferences run French-language sheets - see AllocationParser's header
// detection, which already tolerates French vocab elsewhere) - skipped
// where it's identical to the English name (e.g. "Canada"). AllocationParser
// matches a cell's country name against both `name` and every `alias`. `code`
// also keys the flag SVGs in src/assets/flags (see components/Flag.jsx).
// Almost all `code`s are ISO 3166-1 alpha-3, except constituent-nation entries
// some MUN sheets list separately (currently just "Scotland"), which use
// their ISO 3166-2 subdivision code instead (e.g. "GB-SCT").
export const countries = [
  { name: "Afghanistan", code: "AFG" },
  { name: "Albania", code: "ALB", alias: ["Albanie"] },
  { name: "Algeria", code: "DZA", alias: ["Algérie"] },
  { name: "American Samoa", code: "ASM", alias: ["Samoa américaines"] },
  { name: "Andorra", code: "AND", alias: ["Andorre"] },
  { name: "Angola", code: "AGO" },
  { name: "Anguilla", code: "AIA" },
  { name: "Antarctica", code: "ATA", alias: ["Antarctique"] },
  { name: "Antigua and Barbuda", code: "ATG", alias: ["Antigua-et-Barbuda"] },
  { name: "Argentina", code: "ARG", alias: ["Argentine"] },
  { name: "Armenia", code: "ARM", alias: ["Arménie"] },
  { name: "Aruba", code: "ABW" },
  { name: "Australia", code: "AUS", alias: ["Australie"] },
  { name: "Austria", code: "AUT", alias: ["Autriche"] },
  { name: "Azerbaijan", code: "AZE", alias: ["Azerbaïdjan"] },
  { name: "Bahamas", code: "BHS", alias: ["The Bahamas"] },
  { name: "Bahrain", code: "BHR", alias: ["Bahreïn"] },
  { name: "Bangladesh", code: "BGD" },
  { name: "Barbados", code: "BRB", alias: ["Barbade"] },
  { name: "Belarus", code: "BLR", alias: ["Byelorussian SSR", "Byelorussia", "Bélarus"] },
  { name: "Belgium", code: "BEL", alias: ["Belgique"] },
  { name: "Belize", code: "BLZ" },
  { name: "Benin", code: "BEN", alias: ["Dahomey", "Bénin"] },
  { name: "Bermuda", code: "BMU", alias: ["Bermudes"] },
  { name: "Bhutan", code: "BTN", alias: ["Bhoutan"] },
  { name: "Bolivia", code: "BOL", alias: ["Plurinational State of Bolivia", "État plurinational de Bolivie", "Bolivie"] },
  { name: "Bonaire, Sint Eustatius and Saba", code: "BES", alias: ["Bonaire, Saint-Eustache et Saba"] },
  { name: "Bosnia and Herzegovina", code: "BIH", alias: ["Bosnia", "Bosnie-Herzégovine"] },
  { name: "Botswana", code: "BWA" },
  { name: "Bouvet Island", code: "BVT", alias: ["Île Bouvet"] },
  { name: "Brazil", code: "BRA", alias: ["Brésil"] },
  { name: "British Indian Ocean Territory", code: "IOT", alias: ["Territoire britannique de l'océan Indien"] },
  { name: "Brunei", code: "BRN", alias: ["Brunei Darussalam", "Brunéi Darussalam"] },
  { name: "Bulgaria", code: "BGR", alias: ["Bulgarie"] },
  { name: "Burkina Faso", code: "BFA", alias: ["Upper Volta"] },
  { name: "Burundi", code: "BDI" },
  { name: "Cabo Verde", code: "CPV", alias: ["Cape Verde", "Cap-Vert"] },
  { name: "Cambodia", code: "KHM", alias: ["Cambodge"] },
  { name: "Cameroon", code: "CMR", alias: ["Cameroun"] },
  { name: "Canada", code: "CAN" },
  { name: "Cayman Islands", code: "CYM", alias: ["Îles Caïmans"] },
  { name: "Central African Republic", code: "CAF", alias: ["CAR", "République centrafricaine", "Centrafrique"] },
  { name: "Chad", code: "TCD", alias: ["Tchad"] },
  { name: "Chile", code: "CHL", alias: ["Chili"] },
  { name: "China", code: "CHN", alias: ["People's Republic of China", "PRC", "Chine"] },
  { name: "Christmas Island", code: "CXR", alias: ["Île Christmas"] },
  { name: "Cocos (Keeling) Islands", code: "CCK", alias: ["Îles Cocos (Keeling)"] },
  { name: "Colombia", code: "COL", alias: ["Colombie"] },
  { name: "Comoros", code: "COM", alias: ["Comores"] },
  { name: "Congo", code: "COG", alias: ["Republic of Congo", "Congo-Brazzaville"] },
  { name: "Cook Islands", code: "COK", alias: ["Îles Cook"] },
  { name: "Costa Rica", code: "CRI" },
  { name: "Croatia", code: "HRV", alias: ["Croatie"] },
  { name: "Cuba", code: "CUB" },
  { name: "Curaçao", code: "CUW", alias: ["Curacao"] },
  { name: "Cyprus", code: "CYP", alias: ["Chypre"] },
  { name: "Czechia", code: "CZE", alias: ["Czech Republic", "Tchéquie"] },
  { name: "Côte d'Ivoire", code: "CIV", alias: ["Ivory Coast", "Cote d'Ivoire"] },
  { name: "Denmark", code: "DNK", alias: ["Danemark"] },
  { name: "Djibouti", code: "DJI", alias: ["French Afars and Issas"] },
  { name: "Dominica", code: "DMA", alias: ["Dominique"] },
  { name: "Dominican Republic", code: "DOM", alias: ["République dominicaine"] },
  { name: "DR Congo", code: "COD", alias: ["Congo, Democratic Republic", "DRC", "Congo-Kinshasa", "Zaire", "République démocratique du Congo", "RDC"] },
  { name: "Ecuador", code: "ECU", alias: ["Équateur"] },
  { name: "Egypt", code: "EGY", alias: ["Égypte"] },
  { name: "El Salvador", code: "SLV" },
  { name: "Equatorial Guinea", code: "GNQ", alias: ["Guinée équatoriale"] },
  { name: "Eritrea", code: "ERI", alias: ["Érythrée"] },
  { name: "Estonia", code: "EST", alias: ["Estonie"] },
  { name: "Eswatini", code: "SWZ", alias: ["Swaziland"] },
  { name: "Ethiopia", code: "ETH", alias: ["Éthiopie"] },
  { name: "Falkland Islands (Malvinas)", code: "FLK", alias: ["Malvinas", "Îles Falkland (Malouines)"] },
  { name: "Faroe Islands", code: "FRO", alias: ["Îles Féroé"] },
  { name: "Fiji", code: "FJI", alias: ["Fidji"] },
  { name: "Finland", code: "FIN", alias: ["Finlande"] },
  { name: "France", code: "FRA" },
  { name: "French Guiana", code: "GUF", alias: ["Guyane française"] },
  { name: "French Polynesia", code: "PYF", alias: ["Polynésie française"] },
  { name: "French Southern Territories", code: "ATF", alias: ["Terres australes françaises"] },
  { name: "Gabon", code: "GAB" },
  { name: "Gambia", code: "GMB", alias: ["The Gambia", "Gambie"] },
  { name: "Georgia", code: "GEO", alias: ["Géorgie"] },
  { name: "Germany", code: "DEU", alias: ["Allemagne"] },
  { name: "Ghana", code: "GHA" },
  { name: "Gibraltar", code: "GIB" },
  { name: "Greece", code: "GRC", alias: ["Grèce"] },
  { name: "Greenland", code: "GRL", alias: ["Groenland"] },
  { name: "Grenada", code: "GRD", alias: ["Grenade"] },
  { name: "Guadeloupe", code: "GLP" },
  { name: "Guam", code: "GUM" },
  { name: "Guatemala", code: "GTM" },
  { name: "Guernsey", code: "GGY", alias: ["Guernesey"] },
  { name: "Guinea", code: "GIN", alias: ["Guinée"] },
  { name: "Guinea-Bissau", code: "GNB", alias: ["Guinée-Bissau"] },
  { name: "Guyana", code: "GUY" },
  { name: "Haiti", code: "HTI", alias: ["Haïti"] },
  { name: "Heard Island and McDonald Islands", code: "HMD", alias: ["Île Heard-et-Îles MacDonald"] },
  { name: "Holy See", code: "VAT", alias: ["Vatican City", "Saint-Siège"] },
  { name: "Honduras", code: "HND" },
  { name: "Hong Kong", code: "HKG", alias: ["Hong Kong SAR"] },
  { name: "Hungary", code: "HUN", alias: ["Hongrie"] },
  { name: "Iceland", code: "ISL", alias: ["Islande"] },
  { name: "India", code: "IND", alias: ["Bharat", "Inde"] },
  { name: "Indonesia", code: "IDN", alias: ["Indonésie"] },
  { name: "Iran", code: "IRN", alias: ["Iran, Islamic Republic", "République islamique d'Iran"] },
  { name: "Iraq", code: "IRQ" },
  { name: "Ireland", code: "IRL", alias: ["Republic of Ireland", "Irlande"] },
  { name: "Isle of Man", code: "IMN", alias: ["Île de Man"] },
  { name: "Israel", code: "ISR", alias: ["Israël"] },
  { name: "Italy", code: "ITA", alias: ["Italie"] },
  { name: "Jamaica", code: "JAM", alias: ["Jamaïque"] },
  { name: "Japan", code: "JPN", alias: ["Japon"] },
  { name: "Jersey", code: "JEY" },
  { name: "Jordan", code: "JOR", alias: ["Jordanie"] },
  { name: "Kazakhstan", code: "KAZ" },
  { name: "Kenya", code: "KEN" },
  { name: "Kiribati", code: "KIR" },
  { name: "Kuwait", code: "KWT", alias: ["Koweït"] },
  { name: "Kyrgyzstan", code: "KGZ", alias: ["Kirghizistan"] },
  { name: "Laos", code: "LAO", alias: ["Lao People's Democratic Republic", "Lao PDR", "République démocratique populaire Lao"] },
  { name: "Latvia", code: "LVA", alias: ["Lettonie"] },
  { name: "Lebanon", code: "LBN", alias: ["Liban"] },
  { name: "Lesotho", code: "LSO" },
  { name: "Liberia", code: "LBR", alias: ["Libéria"] },
  { name: "Libya", code: "LBY", alias: ["Libye"] },
  { name: "Liechtenstein", code: "LIE" },
  { name: "Lithuania", code: "LTU", alias: ["Lituanie"] },
  { name: "Luxembourg", code: "LUX" },
  { name: "Macao", code: "MAC", alias: ["Macau"] },
  { name: "Madagascar", code: "MDG" },
  { name: "Malawi", code: "MWI" },
  { name: "Malaysia", code: "MYS", alias: ["Malaisie"] },
  { name: "Maldives", code: "MDV" },
  { name: "Mali", code: "MLI" },
  { name: "Malta", code: "MLT", alias: ["Malte"] },
  { name: "Marshall Islands", code: "MHL", alias: ["RMI", "Îles Marshall"] },
  { name: "Martinique", code: "MTQ" },
  { name: "Mauritania", code: "MRT", alias: ["Mauritanie"] },
  { name: "Mauritius", code: "MUS", alias: ["Maurice"] },
  { name: "Mayotte", code: "MYT" },
  { name: "Mexico", code: "MEX", alias: ["Mexique"] },
  { name: "Micronesia", code: "FSM", alias: ["Micronesia, Federated States", "FSM", "États fédérés de Micronésie", "Micronésie"] },
  { name: "Moldova", code: "MDA", alias: ["Moldova, Republic", "République de Moldova"] },
  { name: "Monaco", code: "MCO" },
  { name: "Mongolia", code: "MNG", alias: ["Mongolie"] },
  { name: "Montenegro", code: "MNE", alias: ["Monténégro"] },
  { name: "Montserrat", code: "MSR" },
  { name: "Morocco", code: "MAR", alias: ["Maroc"] },
  { name: "Mozambique", code: "MOZ" },
  { name: "Myanmar", code: "MMR", alias: ["Burma", "Birmanie"] },
  { name: "Namibia", code: "NAM", alias: ["Namibie"] },
  { name: "Nauru", code: "NRU" },
  { name: "Nepal", code: "NPL", alias: ["Népal"] },
  { name: "Netherlands", code: "NLD", alias: ["Netherlands, Kingdom", "Holland", "Royaume des Pays-Bas", "Pays-Bas"] },
  { name: "New Caledonia", code: "NCL", alias: ["Nouvelle-Calédonie"] },
  { name: "New Zealand", code: "NZL", alias: ["Aotearoa", "Nouvelle-Zélande"] },
  { name: "Nicaragua", code: "NIC" },
  { name: "Niger", code: "NER" },
  { name: "Nigeria", code: "NGA", alias: ["Nigéria"] },
  { name: "Niue", code: "NIU" },
  { name: "Norfolk Island", code: "NFK", alias: ["Île Norfolk"] },
  { name: "North Korea", code: "PRK", alias: ["Democratic People's Republic of Korea", "The Democratic People's Republic of Korea", "DPRK"]},
  { name: "North Macedonia", code: "MKD", alias: ["Macedonia", "FYROM", "Macédoine du Nord"] },
  { name: "Northern Mariana Islands", code: "MNP", alias: ["Îles Mariannes du Nord"] },
  { name: "Norway", code: "NOR", alias: ["Norvège"] },
  { name: "Oman", code: "OMN" },
  { name: "Pakistan", code: "PAK" },
  { name: "Palau", code: "PLW", alias: ["Palaos"] },
  { name: "Palestine", code: "PSE", alias: ["Palestine, State", "Palestinian Territories", "État de Palestine"] },
  { name: "Panama", code: "PAN" },
  { name: "Papua New Guinea", code: "PNG", alias: ["PNG", "Papouasie-Nouvelle-Guinée"] },
  { name: "Paraguay", code: "PRY" },
  { name: "Peru", code: "PER", alias: ["Pérou"] },
  { name: "Philippines", code: "PHL" },
  { name: "Pitcairn", code: "PCN" },
  { name: "Poland", code: "POL", alias: ["Pologne"] },
  { name: "Portugal", code: "PRT" },
  { name: "Puerto Rico", code: "PRI", alias: ["Porto Rico"] },
  { name: "Qatar", code: "QAT" },
  { name: "Romania", code: "ROU", alias: ["Roumanie"] },
  { name: "Russia", code: "RUS", alias: ["Russian Federation", "Fédération de Russie", "Russie"] },
  { name: "Rwanda", code: "RWA" },
  { name: "Réunion", code: "REU", alias: ["Reunion"] },
  { name: "Saint Barthélemy", code: "BLM", alias: ["Saint Barthelemy", "Saint-Barthélemy"] },
  { name: "Saint Helena, Ascension and Tristan da Cunha", code: "SHN", alias: ["Sainte-Hélène, Ascension et Tristan da Cunha"] },
  { name: "Saint Kitts and Nevis", code: "KNA", alias: ["St. Kitts and Nevis", "St Kitts and Nevis", "Saint-Kitts-et-Nevis"] },
  { name: "Saint Lucia", code: "LCA", alias: ["St. Lucia", "St Lucia", "Sainte-Lucie"] },
  { name: "Saint Martin (French part)", code: "MAF", alias: ["Saint-Martin (partie française)"] },
  { name: "Saint Pierre and Miquelon", code: "SPM", alias: ["Saint-Pierre-et-Miquelon"] },
  { name: "Saint Vincent and the Grenadines", code: "VCT", alias: ["St. Vincent and the Grenadines", "St Vincent and the Grenadines", "Saint-Vincent-et-les Grenadines"] },
  { name: "Samoa", code: "WSM", alias: ["Western Samoa"] },
  { name: "San Marino", code: "SMR", alias: ["Saint-Marin"] },
  { name: "Sao Tome and Principe", code: "STP", alias: ["São Tomé and Príncipe", "Sao Tomé-et-Principe"] },
  { name: "Saudi Arabia", code: "SAU", alias: ["KSA", "Arabie saoudite"] },
  { name: "Scotland", code: "GB-SCT" },
  { name: "Senegal", code: "SEN", alias: ["Sénégal"] },
  { name: "Serbia", code: "SRB", alias: ["Serbie"] },
  { name: "Seychelles", code: "SYC" },
  { name: "Sierra Leone", code: "SLE" },
  { name: "Singapore", code: "SGP", alias: ["Singapour"] },
  { name: "Sint Maarten (Dutch part)", code: "SXM", alias: ["Saint-Martin (partie néerlandaise)"] },
  { name: "Slovakia", code: "SVK", alias: ["Slovak Republic", "Slovaquie"] },
  { name: "Slovenia", code: "SVN", alias: ["Slovénie"] },
  { name: "Solomon Islands", code: "SLB", alias: ["Îles Salomon"] },
  { name: "Somalia", code: "SOM", alias: ["Somalie"] },
  { name: "South Africa", code: "ZAF", alias: ["RSA", "Afrique du Sud"] },
  { name: "South Georgia and South Sandwich Islands", code: "SGS", alias: ["Géorgie du Sud-et-les Îles Sandwich du Sud"] },
  { name: "South Korea", code: "KOR", alias: ["Korea, Republic", "ROK", "République de Corée", "Corée du Sud", "Republic of Korea"] },
  { name: "South Sudan", code: "SSD", alias: ["Soudan du Sud"] },
  { name: "Spain", code: "ESP", alias: ["Espagne"] },
  { name: "Sri Lanka", code: "LKA", alias: ["Ceylon"] },
  { name: "Sudan", code: "SDN", alias: ["Soudan"] },
  { name: "Suriname", code: "SUR" },
  { name: "Svalbard and Jan Mayen", code: "SJM", alias: ["Svalbard et l'Île Jan Mayen"] },
  { name: "Sweden", code: "SWE", alias: ["Suède"] },
  { name: "Switzerland", code: "CHE", alias: ["Suisse"] },
  { name: "Syria", code: "SYR", alias: ["Syrian Arab Republic", "République arabe syrienne", "Syrie"] },
  { name: "Taiwan", code: "TWN", alias: ["Republic of China", "Chinese Taipei", "Taïwan (Province de Chine)", "Taïwan"] },
  { name: "Tajikistan", code: "TJK", alias: ["Tadjikistan"] },
  { name: "Tanzania", code: "TZA", alias: ["Tanzania, United Republic", "République-Unie de Tanzanie", "Tanzanie"] },
  { name: "Thailand", code: "THA", alias: ["Siam", "Thaïlande"] },
  { name: "Timor-Leste", code: "TLS", alias: ["East Timor", "Timor oriental"] },
  { name: "Togo", code: "TGO" },
  { name: "Tokelau", code: "TKL" },
  { name: "Tonga", code: "TON" },
  { name: "Trinidad and Tobago", code: "TTO", alias: ["Trinité-et-Tobago"] },
  { name: "Tunisia", code: "TUN", alias: ["Tunisie"] },
  { name: "Turkey", code: "TUR", alias: ["Türkiye", "Turkiye"] },
  { name: "Turkmenistan", code: "TKM", alias: ["Turkménistan"] },
  { name: "Turks and Caicos Islands", code: "TCA", alias: ["Îles Turks-et-Caïcos"] },
  { name: "Tuvalu", code: "TUV" },
  { name: "Uganda", code: "UGA", alias: ["Ouganda"] },
  { name: "Ukraine", code: "UKR" },
  { name: "United Arab Emirates", code: "ARE", alias: ["UAE", "Émirats arabes unis"] },
  { name: "United Kingdom", code: "GBR", alias: ["Great Britain", "UK", "Royaume-Uni de Grande-Bretagne et d'Irlande du Nord", "Royaume-Uni"] },
  { name: "United States", code: "USA", alias: ["United States of America", "US", "USA", "États-Unis d'Amérique", "États-Unis", "America"] },
  { name: "United States Minor Outlying Islands", code: "UMI", alias: ["Îles mineures éloignées des États-Unis"] },
  { name: "Uruguay", code: "URY" },
  { name: "Uzbekistan", code: "UZB", alias: ["Ouzbékistan"] },
  { name: "Vanuatu", code: "VUT", alias: ["New Hebrides"] },
  { name: "Venezuela", code: "VEN", alias: ["Venezuela, Bolivarian Republic", "République bolivarienne du Venezuela"] },
  { name: "Vietnam", code: "VNM", alias: ["Viet Nam"] },
  { name: "Virgin Islands (British)", code: "VGB", alias: ["Îles Vierges britanniques"] },
  { name: "Virgin Islands (U.S.)", code: "VIR", alias: ["Îles Vierges des États-Unis"] },
  { name: "Wallis and Futuna", code: "WLF", alias: ["Wallis-et-Futuna"] },
  { name: "Western Sahara", code: "ESH", alias: ["Sahara occidental"] },
  { name: "Yemen", code: "YEM", alias: ["Yémen"] },
  { name: "Zambia", code: "ZMB", alias: ["Zambie"] },
  { name: "Zimbabwe", code: "ZWE" },
  { name: "Åland Islands", code: "ALA", alias: ["Aland Islands", "Îles Åland"] },
];

// Genuinely defunct states, not aliased to a modern country: their borders,
// government, or membership differ materially from any single present-day
// successor (a split, dissolution, or legally distinct former government),
// unlike the rename-only cases above (Zaire, Burma, Ceylon, Upper Volta,
// etc.) which are aliases since the same continuous state just renamed
// itself. Codes are the former ISO 3166-3 withdrawn codes, for historical
// MUN crisis committees (e.g. Cold War, Yugoslav Wars, decolonization).
export const historicalCountries = [
  { name: "Soviet Union", code: "SUN", alias: ["USSR", "CCCP", "Union of Soviet Socialist Republics"] },
  { name: "Yugoslavia", code: "YUG", alias: ["Socialist Federal Republic of Yugoslavia", "SFR Yugoslavia"] },
  { name: "Serbia and Montenegro", code: "SCG" },
  { name: "Czechoslovakia", code: "CSK" },
  { name: "East Germany", code: "DDR", alias: ["German Democratic Republic", "GDR"] },
  { name: "Rhodesia", code: "RHO", alias: ["Southern Rhodesia"] },
  { name: "North Vietnam", code: "VDR", alias: ["Democratic Republic of Vietnam"] },
  { name: "Netherlands Antilles", code: "ANT" },
  { name: "Pacific Islands, Trust Territory of the", code: "PCI" },
];


// Deliberately excludes generic words like "director"/"secretary"/"representative"/
// "officer": in real allocation sheets those also show up as delegate portfolio
// names (e.g. a crisis committee delegate called "BSAA Director" or "UNSC
// Representative"), so treating them as chair/page signals would misclassify data.
export const CHAIR_WORDS = new RegExp([
  "CHAIR",
  "PRESIDENT",
  "EDITOR",
  "DAIS",
  "MODERATOR",
  "PRESIDING",
  "RAPPORTEUR",
].join("|"));

export const PAGE_WORDS = new Set([
  "PAGE",
  "PAGES",
  "COURSIER",
  "COURSIERS",
  "MESSENGER",
  "MESSENGERS",
  "RUNNER",
  "RUNNERS",
  "USHER",
  "USHERS",
  // EISMUN embeds a per-committee support-staff photographer row
  // ("Photographer") alongside the delegate list - checked against every
  // country/role value across all 6 excelToJson sample files first, per
  // the rule below.
  "PHOTOGRAPHER",
  "PHOTOGRAPHERS",
]);

// Sheet names (exact, case-insensitive) that are never a real committee -
// cover/instructions/summary tabs some conferences include alongside the
// actual committee sheets.
export const SKIP_SHEETS = new Set([
  "teams",
  "information",
  "info",
  "cover",
  "cover page",
  "instructions",
  "read me",
  "readme",
  "summary",
  "notes",
  "overview",
  // EISMUN's whole-conference roster tab: advisors + secretariat +
  // parliamentarians, followed by a "Committees and Chairs" table that just
  // re-lists every chair already captured from their own committee sheet -
  // same role as "teams"/"information" above, just named differently.
  "chairs info",
]);

// Exact-match signals (post normalize()) that a row is a header row, and
// which field a header column maps to. Kept as sets (not a regex/substring
// check) because these are compared against a whole header cell, not
// scanned for as a substring of arbitrary data - "Delegate"/"Student" as a
// whole cell is a safe signal; as a substring of someone's real name it
// would not be.
export const NAME_WORDS = new Set([
  "NAME",
  "NOM",
  "NOMBRE",
  "DELEGATE",
  "STUDENT",
  "PARTICIPANT",
  "FULL NAME",
]);

export const EMAIL_WORDS = new Set([
  "EMAIL",
  "E-MAIL",
  "MAIL",
  "CORREO",
]);

export const TOPIC_WORDS = new Set([
  "TOPIC",
  "SUJET",
  "QUESTION",
  "THEME",
]);

// Used by MotionInput's duration-phrase detection (a motion followed by
// "for <number> minute(s)", e.g. "Moderated Caucus for 10 minutes") to spot
// the connective linking the motion to its duration, and the unit following
// the number - not header/row classification vocab like the sets above.
export const CONNECTIVE_WORDS = new Set([
  "FOR",
  "WITH",
  "OF"
]);

export const MEASUREMENT_WORDS = new Set([
  "MINUTE",
  "MINUTES",
  "MIN"
]);
