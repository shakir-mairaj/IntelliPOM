(() => {
  // Theme toggle — runs first, before anything else, so the correct theme
  // applies immediately on load rather than flashing dark-then-light.
  const themeToggle = document.getElementById("themeToggle");
  const rootEl = document.documentElement;

  function applyTheme(theme) {
    rootEl.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
  }

  applyTheme(localStorage.getItem("intellipom-theme") || "dark");

  themeToggle.addEventListener("click", () => {
    const next = rootEl.getAttribute("data-theme") === "light" ? "dark" : "light";
    localStorage.setItem("intellipom-theme", next);
    applyTheme(next);
  });

  const state = {
    mode: "paste",
    framework: "playwright",
    uploadedHtml: null,
    lastResult: null,
  };

  const el = {
    modeTabs: document.querySelectorAll(".tabs[aria-label='Input mode'] .tab"),
    frameworkTabs: document.querySelectorAll(".framework-tabs .tab"),
    htmlInput: document.getElementById("htmlInput"),
    fileInput: document.getElementById("fileInput"),
    fileName: document.getElementById("fileName"),
    urlInput: document.getElementById("urlInput"),
    classNameInput: document.getElementById("classNameInput"),
    generateBtn: document.getElementById("generateBtn"),
    clearHtmlBtn: document.getElementById("clearHtmlBtn"),
    clearUrlBtn: document.getElementById("clearUrlBtn"),
    clearUploadBtn: document.getElementById("clearUploadBtn"),
    errorMsg: document.getElementById("errorMsg"),
    emptyState: document.getElementById("emptyState"),
    results: document.getElementById("results"),
    elementCount: document.getElementById("elementCount"),
    attentionBanner: document.getElementById("attentionBanner"),
    locatorList: document.getElementById("locatorList"),
    verifyUrlInput: document.getElementById("verifyUrlInput"),
    verifyBtn: document.getElementById("verifyBtn"),
    verifyStatus: document.getElementById("verifyStatus"),
    codeOutput: document.getElementById("codeOutput"),
    copyBtn: document.getElementById("copyBtn"),
  };

  function band(score) {
    if (score >= 80) return "high";
    if (score >= 50) return "mid";
    return "low";
  }

  function meterSegments(score) {
    const filled = Math.max(1, Math.round(score / 20)); // 5 segments, 20pts each
    const b = band(score);
    let html = "";
    for (let i = 0; i < 5; i++) {
      html += `<span class="meter-seg ${i < filled ? `is-filled band-${b}` : ""}"></span>`;
    }
    return html;
  }

  function switchTab(tabs, clicked, attr) {
    tabs.forEach((t) => {
      const active = t === clicked;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
    return clicked.dataset[attr];
  }

  el.modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.mode = switchTab(el.modeTabs, tab, "mode");
      document.querySelectorAll(".input-panel .tab-panel").forEach((p) => {
        p.classList.toggle("is-hidden", p.dataset.panel !== state.mode);
      });
      hideError();
    });
  });

  el.frameworkTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.framework = switchTab(el.frameworkTabs, tab, "framework");
      renderCode();
    });
  });

  el.fileInput.addEventListener("change", async () => {
    const file = el.fileInput.files[0];
    if (!file) return;
    el.fileName.textContent = file.name;
    state.uploadedHtml = await file.text();
  });

  el.clearHtmlBtn.addEventListener("click", () => {
    el.htmlInput.value = "";
    el.htmlInput.focus();
    hideError();
  });

  el.clearUrlBtn.addEventListener("click", () => {
    el.urlInput.value = "";
    el.urlInput.focus();
    hideError();
  });

  el.clearUploadBtn.addEventListener("click", () => {
    el.fileInput.value = "";
    el.fileName.textContent = "";
    state.uploadedHtml = null;
    hideError();
  });

  function showError(message) {
    el.errorMsg.textContent = message;
    el.errorMsg.classList.remove("is-hidden");
  }

  function hideError() {
    el.errorMsg.classList.add("is-hidden");
  }

  function setLoading(isLoading) {
    el.generateBtn.disabled = isLoading;
    el.generateBtn.textContent = isLoading ? "Generating…" : "Generate page object";
  }

  async function generate() {
    hideError();
    const className = el.classNameInput.value.trim() || "GeneratedPage";
    let endpoint, body;

    if (state.mode === "paste") {
      const html = el.htmlInput.value.trim();
      if (!html) return showError("Paste some HTML first.");
      endpoint = "/api/generate/html";
      body = { html, className };
    } else if (state.mode === "upload") {
      if (!state.uploadedHtml) return showError("Choose an .html file first.");
      endpoint = "/api/generate/html";
      body = { html: state.uploadedHtml, className };
    } else {
      const url = el.urlInput.value.trim();
      if (!url) return showError("Enter a URL first.");
      endpoint = "/api/generate/url";
      body = { url, className };
    }

    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      state.lastResult = data;
      renderResults(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function renderResults(data) {
    el.emptyState.classList.add("is-hidden");
    el.results.classList.remove("is-hidden");
    el.elementCount.textContent = `${data.elementCount} element${data.elementCount === 1 ? "" : "s"}`;

    renderAttentionBanner(data);

    el.locatorList.innerHTML = data.elements
      .map(
        (e) => `
        <div class="locator-row">
          <div class="meter" title="${e.score}/100">${meterSegments(e.score)}</div>
          <div class="locator-info">
            <div class="locator-name">${e.name}</div>
            <div class="locator-reason">${e.reason}</div>
          </div>
          <span class="verify-badge" id="verify-badge-${e.name}"></span>
          <div class="score-badge band-${band(e.score)}">${e.score}</div>
        </div>`
      )
      .join("");

    el.verifyStatus.classList.add("is-hidden");
    el.verifyUrlInput.value = "";

    renderCode();
  }

  // Feature 4: "elements needing attention" summary — flags fragile locators
  // (score below 50, i.e. band "low" — class/structural fallbacks or values
  // that failed the uniqueness check) so the fix is visible before you even
  // look at generated code.
  function renderAttentionBanner(data) {
    const fragile = data.elements.filter((e) => band(e.score) === "low");
    if (fragile.length === 0) {
      el.attentionBanner.classList.remove("is-hidden");
      el.attentionBanner.classList.add("is-clear");
      el.attentionBanner.textContent = `All ${data.elementCount} locators have a reasonably stable selector.`;
      return;
    }
    el.attentionBanner.classList.remove("is-clear");
    el.attentionBanner.classList.remove("is-hidden");
    el.attentionBanner.textContent =
      `${fragile.length} of ${data.elementCount} element${data.elementCount === 1 ? "" : "s"} ` +
      `${fragile.length === 1 ? "has" : "have"} only a fragile locator (${fragile.map((e) => e.name).join(", ")}) ` +
      `— consider adding a data-testid.`;
  }

  function renderCode() {
    if (!state.lastResult) return;
    el.codeOutput.textContent = state.lastResult.code[state.framework] || "";
  }

  el.copyBtn.addEventListener("click", async () => {
    if (!state.lastResult) return;
    await navigator.clipboard.writeText(state.lastResult.code[state.framework] || "");
    el.copyBtn.textContent = "Copied";
    el.copyBtn.classList.add("is-copied");
    setTimeout(() => {
      el.copyBtn.textContent = "Copy";
      el.copyBtn.classList.remove("is-copied");
    }, 1500);
  });

  // Feature 1: "Verify live" — re-checks the generated selectors against the
  // CURRENT rendered DOM of a URL, so a paste/upload-mode result (which may
  // be a stale HTML snapshot) can be double-checked against the real page.
  el.verifyBtn.addEventListener("click", async () => {
    if (!state.lastResult) return;
    const url = el.verifyUrlInput.value.trim();
    if (!url) {
      el.verifyStatus.textContent = "Enter a URL to verify against.";
      el.verifyStatus.classList.remove("is-hidden");
      return;
    }

    const selectors = {};
    for (const e of state.lastResult.elements) {
      selectors[e.name] = e.cssSelector || null;
    }

    el.verifyBtn.disabled = true;
    el.verifyBtn.textContent = "Verifying…";
    el.verifyStatus.classList.remove("is-hidden");
    el.verifyStatus.textContent = "Launching a headless browser to check the live page…";

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, selectors }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");

      let okCount = 0;
      let mismatchCount = 0;
      for (const [name, result] of Object.entries(data.results)) {
        const badge = document.getElementById(`verify-badge-${name}`);
        if (!badge) continue;
        if (result.matchCount === 1) {
          badge.textContent = "✓ live-verified";
          badge.className = "verify-badge is-ok";
          okCount++;
        } else if (result.matchCount === null) {
          badge.textContent = "manual check";
          badge.className = "verify-badge is-unknown";
        } else {
          badge.textContent = `⚠ ${result.matchCount} matches live`;
          badge.className = "verify-badge is-mismatch";
          mismatchCount++;
        }
      }
      el.verifyStatus.textContent = `Verified against the live page: ${okCount} confirmed unique, ${mismatchCount} mismatched.`;
    } catch (err) {
      el.verifyStatus.textContent = err.message;
    } finally {
      el.verifyBtn.disabled = false;
      el.verifyBtn.textContent = "Verify live";
    }
  });

  el.generateBtn.addEventListener("click", generate);
})();
