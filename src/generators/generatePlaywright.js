const { playwrightSelectorString } = require("./locatorStrings");

function generatePlaywright(elements, className = "GeneratedPage") {
  const lines = [];
  lines.push(`class ${className} {`);

  // ---- Locators, stored separately as named constants ----
  lines.push(`  static SELECTORS = {`);
  for (const el of elements) {
    const selector = playwrightSelectorString(el.recommended);
    lines.push(`    ${el.name}: '${selector}', // ${el.recommended.reason} (score: ${el.recommended.score}/100)`);
  }
  lines.push(`  };`);
  lines.push(``);

  lines.push(`  constructor(page) {`);
  lines.push(`    this.page = page;`);
  for (const el of elements) {
    lines.push(`    this.${el.name} = page.locator(${className}.SELECTORS.${el.name});`);
  }
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`module.exports = ${className};`);
  return lines.join("\n");
}

module.exports = { generatePlaywright };
