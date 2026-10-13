(function () {
  "use strict";

  if (window.__MERAYOUR_MEGA_ULTIMATE_V92__) return;
  window.__MERAYOUR_MEGA_ULTIMATE_V92__ = true;

  // ==========================================================
  // MERAYOUR ADGUARD V9.2 - MEGA COMBINED MASTER EDITION
  // (All previous scripts, honey-pots, shadow-doms, and extreme hooks combined)
  // ==========================================================

  const CONFIG = {
    GA4_ID: "G-ML091DD9QZ",
    ADSENSE_ID: "ca-pub-1011806586686442",

    INITIAL_GRACE: 0,        // जीरो ग्रेस टाइम (तुरंत ऐक्शन)
    SYSTEM_GRACE: 0,         // जीरो सिस्टम ग्रेस
    CONFIRMATION_TIME: 50,   // पलक झपकने से भी तेज पुष्टि
    RECOVERY_CONFIRMATION_TIME: 5000,
    CHECK_INTERVAL: 200,     // सुपर-फास्ट रफ्तार से लगातार जांच

    GA_SCRIPT_FAILURE: 50,
    GA_ACTIVITY_MISSING: 40,
    ADSENSE_SCRIPT_FAILURE: 50,
    
    DETECTION_THRESHOLD: 10, // अतिसंवेदनशील (कोई नहीं बच सकता)

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

    baitTriggered: false,
    networkBlocked: false,
    extremeTamperDetected: false,

    suspiciousSince: 0,
    healthySince: 0,
    locked: false,

    observer: null,
    gaObserver: null,
    lockObserver: null,
    timer: null,

    detachedContent: new Map(),
    savedPageStyles: null,
    lockInProgress: false,
    
    // मल्टीपल ट्रैप स्टोरेज
    baitElement: null,
    baitHosts: [],
    shadowBaits: []
  };

  // ==========================================================
  // 1. ENVIRONMENT CHECK
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
  // 2. SCRIPT CLASSIFICATION & WATCHERS (Core Engine)
  // ==========================================================
  function classifyScript(src) {
    if (!src) return "";
    const url = src.toLowerCase();
    if (url.includes("googletagmanager.com/gtag/js") && url.includes(CONFIG.GA4_ID.toLowerCase())) {
      return "GA4";
    }
    if (url.includes("googlesyndication.com/pagead/js/adsbygoogle.js") && url.includes(CONFIG.ADSENSE_ID.toLowerCase())) {
      return "ADSENSE";
    }
    return "";
  }

  function attachScriptListeners(script) {
    if (!script || !script.src) return;
    const type = classifyScript(script.src);
    if (!type) return;
    if (script.dataset.merayourWatched === "1") return;
    script.dataset.merayourWatched = "1";

    if (type === "GA4") state.gaScriptFound = true;
    else state.adsenseScriptFound = true;

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
      if (type === "GA4") state.gaScriptFailed = true;
      else state.adsenseScriptFailed = true;
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
    document.querySelectorAll("script[src]").forEach(attachScriptListeners);
    if (!document.documentElement) return;

    state.observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.tagName === "SCRIPT") attachScriptListeners(node);
          if (node.querySelectorAll) {
            node.querySelectorAll("script[src]").forEach(attachScriptListeners);
          }
        });
      });
    });

    state.observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ==========================================================
  // 3. GA4 & ANALYTICS INSPECTORS
  // ==========================================================
  function isGAResource(url) {
    if (!url) return false;
    const value = url.toLowerCase();
    return value.includes("google-analytics.com") || value.includes("analytics.google.com");
  }

  function inspectGAResources() {
    try {
      performance.getEntriesByType("resource").forEach(function (entry) {
        if (isGAResource(entry.name)) state.gaActivitySeen = true;
      });
    } catch (_) {}
  }

  function watchGAResources() {
    if (!("PerformanceObserver" in window)) return;
    try {
      state.gaObserver = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (isGAResource(entry.name)) state.gaActivitySeen = true;
        });
      });
      state.gaObserver.observe({ type: "resource", buffered: true });
    } catch (_) {}
  }

  // ==========================================================
  // 4. OVERLAY & STYLES (Force Lock Engine)
  // ==========================================================
  function installStyles() {
    if (document.getElementById(CONFIG.STYLE_ID)) return;
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
        background: rgba(2, 4, 8, 0.998) !important;
        color: #fff !important;
        font-family: Arial, sans-serif !important;
        overflow: hidden !important;
        backdrop-filter: blur(10px) !important;
      }
      #${CONFIG.OVERLAY_ID} .ag-v92-card {
        width: 100% !important;
        max-width: 450px !important;
        padding: 30px 24px !important;
        box-sizing: border-box !important;
        text-align: center !important;
        background: #111520 !important;
        border: 2px solid #ff334b !important;
        border-radius: 14px !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95) !important;
      }
      #${CONFIG.OVERLAY_ID} h2 {
        margin: 0 0 15px !important;
        color: #ff4757 !important;
        font-size: 24px !important;
        font-weight: 700 !important;
      }
      #${CONFIG.OVERLAY_ID} p {
        color: #cfd3dc !important;
        font-size: 15px !important;
        line-height: 1.6 !important;
        margin-bottom: 22px !important;
      }
      #${CONFIG.OVERLAY_ID} button {
        width: 100% !important;
        padding: 14px 20px !important;
        border: 0 !important;
        border-radius: 8px !important;
        background: #ff334b !important;
        color: #fff !important;
        font-weight: bold !important;
        font-size: 16px !important;
        cursor: pointer !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function getContentCandidates() {
    for (let i = 0; i < CONFIG.CONTENT_SELECTORS.length; i++) {
      const selector = CONFIG.CONTENT_SELECTORS[i];
      let matches = [];
      try {
        matches = Array.from(document.querySelectorAll(selector));
      } catch (_) {
        continue;
      }

      matches = matches.filter(function (el) {
        if (!el.isConnected) return false;
        if (el.id === CONFIG.OVERLAY_ID || el.closest("#" + CONFIG.OVERLAY_ID)) return false;
        if (el === document.body || el === document.documentElement || el.tagName === "SCRIPT" || el.tagName === "STYLE") return false;
        return !state.detachedContent.has(el);
      });

      if (matches.length > 0) {
        return matches.filter(function (el) {
          return !matches.some(function (other) {
            return other !== el && other.contains(el);
          });
        });
      }
    }
    return [];
  }

  function detachContent() {
    if (state.lockInProgress) return;
    state.lockInProgress = true;
    try {
      getContentCandidates().forEach(function (el) {
        if (!el.parentNode || !el.isConnected) return;
        const parent = el.parentNode;
        const nextSibling = el.nextSibling;
        const placeholder = document.createComment("Secured Lock");
        const record = { placeholder: placeholder, parent: parent, nextSibling: nextSibling };
        try {
          parent.replaceChild(placeholder, el);
          state.detachedContent.set(el, record);
        } catch (_) {}
      });

      if (!state.savedPageStyles) {
        state.savedPageStyles = {
          htmlOverflow: document.documentElement.style.getPropertyValue("overflow"),
          bodyOverflow: document.body ? document.body.style.getPropertyValue("overflow") : ""
        };
      }
      document.documentElement.style.setProperty("overflow", "hidden", "important");
      if (document.body) document.body.style.setProperty("overflow", "hidden", "important");
    } finally {
      state.lockInProgress = false;
    }
  }

  function restoreContent() {
    state.detachedContent.forEach(function (record, el) {
      try {
        if (record.placeholder && record.placeholder.parentNode) {
          record.placeholder.parentNode.replaceChild(el, record.placeholder);
          return;
        }
        if (record.parent && record.parent.isConnected) {
          const reference = record.nextSibling && record.nextSibling.parentNode === record.parent ? record.nextSibling : null;
          record.parent.insertBefore(el, reference);
        }
      } catch (_) {}
    });
    state.detachedContent.clear();
    if (state.savedPageStyles) {
      document.documentElement.style.removeProperty("overflow");
      if (document.body) document.body.style.removeProperty("overflow");
      state.savedPageStyles = null;
    }
  }

  function createLock() {
    if (!document.body) return;
    installStyles();

    let overlay = document.getElementById(CONFIG.OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = CONFIG.OVERLAY_ID;

      const card = document.createElement("div");
      card.className = "ag-v92-card";

      const heading = document.createElement("h2");
      heading.textContent = "Ad Blocker Detected!";

      const message = document.createElement("p");
      message.textContent = "Your ad blocker or browser filter is interfering with this site. Please disable it to continue reading.";

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "I've Disabled It — Reload";
      button.addEventListener("click", function () {
        location.reload();
      });

      card.appendChild(heading);
      card.appendChild(message);
      card.appendChild(button);
      overlay.appendChild(card);
    }

    if (!overlay.isConnected || getComputedStyle(overlay).display === "none") {
      document.body.appendChild(overlay);
    }

    state.locked = true;
    detachContent();

    if (!state.lockObserver && document.documentElement) {
      state.lockObserver = new MutationObserver(function () {
        if (!state.locked) return;
        let currentOverlay = document.getElementById(CONFIG.OVERLAY_ID);
        if (!currentOverlay || !currentOverlay.isConnected) {
          if (document.body) document.body.appendChild(overlay);
        }
        detachContent();
      });
      state.lockObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    }
  }

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
  }

  // ==========================================================
  // 5. ALL UPGRADED PATCHES ADDED AT THE BOTTOM (UNSTOPPABLE LAYER)
  // ==========================================================

  // (A) Standard Proven Honeypot
  function plantBait() {
    if (document.getElementById("adsbygoogle-trap-box")) return;
    try {
      const bait = document.createElement("div");
      bait.id = "adsbygoogle-trap-box";
      bait.className = "adsbygoogle pub_300x250 pub_300x250_m text-ad textAd banner-ad";
      bait.style.cssText = "width: 1px !important; height: 1px !important; position: absolute !important; left: -9999px !important; top: -9999px !important; opacity: 0.01 !important; pointer-events: none !important; z-index: -9999 !important;";
      bait.innerHTML = "&nbsp;";
      (document.body || document.documentElement).appendChild(bait);
      state.baitElement = bait;
    } catch (_) {}
  }

  function checkBaitTrap() {
    if (!state.baitElement) return false;
    try {
      const rect = state.baitElement.getBoundingClientRect();
      const style = window.getComputedStyle(state.baitElement);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0" ||
        rect.width === 0 ||
        rect.height === 0 ||
        !state.baitElement.isConnected
      ) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  // (B) Advanced Shadow DOM Baits for Edge & Opera
  function plantExtremeBaits() {
    if (state.baitHosts.length > 0) return;
    const baitIDs = ["google_ads_iframe_net_trap_1", "aswift_0_box", "pub_300x250_deep_trap"];
    baitIDs.forEach((id, index) => {
      try {
        const host = document.createElement("div");
        host.id = "merayour-shadow-host-" + index;
        host.style.cssText = "position:absolute !important; left:-9999px !important; top:-9999px !important; width:1px !important; height:1px !important; opacity:0.01 !important; pointer-events:none !important;";
        const shadow = host.attachShadow({ mode: 'open' });
        const fakeAd = document.createElement("div");
        fakeAd.id = id;
        fakeAd.className = "adsbygoogle pub_300x250 text-ad banner-ad";
        fakeAd.style.cssText = "width:300px !important; height:250px !important; display:block !important;";
        fakeAd.innerHTML = '<iframe src="about:blank" style="width:100%;height:100%;"></iframe>';
        shadow.appendChild(fakeAd);
        (document.body || document.documentElement).appendChild(host);
        state.baitHosts.push(host);
        state.shadowBaits.push(fakeAd);
      } catch (_) {}
    });
  }

  function checkExtremeBaits() {
    if (state.baitHosts.length === 0) return false;
    for (let i = 0; i < state.baitHosts.length; i++) {
      try {
        const host = state.baitHosts[i];
        const hostRect = host.getBoundingClientRect();
        const style = window.getComputedStyle(host);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0" ||
          hostRect.width === 0 ||
          !host.isConnected
        ) {
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  // (C) Network Fetch & DOM Tampering Interceptors
  function watchExtremeTampering() {
    try {
      const originalFetch = window.fetch;
      if (originalFetch) {
        window.fetch = function (...args) {
          const url = (args[0] || "").toString().toLowerCase();
          if (url.includes("google") || url.includes("analytics") || url.includes("googlesyndication")) {
            return originalFetch.apply(this, args).catch(err => {
              state.networkBlocked = true;
              throw err;
            });
          }
          return originalFetch.apply(this, args);
        };
      }
    } catch (_) {}

    try {
      const nativeRemove = Element.prototype.remove;
      if (nativeRemove) {
        Element.prototype.remove = function() {
          if (this.id && (this.id.includes("trap") || this.id.includes("merayour"))) {
            state.extremeTamperDetected = true;
          }
          return nativeRemove.apply(this, arguments);
        };
      }
    } catch (_) {}
  }

  // ==========================================================
  // 6. ULTIMATE COMBINED EVALUATION LOOP
  // ==========================================================
  function evaluate() {
    inspectGAResources();

    let score = 0;
    if (checkBaitTrap() || checkExtremeBaits()) {
      state.baitTriggered = true;
      score = 100;
    }
    if (state.networkBlocked || state.extremeTamperDetected) {
      score = 100;
    }
    if (state.gaScriptFailed || state.adsenseScriptFailed) {
      score = Math.max(score, 50);
    }

    if (score >= CONFIG.DETECTION_THRESHOLD || state.baitTriggered || state.networkBlocked || state.extremeTamperDetected) {
      state.healthySince = 0;
      if (!state.suspiciousSince) {
        state.suspiciousSince = Date.now();
      }
      if (Date.now() - state.suspiciousSince >= CONFIG.CONFIRMATION_TIME) {
        createLock();
      }
      return;
    }

    state.suspiciousSince = 0;
    if (state.locked && !state.baitTriggered && !state.networkBlocked) {
      if (!state.healthySince) {
        state.healthySince = Date.now();
      }
      if (Date.now() - state.healthySince >= CONFIG.RECOVERY_CONFIRMATION_TIME) {
        removeLock();
      }
    }
  }

  // ==========================================================
  // 7. INITIALIZATION
  // ==========================================================
  function init() {
    watchScripts();
    watchGAResources();
    plantBait();
    plantExtremeBaits();
    watchExtremeTampering();

    state.timer = window.setInterval(evaluate, CONFIG.CHECK_INTERVAL);
    evaluate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();
