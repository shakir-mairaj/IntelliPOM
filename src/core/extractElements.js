const cheerio = require("cheerio");
const { buildCandidates } = require("./locatorScoring");
const { toCss } = require("./cssSelector");

// Tags/attributes we consider "interesting" for a Page Object — i.e. things
// a test is likely to interact with or assert on.
const INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "[role]",
  "[data-testid]",
  "[data-test]",
  "[data-qa]",
  "[data-cy]",
  "[onclick]",
  "summary",
].join(",");

const NOT_UNIQUE_PENALTY = 50;
const NO_MATCH_PENALTY = 60;

/**
 * A candidate scored highly just because the attribute exists — but if the
 * same value appears elsewhere on the page (e.g. a duplicated id, a repeated
 * data-testid), the selector isn't actually reliable. This checks each
 * candidate against the real DOM and scores down anything that doesn't
 * resolve to exactly one element.
 *
 * Role/text-based candidates have no plain-CSS form (toCss returns null for
 * them) so they're left unverified here — they're checked at the framework
 * level instead, where the real engine syntax (Playwright's role=, etc.)
 * applies.
 */
function annotateUniqueness($, candidates) {
  for (const candidate of candidates) {
    const css = toCss(candidate);
    if (!css) {
      candidate.matchCount = null; // can't verify with a plain CSS query
      continue;
    }

    let matchCount;
    try {
      matchCount = $(css).length;
    } catch (err) {
      matchCount = null; // selector syntax the parser couldn't evaluate
    }
    candidate.matchCount = matchCount;

    if (matchCount === 1) {
      continue; // confirmed unique — score stands
    }
    if (matchCount > 1) {
      candidate.score = Math.max(candidate.score - NOT_UNIQUE_PENALTY, 5);
      candidate.reason = `${candidate.reason} — not unique, matches ${matchCount} elements on this page`;
    } else if (matchCount === 0) {
      candidate.score = Math.max(candidate.score - NO_MATCH_PENALTY, 3);
      candidate.reason = `${candidate.reason} — selector did not resolve to any element, verify manually`;
    }
  }
  candidates.sort((a, b) => b.score - a.score);
}

function toCamelCase(str) {
  return str
    .trim()
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, chr) => (chr ? chr.toUpperCase() : ""))
    .replace(/^[A-Z]/, (c) => c.toLowerCase())
    .replace(/^\d+/, ""); // camelCase identifiers can't start with a digit
}

function suggestName(tag, attribs, text) {
  const raw =
    attribs["data-testid"] ||
    attribs["aria-label"] ||
    (text && text.trim().length <= 40 ? text : null) ||
    attribs.name ||
    attribs.id ||
    attribs.placeholder ||
    `${tag}Element`;

  let name = toCamelCase(raw) || `${tag}Element`;

  // Suffix hint based on tag so generated code reads naturally
  // (loginButton, emailInput, termsCheckbox, etc.)
  const tagSuffix = {
    button: "Button",
    a: "Link",
    input: attribs.type === "checkbox" ? "Checkbox" : attribs.type === "radio" ? "Radio" : "Input",
    select: "Dropdown",
    textarea: "Textarea",
  }[tag];

  if (tagSuffix && !name.toLowerCase().endsWith(tagSuffix.toLowerCase())) {
    name = name + tagSuffix;
  }
  return name;
}

/**
 * Parse raw HTML and extract a ranked list of elements with candidate locators.
 * @param {string} html
 * @returns {{name: string, tag: string, candidates: object[]}[]}
 */
function extractElements(html) {
  const $ = cheerio.load(html);
  const elements = [];
  const usedNames = new Map(); // dedupe collisions -> name2, name3...

  $(INTERACTIVE_SELECTOR).each((_, node) => {
    const el = $(node);
    const tag = node.tagName ? node.tagName.toLowerCase() : node.name;
    const attribs = node.attribs || {};
    const text = el.text();

    // Skip elements with no usable signal at all (empty, no attrs, no text)
    const hasSignal =
      Object.keys(attribs).length > 0 || (text && text.trim().length > 0);
    if (!hasSignal) return;

    const nthOfType = $(node).parent().children(tag).index(node) + 1;
    const candidates = buildCandidates({ tag, attribs, text, nthOfType });
    if (candidates.length === 0) return;
    annotateUniqueness($, candidates);

    let name = suggestName(tag, attribs, text);
    if (usedNames.has(name)) {
      const count = usedNames.get(name) + 1;
      usedNames.set(name, count);
      name = `${name}${count}`;
    } else {
      usedNames.set(name, 1);
    }

    elements.push({
      name,
      tag,
      recommended: candidates[0],
      candidates,
    });
  });

  return elements;
}

module.exports = { extractElements, suggestName, toCamelCase };
