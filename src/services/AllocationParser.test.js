import { describe, expect, it } from "vitest";
import { cellValue } from "./AllocationParser";

describe("cellValue", () => {
  it("keeps plain text and numbers, trimmed", () => {
    expect(cellValue("  France ")).toBe("France");
    expect(cellValue(12)).toBe(12);
    expect(cellValue(null)).toBe(null);
    expect(cellValue(undefined)).toBe(null);
  });

  it("reads the text out of rich text, hyperlinks, and formulas", () => {
    expect(cellValue({ richText: [{ text: "Uni" }, { text: "ted Kingdom" }] })).toBe("United Kingdom");
    expect(cellValue({ text: "a@b.org", hyperlink: "mailto:a@b.org" })).toBe("a@b.org");
    expect(cellValue({ text: { richText: [{ text: "Linked" }] }, hyperlink: "https://x" })).toBe("Linked");
    expect(cellValue({ formula: "A1", result: "Japan" })).toBe("Japan");
    expect(cellValue({ sharedFormula: "A1", result: 3 })).toBe(3);
  });

  it("treats errors and formulas with no cached result as empty", () => {
    expect(cellValue({ error: "#REF!" })).toBe(null);
    expect(cellValue({ formula: "A1" })).toBe(null);
    expect(cellValue({ formula: "A1", result: { error: "#N/A" } })).toBe(null);
  });

  it("writes dates as a calendar date and booleans as text", () => {
    expect(cellValue(new Date("2026-01-24T00:00:00Z"))).toBe("2026-01-24");
    expect(cellValue(true)).toBe("TRUE");
  });
});
