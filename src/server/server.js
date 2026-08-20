const express = require("express");
const multer = require("multer");
const path = require("path");

const { extractElements } = require("../core/extractElements");
const { generatePlaywright } = require("../generators/generatePlaywright");
const { generateCypress } = require("../generators/generateCypress");
const { generateSelenium } = require("../generators/generateSelenium");
const { captureRenderedHtml } = require("../capture/liveCapture");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB cap, in-memory (no temp files on disk)

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "..", "public")));

function buildResult(elements, className) {
  return {
    elementCount: elements.length,
    elements: elements.map((el) => ({
      name: el.name,
      tag: el.tag,
      score: el.recommended.score,
      reason: el.recommended.reason,
      locatorType: el.recommended.type,
    })),
    code: {
      playwright: generatePlaywright(elements, className),
      cypress: generateCypress(elements, className),
      selenium: generateSelenium(elements, className),
    },
  };
}

function handleExtractionError(res, err) {
  console.error(err);
  res.status(400).json({ error: err.message || "Failed to generate page object." });
}

// Mode 1 & 2: paste HTML directly, or upload a .html file (client reads it as text either way)
app.post("/api/generate/html", (req, res) => {
  try {
    const { html, className } = req.body;
    if (!html || !html.trim()) {
      return res.status(400).json({ error: "No HTML provided." });
    }
    const elements = extractElements(html);
    if (elements.length === 0) {
      return res.status(422).json({ error: "No interactive elements found in that HTML." });
    }
    res.json(buildResult(elements, className || "GeneratedPage"));
  } catch (err) {
    handleExtractionError(res, err);
  }
});

// Mode 3: live URL — launches a headless browser server-side
app.post("/api/generate/url", async (req, res) => {
  try {
    const { url, className } = req.body;
    if (!url || !/^https?:\/\//.test(url)) {
      return res.status(400).json({ error: "Provide a valid http(s) URL." });
    }
    const html = await captureRenderedHtml(url);
    const elements = extractElements(html);
    if (elements.length === 0) {
      return res.status(422).json({ error: "No interactive elements found on that page." });
    }
    res.json(buildResult(elements, className || "GeneratedPage"));
  } catch (err) {
    handleExtractionError(res, err);
  }
});

// Optional multipart upload endpoint (for a real <input type="file"> POST rather than
// reading the file client-side) — kept for completeness / non-JS-preview workflows.
app.post("/api/generate/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const html = req.file.buffer.toString("utf8");
    const className = req.body.className || "GeneratedPage";
    const elements = extractElements(html);
    if (elements.length === 0) {
      return res.status(422).json({ error: "No interactive elements found in that file." });
    }
    res.json(buildResult(elements, className));
  } catch (err) {
    handleExtractionError(res, err);
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`IntelliPOM running at http://localhost:${PORT}`);
  });
}

module.exports = app;
