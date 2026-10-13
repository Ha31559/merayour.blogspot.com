(function () {
  "use strict";

  if (window.__MERAYOUR_ADGUARD_V92__) return;
  window.__MERAYOUR_ADGUARD_V92__ = true;

  // ==========================================================
  // MERAYOUR ADGUARD V9.2 - BULLET-PROOF ASSAULT EDITION
  // ==========================================================

  const CONFIG = {
    GA4_ID: "G-ML091DD9QZ",
    ADSENSE_ID: "ca-pub-1011806586686442",

    INITIAL_GRACE: 35000,    // 35 सेकंड शुरुआती छूट
    SYSTEM_GRACE: 90000,     // 90 सेकंड का सिस्टम ग्रेस पीरियड
    CONFIRMATION_TIME: 6000, // 6 सेकंड लगातार शक होने पर लॉक लगेगा
    RECOVERY_CONFIRMATION_TIME: 5000,
    CHECK_INTERVAL: 5,

    GA_SCRIPT_FAILURE: 50,
    GA_ACTIVITY_MISSING: 40,
    ADSENSE_SCRIPT_FAILURE: 50,
    ADSENSE_RENDER_MISSING: 0, 
    
    DETECTION_THRESHOLD: 90, 

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
    gaObserver: null,
    lockObserver: null,
    timer: null,

    detachedContent: new Map(),

    savedPageStyles: null,
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
      url.includes(
        "googlesyndication.com/pagead/js/adsbygoogle.js"
      ) &&
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

    if (script.dataset.merayourV92Watched === "1") {
      return;
    }

    script.dataset.merayourV92Watched = "1";

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
  // GA4 ACTIVITY
  // ==========================================================

  function isGAResource(url) {
    if (!url) return false;

    const value = url.toLowerCase();

    return (
      value.includes("google-analytics.com/g/collect") ||
      value.includes("analytics.google.com/g/collect") ||
      value.includes(
        "region1.google-analytics.com/g/collect"
      ) ||
      value.includes("google-analytics.com/collect")
    );
  }

  function inspectGAResources() {
    try {
      performance.getEntriesByType("resource").forEach(
        function (entry) {
          if (isGAResource(entry.name)) {
            state.gaActivitySeen = true;
          }
        }
      );
    } catch (_) {}
  }

  function watchGAResources() {
    if (!("PerformanceObserver" in window)) return;

    try {
      state.gaObserver = new PerformanceObserver(
        function (list) {
          list.getEntries().forEach(function (entry) {
            if (isGAResource(entry.name)) {
              state.gaActivitySeen = true;
            }
          });
        }
      );

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
      gaScore += 50;
    }

    if (elapsed >= CONFIG.SYSTEM_GRACE) {
      if (typeof window.gtag === "undefined") {
        gaScore += 50;
      } else if (state.gaScriptFound && !state.gaActivitySeen) {
        gaScore += 40;
      }
    }

    if (state.adsenseScriptFailed) {
      adScore += 50;
    }

    if (
      elapsed >= CONFIG.SYSTEM_GRACE &&
      typeof window.adsbygoogle === "undefined"
    ) {
      adScore += 50;
    }

    state.gaFailureScore = gaScore;
    state.adsenseFailureScore = adScore;

    const totalScore = Math.max(gaScore, adScore);

    return {
      ga: gaScore,
      adsense: adScore,
      total: totalScore,
      suspicious: totalScore >= CONFIG.DETECTION_THRESHOLD && elapsed >= CONFIG.SYSTEM_GRACE
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
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
        box-sizing: border-box !important;
        background: rgba(5, 7, 12, 0.995) !important;
        color: #fff !important;
        font-family: Arial, sans-serif !important;
        overflow: hidden !important;
        backdrop-filter: blur(8px) !important;
      }

      #${CONFIG.OVERLAY_ID} .ag-v92-card {
        width: 100% !important;
        max-width: 450px !important;
        padding: 30px 24px !important;
        box-sizing: border-box !important;
        text-align: center !important;
        background: #151923 !important;
        border: 2px solid #ff4757 !important;
        border-radius: 14px !important;
        box-shadow: 0 15px 50px rgba(0, 0, 0, 0.9) !important;
      }

      #${CONFIG.OVERLAY_ID} h2 {
        margin: 0 0 15px !important;
        color: #ff626c !important;
        font-size: 24px !important;
        font-weight: 700 !important;
      }

      #${CONFIG.OVERLAY_ID} p {
        color: #d2d5df !important;
        font-size: 15px !important;
        line-height: 1.6 !important;
        margin-bottom: 20px !important;
      }

      #${CONFIG.OVERLAY_ID} button {
        width: 100% !important;
        padding: 14px 20px !important;
        border: 0 !important;
        border-radius: 8px !important;
        background: #ff4757 !important;
        color: #fff !important;
        font-weight: bold !important;
        font-size: 16px !important;
        cursor: pointer !important;
        box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4) !important;
      }
    `;

    (document.head || document.documentElement).appendChild(
      style
    );
  }

  // ==========================================================
  // CREATE LOCK (BULLET-PROOF ASSAULT MODE)
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
      overlay.setAttribute("style", "position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; display: flex !important; align-items: center !important; justify-content: center !important; background: rgba(5, 7, 12, 0.995) !important;");

      const card = document.createElement("div");
      card.className = "ag-v92-card";
      card.setAttribute("style", "width: 100% !important; max-width: 450px !important; padding: 30px 24px !important; background: #151923 !important; border: 2px solid #ff4757 !important; border-radius: 14px !important; text-align: center !important; color: #fff !important; box-shadow: 0 15px 50px rgba(0,0,0,0.9) !important;");

      const heading = document.createElement("h2");
      heading.id = "merayour-v92-heading";
      heading.textContent = "Ad Blocker Detected!";
      heading.setAttribute("style", "color: #ff626c !important; font-size: 24px !important; margin-bottom: 15px !important;");

      const message = document.createElement("p");
      message.textContent =
        "Merayour is supported by advertising. Please allow " +
        "Google Analytics and advertising services for this website, " +
        "then reload the page to continue reading.";
      message.setAttribute("style", "color: #d2d5df !important; font-size: 15px !important; line-height: 1.6 !important; margin-bottom: 20px !important;");

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "I've Allowed Ads — Reload";
      button.setAttribute("style", "width: 100% !important; padding: 14px 20px !important; background: #ff4757 !important; color: #fff !important; font-weight: bold !important; border: none !important; border-radius: 8px !important; cursor: pointer !important;");

      button.addEventListener("click", function () {
        location.reload();
      });

      card.appendChild(heading);
      card.appendChild(message);
      card.appendChild(button);

      overlay.appendChild(card);
    }

    if (!overlay.isConnected || overlay.style.display === "none") {
      document.body.appendChild(overlay);
    }

    state.locked = true;
    detachContent();

    if (
      !state.lockObserver &&
      document.documentElement
    ) {
      state.lockObserver = new MutationObserver(function () {
        if (!state.locked) return;

        let currentOverlay = document.getElementById(
          CONFIG.OVERLAY_ID
        );

        if (!currentOverlay || !currentOverlay.isConnected) {
          if (document.body) {
            document.body.appendChild(overlay);
          }
        }

        detachContent();
      });

      state.lockObserver.observe(
        document.documentElement,
        {
          childList: true,
          subtree: true,
          attributes: true
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
  }

  // ==========================================================
  // MAIN LOOP
  // ==========================================================

  function evaluate() {
    inspectGAResources();
    inspectAdSlots();

    const elapsed = Date.now() - startedAt;

    if (elapsed < CONFIG.INITIAL_GRACE) {
      return;
    }

    const evidence = calculateEvidence();

    if (evidence.suspicious) {
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
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
