// Minimal, purpose-built formatter for this repo's LICENSE text - not a
// general markdown parser. The license's author-controlled Markdown subset
// is simple (## headings, --- dividers, **bold** labels, plain paragraphs
// with manual line-wraps and indented (a)/(b)/(c) sub-items separated only
// by single newlines), so a full markdown library isn't warranted - blocks
// are split on blank lines and classified by their leading pattern, and a
// paragraph's internal single newlines are preserved via CSS (white-space)
// rather than parsed into a real list structure.
export function formatLicenseText(text) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      if (block === "---") return { type: "rule", text: "", key: index };
      if (block.startsWith("## ")) return { type: "heading", text: block.slice(3), key: index };
      if (index === 0) return { type: "title", text: block, key: index };
      return { type: "paragraph", text: block, key: index };
    });
}

// Splits a paragraph's text on **bold** markers into plain/bold segments -
// the only inline markdown this license text uses.
export function splitBold(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return { bold: true, text: part.slice(2, -2), key: i };
    }
    return { bold: false, text: part, key: i };
  });
}
