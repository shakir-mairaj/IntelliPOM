// Shared CSS-selector construction, used both by the generators (to emit
// selector strings) and by extraction (to verify a candidate actually
// matches exactly one element before trusting its score).

// Escapes a value going inside an attribute selector's ["..."] — handles
// both a literal double-quote and a literal backslash in the value itself,
// e.g. an aria-label like `Say "hi"` must not break the generated selector.
function escapeAttrValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function cssAttrSelector(attr, value) {
  return `[${attr}="${escapeAttrValue(value)}"]`;
}

function toCss(candidate) {
  switch (candidate.type) {
    case "testid":
      return cssAttrSelector(candidate.attr, candidate.value);
    case "id":
      // Escape characters that are invalid as a bare CSS identifier
      return `#${candidate.value.replace(/([ #.;,:!?'"()\[\]{}\\])/g, "\\$1")}`;
    case "ariaLabel":
      return cssAttrSelector("aria-label", candidate.value);
    case "name":
      return cssAttrSelector("name", candidate.value);
    case "placeholder":
      return cssAttrSelector("placeholder", candidate.value);
    case "title":
      return cssAttrSelector("title", candidate.value);
    case "class":
      return `.${candidate.value.replace(/([ #.;,:!?'"()\[\]{}\\])/g, "\\$1")}`;
    case "structural":
      return `${candidate.tag}:nth-of-type(${candidate.nthOfType})`;
    case "role":
    case "text":
      return null; // no plain CSS equivalent; handled per-framework in the generators
    default:
      return null;
  }
}

module.exports = { toCss, cssAttrSelector, escapeAttrValue };
