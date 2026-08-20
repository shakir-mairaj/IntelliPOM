# IntelliPOM

[![Test](https://github.com/<your-username>/intellipom/actions/workflows/test.yml/badge.svg)](https://github.com/<your-username>/intellipom/actions/workflows/test.yml)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

Generate ready-to-use **Page Object Model (POM)** classes for **Playwright, Cypress, and Selenium** from any HTML — pasted, uploaded, or captured live from a running site.

Unlike most "HTML → locator" tools, every selector this generates comes with a **stability score (0–100)** and a plain-English reason, so you know *why* a locator was chosen instead of blindly trusting it.

<!--
  Add a screenshot or short GIF of the web UI here before publishing, e.g.:
  ![IntelliPOM UI](docs/screenshot.png)
  A 10–15s clip of pasting a saucedemo.com URL and watching the confidence
  meters populate is the single best thing you can add to this README.
-->

```js
class LoginPage {
  static SELECTORS = {
    loginEmailInput: '#email', // unique identifier (score: 90/100)
    loginSubmitBtnButton: '[data-testid="login-submit-btn"]', // dedicated test attribute — will not change with styling or copy edits (score: 100/100)
  };

  constructor(page) {
    this.page = page;
    this.loginEmailInput = page.locator(LoginPage.SELECTORS.loginEmailInput);
    this.loginSubmitBtnButton = page.locator(LoginPage.SELECTORS.loginSubmitBtnButton);
  }
}
```

## Why this exists

Most Page-Object generators just grab the first `id` or `class` they find — including auto-generated ones like `css-1a2b3c4` or `field_294817`, which break the moment a build hash changes. This tool ranks locators the way an experienced automation engineer would:

| Priority | Locator type | Typical score |
|---|---|---|
| 1 | `data-testid` / `data-cy` / `data-qa` | 96–100 |
| 2 | `id` (unless it looks auto-generated) | 90 |
| 3 | `aria-label` | 80 |
| 4 | `name` | 75 |
| 5 | role + visible text | 70 |
| 6 | visible text only | 60 |
| 7 | `placeholder` / `title` | 50–55 |
| 8 | CSS class (non-dynamic) | 40 |
| 9 | structural / `nth-of-type` | 20 (last resort) |

Values that look auto-generated (hashes, `css-xxxxx`, `field_20481`, etc.) are automatically detected and penalized — they'll still be offered as a fallback, but ranked appropriately low.

Every CSS-expressible candidate is also checked against the actual page: if a `data-testid` or `id` you'd expect to be unique turns out to match more than one element (duplicate IDs happen more than you'd think), its score is penalized and the next-best distinguishing locator wins instead — the score isn't just "this attribute exists," it's "this attribute exists **and** actually resolves to one element."

## Install

```bash
git clone https://github.com/<your-username>/intellipom
cd intellipom
npm install
```

## Usage

### CLI

```bash
# Generate all three frameworks, printed to stdout
node src/cli.js examples/sample.html --class LoginPage

# Just Playwright, written to a file
node src/cli.js examples/sample.html --framework playwright --class LoginPage --out ./output

# Just Cypress
node src/cli.js path/to/your.html --framework cypress --class CheckoutPage

# Capture a LIVE page (handles SPAs — waits for JS to render before reading the DOM)
node src/cli.js --url https://your-app.com/login --class LoginPage

# Try it against a public automation-practice site
node src/cli.js --url https://www.saucedemo.com --class LoginPage
```

```
Usage: node src/cli.js <html-file> [options]
       node src/cli.js --url <url> [options]

Options:
  --framework <name>   playwright | cypress | selenium | all   (default: all)
  --class <name>       Name for the generated class              (default: GeneratedPage)
  --out <dir>          Directory to write output file(s) into     (default: stdout)
  --url <url>          Capture the LIVE rendered DOM of a URL with a headless
                        browser instead of reading a local HTML file (handles SPAs)
```

### Web UI

```bash
npm install
npx playwright install chromium   # one-time, downloads the headless browser
npm start
```

Then open **http://localhost:3000** in your browser. Three input modes (Paste HTML / Upload file / Live URL), framework tabs for the output, and every generated locator shows a confidence meter with the reason it was chosen.

> The live-browser-capture (`--url` / "Live URL" tab) needs a Chromium binary. `npx playwright install chromium` downloads it once — the CLI and paste/upload modes work without it.

## Project structure

```
src/
  core/
    locatorScoring.js     -> the stability-ranking engine (framework-agnostic)
    extractElements.js    -> parses HTML, finds interactive elements, names them
  capture/
    liveCapture.js         -> headless-browser DOM capture for live URLs (SPAs)
  generators/
    locatorStrings.js     -> turns a scored candidate into a real selector string
    generatePlaywright.js
    generateCypress.js
    generateSelenium.js
  server/
    server.js               -> Express API backing the web UI
  cli.js                  -> command-line entry point
public/                      -> web UI (vanilla HTML/CSS/JS, no build step)
tests/
  locatorScoring.test.js  -> unit tests for the scoring engine
examples/
  sample.html             -> a login-page fixture used for demos/tests
```

## Roadmap

- [ ] AI-assisted element naming/grouping via the Claude API, for pages with no `data-testid` coverage at all
- [ ] npm package publish (`npx intellipom ...`)
- [ ] Auth support for live-capture mode (login before scraping a protected page)

## Running tests

```bash
npm test
```

## License

MIT
