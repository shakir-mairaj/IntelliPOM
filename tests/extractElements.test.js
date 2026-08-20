const assert = require("node:assert");
const test = require("node:test");
const { extractElements } = require("../src/core/extractElements");
const { toCss } = require("../src/core/cssSelector");

test("duplicate id is scored down and a distinguishing selector wins instead", () => {
  const html = `
    <button id="submit">Submit A</button>
    <button id="submit">Submit B</button>
  `;
  const elements = extractElements(html);
  for (const el of elements) {
    assert.notStrictEqual(el.recommended.type, "id", `${el.name} should not recommend the duplicated id`);
  }
});

test("unique data-testid is not penalized", () => {
  const html = `<input data-testid="email" name="email" />`;
  const elements = extractElements(html);
  assert.strictEqual(elements[0].recommended.type, "testid");
  assert.strictEqual(elements[0].recommended.score, 100);
  assert.strictEqual(elements[0].recommended.matchCount, 1);
});

test("attribute values containing double quotes are escaped in the CSS selector", () => {
  const css = toCss({ type: "ariaLabel", value: 'Say "hi" to me' });
  assert.strictEqual(css, '[aria-label="Say \\"hi\\" to me"]');
});
