// Turns a scored candidate (from locatorScoring.js) into an actual selector
// string, per framework/style, since Playwright/Cypress/Selenium each have
// their own preferred locator syntax.
//
// Playwright and Cypress builders return a single STRING (not a full
// page.locator(...) call) so the generators can store it as a named
// constant first -- e.g. SELECTORS.loginEmailInput = '#email' -- and
// reference it afterwards, the same way the Selenium generator already
// separates its By-tuples from the methods that use them.

const { toCss, cssAttrSelector } = require("../core/cssSelector");

function escapeQuotes(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// Playwright's locator() accepts engine-prefixed strings (role=, text=)
// alongside plain CSS, so every locator type can be expressed as one string.
function playwrightSelectorString(candidate) {
  if (candidate.type === "role") {
    return `role=${candidate.role}[name="${escapeQuotes(candidate.text)}"]`;
  }
  if (candidate.type === "text") {
    return `text=${candidate.text}`;
  }
  return toCss(candidate);
}

// Cypress's cy.get() uses jQuery's selector engine, which supports :contains()
// but has no native role engine -- so role/text fall back to a CSS+:contains combo.
function cypressSelectorString(candidate) {
  if (candidate.type === "role") {
    return `[role="${candidate.role}"]:contains("${escapeQuotes(candidate.text)}")`;
  }
  if (candidate.type === "text") {
    return `:contains("${escapeQuotes(candidate.text)}")`;
  }
  return toCss(candidate);
}

// Selenium (Python) uses By.* tuples rather than a single string.
function toSeleniumBy(candidate) {
  switch (candidate.type) {
    case "testid":
      return `(By.CSS_SELECTOR, '${cssAttrSelector(candidate.attr, candidate.value)}')`;
    case "id":
      return `(By.ID, '${escapeQuotes(candidate.value)}')`;
    case "ariaLabel":
      return `(By.CSS_SELECTOR, '${cssAttrSelector("aria-label", candidate.value)}')`;
    case "name":
      return `(By.NAME, '${escapeQuotes(candidate.value)}')`;
    case "placeholder":
      return `(By.CSS_SELECTOR, '${cssAttrSelector("placeholder", candidate.value)}')`;
    case "title":
      return `(By.CSS_SELECTOR, '${cssAttrSelector("title", candidate.value)}')`;
    case "class":
      return `(By.CLASS_NAME, '${escapeQuotes(candidate.value)}')`;
    case "role":
      return `(By.XPATH, "//*[@role='${candidate.role}'][contains(., '${escapeQuotes(candidate.text)}')]")`;
    case "text":
      return `(By.XPATH, "//*[contains(text(), '${escapeQuotes(candidate.text)}')]")`;
    case "structural":
      return `(By.XPATH, "//${candidate.tag}[${candidate.nthOfType}]")`;
    default:
      return `(By.XPATH, '')`;
  }
}

module.exports = { toCss, playwrightSelectorString, cypressSelectorString, toSeleniumBy, escapeQuotes };
