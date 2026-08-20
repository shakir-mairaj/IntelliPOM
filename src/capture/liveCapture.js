const { chromium } = require("playwright");

/**
 * Navigate to a URL with a real headless browser and return the fully
 * rendered HTML — i.e. after JS has run, unlike a raw fetch() of the URL.
 * This is what makes the generator work on SPAs (React/Vue/Angular apps),
 * not just static markup.
 *
 * @param {string} url
 * @param {{waitForSelector?: string, timeoutMs?: number}} [options]
 * @returns {Promise<string>} rendered HTML
 */
async function captureRenderedHtml(url, options = {}) {
  const { waitForSelector, timeoutMs = 30000 } = options;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      // A realistic viewport/UA avoids some sites serving a stripped-down
      // "unsupported browser" page to headless clients.
      viewport: { width: 1366, height: 900 },
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: timeoutMs });
    }

    return await page.content();
  } finally {
    await browser.close();
  }
}

module.exports = { captureRenderedHtml };
