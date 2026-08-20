const { toSeleniumBy } = require("./locatorStrings");

function toSnakeCase(name) {
  return name.replace(/([A-Z])/g, "_$1").toLowerCase();
}

function generateSelenium(elements, className = "GeneratedPage") {
  const lines = [];
  lines.push(`from selenium.webdriver.common.by import By`);
  lines.push(``);
  lines.push(``);
  lines.push(`class ${className}:`);
  lines.push(`    def __init__(self, driver):`);
  lines.push(`        self.driver = driver`);
  lines.push(``);
  for (const el of elements) {
    const snake = toSnakeCase(el.name);
    const byExpr = toSeleniumBy(el.recommended);
    lines.push(`    # ${el.recommended.reason} (score: ${el.recommended.score}/100)`);
    lines.push(`    ${snake.toUpperCase()} = ${byExpr}`);
  }
  lines.push(``);
  for (const el of elements) {
    const snake = toSnakeCase(el.name);
    lines.push(`    def get_${snake}(self):`);
    lines.push(`        return self.driver.find_element(*self.${snake.toUpperCase()})`);
    lines.push(``);
  }
  return lines.join("\n");
}

module.exports = { generateSelenium };
