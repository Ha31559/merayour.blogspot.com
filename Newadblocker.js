(function () {
  "use strict";

  if (window.__MERAYOUR_ADGUARD_V91__) return;
  window.__MERAYOUR_ADGUARD_V91__ = true;

  // ==========================================================
  // MERAYOUR ADGUARD V9.1 — CONTENT LOCK EDITION
  // GA4 OR ADSENSE FAILURE = LOCK
  // ORIGINAL ARTICLE HTML IS PRESERVED
  // ==========================================================

  const CONFIG = {
    GA4_ID: "G-ML091DD9QZ",
    ADSENSE_ID: "ca-pub-1011806586686442",

    INITIAL_GRACE: 3000,
    SYSTEM_GRACE: 8000,
    CONFIRMATION_TIME: 3000,
    RECOVERY_CONFIRMATION_TIME: 5000,
    CHECK_INTERVAL: 800,

    GA_SCRIPT_FAILURE: 60,
    GA_ACTIVITY_MISSING: 60,
    ADSENSE_SCRIPT_FAILURE: 60,
    ADSENSE_RENDER_MISSING: 60,
    DETECTION_THRESHOLD: 50,

    OVERLAY_ID: "merayour-v91-lock",
    STYLE_ID: "merayour-v91-style",

    // Add your actual article selectors if your theme
    // uses a different content container.
    CONTENT_SELECTORS: [
      ".post-body",
      ".post-outer",
      ".post",
      "article",
      ".blog-posts"
    ]
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
    healthySince: 0,
    locked: false,

    observer: null,
    lockObserver: null,
    timer: null,

    protectedElements: new Map(),
    lockInProgress: false
  };

  // ==========================================================
  // ENVIRONMENT
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

  function attachScriptListeners(script) {
    if (!script || !script.src) return;

    const type = classifyScript(script.src);
    if (!type) return;

    if (script.dataset.merayourV91Watched === "1") return;

    script.dataset.merayourV91Watched = "1";

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
    }, { once: true });

    script.addEventListener("error", function () {
      if (type === "GA4") {
        state.gaScriptFailed = true;
      } else {
        state.adsenseScriptFailed = true;
      }
    }, { once: true });
  }

  window.addEventListener("error", function (event) {
    const target = event.target;

    if (!target || target.tagName !== "SCRIPT") return;

    const type = classifyScript(target.src || "");

    if (type === "GA4") {
      state.gaScriptFound = true;
      state.gaScriptFailed = true;
    } else if (type === "ADSENSE") {
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
  // GA4 ACTIVITY
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

      if (status === "filled") filled = true;
      if (status === "unfilled") unfilled = true;

      // A visible iframe is not proof of a served ad
      // unless AdSense itself reports the slot as filled.
      const iframe = slot.querySelector("iframe");

      if (iframe && status === "filled") {
        const rect = iframe.getBoundingClientRect();
        const style = getComputedStyle(iframe);

        if (
          rect.width >= 10 &&
          rect.height >= 10 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        ) {
          filled = true;
        }
      }
    });

    state.adFilled = filled;
    state.adUnfilled = unfilled;
  }

  // ==========================================================
  // EVIDENCE ENGINE
  // ==========================================================

  function calculateEvidence() {
    const elapsed = Date.now() - startedAt;

    let gaScore = 0;
    let adScore = 0;

    if (state.gaScriptFailed) {
      gaScore = CONFIG.GA_SCRIPT_FAILURE;
    }

    if (elapsed >= CONFIG.SYSTEM_GRACE) {
      if (typeof window.gtag === "undefined") {
        gaScore = CONFIG.GA_SCRIPT_FAILURE;
      } else if (
        state.gaScriptFound &&
        !state.gaActivitySeen
      ) {
        gaScore = CONFIG.GA_ACTIVITY_MISSING;
      }
    }

    if (state.adsenseScriptFailed) {
      adScore = CONFIG.ADSENSE_SCRIPT_FAILURE;
    }

    if (
      elapsed >= CONFIG.SYSTEM_GRACE &&
      typeof window.adsbygoogle === "undefined"
    ) {
      adScore = CONFIG.ADSENSE_SCRIPT_FAILURE;
    }

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
      total: Math.max(gaScore, adScore),
      suspicious: gaScore > 0 || adScore > 0
    };
  }

  // ==========================================================
  // CONTENT PROTECTION
  // Preserve original HTML and existing listeners.
  // ==========================================================

  function getProtectedElements() {
    const found = new Set();

    CONFIG.CONTENT_SELECTORS.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        if (
          el.id === CONFIG.OVERLAY_ID ||
          el.closest("#" + CONFIG.OVERLAY_ID)
        ) {
          return;
        }

        // Avoid protecting the whole document or body.
        if (
          el === document.body ||
          el === document.documentElement
        ) {
          return;
        }

        found.add(el);
      });
    });

    // Remove nested candidates when a parent is already protected.
    return Array.from(found).filter(function (el) {
      return !Array.from(found).some(function (other) {
        return other !== el && other.contains(el);
      });
    });
  }

  function protectContent() {
    if (state.lockInProgress) return;

    state.lockInProgress = true;

    try {
      getProtectedElements().forEach(function (el) {
        if (!state.protectedElements.has(el)) {
          state.protectedElements.set(el, {
            inert: el.inert,
            ariaHidden: el.getAttribute("aria-hidden"),
            userSelect: el.style.userSelect,
            pointerEvents: el.style.pointerEvents
          });
        }

        el.inert = true;
        el.setAttribute("aria-hidden", "true");
        el.style.setProperty("user-select", "none", "important");
        el.style.setProperty("pointer-events", "none", "important");
      });

      document.documentElement.style.setProperty(
        "overflow",
        "hidden",
        "important"
      );

      document.body.style.setProperty(
        "overflow",
        "hidden",
        "important"
      );
    } finally {
      state.lockInProgress = false;
    }
  }

  function restoreContent() {
    state.protectedElements.forEach(function (original, el) {
      if (!el.isConnected) return;

      el.inert = original.inert;

      if (original.ariaHidden === null) {
        el.removeAttribute("aria-hidden");
      } else {
        el.setAttribute("aria-hidden", original.ariaHidden);
      }

      if (original.userSelect) {
        el.style.userSelect = original.userSelect;
      } else {
        el.style.removeProperty("user-select");
      }

      if (original.pointerEvents) {
        el.style.pointerEvents = original.pointerEvents;
      } else {
        el.style.removeProperty("pointer-events");
      }
    });

    state.protectedElements.clear();

    document.documentElement.style.removeProperty("overflow");

    if (document.body) {
      document.body.style.removeProperty("overflow");
    }
  }

  // ==========================================================
  // OVERLAY
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

      #${CONFIG.OVERLAY_ID} .ag-v91-card {
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

  function createLock() {
    if (!document.body) return;

    installStyles();

    let overlay = document.getElementById(CONFIG.OVERLAY_ID);

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = CONFIG.OVERLAY_ID;
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "merayour-v91-heading");

      const card = document.createElement("div");
      card.className = "ag-v91-card";

      const heading = document.createElement("h2");
      heading.id = "merayour-v91-heading";
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

    if (!overlay.isConnected) {
      document.body.appendChild(overlay);
    }

    state.locked = true;
    protectContent();

    // Re-apply content protection if the theme inserts
    // additional matching article containers while locked.
    if (!state.lockObserver && document.documentElement) {
      state.lockObserver = new MutationObserver(function () {
        if (!state.locked) return;

        if (!document.getElementById(CONFIG.OVERLAY_ID)) {
          document.body.appendChild(overlay);
        }

        protectContent();
      });

      state.lockObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }

  function removeLock() {
    const overlay = document.getElementById(CONFIG.OVERLAY_ID);

    if (overlay) overlay.remove();

    if (state.lockObserver) {
      state.lockObserver.disconnect();
      state.lockObserver = null;
    }

    restoreContent();

    state.locked = false;
    state.suspiciousSince = 0;
    state.healthySince = 0;
  }

  // ==========================================================
  // MAIN LOOP
  // ==========================================================

  function evaluate() {
    inspectGAResources();
    inspectAdSlots();

    const elapsed = Date.now() - startedAt;

    if (elapsed < CONFIG.INITIAL_GRACE) return;

    const evidence = calculateEvidence();
    const suspicious =
      evidence.suspicious &&
      evidence.total >= CONFIG.DETECTION_THRESHOLD;

    if (suspicious) {
      state.healthySince = 0;

      if (!state.suspiciousSince) {
        state.suspiciousSince = Date.now();
      }

      if (
        Date.now() - state.suspiciousSince >=
        CONFIG.CONFIRMATION_TIME
      ) {
        createLock();
      }

      return;
    }

    state.suspiciousSince = 0;

    // Require a continuous healthy period before unlocking.
    if (state.locked) {
      if (!state.healthySince) {
        state.healthySince = Date.now();
      }

      if (
        Date.now() - state.healthySince >=
        CONFIG.RECOVERY_CONFIRMATION_TIME
      ) {
        removeLock();
      }
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
