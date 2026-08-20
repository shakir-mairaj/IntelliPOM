(() => {
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
    locatorList: document.getElementById("locatorList"),
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

    el.locatorList.innerHTML = data.elements
      .map(
        (e) => `
        <div class="locator-row">
          <div class="meter" title="${e.score}/100">${meterSegments(e.score)}</div>
          <div class="locator-info">
            <div class="locator-name">${e.name}</div>
            <div class="locator-reason">${e.reason}</div>
          </div>
          <div class="score-badge band-${band(e.score)}">${e.score}</div>
        </div>`
      )
      .join("");

    renderCode();
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

  el.generateBtn.addEventListener("click", generate);
})();
