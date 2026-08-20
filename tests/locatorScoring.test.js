const assert = require("node:assert");
const test = require("node:test");
const { buildCandidates, looksDynamic } = require("../src/core/locatorScoring");

test("data-testid always wins over id and class", () => {
  const candidates = buildCandidates({
    tag: "button",
    attribs: { "data-testid": "submit-btn", id: "submit", class: "sc-bZQltP" },
    text: "Submit",
  });
  assert.strictEqual(candidates[0].type, "testid");
  assert.strictEqual(candidates[0].value, "submit-btn");
});

test("dynamic-looking id is penalized below a stable name attribute", () => {
  const candidates = buildCandidates({
    tag: "input",
    attribs: { id: "field_294817", name: "remember" },
    text: "",
  });
  const idCandidate = candidates.find((c) => c.type === "id");
  const nameCandidate = candidates.find((c) => c.type === "name");
  assert.ok(idCandidate.score < nameCandidate.score);
});

test("ordinary kebab-case test IDs are NOT mistaken for build hashes", () => {
  const candidates = buildCandidates({
    tag: "input",
    attribs: { "data-testid": "unique-email" },
    text: "",
  });
  assert.strictEqual(candidates[0].type, "testid");
  assert.strictEqual(candidates[0].score, 100);
});

test("looksDynamic detects hash-like and numeric-suffixed values", () => {
  assert.strictEqual(looksDynamic("a1b2c3d4"), true);
  assert.strictEqual(looksDynamic("remember_20481"), true);
  assert.strictEqual(looksDynamic("css-1a2b3c4"), true);
  assert.strictEqual(looksDynamic("login-submit-btn"), false);
  assert.strictEqual(looksDynamic("email"), false);
});

test("structural selector is always the lowest-ranked fallback", () => {
  const candidates = buildCandidates({
    tag: "div",
    attribs: {},
    text: "",
    nthOfType: 3,
  });
  assert.strictEqual(candidates.length, 1);
  assert.strictEqual(candidates[0].type, "structural");
});

test("element with no signal at all still returns a structural fallback", () => {
  const candidates = buildCandidates({ tag: "span", attribs: {}, text: "" });
  assert.ok(candidates.every((c) => c.type === "structural"));
});
