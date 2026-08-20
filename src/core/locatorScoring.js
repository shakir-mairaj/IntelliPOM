/**
 * locatorScoring.js
 *
 * Given an element's attributes/text, produce a ranked list of candidate
 * locators with a stability score (0-100) and a human-readable reason.
 * Higher score = less likely to break when the UI changes.
 */

// Patterns that suggest a value is auto-generated / build-time-dynamic,
// and therefore an UNSTABLE thing to lock a test to.
const DYNAMIC_PATTERNS = [
  /^[0-9a-f]{6,}$/i, // pure hex hash, e.g. "a1b2c3d4"
  /\d{4,}/, // 4+ consecutive digits, e.g. "input_20481"
  /^(css|sc|jss|emotion)-[a-zA-Z0-9]+$/, // styled-components / emotion / JSS classes
  /^Mui[A-Z][a-zA-Z]*-[a-z0-9]+$/, // MUI generated classes
];

// A trailing dash-suffix is only hash-like if it actually contains a digit —
// real build hashes ("btn-x7f9a2") mix letters and numbers, while ordinary
// kebab-case test IDs ("unique-email", "checkout-button") are pure words and
// must NOT be penalized just for being 5+ characters after a dash.
function hasDynamicTrailingSuffix(value) {
  const match = value.match(/-([a-z0-9]+)$/i);
  if (!match) return false;
  const suffix = match[1];
  return suffix.length >= 5 && /\d/.test(suffix);
}

function looksDynamic(value) {
  if (!value) return false;
  const trimmed = value.trim();
  return DYNAMIC_PATTERNS.some((re) => re.test(trimmed)) || hasDynamicTrailingSuffix(trimmed);
}

// Base score per attribute type, before dynamic-value penalty.
const ATTRIBUTE_PRIORITY = [
  { key: "data-testid", type: "testid", score: 100, reason: "dedicated test attribute — will not change with styling or copy edits" },
  { key: "data-test", type: "testid", score: 98, reason: "dedicated test attribute" },
  { key: "data-qa", type: "testid", score: 96, reason: "dedicated QA attribute" },
  { key: "data-cy", type: "testid", score: 96, reason: "Cypress-specific test attribute" },
  { key: "id", type: "id", score: 90, reason: "unique identifier" },
  { key: "aria-label", type: "ariaLabel", score: 80, reason: "accessibility label — usually stable and improves a11y coverage as a side effect" },
  { key: "name", type: "name", score: 75, reason: "form field name attribute" },
  { key: "placeholder", type: "placeholder", score: 55, reason: "placeholder text — breaks if copy changes" },
  { key: "title", type: "title", score: 50, reason: "title attribute — breaks if copy changes" },
];

const DYNAMIC_PENALTY = 45; // heavy penalty, but not disqualifying (still usable as last resort)

function scoreFromAttributes(attribs) {
  const candidates = [];
  for (const { key, type, score, reason } of ATTRIBUTE_PRIORITY) {
    const value = attribs[key];
    if (value && value.trim()) {
      const dynamic = looksDynamic(value);
      candidates.push({
        type,
        attr: key,
        value: value.trim(),
        score: dynamic ? Math.max(score - DYNAMIC_PENALTY, 5) : score,
        reason: dynamic ? `${reason}, but value looks auto-generated — treat as fallback` : reason,
      });
    }
  }
  return candidates;
}

function scoreFromRoleAndText(tag, attribs, text) {
  const candidates = [];
  const role = attribs.role;
  const trimmedText = (text || "").trim().replace(/\s+/g, " ");

  if (role && trimmedText) {
    candidates.push({
      type: "role",
      role,
      text: trimmedText,
      score: 70,
      reason: "accessible role + visible text — stable unless copy or a11y semantics change",
    });
  }

  const textBearingTags = ["button", "a", "label", "option", "summary"];
  if (textBearingTags.includes(tag) && trimmedText && trimmedText.length <= 60) {
    candidates.push({
      type: "text",
      text: trimmedText,
      score: 60,
      reason: "visible text match — breaks if copy is edited or localized",
    });
  }

  return candidates;
}

function scoreFromClass(attribs) {
  const className = attribs.class;
  if (!className) return [];
  const firstStableClass = className
    .split(/\s+/)
    .filter(Boolean)
    .find((c) => !looksDynamic(c) && !/^(active|disabled|selected|hover|focus|hidden)$/i.test(c));

  if (!firstStableClass) return [];

  return [
    {
      type: "class",
      value: firstStableClass,
      score: 40,
      reason: "CSS class — fragile, tends to change with styling refactors",
    },
  ];
}

function scoreStructural(tag, indexAmongSiblings) {
  return [
    {
      type: "structural",
      tag,
      nthOfType: indexAmongSiblings,
      score: 20,
      reason: "positional/structural selector — most brittle option, last resort only",
    },
  ];
}

/**
 * Build every candidate locator for an element, sorted best-first.
 * @param {{tag: string, attribs: Record<string,string>, text: string, nthOfType: number}} el
 */
function buildCandidates(el) {
  const { tag, attribs = {}, text = "", nthOfType = 1 } = el;
  const candidates = [
    ...scoreFromAttributes(attribs),
    ...scoreFromRoleAndText(tag, attribs, text),
    ...scoreFromClass(attribs),
    ...scoreStructural(tag, nthOfType),
  ];
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

module.exports = { buildCandidates, looksDynamic, DYNAMIC_PATTERNS };
