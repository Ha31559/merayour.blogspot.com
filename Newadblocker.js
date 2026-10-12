(function () {
  "use strict";

  // ==========================================================
  // MERAYOUR ADGUARD V10
  // HYBRID STRICT + BALANCED ADVANCED EDITION
  //
  // Preserves:
  // - Original DOM Detach Lock
  // - Original overlay design and Reload button
  // - GA4 monitoring
  // - AdSense script and slot monitoring
  // - Initial and system grace periods
  // - Recovery confirmation
  //
  // Improvements:
  // - Multiple-signal verification
  // - Script-load race reconciliation
  // - Performance Resource Timing inspection
  // - Positive health evidence
  // - Persistent failure confirmation
  // - Recovery watchdog
  // - Optional diagnostic logging
  //
  // IMPORTANT:
  // Browser-side detection cannot guarantee identification
  // of every ad blocker or distinguish every network failure.
  // ==========================================================

  if (window.MERAYOUR_ADGUARD_V10) return;

  window.MERAYOUR_ADGUARD_V10 = true;

  const CONFIG = {
    GA4_ID: "G-ML091DD9QZ",
    ADSENSE_ID: "ca-pub-1011806586686442",

    // Grace periods
    INITIAL_GRACE: 500,
    SYSTEM_GRACE: 1000,

    // Detection and recovery
    CONFIRMATION_TIME: 1000,
    RECOVERY_CONFIRMATION_TIME: 1000,
    CHECK_INTERVAL: 500,

    // Evidence scoring
    GA_SCRIPT_FAILURE: 60,
    GA_LIBRARY_MISSING: 60,

    ADSENSE_SCRIPT_FAILURE: 60,
    ADSENSE_LIBRARY_MISSING: 60,

    // A single signal must not trigger the lock.
    DETECTION_THRESHOLD: 30,

    // Diagnostics: true writes state changes to the console.
    DIAGNOSTICS: true,

    OVERLAY_ID: "merayour-v92-lock",
    STYLE_ID: "merayour-v92-style",

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

    adSlotsFound: false,
    adFilled: false,
    adUnfilled: false,

    gaFailureScore: 0,
    adsenseFailureScore: 0,

    suspiciousSince: 0,
    healthySince: 0,

    locked: false,
    lastDiagnosticState: "",

    observer: null,
    gaObserver: null,
    lockObserver: null,
    timer: null,

    detachedContent: new Map(),

    savedPageStyles: null,
    lockInProgress: false
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
        "[Merayour AdGuard V10]",
        label,
        details || ""
      );
    } catch (_) {}
  }

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
      url.includes(
        "googlesyndication.com/pagead/js/adsbygoogle.js"
      ) &&
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

  function isGAScriptResource(url) {
    const type = classifyScript(url);
    return type === "GA4";
  }

  function isAdSenseResource(url) {
    const type = classifyScript(url);
    return type === "ADSENSE";
  }

  // ==========================================================
  // RESOURCE TIMING RECONCILIATION
  //
  // Important: script load listeners can be attached after a
  // script has already loaded. Resource Timing helps identify
  // this situation, although resource entries alone are not
  // absolute proof of successful execution.
  // ==========================================================

  function inspectResources() {
    let entries = [];

    try {
      entries = performance.getEntriesByType("resource");
    } catch (_) {
      return;
    }

    entries.forEach(function (entry) {
      const name = entry.name || "";

      if (isGAScriptResource(name)) {
        state.gaResourceSeen = true;
      }

      if (isAdSenseResource(name)) {
        state.adsenseResourceSeen = true;
      }

      if (isGAResource(name)) {
        state.gaActivitySeen = true;
      }
    });
  }

  // ==========================================================
  // SCRIPT LISTENERS
  // ==========================================================

  function attachScriptListeners(script) {
    if (!script || !script.src) return;

    const type = classifyScript(script.src);

    if (!type) return;

    if (script.dataset.merayourV10Watched === "1") {
      return;
    }

    script.dataset.merayourV10Watched = "1";

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

      diagnostic("Script error observed", type);
    }, { once: true });
  }

  // Capture script-loading errors.
  window.addEventListener("error", function (event) {
    const target = event.target;

    if (!target || target.tagName !== "SCRIPT") {
      return;
    }

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

      // Keep the existing visual iframe check.
      if (iframeIsVisible(slot, status)) {
        filled = true;
      }
    });

    state.adFilled = filled;
    state.adUnfilled = unfilled;
  }

  function iframeIsVisible(slot, status) {
    if (status !== "filled") return false;

    const iframe = slot.querySelector("iframe");

    if (!iframe) return false;

    try {
      const rect = iframe.getBoundingClientRect();
      const style = getComputedStyle(iframe);

      return (
        rect.width >= 10 &&
        rect.height >= 10 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    } catch (_) {
      return false;
    }
  }

  // ==========================================================
  // POSITIVE HEALTH RECONCILIATION
  // ==========================================================

  function reconcileHealth() {
    inspectResources();

    // A later positive signal overrides a stale error flag.
    if (
      state.gaScriptLoaded ||
      (
        state.gaResourceSeen &&
        typeof window.gtag === "function"
      ) ||
      (
        typeof window.gtag === "function" &&
        state.gaActivitySeen
      )
    ) {
      state.gaScriptFailed = false;
    }

    if (
      state.adsenseScriptLoaded ||
      (
        state.adsenseResourceSeen &&
        typeof window.adsbygoogle !== "undefined"
      )
    ) {
      state.adsenseScriptFailed = false;
    }
  }

  function analyticsHealthy() {
    return (
      state.gaScriptLoaded ||
      (
        state.gaResourceSeen &&
        typeof window.gtag === "function"
      ) ||
      (
        typeof window.gtag === "function" &&
        state.gaActivitySeen
      )
    );
  }

  function adsenseHealthy() {
    return (
      (
        state.adsenseScriptLoaded ||
        state.adsenseResourceSeen
      ) &&
      typeof window.adsbygoogle !== "undefined"
    );
  }

  // ==========================================================
  // HYBRID MULTI-SIGNAL EVIDENCE ENGINE
  //
  // One isolated failure signal is not enough.
  // An unfilled ad is not treated as proof of blocking.
  // Lack of GA activity alone is not treated as proof.
  // ==========================================================

  function calculateEvidence() {
    const elapsed = Date.now() - startedAt;

    let gaScore = 0;
    let adScore = 0;

    const gaLibraryPresent =
      typeof window.gtag === "function";

    const adsLibraryPresent =
      typeof window.adsbygoogle !== "undefined";

    const gaPositive =
      state.gaScriptLoaded ||
      (
        state.gaResourceSeen &&
        gaLibraryPresent
      ) ||
      (
        gaLibraryPresent &&
        state.gaActivitySeen
      );

    const adsPositive =
      (
        state.adsenseScriptLoaded ||
        state.adsenseResourceSeen
      ) &&
      adsLibraryPresent;

    // --------------------------------------------------------
    // GA4 EVIDENCE
    // --------------------------------------------------------

    const gaExplicitFailure =
      state.gaScriptFailed &&
      !gaPositive;

    const gaLibraryMissing =
      elapsed >= CONFIG.SYSTEM_GRACE &&
      state.gaScriptFound &&
      !state.gaScriptLoaded &&
      !state.gaResourceSeen &&
      !gaLibraryPresent &&
      !state.gaActivitySeen;

    if (gaExplicitFailure) {
      gaScore += CONFIG.GA_SCRIPT_FAILURE;
    }

    if (gaLibraryMissing) {
      gaScore += CONFIG.GA_LIBRARY_MISSING;
    }

    // --------------------------------------------------------
    // ADSENSE EVIDENCE
    // --------------------------------------------------------

    const adsExplicitFailure =
      state.adsenseScriptFailed &&
      !adsPositive;

    const adsLibraryMissing =
      elapsed >= CONFIG.SYSTEM_GRACE &&
      state.adsenseScriptFound &&
      !state.adsenseScriptLoaded &&
      !state.adsenseResourceSeen &&
      !adsLibraryPresent;

    if (adsExplicitFailure) {
      adScore += CONFIG.ADSENSE_SCRIPT_FAILURE;
    }

    if (adsLibraryMissing) {
      adScore += CONFIG.ADSENSE_LIBRARY_MISSING;
    }

    // "unfilled" is a valid AdSense outcome and never adds
    // blocking evidence by itself.
    //
    // No ad slot, no fill, missing GA activity, and missing
    // data-ad-status are not standalone blocker proofs.

    state.gaFailureScore = gaScore;
    state.adsenseFailureScore = adScore;

    const total = gaScore + adScore;

    // Require multiple independent signal categories:
    //
    // A. Strong failure evidence for both services; OR
    // B. Multiple consistent signals for one service.
    //
    // Persistent confirmation time is also required later.
    const gaMultipleSignals =
      gaExplicitFailure && gaLibraryMissing;

    const adsMultipleSignals =
      adsExplicitFailure && adsLibraryMissing;

    const bothServicesFailed =
      gaScore >= CONFIG.GA_SCRIPT_FAILURE &&
      adScore >= CONFIG.ADSENSE_SCRIPT_FAILURE;

    const multipleSignals =
      bothServicesFailed ||
      gaMultipleSignals ||
      adsMultipleSignals;

    return {
      ga: gaScore,
      adsense: adScore,
      total: total,

      gaExplicitFailure: gaExplicitFailure,
      gaLibraryMissing: gaLibraryMissing,

      adsExplicitFailure: adsExplicitFailure,
      adsLibraryMissing: adsLibraryMissing,

      multipleSignals: multipleSignals,

      suspicious:
        multipleSignals &&
        total >= CONFIG.DETECTION_THRESHOLD
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
      const selector = CONFIG.CONTENT_SELECTORS[i];

      let matches = [];

      try {
        matches = Array.from(
          document.querySelectorAll(selector)
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

      if (matches.length > 0) {
        return matches.filter(function (el) {
          return !matches.some(function (other) {
            return (
              other !== el &&
              other.contains(el)
            );
          });
        });
      }
    }

    return [];
  }

  // ==========================================================
  // DOM DETACH LOCK
  // ==========================================================

  function savePageStyles() {
    if (state.savedPageStyles) return;

    state.savedPageStyles = {
      htmlOverflow:
        document.documentElement.style.getPropertyValue(
          "overflow"
        ),

      htmlOverflowPriority:
        document.documentElement.style.getPropertyPriority(
          "overflow"
        ),

      bodyOverflow:
        document.body
          ? document.body.style.getPropertyValue("overflow")
          : "",

      bodyOverflowPriority:
        document.body
          ? document.body.style.getPropertyPriority("overflow")
          : ""
    };
  }

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

        const record = {
          placeholder: placeholder,
          parent: parent,
          nextSibling: nextSibling
        };

        try {
          parent.replaceChild(placeholder, el);

          state.detachedContent.set(el, record);
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

  function restorePageStyles() {
    const saved = state.savedPageStyles;

    if (!saved) return;

    const html = document.documentElement;
    const body = document.body;

    if (saved.htmlOverflow) {
      html.style.setProperty(
        "overflow",
        saved.htmlOverflow,
        saved.htmlOverflowPriority
      );
    } else {
      html.style.removeProperty("overflow");
    }

    if (body) {
      if (saved.bodyOverflow) {
        body.style.setProperty(
          "overflow",
          saved.bodyOverflow,
          saved.bodyOverflowPriority
        );
      } else {
        body.style.removeProperty("overflow");
      }
    }

    state.savedPageStyles = null;
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
    if (document.getElementById(CONFIG.STYLE_ID)) {
      return;
    }

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

      #${CONFIG.OVERLAY_ID} .ag-v92-card {
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

    (document.head || document.documentElement).appendChild(
      style
    );
  }

  // ==========================================================
  // CREATE LOCK
  // ==========================================================

  function createLock() {
    if (!document.body) return;

    installStyles();

    let overlay = document.getElementById(
      CONFIG.OVERLAY_ID
    );

    if (!overlay) {
      overlay = document.createElement("div");

      overlay.id = CONFIG.OVERLAY_ID;

      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");

      overlay.setAttribute(
        "aria-labelledby",
        "merayour-v92-heading"
      );

      const card = document.createElement("div");

      card.className = "ag-v92-card";

      const heading = document.createElement("h2");

      heading.id = "merayour-v92-heading";
      heading.textContent = "Ad Blocker Detected!";

      const message = document.createElement("p");

      message.textContent =
        "Merayour is supported by advertising. Please allow " +
        "Google Analytics and advertising services for this website, " +
        "then reload the page to continue reading.";

      const button = document.createElement("button");

      button.type = "button";

      button.textContent =
        "I've Allowed Ads — Reload";

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

    detachContent();

    diagnostic("Content locked", "Persistent multi-signal evidence");

    if (
      !state.lockObserver &&
      document.documentElement
    ) {
      state.lockObserver = new MutationObserver(function () {
        if (!state.locked) return;

        const currentOverlay = document.getElementById(
          CONFIG.OVERLAY_ID
        );

        if (!currentOverlay && document.body) {
          document.body.appendChild(overlay);
        }

        detachContent();
      });

      state.lockObserver.observe(
        document.documentElement,
        {
          childList: true,
          subtree: true
        }
      );
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

    const overlay = document.getElementById(
      CONFIG.OVERLAY_ID
    );

    if (overlay) {
      overlay.remove();
    }

    restoreContent();

    state.suspiciousSince = 0;
    state.healthySince = 0;

    diagnostic("Lock removed", "Health recovery confirmed");
  }

  // ==========================================================
  // HYBRID WATCHDOG
  // ==========================================================

  function evaluate() {
    inspectResources();
    inspectAdSlots();
    reconcileHealth();

    const elapsed = Date.now() - startedAt;

    // Allow the page to initialize.
    if (elapsed < CONFIG.INITIAL_GRACE) {
      return;
    }

    const gaHealthy = analyticsHealthy();
    const adsHealthy = adsenseHealthy();

    const bothHealthy = gaHealthy && adsHealthy;

    // Positive health evidence clears stale failure flags.
    if (bothHealthy) {
      state.gaScriptFailed = false;
      state.adsenseScriptFailed = false;

      state.gaFailureScore = 0;
      state.adsenseFailureScore = 0;

      state.suspiciousSince = 0;

      if (!state.locked) {
        state.healthySince = 0;

        diagnostic("Healthy", "Both services have positive evidence");

        return;
      }

      // Keep the recovery confirmation period.
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

    // Never lock before the system grace period.
    if (elapsed < CONFIG.SYSTEM_GRACE) {
      state.suspiciousSince = 0;
      return;
    }

    const evidence = calculateEvidence();

    diagnostic(
      "Evidence evaluated",
      "GA=" + evidence.ga +
      ", AdSense=" + evidence.adsense +
      ", Multiple=" + evidence.multipleSignals
    );

    // Strict threshold + Balanced multi-signal confirmation.
    if (!evidence.suspicious) {
      state.suspiciousSince = 0;
      return;
    }

    if (!state.suspiciousSince) {
      state.suspiciousSince = Date.now();
    }

    const suspiciousDuration =
      Date.now() - state.suspiciousSince;

    if (
      suspiciousDuration >= CONFIG.CONFIRMATION_TIME
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
    inspectAdSlots();

    // Reconcile scripts that may have loaded before listeners
    // were attached.
    reconcileHealth();

    state.timer = window.setInterval(
      evaluate,
      CONFIG.CHECK_INTERVAL
    );

    evaluate();

    diagnostic("Initialized", "Hybrid Advanced Edition");
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
