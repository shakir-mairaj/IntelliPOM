#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { extractElements } = require("./core/extractElements");
const { generatePlaywright } = require("./generators/generatePlaywright");
const { generateCypress } = require("./generators/generateCypress");
const { generateSelenium } = require("./generators/generateSelenium");
const { captureRenderedHtml } = require("./capture/liveCapture");

function printUsage() {
  console.log(`
Usage: node src/cli.js <html-file> [options]
       node src/cli.js --url <url> [options]

Options:
  --framework <name>   playwright | cypress | selenium | all   (default: all)
  --class <name>       Name for the generated class              (default: GeneratedPage)
  --out <dir>          Directory to write output file(s) into     (default: stdout)
  --url <url>          Capture the LIVE rendered DOM of a URL with a headless
                        browser instead of reading a local HTML file (handles SPAs)

Examples:
  node src/cli.js examples/sample.html --framework playwright --class LoginPage
  node src/cli.js --url https://example.com/login --class LoginPage
`);
}

function parseArgs(argv) {
  const args = { framework: "all", class: "GeneratedPage", out: null, url: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--framework") args.framework = argv[++i];
    else if (a === "--class") args.class = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--url") args.url = argv[++i];
    else if (a === "-h" || a === "--help") args.help = true;
    else positional.push(a);
  }
  args.htmlFile = positional[0];
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    process.exit(0);
  }
  if (!args.htmlFile && !args.url) {
    printUsage();
    process.exit(1);
  }

  let html;
  if (args.url) {
    console.error(`Launching headless browser to capture ${args.url} ...`);
    html = await captureRenderedHtml(args.url);
  } else {
    html = fs.readFileSync(args.htmlFile, "utf8");
  }

  const elements = extractElements(html);

  if (elements.length === 0) {
    console.error("No interactive elements found in the given HTML.");
    process.exit(1);
  }

  const generators = {
    playwright: () => ({ ext: "js", code: generatePlaywright(elements, args.class) }),
    cypress: () => ({ ext: "js", code: generateCypress(elements, args.class) }),
    selenium: () => ({ ext: "py", code: generateSelenium(elements, args.class) }),
  };

  const targets = args.framework === "all" ? Object.keys(generators) : [args.framework];

  for (const target of targets) {
    if (!generators[target]) {
      console.error(`Unknown framework "${target}". Choose from: playwright, cypress, selenium, all`);
      process.exit(1);
    }
    const { ext, code } = generators[target]();
    if (args.out) {
      fs.mkdirSync(args.out, { recursive: true });
      const outPath = path.join(args.out, `${args.class}.${target}.${ext}`);
      fs.writeFileSync(outPath, code);
      console.log(`Wrote ${outPath}`);
    } else {
      console.log(`\n// ---- ${target} ----\n`);
      console.log(code);
    }
  }

  console.log(`\nExtracted ${elements.length} elements.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
