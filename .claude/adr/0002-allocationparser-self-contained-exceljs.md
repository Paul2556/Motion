# AllocationParser stays self-contained on ExcelJS, never imports the sibling excelToJson project

`src/services/AllocationParser.js` was ported from a standalone sibling tool (`excelToJson/`,
outside this repo) that uses SheetJS for spreadsheet parsing.

**Decision:** this copy deliberately uses **ExcelJS** instead — already a dependency here via
`ConferenceService` — rather than porting to SheetJS or importing the sibling project directly.
`AllocationParser` must stay self-contained: never import from `excelToJson` at runtime. If the
parsing logic changes there, port the change by hand.

**Why:** importing the sibling project would pull SheetJS into the bundle alongside ExcelJS —
two spreadsheet-parsing libraries doing the same job. The alternative, porting `AllocationParser`
to SheetJS to unify on one dependency, was rejected because the parser's header/vocabulary
detection is tuned against many real conferences' Excel templates (offset columns, merged title
cells, shared vs. per-role headers, French-language headers, fill-down stance columns) — most of
its branches exist to handle one specific real workbook layout that would otherwise silently
misparse. Re-deriving that against a different parsing library risks silently breaking a case
nobody's workbook currently exercises in tests, since there's no test suite yet to catch a
regression. A future engineer reaching for the sibling tool "to avoid duplicating parsing logic" is
exactly the mistake this ADR exists to head off.
