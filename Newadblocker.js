(function () {
  "use strict";

  // ==========================================================
  // MERAYOUR ADGUARD V11
  // SIMPLIFIED HYBRID EDITION
  //
  // Preserves:
  // - DOM detach/restore lock
  // - Dark overlay and reload button
  // - GA4 and AdSense monitoring
  // - Grace periods
  // - Failure confirmation
  // - Recovery confirmation
  //
  // Simplified:
  // - No evidence scoring
  // - No detection threshold
  // - No multiple-signal scoring engine
  // - Missing scripts checked after grace period
  //
  // Note:
  // Browser-side detection cannot conclusively distinguish
  // an ad blocker from every network or configuration failure.
  // ==========================================================

  if (window.MERAYOUR_ADGUARD_V11) return;

  function isBloggerPreview() {
    const host = (location.hostname || "").toLowerCase();
    const search = (location.search || "").toLowerCase();

    return (
      host === "blogger.com" ||
      host.endsWith(".blogger.com") ||
      /(?:^|[?&])preview=(?:true|1)(?:&|$)/.test(search)
    );
  }

  if (isBloggerPreview()) return;

  window.MERAYOUR_ADGUARD_V11 = true;

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  const CONFIG = {
    GA4_ID: "G-ML091DD9QZ",
    ADSENSE_ID: "ca-pub-1011806586686442",

    INITIAL_GRACE: 3000,
    SYSTEM_GRACE: 10000,

    CONFIRMATION_TIME: 3000,
    RECOVERY_CONFIRMATION_TIME: 3000,
    CHECK_INTERVAL: 1000,

    DIAGNOSTICS: true,

    OVERLAY_ID: "merayour-v11-lock",
    STYLE_ID: "merayour-v11-style",

    CONTENT_SELECTORS: [
      ".post-body",
      "article",
      ".post"
    ]
  };

  const startedAt = Date.now();

  const state = {
    gaScriptFound: false,
    gaScriptLoaded: false,
    gaScriptFailed: false,
    gaResourceSeen: false,
    gaActivitySeen: false,

    adsenseScriptFound: false,
    adsenseScriptLoaded: false,
    adsenseScriptFailed: false,
    adsenseResourceSeen: false,

    suspiciousSince: 0,
    healthySince: 0,

    locked: false,
    lockInProgress: false,

    lastDiagnosticState: "",

    scriptObserver: null,
    gaObserver: null,
    lockObserver: null,
    timer: null,

    detachedContent: new Map(),
    savedPageStyles: null
  };

  // ==========================================================
  // DIAGNOSTICS
  // ==========================================================

  function diagnostic(label, details) {
    if (!CONFIG.DIAGNOSTICS) return;

    const signature = label + ":" + (details || "");

    if (signature === state.lastDiagnosticState) return;

    state.lastDiagnosticState = signature;

    try {
      console.info(
        "[Merayour AdGuard V11]",
        label,
        details || ""
      );
    } catch (_) {}
  }

  // ==========================================================
  // SCRIPT CLASSIFICATION
  // ==========================================================

  function classifyScript(src) {
    if (!src) return "";

    let url;

    try {
      url = new URL(src, location.href).href.toLowerCase();
    } catch (_) {
      return "";
    }

    if (
      url.includes("googletagmanager.com/gtag/js") &&
      url.includes(CONFIG.GA4_ID.toLowerCase())
    ) {
      return "GA4";
    }

    if (
      url.includes("googlesyndication.com/pagead/js/adsbygoogle.js") &&
      url.includes(CONFIG.ADSENSE_ID.toLowerCase())
    ) {
      return "ADSENSE";
    }

    return "";
  }

  function isGAResource(url) {
    if (!url) return false;

    const value = url.toLowerCase();

    return (
      value.includes("google-analytics.com/g/collect") ||
      value.includes("analytics.google.com/g/collect") ||
      value.includes("region1.google-analytics.com/g/collect") ||
      value.includes("google-analytics.com/collect")
    );
  }

  // ==========================================================
  // RESOURCE TIMING
  // ==========================================================

  function inspectResources() {
    let entries = [];

    try {
      entries = performance.getEntriesByType("resource");
    } catch (_) {
      return;
    }

    entries.forEach(function (entry) {
      const type = classifyScript(entry.name || "");

      if (type === "GA4") {
        state.gaResourceSeen = true;
      }

      if (type === "ADSENSE") {
        state.adsenseResourceSeen = true;
      }

      if (isGAResource(entry.name || "")) {
        state.gaActivitySeen = true;
      }
    });
  }

  // ==========================================================
  // SCRIPT LOAD / ERROR MONITOR
  // ==========================================================

  function attachScriptListeners(script) {
    if (!script || !script.src) return;

    const type = classifyScript(script.src);

    if (!type) return;

    if (script.dataset.merayourV11Watched === "1") {
      return;
    }

    script.dataset.merayourV11Watched = "1";

    if (type === "GA4") {
      state.gaScriptFound = true;
    } else {
      state.adsenseScriptFound = true;
    }

    script.addEventListener("load", function () {
      if (type === "GA4") {
        state.gaScriptLoaded = true;
        state.gaScriptFailed = false;
      } else {
        state.adsenseScriptLoaded = true;
        state.adsenseScriptFailed = false;
      }

      diagnostic("Script loaded", type);
    }, { once: true });

    script.addEventListener("error", function () {
      if (type === "GA4") {
        state.gaScriptFailed = true;
      } else {
        state.adsenseScriptFailed = true;
      }

      diagnostic("Script error", type);
    }, { once: true });
  }

  // Capture resource errors even if an element listener
  // was attached too late.
  window.addEventListener("error", function (event) {
    const target = event.target;

    if (!target || target.tagName !== "SCRIPT") return;

    const type = classifyScript(target.src || "");

    if (type === "GA4") {
      state.gaScriptFound = true;
      state.gaScriptFailed = true;
    }

    if (type === "ADSENSE") {
      state.adsenseScriptFound = true;
      state.adsenseScriptFailed = true;
    }
  }, true);

  function watchScripts() {
    document.querySelectorAll("script[src]").forEach(
      attachScriptListeners
    );

    if (!document.documentElement) return;

    state.scriptObserver = new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;

          if (node.tagName === "SCRIPT") {
            attachScriptListeners(node);
          }

          if (node.querySelectorAll) {
            node.querySelectorAll("script[src]").forEach(
              attachScriptListeners
            );
          }
        });
      });
    });

    state.scriptObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ==========================================================
  // GA4 ACTIVITY MONITOR
  // ==========================================================

  function watchGAResources() {
    if (!("PerformanceObserver" in window)) return;

    try {
      state.gaObserver = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (isGAResource(entry.name)) {
            state.gaActivitySeen = true;
          }
        });
      });

      state.gaObserver.observe({
        type: "resource",
        buffered: true
      });
    } catch (_) {}
  }

  // ==========================================================
  // POSITIVE HEALTH SIGNALS
  // ==========================================================

  function analyticsHealthy() {
    const gtagPresent = typeof window.gtag === "function";

    return (
      state.gaScriptLoaded ||
      (state.gaResourceSeen && gtagPresent) ||
      (gtagPresent && state.gaActivitySeen)
    );
  }

  function adsenseHealthy() {
    const libraryPresent =
      typeof window.adsbygoogle !== "undefined";

    return (
      (
        state.adsenseScriptLoaded ||
        state.adsenseResourceSeen
      ) &&
      libraryPresent
    );
  }

  function reconcileHealth() {
    inspectResources();

    if (analyticsHealthy()) {
      state.gaScriptFailed = false;
    }

    if (adsenseHealthy()) {
      state.adsenseScriptFailed = false;
    }
  }

  // ==========================================================
  // SIMPLIFIED FAILURE CHECK
  //
  // After SYSTEM_GRACE:
  // - Missing expected script is a failure signal.
  // - Found but not successfully loaded is a failure signal.
  // - A positive health signal clears the failure.
  //
  // Locking still requires BOTH services to show failure
  // and the condition to persist for CONFIRMATION_TIME.
  // ==========================================================

  function calculateEvidence() {
    const elapsed = Date.now() - startedAt;

    const gaHealthy = analyticsHealthy();
    const adsHealthy = adsenseHealthy();

    const gaFailure =
      elapsed >= CONFIG.SYSTEM_GRACE &&
      !gaHealthy &&
      (
        state.gaScriptFailed ||
        !state.gaScriptFound ||
        !state.gaScriptLoaded
      );

    const adsFailure =
      elapsed >= CONFIG.SYSTEM_GRACE &&
      !adsHealthy &&
      (
        state.adsenseScriptFailed ||
        !state.adsenseScriptFound ||
        !state.adsenseScriptLoaded
      );

    return {
      gaHealthy: gaHealthy,
      adsHealthy: adsHealthy,

      gaFailure: gaFailure,
      adsFailure: adsFailure,

      // Require both services to fail.
      suspicious: gaFailure && adsFailure
    };
  }

  // ==========================================================
  // CONTENT CANDIDATES
  // ==========================================================

  function getContentCandidates() {
    for (
      let i = 0;
      i < CONFIG.CONTENT_SELECTORS.length;
      i++
    ) {
      let matches = [];

      try {
        matches = Array.from(
          document.querySelectorAll(
            CONFIG.CONTENT_SELECTORS[i]
          )
        );
      } catch (_) {
        continue;
      }

      matches = matches.filter(function (el) {
        if (!el.isConnected) return false;

        if (
          el.id === CONFIG.OVERLAY_ID ||
          el.closest("#" + CONFIG.OVERLAY_ID)
        ) {
          return false;
        }

        if (
          el === document.body ||
          el === document.documentElement ||
          el.tagName === "SCRIPT" ||
          el.tagName === "STYLE"
        ) {
          return false;
        }

        return !state.detachedContent.has(el);
      });

      if (matches.length) {
        return matches.filter(function (el) {
          return !matches.some(function (other) {
            return other !== el && other.contains(el);
          });
        });
      }
    }

    return [];
  }

  // ==========================================================
  // SAVE AND RESTORE PAGE STYLES
  // ==========================================================

  function savePageStyles() {
    if (state.savedPageStyles) return;

    const html = document.documentElement;
    const body = document.body;

    state.savedPageStyles = {
      htmlOverflow: html.style.getPropertyValue("overflow"),
      htmlPriority: html.style.getPropertyPriority("overflow"),

      bodyOverflow: body
        ? body.style.getPropertyValue("overflow")
        : "",

      bodyPriority: body
        ? body.style.getPropertyPriority("overflow")
        : ""
    };
  }

  function restorePageStyles() {
    const saved = state.savedPageStyles;

    if (!saved) return;

    const html = document.documentElement;
    const body = document.body;

    if (saved.htmlOverflow) {
      html.style.setProperty(
        "overflow",
        saved.htmlOverflow,
        saved.htmlPriority
      );
    } else {
      html.style.removeProperty("overflow");
    }

    if (body) {
      if (saved.bodyOverflow) {
        body.style.setProperty(
          "overflow",
          saved.bodyOverflow,
          saved.bodyPriority
        );
      } else {
        body.style.removeProperty("overflow");
      }
    }

    state.savedPageStyles = null;
  }

  // ==========================================================
  // DETACH / RESTORE CONTENT
  // ==========================================================

  function detachContent() {
    if (state.lockInProgress) return;

    state.lockInProgress = true;

    try {
      getContentCandidates().forEach(function (el) {
        if (!el.parentNode || !el.isConnected) return;

        const parent = el.parentNode;
        const nextSibling = el.nextSibling;

        const placeholder = document.createComment(
          "Merayour content temporarily locked"
        );

        try {
          parent.replaceChild(placeholder, el);

          state.detachedContent.set(el, {
            placeholder: placeholder,
            parent: parent,
            nextSibling: nextSibling
          });
        } catch (_) {}
      });

      savePageStyles();

      document.documentElement.style.setProperty(
        "overflow",
        "hidden",
        "important"
      );

      if (document.body) {
        document.body.style.setProperty(
          "overflow",
          "hidden",
          "important"
        );
      }
    } finally {
      state.lockInProgress = false;
    }
  }

  function restoreContent() {
    state.detachedContent.forEach(function (record, el) {
      try {
        if (
          record.placeholder &&
          record.placeholder.parentNode
        ) {
          record.placeholder.parentNode.replaceChild(
            el,
            record.placeholder
          );

          return;
        }

        if (record.parent && record.parent.isConnected) {
          const reference =
            record.nextSibling &&
            record.nextSibling.parentNode === record.parent
              ? record.nextSibling
              : null;

          record.parent.insertBefore(el, reference);
        }
      } catch (_) {}
    });

    state.detachedContent.clear();

    restorePageStyles();
  }

  // ==========================================================
  // OVERLAY STYLES
  // ==========================================================

  function installStyles() {
    if (document.getElementById(CONFIG.STYLE_ID)) return;

    const style = document.createElement("style");

    style.id = CONFIG.STYLE_ID;

    style.textContent = `
      #${CONFIG.OVERLAY_ID} {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 22px !important;
        box-sizing: border-box !important;
        background: rgba(8,10,16,.99) !important;
        color: #fff !important;
        font-family: Arial,sans-serif !important;
        overflow: auto !important;
        overscroll-behavior: contain !important;
        isolation: isolate !important;
      }

      #${CONFIG.OVERLAY_ID} .ag-v11-card {
        width: 100% !important;
        max-width: 470px !important;
        padding: 30px 24px !important;
        box-sizing: border-box !important;
        text-align: center !important;
        background: #151923 !important;
        border: 1px solid #a52b38 !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 40px rgba(0,0,0,.7) !important;
      }

      #${CONFIG.OVERLAY_ID} h2 {
        margin: 0 0 16px !important;
        color: #ff626c !important;
        font-size: 25px !important;
        line-height: 1.35 !important;
      }

      #${CONFIG.OVERLAY_ID} p {
        color: #d2d5df !important;
        font-size: 15px !important;
        line-height: 1.7 !important;
      }

      #${CONFIG.OVERLAY_ID} button {
        margin-top: 12px !important;
        padding: 13px 20px !important;
        border: 0 !important;
        border-radius: 6px !important;
        background: #b92f3b !important;
        color: #fff !important;
        font-weight: bold !important;
        font-size: 15px !important;
        cursor: pointer !important;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  // ==========================================================
  // CREATE LOCK
  // ==========================================================

  function createLock() {
    if (!document.body || state.locked) return;

    installStyles();

    let overlay = document.getElementById(CONFIG.OVERLAY_ID);

    if (!overlay) {
      overlay = document.createElement("div");

      overlay.id = CONFIG.OVERLAY_ID;
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute(
        "aria-labelledby",
        "merayour-v11-heading"
      );

      const card = document.createElement("div");
      card.className = "ag-v11-card";

      const heading = document.createElement("h2");
      heading.id = "merayour-v11-heading";
      heading.textContent = "Ad Blocker Detected!";

      const message = document.createElement("p");

      message.textContent =
        "Merayour is supported by advertising. Please allow " +
        "Google Analytics and advertising services for this website, " +
        "then reload the page to continue reading.";

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "I've Allowed Ads — Reload";

      button.addEventListener("click", function () {
        location.reload();
      });

      card.appendChild(heading);
      card.appendChild(message);
      card.appendChild(button);
      overlay.appendChild(card);
    }

    document.body.appendChild(overlay);

    state.locked = true;

    detachContent();

    diagnostic(
      "Content locked",
      "Both services failed after grace and confirmation"
    );

    if (!state.lockObserver && document.documentElement) {
      state.lockObserver = new MutationObserver(function () {
        if (!state.locked) return;

        const current = document.getElementById(
          CONFIG.OVERLAY_ID
        );

        if (!current && document.body) {
          document.body.appendChild(overlay);
        }

        detachContent();
      });

      state.lockObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }

  // ==========================================================
  // REMOVE LOCK
  // ==========================================================

  function removeLock() {
    state.locked = false;

    if (state.lockObserver) {
      state.lockObserver.disconnect();
      state.lockObserver = null;
    }

    const overlay = document.getElementById(CONFIG.OVERLAY_ID);

    if (overlay) overlay.remove();

    restoreContent();

    state.suspiciousSince = 0;
    state.healthySince = 0;

    diagnostic("Lock removed", "Recovery confirmed");
  }

  // ==========================================================
  // WATCHDOG
  // ==========================================================

  function evaluate() {
    inspectResources();
    reconcileHealth();

    const elapsed = Date.now() - startedAt;

    if (elapsed < CONFIG.INITIAL_GRACE) return;

    const evidence = calculateEvidence();

    diagnostic(
      "Status",
      "GA healthy=" + evidence.gaHealthy +
      ", AdSense healthy=" + evidence.adsHealthy +
      ", GA failure=" + evidence.gaFailure +
      ", AdSense failure=" + evidence.adsFailure +
      ", Suspicious=" + evidence.suspicious
    );

    // Recovery requires both services to become healthy.
    if (evidence.gaHealthy && evidence.adsHealthy) {
      state.suspiciousSince = 0;

      if (!state.locked) {
        state.healthySince = 0;
        return;
      }

      if (!state.healthySince) {
        state.healthySince = Date.now();
      }

      if (
        Date.now() - state.healthySince >=
        CONFIG.RECOVERY_CONFIRMATION_TIME
      ) {
        removeLock();
      }

      return;
    }

    state.healthySince = 0;

    if (elapsed < CONFIG.SYSTEM_GRACE) {
      state.suspiciousSince = 0;
      return;
    }

    if (!evidence.suspicious) {
      state.suspiciousSince = 0;
      return;
    }

    if (!state.suspiciousSince) {
      state.suspiciousSince = Date.now();
    }

    if (
      Date.now() - state.suspiciousSince >=
      CONFIG.CONFIRMATION_TIME
    ) {
      createLock();
    }
  }

  // ==========================================================
  // INITIALIZATION
  // ==========================================================

  function init() {
    watchScripts();
    watchGAResources();

    inspectResources();
    reconcileHealth();

    state.timer = window.setInterval(
      evaluate,
      CONFIG.CHECK_INTERVAL
    );

    evaluate();

    diagnostic(
      "Initialized",
      "Simplified Hybrid Edition"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
