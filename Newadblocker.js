(function () {
  "use strict";

  if (window.__MERAYOUR_ADGUARD_V9__) return;
  window.__MERAYOUR_ADGUARD_V9__ = true;

  // ==========================================================
  // MERAYOUR ADGUARD V9 — ZERO TOLERANCE MODE
  // GA4 OR ADSENSE FAILURE = CONTENT LOCK
  // ==========================================================

  const CONFIG = {
    GA4_ID: "G-ML091DD9QZ",
    ADSENSE_ID: "ca-pub-1011806586686442",

    INITIAL_GRACE: 3000,
    SYSTEM_GRACE: 8000,
    CONFIRMATION_TIME: 3000,
    CHECK_INTERVAL: 800,

    GA_SCRIPT_FAILURE: 60,
    GA_ACTIVITY_MISSING: 60,

    ADSENSE_SCRIPT_FAILURE: 60,
    ADSENSE_RENDER_MISSING: 60,

    DETECTION_THRESHOLD: 50,

    OVERLAY_ID: "merayour-v9-lock",
    STYLE_ID: "merayour-v9-style"
  };

  const startedAt = Date.now();

  const state = {
    gaScriptFound: false,
    gaScriptLoaded: false,
    gaScriptFailed: false,
    gaActivitySeen: false,

    adsenseScriptFound: false,
    adsenseScriptLoaded: false,
    adsenseScriptFailed: false,

    adSlotsFound: false,
    adFilled: false,
    adUnfilled: false,

    gaFailureScore: 0,
    adsenseFailureScore: 0,

    suspiciousSince: 0,
    locked: false,

    observer: null,
    timer: null
  };

  // ==========================================================
  // ENVIRONMENT CHECKS
  // ==========================================================

  function isBloggerPreview() {
    const host = (location.hostname || "").toLowerCase();
    const search = (location.search || "").toLowerCase();

    return (
      host === "blogger.com" ||
      host.endsWith(".blogger.com") ||
      /(?:^|[?&])preview=(?:true|1)(?:&|$)/.test(search)
    );
  }

  function isReaderMode() {
    try {
      return (
        location.href.startsWith("about:reader") ||
        document.documentElement.classList.contains("moz-reader-mode") ||
        !!document.querySelector(".moz-reader-content")
      );
    } catch (_) {
      return false;
    }
  }

  if (isBloggerPreview()) return;

  // ==========================================================
  // SCRIPT CLASSIFICATION
  // ==========================================================

  function classifyScript(src) {
    if (!src) return "";

    const url = src.toLowerCase();

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

  // ==========================================================
  // SCRIPT STATE MONITOR
  // ==========================================================

  function attachScriptListeners(script) {
    if (!script || !script.src) return;

    const type = classifyScript(script.src);

    if (!type) return;

    if (script.dataset.merayourV9Watched === "1") return;

    script.dataset.merayourV9Watched = "1";

    if (type === "GA4") {
      state.gaScriptFound = true;
    }

    if (type === "ADSENSE") {
      state.adsenseScriptFound = true;
    }

    script.addEventListener("load", function () {
      if (type === "GA4") {
        state.gaScriptLoaded = true;
        state.gaScriptFailed = false;
      }

      if (type === "ADSENSE") {
        state.adsenseScriptLoaded = true;
        state.adsenseScriptFailed = false;
      }
    }, { once: true });

    script.addEventListener("error", function () {
      if (type === "GA4") {
        state.gaScriptFailed = true;
      }

      if (type === "ADSENSE") {
        state.adsenseScriptFailed = true;
      }
    }, { once: true });
  }

  // Capture script resource errors, including scripts
  // inserted after the initial page markup.
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

    state.observer = new MutationObserver(function (records) {
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

    state.observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ==========================================================
  // GA4 ACTIVITY MONITOR
  // Observe actual browser resource entries.
  // No fabricated requests.
  // ==========================================================

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

  function inspectGAResources() {
    try {
      performance.getEntriesByType("resource").forEach(function (entry) {
        if (isGAResource(entry.name)) {
          state.gaActivitySeen = true;
        }
      });
    } catch (_) {}
  }

  function watchGAResources() {
    if (!("PerformanceObserver" in window)) return;

    try {
      const observer = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (isGAResource(entry.name)) {
            state.gaActivitySeen = true;
          }
        });
      });

      observer.observe({
        type: "resource",
        buffered: true
      });
    } catch (_) {}
  }

  // ==========================================================
  // ADSENSE SLOT MONITOR
  // ==========================================================

  function inspectAdSlots() {
    const selector =
      'ins.adsbygoogle[data-ad-client="' +
      CONFIG.ADSENSE_ID +
      '"]';

    const slots = document.querySelectorAll(selector);

    state.adSlotsFound = slots.length > 0;

    let filled = false;
    let unfilled = false;

    slots.forEach(function (slot) {
      const status = (
        slot.getAttribute("data-ad-status") || ""
      ).toLowerCase();

      if (status === "filled") {
        filled = true;
      }

      if (status === "unfilled") {
        unfilled = true;
      }

      // A visible iframe is supplementary evidence.
      // An iframe alone cannot prove that an ad was served.
      const iframe = slot.querySelector("iframe");

      if (iframe) {
        const rect = iframe.getBoundingClientRect();
        const style = getComputedStyle(iframe);

        const visible =
          rect.width >= 10 &&
          rect.height >= 10 &&
          style.display !== "none" &&
          style.visibility !== "hidden";

        if (visible && status === "filled") {
          filled = true;
        }
      }
    });

    state.adFilled = filled;
    state.adUnfilled = unfilled;
  }

  // ==========================================================
  // ZERO TOLERANCE EVIDENCE ENGINE
  // Either system can independently trigger a lock.
  // ==========================================================

  function calculateEvidence() {
    const elapsed = Date.now() - startedAt;

    let gaScore = 0;
    let adScore = 0;

    // GA4: explicit script failure.
    if (state.gaScriptFailed) {
      gaScore = CONFIG.GA_SCRIPT_FAILURE;
    }

    // GA4: configured GA4 is not available after grace.
    // A defined gtag function alone does not prove that
    // its external script or requests are working.
    if (elapsed >= CONFIG.SYSTEM_GRACE) {
      if (typeof window.gtag === "undefined") {
        gaScore = CONFIG.GA_SCRIPT_FAILURE;
      } else if (
        state.gaScriptFound &&
        !state.gaActivitySeen
      ) {
        gaScore = Math.max(
          gaScore,
          CONFIG.GA_ACTIVITY_MISSING
        );
      }
    }

    // AdSense: explicit script failure.
    if (state.adsenseScriptFailed) {
      adScore = CONFIG.ADSENSE_SCRIPT_FAILURE;
    }

    // AdSense: expected global is missing after grace.
    if (
      elapsed >= CONFIG.SYSTEM_GRACE &&
      typeof window.adsbygoogle === "undefined"
    ) {
      adScore = CONFIG.ADSENSE_SCRIPT_FAILURE;
    }

    // AdSense: a real configured slot remains unresolved.
    // An explicitly unfilled slot is not independently
    // considered proof of an AdBlocker.
    if (
      elapsed >= CONFIG.SYSTEM_GRACE &&
      state.adsenseScriptFound &&
      state.adSlotsFound &&
      !state.adFilled &&
      !state.adUnfilled
    ) {
      adScore = Math.max(
        adScore,
        CONFIG.ADSENSE_RENDER_MISSING
      );
    }

    state.gaFailureScore = gaScore;
    state.adsenseFailureScore = adScore;

    return {
      ga: gaScore,
      adsense: adScore,

      // Keep the strongest system score.
      total: Math.max(gaScore, adScore),

      // ZERO TOLERANCE: either system is sufficient.
      eitherSystemSuspicious:
        gaScore > 0 || adScore > 0
    };
  }

  // ==========================================================
  // LOCK SCREEN
  // Original article HTML remains untouched.
  // ==========================================================

  function createLock() {
    if (state.locked || !document.body) return;

    if (document.getElementById(CONFIG.OVERLAY_ID)) {
      state.locked = true;
      return;
    }

    if (!document.getElementById(CONFIG.STYLE_ID)) {
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
          background: rgba(8,10,16,.98) !important;
          color: #fff !important;
          font-family: Arial,sans-serif !important;
        }

        #${CONFIG.OVERLAY_ID} .ag-v9-card {
          width: 100% !important;
          max-width: 470px !important;
          padding: 30px 24px !important;
          box-sizing: border-box !important;
          text-align: center !important;
          background: #151923 !important;
          border: 1px solid #a52b38 !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 40px rgba(0,0,0,.5) !important;
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

      document.head.appendChild(style);
    }

    const overlay = document.createElement("div");
    overlay.id = CONFIG.OVERLAY_ID;

    const card = document.createElement("div");
    card.className = "ag-v9-card";

    const heading = document.createElement("h2");
    heading.textContent = "Ad Blocker Detected!";

    const message = document.createElement("p");
    message.textContent =
      "Merayour is supported by advertising. " +
      "Please allow Google Analytics and advertising services " +
      "on this website, then reload the page to continue reading.";

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

    document.body.appendChild(overlay);

    state.locked = true;
  }

  function removeLock() {
    const overlay = document.getElementById(CONFIG.OVERLAY_ID);

    if (overlay) {
      overlay.remove();
    }

    state.locked = false;
    state.suspiciousSince = 0;
  }

  // ==========================================================
  // MAIN EVALUATION LOOP
  // ==========================================================

  function evaluate() {
    if (isReaderMode()) return;

    inspectGAResources();
    inspectAdSlots();

    const elapsed = Date.now() - startedAt;

    if (elapsed < CONFIG.INITIAL_GRACE) return;

    const evidence = calculateEvidence();

    /*
     * IMPORTANT:
     * A filled AdSense slot does not cancel a GA4 failure.
     * A working GA4 script does not cancel an AdSense failure.
     */
    const suspicious =
      evidence.eitherSystemSuspicious &&
      evidence.total >= CONFIG.DETECTION_THRESHOLD;

    if (!suspicious) {
      state.suspiciousSince = 0;

      // Recover automatically when neither system is
      // currently producing a failure signal.
      if (state.locked) {
        removeLock();
      }

      return;
    }

    if (!state.suspiciousSince) {
      state.suspiciousSince = Date.now();
      return;
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

    inspectGAResources();
    inspectAdSlots();

    state.timer = window.setInterval(
      evaluate,
      CONFIG.CHECK_INTERVAL
    );

    evaluate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

})();
