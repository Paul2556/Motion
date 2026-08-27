// Purpose-built for this repo's LICENSE, not a general markdown parser: its
// subset is small and author-controlled, so blocks split on blank lines and
// internal newlines are preserved via CSS rather than parsed into lists.
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
