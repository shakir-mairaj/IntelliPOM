const { cypressSelectorString } = require("./locatorStrings");

function generateCypress(elements, className = "GeneratedPage") {
  const lines = [];
  lines.push(`class ${className} {`);

  // ---- Locators, stored separately as named constants ----
  lines.push(`  static SELECTORS = {`);
  for (const el of elements) {
    const selector = cypressSelectorString(el.recommended);
    lines.push(`    ${el.name}: '${selector}', // ${el.recommended.reason} (score: ${el.recommended.score}/100)`);
  }
  lines.push(`  };`);
  lines.push(``);

  for (const el of elements) {
    lines.push(`  get ${el.name}() {`);
    lines.push(`    return cy.get(${className}.SELECTORS.${el.name});`);
    lines.push(`  }`);
    lines.push(``);
  }
  lines.push(`}`);
  lines.push(``);
  lines.push(`export default new ${className}();`);
  return lines.join("\n");
}

module.exports = { generateCypress };
